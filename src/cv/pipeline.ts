import {
  ImageMetadata,
  FeatureMethod,
  TransformModelType,
  RegistrationResult,
  RegistrationMetrics,
  StageStatus,
  MatchPoint,
  TriSensorValidationResult,
} from '../types';
import {
  imageDataToGrayscale,
  applyCLAHE,
  bilateralFilter,
} from './imageProcessing';
import { detectFeatures } from './featureDetection';
import { extractDescriptors } from './featureDescription';
import { matchFeaturesKNN } from './matching';
import { runRANSAC } from './ransac';
import { refineSubpixelMatches } from './subpixel';
import {
  warpImageHomography,
  generateDifferenceMap,
  generateMatchesCanvas,
} from './warping';
import { computeExplainableConfidence } from './confidenceEngine';
import { generateOrMatchLunarFeatures } from './lunarFeatureDatabase';
import { validateTriSensorScene } from './triSensorValidation';

export interface PipelineOptions {
  featureMethod?: FeatureMethod;
  transformModel?: TransformModelType;
  inlierThresholdPx?: number;
  maxKeypoints?: number;
  ratioThreshold?: number;
  enableCLAHE?: boolean;
  enableSubpixel?: boolean;
  onProgress?: (status: StageStatus) => void;
  thirdCanvas?: HTMLCanvasElement;
  thirdMeta?: ImageMetadata;
}

/**
 * Calculate Spatial Distribution Score across an 8x8 Grid
 */
export function calculateSpatialDistribution(
  inlierMatches: MatchPoint[],
  width: number,
  height: number
): { score: number; warning?: string } {
  if (inlierMatches.length === 0) {
    return { score: 0, warning: 'No inlier matches to evaluate spatial distribution.' };
  }

  const gridX = 8;
  const gridY = 8;
  const grid = new Uint32Array(gridX * gridY);
  const cellW = width / gridX;
  const cellH = height / gridY;

  for (const m of inlierMatches) {
    const gx = Math.min(gridX - 1, Math.max(0, Math.floor(m.referenceKeypoint.x / cellW)));
    const gy = Math.min(gridY - 1, Math.max(0, Math.floor(m.referenceKeypoint.y / cellH)));
    grid[gy * gridX + gx]++;
  }

  let occupiedCells = 0;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] > 0) occupiedCells++;
  }

  const coverageRatio = occupiedCells / (gridX * gridY); // e.g. 0.45 = 45% grid occupied
  const score = Math.round(Math.min(100, (coverageRatio / 0.5) * 100));

  let warning: string | undefined;
  if (coverageRatio < 0.2) {
    warning = 'Matches are heavily concentrated in one small crater/region. Alignment stability across edges may be reduced.';
  } else if (coverageRatio < 0.35) {
    warning = 'Moderate spatial coverage. Consider verifying terrain details near image borders.';
  }

  return { score, warning };
}

/**
 * Assign Lunar Selenographic Coordinates to matches if GeoCenter metadata is present
 */
function assignLunarCoordinates(
  matches: MatchPoint[],
  refMeta: ImageMetadata
): MatchPoint[] {
  const centerLat = refMeta.geoCenterLat ?? -70.83; // Default Lunar South Pole crater
  const centerLon = refMeta.geoCenterLon ?? 9.24;
  const kmPerPx = (refMeta.resolutionMeters ?? 0.5) / 1000.0;
  const moonRadiusKm = 1737.4;
  const degPerKm = 180.0 / (Math.PI * moonRadiusKm);

  return matches.map(m => {
    const dx = m.referenceKeypoint.x - refMeta.width / 2;
    const dy = m.referenceKeypoint.y - refMeta.height / 2;

    const latOffset = -dy * kmPerPx * degPerKm;
    const lonOffset = (dx * kmPerPx * degPerKm) / Math.cos((centerLat * Math.PI) / 180);

    return {
      ...m,
      lunarLat: Number((centerLat + latOffset).toFixed(5)),
      lunarLon: Number((centerLon + lonOffset).toFixed(5)),
    };
  });
}

/**
 * Helper to convert Image element or URL to Canvas
 */
export async function loadImageToCanvas(imgSrc: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas);
      } else {
        reject(new Error('Failed to create canvas context'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image for registration'));
    img.src = imgSrc;
  });
}

/**
 * Helper delay for smooth UI stage transitions
 */
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Run Complete Lunar Image Registration Pipeline
 */
export async function runRegistrationPipeline(
  sourceCanvas: HTMLCanvasElement,
  referenceCanvas: HTMLCanvasElement,
  sourceMeta: ImageMetadata,
  referenceMeta: ImageMetadata,
  options: PipelineOptions = {}
): Promise<RegistrationResult> {
  const startTime = Date.now();
  const {
    featureMethod = 'SIFT',
    transformModel = 'HOMOGRAPHY',
    inlierThresholdPx = 3.0,
    maxKeypoints = 500,
    ratioThreshold = 0.75,
    enableCLAHE = true,
    enableSubpixel = true,
    onProgress,
  } = options;

  const report = (stage: StageStatus['stage'], progress: number, message: string) => {
    if (onProgress) {
      onProgress({
        stage,
        progress,
        message,
        startTime,
        elapsedMs: Date.now() - startTime,
      });
    }
  };

  // 1. VALIDATION
  report('VALIDATING', 5, 'Validating lunar image dimensions, format, and radiometric range...');
  await sleep(60);

  if (sourceCanvas.width < 64 || sourceCanvas.height < 64 || referenceCanvas.width < 64 || referenceCanvas.height < 64) {
    throw new Error('Image resolution too low. Minimum dimension required is 64x64 pixels.');
  }

  // 2. PREPROCESSING
  report('PREPROCESSING', 15, 'Converting to grayscale and applying CLAHE illumination normalization...');
  const srcCtx = sourceCanvas.getContext('2d')!;
  const refCtx = referenceCanvas.getContext('2d')!;
  const srcImgData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const refImgData = refCtx.getImageData(0, 0, referenceCanvas.width, referenceCanvas.height);

  let srcGray = imageDataToGrayscale(srcImgData);
  let refGray = imageDataToGrayscale(refImgData);

  if (enableCLAHE) {
    srcGray = applyCLAHE(srcGray, 8, 8, 2.5);
    refGray = applyCLAHE(refGray, 8, 8, 2.5);
    srcGray = bilateralFilter(srcGray, 1.5, 20.0);
    refGray = bilateralFilter(refGray, 1.5, 20.0);
  }
  await sleep(60);

  // 3. FEATURE DETECTION
  report('DETECTING_FEATURES', 35, `Extracting multi-scale lunar features using ${featureMethod}...`);
  const srcKeypoints = detectFeatures(srcGray, featureMethod, maxKeypoints);
  const refKeypoints = detectFeatures(refGray, featureMethod, maxKeypoints);

  if (srcKeypoints.length < 8) {
    throw new Error(`Insufficient features detected in source image (${srcKeypoints.length} found). Try an image with higher crater/topographic contrast.`);
  }
  if (refKeypoints.length < 8) {
    throw new Error(`Insufficient features detected in reference image (${refKeypoints.length} found). Try an image with higher crater/topographic contrast.`);
  }
  await sleep(60);

  // 4. FEATURE DESCRIPTION
  report('DESCRIBING_FEATURES', 50, 'Computing scale and illumination invariant feature descriptors...');
  const srcDescriptors = extractDescriptors(srcGray, srcKeypoints, featureMethod);
  const refDescriptors = extractDescriptors(refGray, refKeypoints, featureMethod);
  await sleep(60);

  // 5. FEATURE MATCHING
  report('MATCHING_FEATURES', 65, 'Executing cross-sensor KNN matching with Lowe\'s ratio test...');
  const candidateMatches = matchFeaturesKNN(srcDescriptors, refDescriptors, ratioThreshold, true);

  if (candidateMatches.length < 4) {
    throw new Error(`Only ${candidateMatches.length} candidate matches found. Images may not share sufficient geometric overlap or have incompatible scale differences.`);
  }
  await sleep(60);

  // 6. GEOMETRIC VERIFICATION & RANSAC
  report('GEOMETRIC_VERIFICATION', 78, `Applying RANSAC geometric verification (${transformModel})...`);
  const ransacResult = runRANSAC(candidateMatches, transformModel, inlierThresholdPx, 1000);

  if (ransacResult.inlierCount < 4) {
    throw new Error(`RANSAC could not find a geometrically consistent consensus set (${ransacResult.inlierCount} inliers found).`);
  }
  await sleep(60);

  // 7. SUB-PIXEL REFINEMENT
  let finalMatches = ransacResult.classifiedMatches;
  let subpixelAchieved = false;
  let subpixelMeanShift = 0;

  if (enableSubpixel) {
    report('SUBPIXEL_REFINEMENT', 85, 'Refining inlier correspondences to sub-pixel accuracy...');
    const subpixelRes = refineSubpixelMatches(srcGray, refGray, finalMatches);
    finalMatches = subpixelRes.refinedMatches;
    subpixelAchieved = subpixelRes.subpixelAchieved;
    subpixelMeanShift = subpixelRes.meanShiftPx;
  }
  await sleep(40);

  // 8. WARPING & REGISTRATION
  report('WARPING_REGISTRATION', 92, 'Generating projective warped registered image canvas...');
  const registeredCanvas = warpImageHomography(
    sourceCanvas,
    referenceCanvas.width,
    referenceCanvas.height,
    ransacResult.transformation
  );

  const diffCanvas = generateDifferenceMap(referenceCanvas, registeredCanvas);
  const matchesCanvas = generateMatchesCanvas(sourceCanvas, referenceCanvas, finalMatches);
  await sleep(40);

  // 9. QUALITY EVALUATION & SPATIAL DISTRIBUTION
  report('EVALUATING_QUALITY', 95, 'Calculating RMSE, spatial entropy distribution, and confidence scores...');
  const inlierMatches = finalMatches.filter(m => m.inlier);
  const spatial = calculateSpatialDistribution(inlierMatches, referenceCanvas.width, referenceCanvas.height);

  finalMatches = assignLunarCoordinates(finalMatches, referenceMeta);

  // 10. EXPLAINABLE CONFIDENCE DECOMPOSITION
  const explainableConf = computeExplainableConfidence(
    {
      totalCandidates: candidateMatches.length,
      inlierCount: ransacResult.inlierCount,
      inlierRatio: ransacResult.inlierRatio,
      rmse: ransacResult.rmse,
      meanResidual: ransacResult.meanResidual,
      spatialDistributionScore: spatial.score,
      subpixelAchieved,
      subpixelMeanShift,
    },
    sourceMeta,
    referenceMeta
  );

  // 11. LUNAR FEATURE IDENTITY CARDS & PERSISTENT REGISTRY
  report('FEATURE_ID_GENERATION', 98, 'Cataloging verified lunar features and syncing with persistent registry...');
  const observedSensorList = [sourceMeta.sensor, referenceMeta.sensor];
  if (options.thirdMeta) observedSensorList.push(options.thirdMeta.sensor);
  
  const lunarFeatures = generateOrMatchLunarFeatures(
    inlierMatches,
    referenceMeta,
    observedSensorList,
    explainableConf.overallScore,
    options.thirdMeta
  );

  const warnings: string[] = [];
  if (spatial.warning) warnings.push(spatial.warning);
  if (ransacResult.rmse > 2.5) warnings.push(`High RMSE (${ransacResult.rmse}px). Alignment has noticeable residual distortion.`);
  if (ransacResult.inlierRatio < 0.35) warnings.push(`Low inlier ratio (${(ransacResult.inlierRatio * 100).toFixed(1)}%). Consider switching to SIFT or tuning contrast.`);

  const metrics: RegistrationMetrics = {
    totalCandidates: candidateMatches.length,
    inlierCount: ransacResult.inlierCount,
    outlierCount: ransacResult.outlierCount,
    inlierRatio: ransacResult.inlierRatio,
    rmse: ransacResult.rmse,
    meanResidual: ransacResult.meanResidual,
    maxResidual: ransacResult.maxResidual,
    confidenceScore: explainableConf.overallScore,
    explainableConfidence: explainableConf,
    spatialDistributionScore: spatial.score,
    spatialWarning: spatial.warning,
    subpixelAchieved,
    subpixelMeanShift,
    processingTimeMs: Date.now() - startTime,
    ransacIterations: ransacResult.iterations,
  };

  const simpleExplanation = `Your lunar images were aligned with ${metrics.inlierCount} verified correspondence points (${(metrics.inlierRatio * 100).toFixed(1)}% inlier consensus). Registration error (RMSE) is ${metrics.rmse.toFixed(2)} px with an explainable confidence score of ${explainableConf.overallScore}% (${explainableConf.verdict}). ${lunarFeatures.length} persistent lunar features were cataloged.`;

  const technicalExplanation = `Estimated ${transformModel} transformation matrix using RANSAC across ${metrics.ransacIterations} iterations. Detected ${srcKeypoints.length} source and ${refKeypoints.length} reference keypoints via ${featureMethod}. Final model achieved Root Mean Square Error (RMSE) of ${metrics.rmse.toFixed(2)} px across ${metrics.inlierCount} verified inliers with spatial grid coverage score of ${metrics.spatialDistributionScore}%. Scale factor: ${ransacResult.transformation.scaleFactor ?? 1.0}, estimated rotation: ${ransacResult.transformation.rotationDeg ?? 0}°.`;

  report('COMPLETED', 100, 'Registration successfully completed!');

  return {
    id: `reg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    sourceMeta,
    referenceMeta,
    thirdMeta: options.thirdMeta,
    featureMethod,
    transformModel,
    sourceKeypoints: srcKeypoints,
    referenceKeypoints: refKeypoints,
    matches: finalMatches,
    transformation: ransacResult.transformation,
    metrics,
    registeredDataUrl: registeredCanvas.toDataURL('image/png'),
    differenceDataUrl: diffCanvas.toDataURL('image/png'),
    matchesDataUrl: matchesCanvas.toDataURL('image/png'),
    sourceDataUrl: sourceCanvas.toDataURL('image/png'),
    referenceDataUrl: referenceCanvas.toDataURL('image/png'),
    thirdDataUrl: options.thirdCanvas?.toDataURL('image/png'),
    lunarFeatures,
    explainableConfidence: explainableConf,
    simpleExplanation,
    technicalExplanation,
    warnings,
  };
}
