/**
 * Image Preprocessing Module for Lunar Imagery
 * Handles Grayscale, CLAHE (Contrast Limited Adaptive Histogram Equalization),
 * Multi-scale Pyramids, Gradient maps, and Illumination Normalization.
 */

export interface GrayscaleImage {
  width: number;
  height: number;
  data: Float32Array; // values in [0, 255]
}

export interface GradientMap {
  magnitude: Float32Array;
  direction: Float32Array; // in radians [-PI, PI]
  width: number;
  height: number;
}

/**
 * Convert HTMLImageElement or ImageData to GrayscaleImage Float32Array
 */
export function imageDataToGrayscale(imageData: ImageData): GrayscaleImage {
  const { width, height, data } = imageData;
  const gray = new Float32Array(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    // ITU-R BT.601 standard for grayscale conversion
    gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return { width, height, data: gray };
}

/**
 * Convert Grayscale Float32Array back to ImageData for Canvas rendering
 */
export function grayscaleToImageData(gray: GrayscaleImage): ImageData {
  const { width, height, data } = gray;
  const clamped = new Uint8ClampedArray(width * height * 4);
  for (let i = 0, j = 0; i < data.length; i++, j += 4) {
    const val = Math.max(0, Math.min(255, Math.round(data[i])));
    clamped[j] = val;
    clamped[j + 1] = val;
    clamped[j + 2] = val;
    clamped[j + 3] = 255;
  }
  return new ImageData(clamped, width, height);
}

/**
 * Separable Gaussian Blur filter
 */
export function gaussianBlur(img: GrayscaleImage, sigma: number): GrayscaleImage {
  if (sigma <= 0.1) return { width: img.width, height: img.height, data: new Float32Array(img.data) };
  
  const radius = Math.ceil(3 * sigma);
  const kernelSize = 2 * radius + 1;
  const kernel = new Float32Array(kernelSize);
  let sum = 0;

  for (let i = 0; i < kernelSize; i++) {
    const x = i - radius;
    const g = Math.exp(-(x * x) / (2 * sigma * sigma));
    kernel[i] = g;
    sum += g;
  }
  for (let i = 0; i < kernelSize; i++) {
    kernel[i] /= sum;
  }

  const { width, height, data } = img;
  const temp = new Float32Array(width * height);
  const result = new Float32Array(width * height);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        const px = Math.min(width - 1, Math.max(0, x + k));
        acc += data[rowOffset + px] * kernel[k + radius];
      }
      temp[rowOffset + x] = acc;
    }
  }

  // Vertical pass
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        const py = Math.min(height - 1, Math.max(0, y + k));
        acc += temp[py * width + x] * kernel[k + radius];
      }
      result[y * width + x] = acc;
    }
  }

  return { width, height, data: result };
}

/**
 * CLAHE (Contrast Limited Adaptive Histogram Equalization)
 * Crucial for Lunar Imagery with extreme shadow-sunlight dynamic range!
 */
export function applyCLAHE(
  img: GrayscaleImage,
  gridTilesX: number = 8,
  gridTilesY: number = 8,
  clipLimit: number = 2.5
): GrayscaleImage {
  const { width, height, data } = img;
  const tileWidth = Math.floor(width / gridTilesX);
  const tileHeight = Math.floor(height / gridTilesY);
  const numBins = 256;

  // Compute local histogram for each grid tile
  const histograms: Float32Array[] = [];
  for (let gy = 0; gy < gridTilesY; gy++) {
    for (let gx = 0; gx < gridTilesX; gx++) {
      const hist = new Float32Array(numBins);
      const startX = gx * tileWidth;
      const endX = gx === gridTilesX - 1 ? width : (gx + 1) * tileWidth;
      const startY = gy * tileHeight;
      const endY = gy === gridTilesY - 1 ? height : (gy + 1) * tileHeight;
      const tileArea = (endX - startX) * (endY - startY);

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const val = Math.max(0, Math.min(255, Math.floor(data[y * width + x])));
          hist[val]++;
        }
      }

      // Clip histogram to prevent over-amplification of noise in flat lunar maria
      const actualClipLimit = Math.max(1, Math.floor((clipLimit * tileArea) / numBins));
      let excess = 0;
      for (let b = 0; b < numBins; b++) {
        if (hist[b] > actualClipLimit) {
          excess += hist[b] - actualClipLimit;
          hist[b] = actualClipLimit;
        }
      }

      // Redistribute clipped excess uniformly
      const bonus = excess / numBins;
      for (let b = 0; b < numBins; b++) {
        hist[b] += bonus;
      }

      // Compute CDF (Cumulative Distribution Function)
      const cdf = new Float32Array(numBins);
      let cumulative = 0;
      for (let b = 0; b < numBins; b++) {
        cumulative += hist[b];
        cdf[b] = (cumulative / tileArea) * 255;
      }

      histograms.push(cdf);
    }
  }

  // Bilinear interpolation between 4 nearest tile CDFs
  const out = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    const normY = (y - tileHeight / 2) / tileHeight;
    const gy1 = Math.max(0, Math.min(gridTilesY - 1, Math.floor(normY)));
    const gy2 = Math.min(gridTilesY - 1, gy1 + 1);
    const weightY = Math.max(0, Math.min(1, normY - gy1));

    for (let x = 0; x < width; x++) {
      const normX = (x - tileWidth / 2) / tileWidth;
      const gx1 = Math.max(0, Math.min(gridTilesX - 1, Math.floor(normX)));
      const gx2 = Math.min(gridTilesX - 1, gx1 + 1);
      const weightX = Math.max(0, Math.min(1, normX - gx1));

      const val = Math.max(0, Math.min(255, Math.floor(data[y * width + x])));

      const cdf00 = histograms[gy1 * gridTilesX + gx1][val];
      const cdf10 = histograms[gy1 * gridTilesX + gx2][val];
      const cdf01 = histograms[gy2 * gridTilesX + gx1][val];
      const cdf11 = histograms[gy2 * gridTilesX + gx2][val];

      const top = (1 - weightX) * cdf00 + weightX * cdf10;
      const bottom = (1 - weightX) * cdf01 + weightX * cdf11;
      out[y * width + x] = (1 - weightY) * top + weightY * bottom;
    }
  }

  return { width, height, data: out };
}

/**
 * Compute Sobel Gradients (Magnitude & Orientation) for edge/crater detection and illumination invariance
 */
export function computeGradients(img: GrayscaleImage): GradientMap {
  const { width, height, data } = img;
  const magnitude = new Float32Array(width * height);
  const direction = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    const yMinus = (y - 1) * width;
    const yCurrent = y * width;
    const yPlus = (y + 1) * width;

    for (let x = 1; x < width - 1; x++) {
      // Sobel X kernel: [-1 0 1; -2 0 2; -1 0 1]
      const gx =
        -data[yMinus + x - 1] + data[yMinus + x + 1] +
        -2 * data[yCurrent + x - 1] + 2 * data[yCurrent + x + 1] +
        -data[yPlus + x - 1] + data[yPlus + x + 1];

      // Sobel Y kernel: [-1 -2 -1; 0 0 0; 1 2 1]
      const gy =
        -data[yMinus + x - 1] - 2 * data[yMinus + x] - data[yMinus + x + 1] +
        data[yPlus + x - 1] + 2 * data[yPlus + x] + data[yPlus + x + 1];

      const idx = yCurrent + x;
      magnitude[idx] = Math.sqrt(gx * gx + gy * gy);
      direction[idx] = Math.atan2(gy, gx);
    }
  }

  return { magnitude, direction, width, height };
}

/**
 * Bilateral Edge-Preserving Filter to smooth crater floors while keeping steep crater rims sharp
 */
export function bilateralFilter(
  img: GrayscaleImage,
  spatialSigma: number = 2.0,
  rangeSigma: number = 25.0
): GrayscaleImage {
  const { width, height, data } = img;
  const radius = Math.ceil(2 * spatialSigma);
  const result = new Float32Array(width * height);

  const spatialKernel = new Float32Array((2 * radius + 1) * (2 * radius + 1));
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const distSq = dx * dx + dy * dy;
      spatialKernel[(dy + radius) * (2 * radius + 1) + (dx + radius)] = Math.exp(-distSq / (2 * spatialSigma * spatialSigma));
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const centerVal = data[y * width + x];
      let sumWeights = 0;
      let sumFiltered = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;

        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;

          const neighborVal = data[ny * width + nx];
          const diff = neighborVal - centerVal;
          const rangeWeight = Math.exp(-(diff * diff) / (2 * rangeSigma * rangeSigma));
          const spatialWeight = spatialKernel[(dy + radius) * (2 * radius + 1) + (dx + radius)];
          const weight = spatialWeight * rangeWeight;

          sumWeights += weight;
          sumFiltered += neighborVal * weight;
        }
      }

      result[y * width + x] = sumWeights > 0 ? sumFiltered / sumWeights : centerVal;
    }
  }

  return { width, height, data: result };
}

/**
 * Downsample image by factor of 2 for Gaussian Pyramid
 */
export function downsampleHalf(img: GrayscaleImage): GrayscaleImage {
  const newWidth = Math.floor(img.width / 2);
  const newHeight = Math.floor(img.height / 2);
  const out = new Float32Array(newWidth * newHeight);

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcX = x * 2;
      const srcY = y * 2;
      // Average 2x2 block
      const v00 = img.data[srcY * img.width + srcX];
      const v10 = img.data[srcY * img.width + srcX + 1];
      const v01 = img.data[(srcY + 1) * img.width + srcX];
      const v11 = img.data[(srcY + 1) * img.width + srcX + 1];
      out[y * newWidth + x] = (v00 + v10 + v01 + v11) * 0.25;
    }
  }

  return { width: newWidth, height: newHeight, data: out };
}

/**
 * Calculate Image Statistics
 */
export function computeImageStats(img: GrayscaleImage): {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  entropy: number;
} {
  const { data } = img;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  const hist = new Uint32Array(256);

  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
    const b = Math.max(0, Math.min(255, Math.floor(v)));
    hist[b]++;
  }

  const mean = sum / data.length;
  let varianceSum = 0;
  for (let i = 0; i < data.length; i++) {
    const diff = data[i] - mean;
    varianceSum += diff * diff;
  }
  const stdDev = Math.sqrt(varianceSum / data.length);

  // Shannon Entropy
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (hist[i] > 0) {
      const p = hist[i] / data.length;
      entropy -= p * Math.log2(p);
    }
  }

  return { mean, stdDev, min, max, entropy };
}
