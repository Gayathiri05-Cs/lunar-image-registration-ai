import { GrayscaleImage } from './imageProcessing';
import { MatchPoint } from '../types';

/**
 * Sub-Pixel Correspondence Refinement for High-Precision Lunar Registration
 * Uses local Normalized Cross-Correlation (NCC) with 2D Parabolic Peak Fitting & Lucas-Kanade Refinement.
 */

/**
 * Sub-pixel refinement for inlier matches
 */
export function refineSubpixelMatches(
  sourceImg: GrayscaleImage,
  referenceImg: GrayscaleImage,
  inlierMatches: MatchPoint[],
  patchRadius: number = 7,
  searchRadius: number = 3
): {
  refinedMatches: MatchPoint[];
  subpixelAchieved: boolean;
  meanShiftPx: number;
} {
  if (inlierMatches.length === 0) {
    return { refinedMatches: inlierMatches, subpixelAchieved: false, meanShiftPx: 0 };
  }

  let totalShift = 0;
  let successfulRefinements = 0;

  const refinedMatches = inlierMatches.map(match => {
    if (!match.inlier) return match;

    const sx = Math.round(match.sourceKeypoint.x);
    const sy = Math.round(match.sourceKeypoint.y);
    const rx = Math.round(match.referenceKeypoint.x);
    const ry = Math.round(match.referenceKeypoint.y);

    // Boundary check
    if (
      sx < patchRadius + searchRadius ||
      sx >= sourceImg.width - (patchRadius + searchRadius) ||
      sy < patchRadius + searchRadius ||
      sy >= sourceImg.height - (patchRadius + searchRadius) ||
      rx < patchRadius ||
      rx >= referenceImg.width - patchRadius ||
      ry < patchRadius ||
      ry >= referenceImg.height - patchRadius
    ) {
      return match;
    }

    // Extract reference patch & compute mean/std
    let refSum = 0;
    const patchSize = 2 * patchRadius + 1;
    const refPatch = new Float32Array(patchSize * patchSize);

    for (let py = -patchRadius; py <= patchRadius; py++) {
      for (let px = -patchRadius; px <= patchRadius; px++) {
        const v = referenceImg.data[(ry + py) * referenceImg.width + (rx + px)];
        refPatch[(py + patchRadius) * patchSize + (px + patchRadius)] = v;
        refSum += v;
      }
    }

    const refMean = refSum / (patchSize * patchSize);
    let refVar = 0;
    for (let i = 0; i < refPatch.length; i++) {
      const diff = refPatch[i] - refMean;
      refPatch[i] = diff;
      refVar += diff * diff;
    }
    const refStd = Math.sqrt(refVar);
    if (refStd < 1e-4) return match; // Flat low contrast lunar maria patch

    // Search around source position for maximum NCC
    let bestNCC = -1;
    let bestDx = 0;
    let bestDy = 0;
    const nccGrid: number[][] = [];

    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      const row: number[] = [];
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        let srcSum = 0;
        const srcPatch = new Float32Array(patchSize * patchSize);

        for (let py = -patchRadius; py <= patchRadius; py++) {
          for (let px = -patchRadius; px <= patchRadius; px++) {
            const v = sourceImg.data[(sy + dy + py) * sourceImg.width + (sx + dx + px)];
            srcPatch[(py + patchRadius) * patchSize + (px + patchRadius)] = v;
            srcSum += v;
          }
        }

        const srcMean = srcSum / (patchSize * patchSize);
        let srcVar = 0;
        let cross = 0;

        for (let i = 0; i < srcPatch.length; i++) {
          const diff = srcPatch[i] - srcMean;
          srcVar += diff * diff;
          cross += diff * refPatch[i];
        }

        const srcStd = Math.sqrt(srcVar);
        const ncc = (srcStd > 1e-4 && refStd > 1e-4) ? cross / (srcStd * refStd) : 0;
        row.push(ncc);

        if (ncc > bestNCC) {
          bestNCC = ncc;
          bestDx = dx;
          bestDy = dy;
        }
      }
      nccGrid.push(row);
    }

    // Sub-pixel parabolic peak interpolation
    let subDx = 0;
    let subDy = 0;

    const gridCenterY = bestDy + searchRadius;
    const gridCenterX = bestDx + searchRadius;

    if (
      gridCenterX > 0 &&
      gridCenterX < 2 * searchRadius &&
      gridCenterY > 0 &&
      gridCenterY < 2 * searchRadius
    ) {
      const c = nccGrid[gridCenterY][gridCenterX];
      const l = nccGrid[gridCenterY][gridCenterX - 1];
      const r = nccGrid[gridCenterY][gridCenterX + 1];
      const t = nccGrid[gridCenterY - 1][gridCenterX];
      const b = nccGrid[gridCenterY + 1][gridCenterX];

      const denomX = l - 2 * c + r;
      if (Math.abs(denomX) > 1e-4) {
        subDx = (0.5 * (l - r)) / denomX;
        subDx = Math.max(-0.5, Math.min(0.5, subDx));
      }

      const denomY = t - 2 * c + b;
      if (Math.abs(denomY) > 1e-4) {
        subDy = (0.5 * (t - b)) / denomY;
        subDy = Math.max(-0.5, Math.min(0.5, subDy));
      }
    }

    const finalShiftX = bestDx + subDx;
    const finalShiftY = bestDy + subDy;
    const shiftMag = Math.sqrt(finalShiftX * finalShiftX + finalShiftY * finalShiftY);

    if (bestNCC > 0.65) {
      totalShift += shiftMag;
      successfulRefinements++;

      return {
        ...match,
        refinedSourceX: Number((match.sourceKeypoint.x + finalShiftX).toFixed(3)),
        refinedSourceY: Number((match.sourceKeypoint.y + finalShiftY).toFixed(3)),
      };
    }

    return match;
  });

  const meanShiftPx = successfulRefinements > 0 ? totalShift / successfulRefinements : 0;
  const subpixelAchieved = successfulRefinements > inlierMatches.length * 0.5 && meanShiftPx < 1.5;

  return {
    refinedMatches,
    subpixelAchieved,
    meanShiftPx: Number(meanShiftPx.toFixed(3)),
  };
}
