import {
  ImageMetadata,
  PairwiseMatchResult,
  TriSensorValidationResult,
  MatchPoint,
  FeatureMethod,
  TransformModelType,
} from '../types';
import { imageDataToGrayscale, applyCLAHE } from './imageProcessing';
import { detectFeatures } from './featureDetection';
import { extractDescriptors } from './featureDescription';
import { matchFeaturesKNN } from './matching';
import { runRANSAC } from './ransac';
import { calculateSpatialDistribution } from './pipeline';

/**
 * Perform pairwise feature matching and geometric consistency analysis
 * between two sensor images to determine radiometric and geomorphic compatibility.
 */
export async function evaluatePairwiseCompatibility(
  canvasA: HTMLCanvasElement,
  canvasB: HTMLCanvasElement,
  metaA: ImageMetadata,
  metaB: ImageMetadata,
  featureMethod: FeatureMethod = 'SIFT',
  inlierThresholdPx: number = 3.5
): Promise<PairwiseMatchResult> {
  const ctxA = canvasA.getContext('2d')!;
  const ctxB = canvasB.getContext('2d')!;

  const imgDataA = ctxA.getImageData(0, 0, canvasA.width, canvasA.height);
  const imgDataB = ctxB.getImageData(0, 0, canvasB.width, canvasB.height);

  let grayA = imageDataToGrayscale(imgDataA);
  let grayB = imageDataToGrayscale(imgDataB);

  // Normalize illumination across distinct spectral bands
  grayA = applyCLAHE(grayA, 6, 6, 2.5);
  grayB = applyCLAHE(grayB, 6, 6, 2.5);

  const keypointsA = detectFeatures(grayA, featureMethod, 350);
  const keypointsB = detectFeatures(grayB, featureMethod, 350);

  if (keypointsA.length < 5 || keypointsB.length < 5) {
    return {
      sensorA: metaA.sensor,
      sensorB: metaB.sensor,
      imageAName: metaA.name,
      imageBName: metaB.name,
      candidateCount: 0,
      inlierCount: 0,
      inlierRatio: 0,
      rmse: 99.9,
      spatialCoverage: 0,
      compatibilityScore: 5,
      isCompatible: false,
      reason: `Insufficient keypoints detected (${metaA.sensor}: ${keypointsA.length}, ${metaB.sensor}: ${keypointsB.length}).`,
      matches: [],
    };
  }

  const descA = extractDescriptors(grayA, keypointsA, featureMethod);
  const descB = extractDescriptors(grayB, keypointsB, featureMethod);

  // KNN matching with Lowe's ratio test
  const candidateMatches = matchFeaturesKNN(descA, descB, 0.78, true);

  if (candidateMatches.length < 4) {
    return {
      sensorA: metaA.sensor,
      sensorB: metaB.sensor,
      imageAName: metaA.name,
      imageBName: metaB.name,
      candidateCount: candidateMatches.length,
      inlierCount: 0,
      inlierRatio: 0,
      rmse: 99.9,
      spatialCoverage: 0,
      compatibilityScore: Math.min(25, candidateMatches.length * 5),
      isCompatible: false,
      reason: `No mutual crater landmark patterns found (${candidateMatches.length} candidate pairs). Distinct lunar scenes or incompatible terrain.`,
      matches: [],
    };
  }

  // RANSAC homography consensus
  const ransac = runRANSAC(candidateMatches, 'HOMOGRAPHY', inlierThresholdPx, 600);
  const inlierMatches = ransac.classifiedMatches.filter(m => m.inlier);
  const spatial = calculateSpatialDistribution(inlierMatches, canvasB.width, canvasB.height);

  // Geographic coordinate check if available
  let geoPenalty = 0;
  if (metaA.geoCenterLat !== undefined && metaB.geoCenterLat !== undefined) {
    const dLat = Math.abs(metaA.geoCenterLat - metaB.geoCenterLat);
    const dLon = Math.abs((metaA.geoCenterLon ?? 0) - (metaB.geoCenterLon ?? 0));
    const angularDist = Math.sqrt(dLat * dLat + dLon * dLon);
    if (angularDist > 2.0) {
      geoPenalty = Math.min(40, Math.round(angularDist * 10));
    }
  }

  // Calculate composite compatibility score (0 - 100)
  // Factors: inlier ratio (40%), inlier count (25%), RMSE precision (20%), spatial spread (15%)
  const inlierRatioScore = Math.min(100, (ransac.inlierRatio / 0.55) * 100);
  const countScore = Math.min(100, (ransac.inlierCount / 20) * 100);
  const rmseScore = Math.max(0, 100 - (ransac.rmse / 3.0) * 100);
  const spatialScore = spatial.score;

  let rawScore = (
    inlierRatioScore * 0.40 +
    countScore * 0.25 +
    rmseScore * 0.20 +
    spatialScore * 0.15
  );

  rawScore = Math.max(0, rawScore - geoPenalty);
  const compatibilityScore = Math.round(Math.min(99, Math.max(5, rawScore)));
  const isCompatible = compatibilityScore >= 52 && ransac.inlierCount >= 6 && ransac.inlierRatio >= 0.30;

  let reason = '';
  if (isCompatible) {
    reason = `Verified strong correspondence with ${ransac.inlierCount} geometric inliers (${(ransac.inlierRatio * 100).toFixed(0)}% ratio, RMSE: ${ransac.rmse.toFixed(2)}px).`;
  } else {
    if (ransac.inlierCount < 5) {
      reason = `Incongruent lunar surface: only ${ransac.inlierCount} geometric inliers found under RANSAC verification.`;
    } else if (ransac.inlierRatio < 0.25) {
      reason = `Low inlier consensus ratio (${(ransac.inlierRatio * 100).toFixed(1)}%). Too many contradictory feature points.`;
    } else if (ransac.rmse > 3.0) {
      reason = `High residual projection error (${ransac.rmse.toFixed(2)}px), indicating divergent surface topography.`;
    } else {
      reason = `Incompatible visual overlap score (${compatibilityScore}%).`;
    }
  }

  return {
    sensorA: metaA.sensor,
    sensorB: metaB.sensor,
    imageAName: metaA.name,
    imageBName: metaB.name,
    candidateCount: candidateMatches.length,
    inlierCount: ransac.inlierCount,
    inlierRatio: ransac.inlierRatio,
    rmse: ransac.rmse,
    spatialCoverage: spatial.score,
    compatibilityScore,
    isCompatible,
    reason,
    matches: ransac.classifiedMatches,
  };
}

/**
 * Intelligent Tri-Sensor Scene Triangulation & Outlier Identification
 * Evaluates OHRC ↔ TMC, OHRC ↔ IIRS, TMC ↔ IIRS pairwise to isolate any outlier sensor.
 */
export async function validateTriSensorScene(
  ohrcCanvas: HTMLCanvasElement,
  tmcCanvas: HTMLCanvasElement,
  iirsCanvas: HTMLCanvasElement,
  ohrcMeta: ImageMetadata,
  tmcMeta: ImageMetadata,
  iirsMeta: ImageMetadata,
  featureMethod: FeatureMethod = 'SIFT'
): Promise<TriSensorValidationResult> {
  // 1. Compute Pairwise Scores
  const pair_ohrc_tmc = await evaluatePairwiseCompatibility(
    ohrcCanvas,
    tmcCanvas,
    ohrcMeta,
    tmcMeta,
    featureMethod
  );

  const pair_ohrc_iirs = await evaluatePairwiseCompatibility(
    ohrcCanvas,
    iirsCanvas,
    ohrcMeta,
    iirsMeta,
    featureMethod
  );

  const pair_tmc_iirs = await evaluatePairwiseCompatibility(
    tmcCanvas,
    iirsCanvas,
    tmcMeta,
    iirsMeta,
    featureMethod
  );

  const sOT = pair_ohrc_tmc.compatibilityScore;
  const sOI = pair_ohrc_iirs.compatibilityScore;
  const sTI = pair_tmc_iirs.compatibilityScore;

  const pairwise = {
    ohrc_tmc: pair_ohrc_tmc,
    ohrc_iirs: pair_ohrc_iirs,
    tmc_iirs: pair_tmc_iirs,
  };

  const COMPAT_THRESHOLD = 50;

  // Case A: All 3 images match mutually (e.g. OHRC-TMC 94%, OHRC-IIRS 88%, TMC-IIRS 91%)
  if (sOT >= COMPAT_THRESHOLD && sOI >= COMPAT_THRESHOLD && sTI >= COMPAT_THRESHOLD) {
    return {
      status: 'ALL_VALID',
      validSensors: ['OHRC', 'TMC', 'IIRS'],
      pairwise,
      diagnosticMessage: 'All three sensor images (OHRC, TMC, IIRS) demonstrate strong mutual lunar correspondence. Scene verified for full tri-band co-registration.',
      detailedReason: `Pairwise compatibility scores: OHRC ↔ TMC: ${sOT}%, OHRC ↔ IIRS: ${sOI}%, TMC ↔ IIRS: ${sTI}%. High geometric consensus and spatial alignment confirmed across all three instruments.`,
      canProceedWithPair: true,
      suggestedAction: 'Proceed with complete 3-sensor multi-spectral co-registration.',
    };
  }

  // Case B: IIRS is the outlier (OHRC ↔ TMC matches, but both fail with IIRS)
  if (sOT >= COMPAT_THRESHOLD && sOI < COMPAT_THRESHOLD && sTI < COMPAT_THRESHOLD) {
    return {
      status: 'OUTLIER_DETECTED',
      outlierSensor: 'IIRS',
      outlierName: iirsMeta.name,
      outlierSlot: 'IIRS',
      validSensors: ['OHRC', 'TMC'],
      pairwise,
      diagnosticMessage: 'IIRS image is inconsistent with the other two images. Registration blocked.',
      detailedReason: `OHRC and TMC demonstrate strong mutual correspondence (${sOT}%, ${pair_ohrc_tmc.inlierCount} inliers), whereas IIRS failed cross-matching with both OHRC (${sOI}%, ${pair_ohrc_iirs.inlierCount} inliers) and TMC (${sTI}%, ${pair_tmc_iirs.inlierCount} inliers). The IIRS image appears to depict a different lunar coordinate or unaligned scene.`,
      canProceedWithPair: true,
      suggestedAction: 'You can either replace the IIRS image with the correct region or proceed with verified 2-sensor registration (OHRC ↔ TMC).',
    };
  }

  // Case C: OHRC is the outlier (TMC ↔ IIRS matches, but both fail with OHRC)
  if (sTI >= COMPAT_THRESHOLD && sOT < COMPAT_THRESHOLD && sOI < COMPAT_THRESHOLD) {
    return {
      status: 'OUTLIER_DETECTED',
      outlierSensor: 'OHRC',
      outlierName: ohrcMeta.name,
      outlierSlot: 'OHRC',
      validSensors: ['TMC', 'IIRS'],
      pairwise,
      diagnosticMessage: 'OHRC image is inconsistent with the other two images. Registration blocked.',
      detailedReason: `TMC and IIRS demonstrate verified mutual correspondence (${sTI}%, ${pair_tmc_iirs.inlierCount} inliers), whereas the uploaded OHRC image failed correspondence matching with both TMC (${sOT}%, ${pair_ohrc_tmc.inlierCount} inliers) and IIRS (${sOI}%, ${pair_ohrc_iirs.inlierCount} inliers). The OHRC image contains terrain from a different lunar longitude/latitude.`,
      canProceedWithPair: true,
      suggestedAction: 'You can replace the OHRC image with the congruent region or proceed registering TMC ↔ IIRS.',
    };
  }

  // Case D: TMC is the outlier (OHRC ↔ IIRS matches, but both fail with TMC)
  if (sOI >= COMPAT_THRESHOLD && sOT < COMPAT_THRESHOLD && sTI < COMPAT_THRESHOLD) {
    return {
      status: 'OUTLIER_DETECTED',
      outlierSensor: 'TMC',
      outlierName: tmcMeta.name,
      outlierSlot: 'TMC',
      validSensors: ['OHRC', 'IIRS'],
      pairwise,
      diagnosticMessage: 'TMC image is inconsistent with the other two images. Registration blocked.',
      detailedReason: `OHRC and IIRS demonstrate verified mutual correspondence (${sOI}%, ${pair_ohrc_iirs.inlierCount} inliers), while TMC failed correspondence with both OHRC (${sOT}%, ${pair_ohrc_tmc.inlierCount} inliers) and IIRS (${sTI}%, ${pair_tmc_iirs.inlierCount} inliers). The TMC slot holds an incongruent lunar frame.`,
      canProceedWithPair: true,
      suggestedAction: 'You can replace the TMC image or proceed with registering OHRC ↔ IIRS.',
    };
  }

  // Case E: Low or erratic scores across multiple pairs
  return {
    status: 'MULTIPLE_OUTLIERS',
    validSensors: [],
    pairwise,
    diagnosticMessage: 'Multiple sensor images are mutually inconsistent. Registration blocked.',
    detailedReason: `No consensus pair achieved sufficient compatibility (OHRC ↔ TMC: ${sOT}%, OHRC ↔ IIRS: ${sOI}%, TMC ↔ IIRS: ${sTI}%). At least two or all three images represent divergent lunar regions, different celestial bodies, or severe radiometric degradation.`,
    canProceedWithPair: false,
    suggestedAction: 'Please verify that all three images represent the same lunar target crater/region and re-upload.',
  };
}
