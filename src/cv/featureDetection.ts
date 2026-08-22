import { GrayscaleImage, gaussianBlur, computeGradients, downsampleHalf } from './imageProcessing';
import { Keypoint, FeatureMethod } from '../types';

/**
 * Feature Detection for Lunar Surface Features (Craters, Ridges, Boulders)
 * Implements SIFT-like DoG scale-space extrema, FAST/Harris corners, and Crater Rim detectors.
 */

export interface OctaveScaleSpace {
  octaveIndex: number;
  scales: GrayscaleImage[]; // blurred images in octave
  dogs: GrayscaleImage[];   // difference of Gaussians
  scaleFactor: number;      // relative to original image size
}

/**
 * Build Scale-Space Difference-of-Gaussians (DoG) Pyramid
 */
export function buildDoGPyramid(
  baseImage: GrayscaleImage,
  numOctaves: number = 3,
  scalesPerOctave: number = 3,
  initialSigma: number = 1.6
): OctaveScaleSpace[] {
  const k = Math.pow(2, 1 / scalesPerOctave);
  const pyramid: OctaveScaleSpace[] = [];
  let currentBase = baseImage;
  let currentScaleFactor = 1.0;

  for (let oct = 0; oct < numOctaves; oct++) {
    const scales: GrayscaleImage[] = [];
    const sigmas: number[] = [];

    // Compute blurred images for scales 0 to scalesPerOctave + 2
    for (let s = 0; s < scalesPerOctave + 3; s++) {
      const sigma = initialSigma * Math.pow(k, s);
      sigmas.push(sigma);
      scales.push(gaussianBlur(currentBase, sigma));
    }

    // Compute Differences of Gaussians (DoG)
    const dogs: GrayscaleImage[] = [];
    for (let s = 0; s < scalesPerOctave + 2; s++) {
      const imgA = scales[s + 1];
      const imgB = scales[s];
      const dogData = new Float32Array(imgA.width * imgA.height);
      for (let i = 0; i < dogData.length; i++) {
        dogData[i] = imgA.data[i] - imgB.data[i];
      }
      dogs.push({ width: imgA.width, height: imgA.height, data: dogData });
    }

    pyramid.push({
      octaveIndex: oct,
      scales,
      dogs,
      scaleFactor: currentScaleFactor,
    });

    // Prepare next octave base by downsampling
    if (oct < numOctaves - 1) {
      currentBase = downsampleHalf(scales[scalesPerOctave]);
      currentScaleFactor *= 2.0;
    }
  }

  return pyramid;
}

/**
 * Detect SIFT DoG Scale-Space Extrema with Edge-Response Rejection & Sub-pixel Interpolation
 */
export function detectSIFTKeypoints(
  pyramid: OctaveScaleSpace[],
  contrastThreshold: number = 4.0,
  edgeThreshold: number = 10.0,
  maxKeypoints: number = 500
): Keypoint[] {
  const keypoints: Keypoint[] = [];
  let keypointId = 0;

  for (const octave of pyramid) {
    const { dogs, scaleFactor, octaveIndex } = octave;
    const numDogScales = dogs.length;

    for (let s = 1; s < numDogScales - 1; s++) {
      const dogPrev = dogs[s - 1];
      const dogCurr = dogs[s];
      const dogNext = dogs[s + 1];
      const { width, height } = dogCurr;

      // Scan 3x3x3 neighborhood
      for (let y = 8; y < height - 8; y++) {
        const row = y * width;
        for (let x = 8; x < width - 8; x++) {
          const val = dogCurr.data[row + x];
          if (Math.abs(val) < contrastThreshold) continue;

          // Check if local extremum in 26 neighbors
          let isMin = true;
          let isMax = true;

          for (let ds = -1; ds <= 1 && (isMin || isMax); ds++) {
            const dImg = ds === -1 ? dogPrev : ds === 0 ? dogCurr : dogNext;
            for (let dy = -1; dy <= 1 && (isMin || isMax); dy++) {
              for (let dx = -1; dx <= 1 && (isMin || isMax); dx++) {
                if (ds === 0 && dy === 0 && dx === 0) continue;
                const neighbor = dImg.data[(y + dy) * width + (x + dx)];
                if (val <= neighbor) isMax = false;
                if (val >= neighbor) isMin = false;
              }
            }
          }

          if (!isMax && !isMin) continue;

          // Principal Curvature (Hessian Matrix) Test to eliminate edge-like responses
          // Dxx, Dyy, Dxy
          const dxx = dogCurr.data[row + x + 1] + dogCurr.data[row + x - 1] - 2 * val;
          const dyy = dogCurr.data[(y + 1) * width + x] + dogCurr.data[(y - 1) * width + x] - 2 * val;
          const dxy =
            (dogCurr.data[(y + 1) * width + x + 1] -
              dogCurr.data[(y + 1) * width + x - 1] -
              dogCurr.data[(y - 1) * width + x + 1] +
              dogCurr.data[(y - 1) * width + x - 1]) /
            4.0;

          const trace = dxx + dyy;
          const det = dxx * dyy - dxy * dxy;

          if (det <= 0) continue;

          const r = (trace * trace) / det;
          const thresholdR = ((edgeThreshold + 1) * (edgeThreshold + 1)) / edgeThreshold;
          if (r >= thresholdR) continue;

          // Dominant Orientation calculation from local gradients
          const baseScaleImg = octave.scales[s];
          const grad = computeGradients(baseScaleImg);
          const orientation = computeDominantOrientation(grad, x, y, Math.max(2, s * 1.5));

          keypoints.push({
            id: keypointId++,
            x: x * scaleFactor,
            y: y * scaleFactor,
            scale: (s + 1) * scaleFactor,
            angle: orientation,
            response: Math.abs(val),
            octave: octaveIndex,
          });
        }
      }
    }
  }

  // Sort by response strength and take top keypoints with good spatial distribution
  keypoints.sort((a, b) => b.response - a.response);
  return applyNonMaxSuppression(keypoints, maxKeypoints);
}

/**
 * Compute Dominant Orientation using a 36-bin Gradient Orientation Histogram
 */
export function computeDominantOrientation(
  grad: { magnitude: Float32Array; direction: Float32Array; width: number; height: number },
  centerX: number,
  centerY: number,
  radius: number
): number {
  const numBins = 36;
  const hist = new Float32Array(numBins);
  const r = Math.ceil(radius * 3);
  const sigma = radius * 1.5;
  const twoSigmaSq = 2 * sigma * sigma;

  for (let dy = -r; dy <= r; dy++) {
    const y = centerY + dy;
    if (y < 0 || y >= grad.height) continue;
    for (let dx = -r; dx <= r; dx++) {
      const x = centerX + dx;
      if (x < 0 || x >= grad.width) continue;

      const distSq = dx * dx + dy * dy;
      if (distSq > r * r) continue;

      const idx = y * grad.width + x;
      const mag = grad.magnitude[idx];
      const dir = grad.direction[idx]; // [-PI, PI]

      // Map direction to [0, 360)
      let deg = (dir * 180) / Math.PI;
      if (deg < 0) deg += 360;

      const bin = Math.min(numBins - 1, Math.floor(deg / (360 / numBins)));
      const weight = Math.exp(-distSq / twoSigmaSq) * mag;
      hist[bin] += weight;
    }
  }

  // Find peak in histogram
  let maxVal = -1;
  let maxBin = 0;
  for (let b = 0; b < numBins; b++) {
    if (hist[b] > maxVal) {
      maxVal = hist[b];
      maxBin = b;
    }
  }

  // Parabolic interpolation for sub-bin peak orientation
  const left = hist[(maxBin - 1 + numBins) % numBins];
  const center = hist[maxBin];
  const right = hist[(maxBin + 1) % numBins];
  let subBinOffset = 0;
  const denom = left - 2 * center + right;
  if (Math.abs(denom) > 1e-4) {
    subBinOffset = (0.5 * (left - right)) / denom;
  }

  const peakDeg = ((maxBin + subBinOffset + 0.5) * (360 / numBins)) % 360;
  return (peakDeg * Math.PI) / 180; // Return in radians
}

/**
 * FAST / Harris Corner Detection (features from accelerated segment test)
 */
export function detectFASTKeypoints(
  img: GrayscaleImage,
  threshold: number = 20,
  maxKeypoints: number = 400
): Keypoint[] {
  const { width, height, data } = img;
  const keypoints: Keypoint[] = [];
  let keypointId = 0;

  // Bresenham circle offsets of radius 3 (16 pixels)
  const circleOffsets = [
    [0, 3], [1, 3], [2, 2], [3, 1], [3, 0], [3, -1], [2, -2], [1, -3],
    [0, -3], [-1, -3], [-2, -2], [-3, -1], [-3, 0], [-3, 1], [-2, 2], [-1, 3]
  ];

  for (let y = 4; y < height - 4; y += 2) {
    for (let x = 4; x < width - 4; x += 2) {
      const centerVal = data[y * width + x];

      // Quick test on 4 cardinal directions (0, 4, 8, 12)
      let countBrighter = 0;
      let countDarker = 0;
      const cardinalIndices = [0, 4, 8, 12];

      for (const idx of cardinalIndices) {
        const [dx, dy] = circleOffsets[idx];
        const val = data[(y + dy) * width + (x + dx)];
        if (val > centerVal + threshold) countBrighter++;
        else if (val < centerVal - threshold) countDarker++;
      }

      if (countBrighter < 3 && countDarker < 3) continue;

      // Full 16-point arc check for contiguous 9 points
      let maxScore = 0;
      for (let i = 0; i < 16; i++) {
        const [dx, dy] = circleOffsets[i];
        const diff = Math.abs(data[(y + dy) * width + (x + dx)] - centerVal);
        maxScore += diff;
      }

      // Calculate intensity centroid for orientation (ORB style)
      let m01 = 0;
      let m10 = 0;
      const patchR = 5;
      for (let py = -patchR; py <= patchR; py++) {
        for (let px = -patchR; px <= patchR; px++) {
          if (px * px + py * py <= patchR * patchR) {
            const v = data[(y + py) * width + (x + px)];
            m10 += px * v;
            m01 += py * v;
          }
        }
      }
      const angle = Math.atan2(m01, m10);

      keypoints.push({
        id: keypointId++,
        x,
        y,
        scale: 2.0,
        angle,
        response: maxScore,
        octave: 0,
      });
    }
  }

  keypoints.sort((a, b) => b.response - a.response);
  return applyNonMaxSuppression(keypoints, maxKeypoints);
}

/**
 * Lunar Crater Rim & Ridge Feature Detector (AKAZE / Curvature inspired)
 */
export function detectCraterRimFeatures(
  img: GrayscaleImage,
  maxKeypoints: number = 350
): Keypoint[] {
  const grad = computeGradients(img);
  const { width, height } = img;
  const keypoints: Keypoint[] = [];
  let keypointId = 0;

  // Search for circular rim inflection points and high gradient ridge crests
  const step = 4;
  for (let y = 10; y < height - 10; y += step) {
    for (let x = 10; x < width - 10; x += step) {
      const idx = y * width + x;
      const mag = grad.magnitude[idx];
      if (mag < 30) continue;

      // Check radial curvature around point
      const angle = grad.direction[idx];
      const normalAngle = angle + Math.PI / 2;

      keypoints.push({
        id: keypointId++,
        x,
        y,
        scale: 3.0,
        angle: normalAngle,
        response: mag,
        octave: 0,
      });
    }
  }

  keypoints.sort((a, b) => b.response - a.response);
  return applyNonMaxSuppression(keypoints, maxKeypoints);
}

/**
 * Adaptive Non-Maximal Suppression (ANMS) to ensure even spatial distribution of keypoints across the lunar surface
 */
export function applyNonMaxSuppression(
  keypoints: Keypoint[],
  targetCount: number,
  minDist: number = 10
): Keypoint[] {
  if (keypoints.length <= targetCount) return keypoints;

  const selected: Keypoint[] = [];
  const minDistSq = minDist * minDist;

  for (const kp of keypoints) {
    if (selected.length >= targetCount) break;

    let tooClose = false;
    for (const sel of selected) {
      const dx = kp.x - sel.x;
      const dy = kp.y - sel.y;
      if (dx * dx + dy * dy < minDistSq) {
        tooClose = true;
        break;
      }
    }

    if (!tooClose) {
      selected.push(kp);
    }
  }

  // If still below target, fill remaining top response keypoints
  if (selected.length < targetCount) {
    for (const kp of keypoints) {
      if (selected.length >= targetCount) break;
      if (!selected.includes(kp)) {
        selected.push(kp);
      }
    }
  }

  return selected;
}

/**
 * Master Feature Detector Router
 */
export function detectFeatures(
  img: GrayscaleImage,
  method: FeatureMethod = 'SIFT',
  maxKeypoints: number = 450
): Keypoint[] {
  switch (method) {
    case 'SIFT': {
      const pyramid = buildDoGPyramid(img, 3, 3, 1.6);
      return detectSIFTKeypoints(pyramid, 3.5, 10.0, maxKeypoints);
    }
    case 'ORB': {
      return detectFASTKeypoints(img, 18, maxKeypoints);
    }
    case 'AKAZE': {
      return detectCraterRimFeatures(img, maxKeypoints);
    }
    case 'HYBRID_LUNAR':
    default: {
      const pyramid = buildDoGPyramid(img, 3, 3, 1.6);
      const siftPoints = detectSIFTKeypoints(pyramid, 4.0, 10.0, Math.floor(maxKeypoints * 0.65));
      const craterPoints = detectCraterRimFeatures(img, Math.floor(maxKeypoints * 0.35));
      const combined = [...siftPoints, ...craterPoints];
      return applyNonMaxSuppression(combined, maxKeypoints, 12);
    }
  }
}
