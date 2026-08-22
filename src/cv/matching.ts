import { FeatureDescriptor, MatchPoint } from '../types';

/**
 * Feature Matching with KNN, Lowe's Ratio Test, and Bidirectional Cross-Check
 */

/**
 * Euclidean L2 distance for Float32Array SIFT descriptors
 */
export function l2Distance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Hamming distance for Uint8Array binary ORB descriptors
 */
export function hammingDistance(a: Uint8Array, b: Uint8Array): number {
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    let xor = a[i] ^ b[i];
    // Count set bits (popcount)
    while (xor > 0) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}

/**
 * Compute distance between two descriptors
 */
export function computeDescriptorDistance(
  descA: Float32Array | Uint8Array,
  descB: Float32Array | Uint8Array
): number {
  if (descA instanceof Float32Array && descB instanceof Float32Array) {
    return l2Distance(descA, descB);
  }
  if (descA instanceof Uint8Array && descB instanceof Uint8Array) {
    return hammingDistance(descA, descB);
  }
  return 9999;
}

/**
 * Match features from source to reference using KNN (k=2) and Lowe's Ratio Test
 */
export function matchFeaturesKNN(
  sourceDescriptors: FeatureDescriptor[],
  referenceDescriptors: FeatureDescriptor[],
  ratioThreshold: number = 0.75,
  crossCheck: boolean = true
): MatchPoint[] {
  if (sourceDescriptors.length === 0 || referenceDescriptors.length === 0) {
    return [];
  }

  // 1. Forward Matching: Source -> Reference
  interface CandidateMatch {
    sourceIdx: number;
    refIdx: number;
    dist1: number;
    dist2: number;
    passedRatio: boolean;
  }

  const forwardMatches: CandidateMatch[] = [];

  for (let i = 0; i < sourceDescriptors.length; i++) {
    const srcDesc = sourceDescriptors[i].descriptor;
    let bestDist = Infinity;
    let secondDist = Infinity;
    let bestIdx = -1;

    for (let j = 0; j < referenceDescriptors.length; j++) {
      const refDesc = referenceDescriptors[j].descriptor;
      const dist = computeDescriptorDistance(srcDesc, refDesc);

      if (dist < bestDist) {
        secondDist = bestDist;
        bestDist = dist;
        bestIdx = j;
      } else if (dist < secondDist) {
        secondDist = dist;
      }
    }

    if (bestIdx !== -1) {
      const passed = secondDist > 1e-5 ? bestDist / secondDist <= ratioThreshold : true;
      forwardMatches.push({
        sourceIdx: i,
        refIdx: bestIdx,
        dist1: bestDist,
        dist2: secondDist,
        passedRatio: passed,
      });
    }
  }

  // 2. Backward Matching: Reference -> Source (if crossCheck enabled)
  let backwardBestForRef: Int32Array | null = null;
  if (crossCheck) {
    backwardBestForRef = new Int32Array(referenceDescriptors.length);
    backwardBestForRef.fill(-1);

    for (let j = 0; j < referenceDescriptors.length; j++) {
      const refDesc = referenceDescriptors[j].descriptor;
      let bestDist = Infinity;
      let bestSrcIdx = -1;

      for (let i = 0; i < sourceDescriptors.length; i++) {
        const srcDesc = sourceDescriptors[i].descriptor;
        const dist = computeDescriptorDistance(srcDesc, refDesc);
        if (dist < bestDist) {
          bestDist = dist;
          bestSrcIdx = i;
        }
      }

      backwardBestForRef[j] = bestSrcIdx;
    }
  }

  // 3. Assemble matches
  const matchPoints: MatchPoint[] = [];
  let matchId = 0;

  for (const match of forwardMatches) {
    if (!match.passedRatio) continue;

    // Cross-check test: source must be ref's closest match too
    if (crossCheck && backwardBestForRef) {
      if (backwardBestForRef[match.refIdx] !== match.sourceIdx) {
        continue;
      }
    }

    const srcKp = sourceDescriptors[match.sourceIdx].keypoint;
    const refKp = referenceDescriptors[match.refIdx].keypoint;

    matchPoints.push({
      id: matchId++,
      sourceKeypoint: srcKp,
      referenceKeypoint: refKp,
      distance: match.dist1,
      inlier: false, // will be evaluated in geometric verification / RANSAC
      residualError: 0,
    });
  }

  return matchPoints;
}
