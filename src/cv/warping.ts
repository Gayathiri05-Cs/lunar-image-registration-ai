import { TransformationMatrix, MatchPoint } from '../types';
import { invert3x3 } from './ransac';

/**
 * Geometric Image Warping and Result Compositing Engine
 * Uses Inverse Projective Mapping with Bilinear Interpolation.
 */

/**
 * Warp Source Image onto Reference Geometry using 3x3 Homography
 */
export function warpImageHomography(
  sourceCanvas: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
  transformation: TransformationMatrix
): HTMLCanvasElement {
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = targetWidth;
  outputCanvas.height = targetHeight;
  const outCtx = outputCanvas.getContext('2d');
  if (!outCtx) return outputCanvas;

  const srcCtx = sourceCanvas.getContext('2d');
  if (!srcCtx) return outputCanvas;

  const srcData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const outData = outCtx.createImageData(targetWidth, targetHeight);

  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  const sData = srcData.data;
  const oData = outData.data;

  // We need the inverse matrix: maps (x_dst, y_dst) -> (x_src, y_src)
  const H = transformation.matrix;
  const Hinv = transformation.inverseMatrix || invert3x3(H);

  if (!Hinv) {
    // If singular, draw source directly
    outCtx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
    return outputCanvas;
  }

  const h00 = Hinv[0][0], h01 = Hinv[0][1], h02 = Hinv[0][2];
  const h10 = Hinv[1][0], h11 = Hinv[1][1], h12 = Hinv[1][2];
  const h20 = Hinv[2][0], h21 = Hinv[2][1], h22 = Hinv[2][2];

  for (let y = 0; y < targetHeight; y++) {
    const rowOffset = y * targetWidth * 4;

    for (let x = 0; x < targetWidth; x++) {
      const z = h20 * x + h21 * y + h22;
      if (Math.abs(z) < 1e-8) continue;

      const srcX = (h00 * x + h01 * y + h02) / z;
      const srcY = (h10 * x + h11 * y + h12) / z;

      // Bilinear interpolation in source image
      if (srcX >= 0 && srcX < srcW - 1 && srcY >= 0 && srcY < srcH - 1) {
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const fx = srcX - x0;
        const fy = srcY - y0;

        const idx00 = (y0 * srcW + x0) * 4;
        const idx10 = (y0 * srcW + x1) * 4;
        const idx01 = (y1 * srcW + x0) * 4;
        const idx11 = (y1 * srcW + x1) * 4;

        const outIdx = rowOffset + x * 4;

        for (let c = 0; c < 3; c++) {
          const top = (1 - fx) * sData[idx00 + c] + fx * sData[idx10 + c];
          const bottom = (1 - fx) * sData[idx01 + c] + fx * sData[idx11 + c];
          oData[outIdx + c] = Math.round((1 - fy) * top + fy * bottom);
        }
        oData[outIdx + 3] = 255; // Alpha
      } else {
        // Out of bounds in source: deep space background
        const outIdx = rowOffset + x * 4;
        oData[outIdx] = 10;
        oData[outIdx + 1] = 12;
        oData[outIdx + 2] = 20;
        oData[outIdx + 3] = 255;
      }
    }
  }

  outCtx.putImageData(outData, 0, 0);
  return outputCanvas;
}

/**
 * Generate Difference Heatmap between Reference Image and Registered Image
 */
export function generateDifferenceMap(
  referenceCanvas: HTMLCanvasElement,
  registeredCanvas: HTMLCanvasElement
): HTMLCanvasElement {
  const width = referenceCanvas.width;
  const height = referenceCanvas.height;
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = width;
  diffCanvas.height = height;
  const diffCtx = diffCanvas.getContext('2d');
  if (!diffCtx) return diffCanvas;

  const refCtx = referenceCanvas.getContext('2d');
  const regCtx = registeredCanvas.getContext('2d');
  if (!refCtx || !regCtx) return diffCanvas;

  const refData = refCtx.getImageData(0, 0, width, height).data;
  const regData = regCtx.getImageData(0, 0, width, height).data;
  const outImg = diffCtx.createImageData(width, height);
  const outData = outImg.data;

  for (let i = 0; i < refData.length; i += 4) {
    const refGray = 0.299 * refData[i] + 0.587 * refData[i + 1] + 0.114 * refData[i + 2];
    const regGray = 0.299 * regData[i] + 0.587 * regData[i + 1] + 0.114 * regData[i + 2];

    const diff = Math.abs(refGray - regGray);
    const normDiff = Math.min(1.0, (diff * 2.2) / 255); // Enhanced contrast for visual inspection

    // Color ramp (Deep Navy -> Cyan -> Yellow -> Magenta/Red)
    let r = 0, g = 0, b = 0;
    if (normDiff < 0.25) {
      const t = normDiff / 0.25;
      r = Math.round(10 + t * 20);
      g = Math.round(15 + t * 140);
      b = Math.round(40 + t * 215);
    } else if (normDiff < 0.5) {
      const t = (normDiff - 0.25) / 0.25;
      r = Math.round(30 + t * 30);
      g = Math.round(155 + t * 90);
      b = Math.round(255 - t * 120);
    } else if (normDiff < 0.75) {
      const t = (normDiff - 0.5) / 0.25;
      r = Math.round(60 + t * 180);
      g = Math.round(245 - t * 45);
      b = Math.round(135 - t * 135);
    } else {
      const t = (normDiff - 0.75) / 0.25;
      r = Math.round(240 + t * 15);
      g = Math.round(200 - t * 170);
      b = Math.round(t * 80);
    }

    outData[i] = r;
    outData[i + 1] = g;
    outData[i + 2] = b;
    outData[i + 3] = 255;
  }

  diffCtx.putImageData(outImg, 0, 0);
  return diffCanvas;
}

/**
 * Generate Correspondence Matches Canvas with Green Inliers & Red Outliers
 */
export function generateMatchesCanvas(
  sourceCanvas: HTMLCanvasElement,
  referenceCanvas: HTMLCanvasElement,
  matches: MatchPoint[],
  maxMatchesToDraw: number = 200
): HTMLCanvasElement {
  const gap = 30;
  const width = sourceCanvas.width + referenceCanvas.width + gap;
  const height = Math.max(sourceCanvas.height, referenceCanvas.height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Background
  ctx.fillStyle = '#0a0d18';
  ctx.fillRect(0, 0, width, height);

  // Draw Source & Reference Images
  ctx.drawImage(sourceCanvas, 0, 0);
  ctx.drawImage(referenceCanvas, sourceCanvas.width + gap, 0);

  // Draw separator & labels
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, sourceCanvas.width, sourceCanvas.height);
  ctx.strokeRect(sourceCanvas.width + gap, 0, referenceCanvas.width, referenceCanvas.height);

  // Draw Matches
  const refOffset = sourceCanvas.width + gap;

  // 1. Draw Outliers first (Red dashed lines)
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'; // Red
  for (const m of matches) {
    if (m.inlier) continue;
    const sx = m.sourceKeypoint.x;
    const sy = m.sourceKeypoint.y;
    const rx = m.referenceKeypoint.x + refOffset;
    const ry = m.referenceKeypoint.y;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(rx, ry);
    ctx.stroke();

    // Outlier dot
    ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rx, ry, 2.5, 0, 2 * Math.PI);
    ctx.fill();
  }

  // 2. Draw Inliers on top (Vibrant Green & Cyan solid lines)
  ctx.lineWidth = 1.5;
  let inlierDrawn = 0;
  for (const m of matches) {
    if (!m.inlier) continue;
    if (inlierDrawn++ > maxMatchesToDraw) break;

    const sx = m.refinedSourceX ?? m.sourceKeypoint.x;
    const sy = m.refinedSourceY ?? m.sourceKeypoint.y;
    const rx = m.referenceKeypoint.x + refOffset;
    const ry = m.referenceKeypoint.y;

    ctx.strokeStyle = 'rgba(34, 197, 94, 0.85)'; // Neon Green
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(rx, ry);
    ctx.stroke();

    // Keypoint rings
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(sx, sy, 3.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = '#06b6d4'; // Cyan
    ctx.beginPath();
    ctx.arc(rx, ry, 3.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(rx, ry, 5, 0, 2 * Math.PI);
    ctx.stroke();
  }

  return canvas;
}
