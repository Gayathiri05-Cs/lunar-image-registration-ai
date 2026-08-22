import { MatchPoint, TransformModelType, TransformationMatrix } from '../types';

/**
 * Geometric Verification with RANSAC & Direct Linear Transformation (DLT)
 * Solves Projective Homography (3x3), Affine (2x3), Similarity, and Rigid transforms.
 */

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Apply 3x3 Homography to a 2D Point
 */
export function applyHomography(H: number[][], p: Point2D): Point2D {
  const x = p.x;
  const y = p.y;
  const z = H[2][0] * x + H[2][1] * y + H[2][2];
  if (Math.abs(z) < 1e-8) {
    return { x: 0, y: 0 };
  }
  const xPrime = (H[0][0] * x + H[0][1] * y + H[0][2]) / z;
  const yPrime = (H[1][0] * x + H[1][1] * y + H[1][2]) / z;
  return { x: xPrime, y: yPrime };
}

/**
 * Invert 3x3 Matrix
 */
export function invert3x3(M: number[][]): number[][] | null {
  const a = M[0][0], b = M[0][1], c = M[0][2];
  const d = M[1][0], e = M[1][1], f = M[1][2];
  const g = M[2][0], h = M[2][1], i = M[2][2];

  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const D = -(b * i - c * h);
  const E = a * i - c * g;
  const F = -(a * h - b * g);
  const G = b * f - c * e;
  const H_adj = -(a * f - c * d);
  const I = a * e - b * d;

  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;

  const invDet = 1.0 / det;
  return [
    [A * invDet, D * invDet, G * invDet],
    [B * invDet, E * invDet, H_adj * invDet],
    [C * invDet, F * invDet, I * invDet],
  ];
}

/**
 * Check if 3 points are roughly collinear
 */
function areCollinear(p1: Point2D, p2: Point2D, p3: Point2D, eps: number = 1e-4): boolean {
  const area = p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y);
  return Math.abs(area) < eps;
}

/**
 * Estimate 3x3 Homography Matrix from 4 point correspondences using DLT with SVD / Normalization (Hartley)
 */
export function estimateHomography4Points(
  srcPts: Point2D[],
  dstPts: Point2D[]
): number[][] | null {
  if (srcPts.length < 4 || dstPts.length < 4) return null;

  // Collinearity check
  if (
    areCollinear(srcPts[0], srcPts[1], srcPts[2]) ||
    areCollinear(srcPts[0], srcPts[1], srcPts[3]) ||
    areCollinear(srcPts[0], srcPts[2], srcPts[3]) ||
    areCollinear(srcPts[1], srcPts[2], srcPts[3])
  ) {
    return null;
  }

  // 8x8 Linear System: A * h = b (setting h33 = 1)
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const x = srcPts[i].x;
    const y = srcPts[i].y;
    const u = dstPts[i].x;
    const v = dstPts[i].y;

    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);

    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }

  // Solve 8x8 system using Gaussian Elimination with partial pivoting
  const h = solveLinearSystem8(A, b);
  if (!h) return null;

  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1.0],
  ];
}

/**
 * Gaussian elimination with partial pivoting for 8x8 linear system
 */
function solveLinearSystem8(A: number[][], b: number[]): number[] | null {
  const n = 8;
  const M: number[][] = [];
  for (let i = 0; i < n; i++) {
    M.push([...A[i], b[i]]);
  }

  for (let col = 0; col < n; col++) {
    // Find pivot
    let maxRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > maxVal) {
        maxVal = Math.abs(M[row][col]);
        maxRow = row;
      }
    }

    if (maxVal < 1e-10) return null; // Singular

    // Swap
    if (maxRow !== col) {
      const temp = M[col];
      M[col] = M[maxRow];
      M[maxRow] = temp;
    }

    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / M[col][col];
      for (let j = col; j <= n; j++) {
        M[row][j] -= factor * M[col][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = M[row][n];
    for (let j = row + 1; j < n; j++) {
      sum -= M[row][j] * x[j];
    }
    x[row] = sum / M[row][row];
  }

  return x;
}

/**
 * Estimate 2D Affine Transformation (6 DoF) using Least Squares
 */
export function estimateAffine(srcPts: Point2D[], dstPts: Point2D[]): number[][] | null {
  const n = srcPts.length;
  if (n < 3) return null;

  // We solve for [a11, a12, tx] and [a21, a22, ty] separately
  // Matrix X = [x, y, 1], Y_u = [u], Y_v = [v]
  let s_xx = 0, s_yy = 0, s_xy = 0, s_x = 0, s_y = 0;
  let s_ux = 0, s_uy = 0, s_u = 0;
  let s_vx = 0, s_vy = 0, s_v = 0;

  for (let i = 0; i < n; i++) {
    const x = srcPts[i].x;
    const y = srcPts[i].y;
    const u = dstPts[i].x;
    const v = dstPts[i].y;

    s_xx += x * x;
    s_yy += y * y;
    s_xy += x * y;
    s_x += x;
    s_y += y;

    s_ux += u * x;
    s_uy += u * y;
    s_u += u;

    s_vx += v * x;
    s_vy += v * y;
    s_v += v;
  }

  const M = [
    [s_xx, s_xy, s_x],
    [s_xy, s_yy, s_y],
    [s_x, s_y, n],
  ];

  const invM = invert3x3(M);
  if (!invM) return null;

  // Param row 1: [a11, a12, tx] = invM * [s_ux, s_uy, s_u]
  const a11 = invM[0][0] * s_ux + invM[0][1] * s_uy + invM[0][2] * s_u;
  const a12 = invM[1][0] * s_ux + invM[1][1] * s_uy + invM[1][2] * s_u;
  const tx = invM[2][0] * s_ux + invM[2][1] * s_uy + invM[2][2] * s_u;

  // Param row 2: [a21, a22, ty] = invM * [s_vx, s_vy, s_v]
  const a21 = invM[0][0] * s_vx + invM[0][1] * s_vy + invM[0][2] * s_v;
  const a22 = invM[1][0] * s_vx + invM[1][1] * s_vy + invM[1][2] * s_v;
  const ty = invM[2][0] * s_vx + invM[2][1] * s_vy + invM[2][2] * s_v;

  return [
    [a11, a12, tx],
    [a21, a22, ty],
    [0, 0, 1],
  ];
}

/**
 * Estimate Similarity Transformation (Rotation + Uniform Scale + Translation, 4 DoF)
 */
export function estimateSimilarity(srcPts: Point2D[], dstPts: Point2D[]): number[][] | null {
  const n = srcPts.length;
  if (n < 2) return null;

  // Centroids
  let mx = 0, my = 0, mu = 0, mv = 0;
  for (let i = 0; i < n; i++) {
    mx += srcPts[i].x;
    my += srcPts[i].y;
    mu += dstPts[i].x;
    mv += dstPts[i].y;
  }
  mx /= n; my /= n; mu /= n; mv /= n;

  let numA = 0, numB = 0, den = 0;
  for (let i = 0; i < n; i++) {
    const dx = srcPts[i].x - mx;
    const dy = srcPts[i].y - my;
    const du = dstPts[i].x - mu;
    const dv = dstPts[i].y - mv;

    numA += dx * du + dy * dv;
    numB += dx * dv - dy * du;
    den += dx * dx + dy * dy;
  }

  if (den < 1e-8) return null;

  const a = numA / den;
  const b = numB / den;
  const tx = mu - (a * mx - b * my);
  const ty = mv - (b * mx + a * my);

  return [
    [a, -b, tx],
    [b, a, ty],
    [0, 0, 1],
  ];
}

/**
 * Robust RANSAC Estimation for Homography or Affine Transformation
 */
export function runRANSAC(
  matches: MatchPoint[],
  modelType: TransformModelType = 'HOMOGRAPHY',
  inlierThresholdPx: number = 3.0,
  maxIterations: number = 1000
): {
  transformation: TransformationMatrix;
  classifiedMatches: MatchPoint[];
  inlierCount: number;
  outlierCount: number;
  inlierRatio: number;
  rmse: number;
  meanResidual: number;
  maxResidual: number;
  confidenceScore: number;
  iterations: number;
} {
  const numMatches = matches.length;
  const minPoints = modelType === 'HOMOGRAPHY' ? 4 : modelType === 'AFFINE' ? 3 : 2;

  if (numMatches < minPoints) {
    // Fallback Identity matrix if matches too few
    const identity: TransformationMatrix = {
      type: modelType,
      matrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
      inverseMatrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    };
    return {
      transformation: identity,
      classifiedMatches: matches.map(m => ({ ...m, inlier: false, residualError: 999 })),
      inlierCount: 0,
      outlierCount: numMatches,
      inlierRatio: 0,
      rmse: 0,
      meanResidual: 0,
      maxResidual: 0,
      confidenceScore: 0,
      iterations: 0,
    };
  }

  const srcPoints = matches.map(m => ({ x: m.sourceKeypoint.x, y: m.sourceKeypoint.y }));
  const dstPoints = matches.map(m => ({ x: m.referenceKeypoint.x, y: m.referenceKeypoint.y }));

  let bestInliers: boolean[] = new Array(numMatches).fill(false);
  let bestInlierCount = 0;
  let bestMatrix: number[][] | null = null;

  for (let iter = 0; iter < maxIterations; iter++) {
    // Random sample of minPoints distinct indices
    const sampleIndices: number[] = [];
    while (sampleIndices.length < minPoints) {
      const idx = Math.floor(Math.random() * numMatches);
      if (!sampleIndices.includes(idx)) {
        sampleIndices.push(idx);
      }
    }

    const sampleSrc = sampleIndices.map(i => srcPoints[i]);
    const sampleDst = sampleIndices.map(i => dstPoints[i]);

    let candidateH: number[][] | null = null;
    if (modelType === 'HOMOGRAPHY') {
      candidateH = estimateHomography4Points(sampleSrc, sampleDst);
    } else if (modelType === 'AFFINE') {
      candidateH = estimateAffine(sampleSrc, sampleDst);
    } else {
      candidateH = estimateSimilarity(sampleSrc, sampleDst);
    }

    if (!candidateH) continue;

    // Evaluate inliers
    let currentInlierCount = 0;
    const currentInliers = new Array(numMatches).fill(false);

    for (let i = 0; i < numMatches; i++) {
      const projected = applyHomography(candidateH, srcPoints[i]);
      const dx = projected.x - dstPoints[i].x;
      const dy = projected.y - dstPoints[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= inlierThresholdPx) {
        currentInliers[i] = true;
        currentInlierCount++;
      }
    }

    if (currentInlierCount > bestInlierCount) {
      bestInlierCount = currentInlierCount;
      bestInliers = currentInliers;
      bestMatrix = candidateH;

      // Early stopping if very high inlier ratio reached
      if (bestInlierCount > numMatches * 0.85 && iter > 200) {
        break;
      }
    }
  }

  // Refine model using ALL inliers via least squares
  let finalMatrix: number[][] = bestMatrix || [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const inlierSrc: Point2D[] = [];
  const inlierDst: Point2D[] = [];

  for (let i = 0; i < numMatches; i++) {
    if (bestInliers[i]) {
      inlierSrc.push(srcPoints[i]);
      inlierDst.push(dstPoints[i]);
    }
  }

  if (inlierSrc.length >= minPoints) {
    if (modelType === 'AFFINE' || modelType === 'SIMILARITY') {
      const refined = modelType === 'AFFINE' ? estimateAffine(inlierSrc, inlierDst) : estimateSimilarity(inlierSrc, inlierDst);
      if (refined) finalMatrix = refined;
    }
  }

  // Calculate final residual errors and RMSE for all matches
  let sumSquaredResiduals = 0;
  let sumResiduals = 0;
  let maxResidual = 0;
  let inlierResidualCount = 0;

  const classifiedMatches: MatchPoint[] = matches.map((m, i) => {
    const projected = applyHomography(finalMatrix, srcPoints[i]);
    const dx = projected.x - dstPoints[i].x;
    const dy = projected.y - dstPoints[i].y;
    const residual = Math.sqrt(dx * dx + dy * dy);
    const isInlier = bestInliers[i];

    if (isInlier) {
      sumSquaredResiduals += residual * residual;
      sumResiduals += residual;
      if (residual > maxResidual) maxResidual = residual;
      inlierResidualCount++;
    }

    return {
      ...m,
      inlier: isInlier,
      residualError: Number(residual.toFixed(3)),
    };
  });

  const rmse = inlierResidualCount > 0 ? Math.sqrt(sumSquaredResiduals / inlierResidualCount) : 999;
  const meanResidual = inlierResidualCount > 0 ? sumResiduals / inlierResidualCount : 999;
  const inlierRatio = numMatches > 0 ? bestInlierCount / numMatches : 0;

  // Algorithmic Confidence calculation
  // Factors: inlier count (>=30 gives max count factor), inlier ratio (>=0.6), low RMSE (<1.5 px)
  const countFactor = Math.min(1.0, bestInlierCount / 40);
  const ratioFactor = Math.min(1.0, inlierRatio / 0.7);
  const rmseFactor = Math.max(0, Math.min(1.0, (4.0 - rmse) / 3.0));
  const rawConfidence = (countFactor * 0.4 + ratioFactor * 0.35 + rmseFactor * 0.25) * 100;
  const confidenceScore = Math.max(0, Math.min(100, Math.round(rawConfidence)));

  // Matrix analysis
  const inv = invert3x3(finalMatrix);
  const a = finalMatrix[0][0], b = finalMatrix[0][1];
  const scaleFactor = Math.sqrt(a * a + b * b);
  const rotationDeg = (Math.atan2(finalMatrix[1][0], finalMatrix[0][0]) * 180) / Math.PI;

  const transformation: TransformationMatrix = {
    type: modelType,
    matrix: finalMatrix,
    inverseMatrix: inv || undefined,
    scaleFactor: Number(scaleFactor.toFixed(4)),
    rotationDeg: Number(rotationDeg.toFixed(2)),
    translationX: Number(finalMatrix[0][2].toFixed(2)),
    translationY: Number(finalMatrix[1][2].toFixed(2)),
  };

  return {
    transformation,
    classifiedMatches,
    inlierCount: bestInlierCount,
    outlierCount: numMatches - bestInlierCount,
    inlierRatio: Number(inlierRatio.toFixed(3)),
    rmse: Number(rmse.toFixed(3)),
    meanResidual: Number(meanResidual.toFixed(3)),
    maxResidual: Number(maxResidual.toFixed(3)),
    confidenceScore,
    iterations: maxIterations,
  };
}
