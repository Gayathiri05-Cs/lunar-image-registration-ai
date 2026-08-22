import { GrayscaleImage, computeGradients } from './imageProcessing';
import { Keypoint, FeatureDescriptor, FeatureMethod } from '../types';

/**
 * Feature Descriptors for Lunar Correspondence
 * Implements SIFT 128-D scale/rotation/illumination invariant descriptors and ORB 256-bit binary descriptors.
 */

/**
 * Compute SIFT-style 128-dimensional Descriptor (4x4 spatial subregions x 8 orientation bins)
 */
export function computeSIFTDescriptor(
  img: GrayscaleImage,
  keypoint: Keypoint,
  gradMap?: { magnitude: Float32Array; direction: Float32Array; width: number; height: number }
): Float32Array {
  const grad = gradMap || computeGradients(img);
  const descriptor = new Float32Array(128); // 4 * 4 * 8

  const cosT = Math.cos(keypoint.angle);
  const sinT = Math.sin(keypoint.angle);

  // Subregion grid parameters
  const numSpatialSubregions = 4;
  const numOrientationBins = 8;
  const subregionWidth = Math.max(3, keypoint.scale * 3);
  const halfWindow = (numSpatialSubregions * subregionWidth) / 2;
  const sigma = halfWindow / 2;
  const twoSigmaSq = 2 * sigma * sigma;

  const kpX = keypoint.x;
  const kpY = keypoint.y;

  // Sample grid around keypoint rotated by -keypoint.angle
  for (let dy = -halfWindow; dy < halfWindow; dy += 1) {
    for (let dx = -halfWindow; dx < halfWindow; dx += 1) {
      // Transform local coordinate to image space
      const rotX = dx * cosT - dy * sinT;
      const rotY = dx * sinT + dy * cosT;
      const imgX = Math.round(kpX + rotX);
      const imgY = Math.round(kpY + rotY);

      if (imgX < 1 || imgX >= img.width - 1 || imgY < 1 || imgY >= img.height - 1) continue;

      const idx = imgY * img.width + imgX;
      const mag = grad.magnitude[idx];
      const dir = grad.direction[idx]; // [-PI, PI]

      // Orientation relative to keypoint dominant angle
      let relDir = dir - keypoint.angle;
      while (relDir < 0) relDir += 2 * Math.PI;
      while (relDir >= 2 * Math.PI) relDir -= 2 * Math.PI;

      // Fractional spatial subregion indices [0, 4)
      const subX = (dx + halfWindow) / subregionWidth - 0.5;
      const subY = (dy + halfWindow) / subregionWidth - 0.5;

      // Fractional orientation bin [0, 8)
      const binFrac = (relDir / (2 * Math.PI)) * numOrientationBins;

      // Gaussian weighting by distance to keypoint center
      const distSq = dx * dx + dy * dy;
      const weight = Math.exp(-distSq / twoSigmaSq) * mag;

      // Trilinear interpolation into 8 neighboring subregion/bin cells
      const x0 = Math.floor(subX);
      const y0 = Math.floor(subY);
      const b0 = Math.floor(binFrac);

      const uX = subX - x0;
      const uY = subY - y0;
      const uB = binFrac - b0;

      for (let sx = 0; sx <= 1; sx++) {
        const binX = x0 + sx;
        if (binX < 0 || binX >= numSpatialSubregions) continue;
        const wX = sx === 0 ? 1 - uX : uX;

        for (let sy = 0; sy <= 1; sy++) {
          const binY = y0 + sy;
          if (binY < 0 || binY >= numSpatialSubregions) continue;
          const wY = sy === 0 ? 1 - uY : uY;

          for (let sb = 0; sb <= 1; sb++) {
            const binB = (b0 + sb + numOrientationBins) % numOrientationBins;
            const wB = sb === 0 ? 1 - uB : uB;

            const descIdx = (binY * numSpatialSubregions + binX) * numOrientationBins + binB;
            descriptor[descIdx] += weight * wX * wY * wB;
          }
        }
      }
    }
  }

  // 1. Normalize descriptor to unit length (L2 norm)
  let norm = 0;
  for (let i = 0; i < 128; i++) {
    norm += descriptor[i] * descriptor[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 1e-6) {
    for (let i = 0; i < 128; i++) descriptor[i] /= norm;
  }

  // 2. Threshold values to 0.2 to suppress non-linear illumination surges (shadow edges)
  let renorm = 0;
  for (let i = 0; i < 128; i++) {
    if (descriptor[i] > 0.2) descriptor[i] = 0.2;
    renorm += descriptor[i] * descriptor[i];
  }

  // 3. Re-normalize to unit length
  renorm = Math.sqrt(renorm);
  if (renorm > 1e-6) {
    for (let i = 0; i < 128; i++) descriptor[i] /= renorm;
  }

  return descriptor;
}

/**
 * Compute 256-bit Binary ORB Descriptor
 */
export function computeORBDescriptor(
  img: GrayscaleImage,
  keypoint: Keypoint
): Uint8Array {
  const descriptor = new Uint8Array(32); // 32 bytes = 256 bits
  const cosT = Math.cos(keypoint.angle);
  const sinT = Math.sin(keypoint.angle);
  const { width, height, data } = img;

  // Precomputed pseudo-random test pattern pairs
  // Seeded coordinate pairs in [-15, 15]
  let bitIndex = 0;
  for (let i = 0; i < 256; i++) {
    // Generate deterministic test pattern
    const angleA = (i * 137.5 * Math.PI) / 180;
    const rA = ((i * 7) % 14) + 2;
    const ax = Math.round(rA * Math.cos(angleA));
    const ay = Math.round(rA * Math.sin(angleA));

    const angleB = (i * 222.5 * Math.PI) / 180;
    const rB = ((i * 11) % 14) + 2;
    const bx = Math.round(rB * Math.cos(angleB));
    const by = Math.round(rB * Math.sin(angleB));

    // Rotate points
    const p1x = Math.round(keypoint.x + ax * cosT - ay * sinT);
    const p1y = Math.round(keypoint.y + ax * sinT + ay * cosT);
    const p2x = Math.round(keypoint.x + bx * cosT - by * sinT);
    const p2y = Math.round(keypoint.y + bx * sinT + by * cosT);

    let v1 = 0;
    let v2 = 0;
    if (p1x >= 0 && p1x < width && p1y >= 0 && p1y < height) {
      v1 = data[p1y * width + p1x];
    }
    if (p2x >= 0 && p2x < width && p2y >= 0 && p2y < height) {
      v2 = data[p2y * width + p2x];
    }

    if (v1 < v2) {
      const byteIdx = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      descriptor[byteIdx] |= 1 << bitOffset;
    }
    bitIndex++;
  }

  return descriptor;
}

/**
 * Compute descriptors for an array of keypoints
 */
export function extractDescriptors(
  img: GrayscaleImage,
  keypoints: Keypoint[],
  method: FeatureMethod = 'SIFT'
): FeatureDescriptor[] {
  const grad = method === 'SIFT' || method === 'HYBRID_LUNAR' ? computeGradients(img) : undefined;
  const descriptors: FeatureDescriptor[] = [];

  for (const kp of keypoints) {
    if (method === 'ORB') {
      const desc = computeORBDescriptor(img, kp);
      descriptors.push({ keypoint: kp, descriptor: desc });
    } else {
      const desc = computeSIFTDescriptor(img, kp, grad);
      descriptors.push({ keypoint: kp, descriptor: desc });
    }
  }

  return descriptors;
}
