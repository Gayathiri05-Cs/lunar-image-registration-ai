import { DemoDataset } from '../types';

/**
 * Procedural Realistic Lunar Surface Generator
 * Simulates real Chandrayaan-2 OHRC, TMC-2, and Lunar Reconnaissance imagery
 * with crater distributions, impact ejecta rays, solar shadow casting, and sensor noise.
 */

interface CraterSpec {
  x: number;
  y: number;
  r: number;
  depth: number;
  hasCentralPeak?: boolean;
}

export function generateSyntheticLunarImage(
  width: number,
  height: number,
  sunAzimuthDeg: number,
  sunElevationDeg: number,
  noiseLevel: number = 0.08,
  rotationDeg: number = 0,
  scale: number = 1.0,
  shiftX: number = 0,
  shiftY: number = 0,
  seed: number = 42
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Base Lunar Regolith Canvas
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  // Standard Lunar Craters Dataset (normalized coordinates in [0, 1])
  const baseCraters: CraterSpec[] = [
    { x: 0.5, y: 0.5, r: 0.22, depth: 1.0, hasCentralPeak: true },
    { x: 0.22, y: 0.28, r: 0.11, depth: 0.8 },
    { x: 0.78, y: 0.32, r: 0.09, depth: 0.75 },
    { x: 0.34, y: 0.76, r: 0.13, depth: 0.9 },
    { x: 0.74, y: 0.72, r: 0.07, depth: 0.6 },
    { x: 0.15, y: 0.62, r: 0.05, depth: 0.5 },
    { x: 0.88, y: 0.55, r: 0.04, depth: 0.45 },
    { x: 0.42, y: 0.18, r: 0.06, depth: 0.55 },
    { x: 0.62, y: 0.86, r: 0.05, depth: 0.5 },
    { x: 0.58, y: 0.24, r: 0.035, depth: 0.4 },
    { x: 0.28, y: 0.45, r: 0.045, depth: 0.5 },
    { x: 0.72, y: 0.48, r: 0.03, depth: 0.35 },
    { x: 0.45, y: 0.82, r: 0.025, depth: 0.3 },
    { x: 0.12, y: 0.15, r: 0.03, depth: 0.35 },
    { x: 0.85, y: 0.18, r: 0.04, depth: 0.4 },
  ];

  // Sun directional vector
  const sunAzRad = (sunAzimuthDeg * Math.PI) / 180;
  const sunElevRad = (sunElevationDeg * Math.PI) / 180;
  const sunDirX = Math.cos(sunAzRad) * Math.cos(sunElevRad);
  const sunDirY = Math.sin(sunAzRad) * Math.cos(sunElevRad);
  const sunDirZ = Math.sin(sunElevRad);

  const rotRad = (rotationDeg * Math.PI) / 180;
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);

  // Heightmap generation function
  function getHeight(u: number, v: number): number {
    // Regolith baseline roughness
    let h = 0.5;
    h += 0.03 * Math.sin(u * 28 + seed) * Math.cos(v * 32 + seed);
    h += 0.015 * Math.sin(u * 65 - seed) * Math.sin(v * 75 + seed);

    for (const c of baseCraters) {
      const du = u - c.x;
      const dv = v - c.y;
      const dist = Math.sqrt(du * du + dv * dv);
      const normDist = dist / c.r;

      if (normDist < 1.0) {
        // Crater bowl (parabolic depression)
        const bowl = (1.0 - normDist * normDist) * c.depth * 0.4;
        h -= bowl;

        // Central peak
        if (c.hasCentralPeak && normDist < 0.22) {
          const peak = (1.0 - normDist / 0.22) * c.depth * 0.18;
          h += peak;
        }
      } else if (normDist >= 1.0 && normDist < 1.5) {
        // Raised crater rim & ejecta blanket
        const rimDist = (normDist - 1.0) / 0.5;
        const rimHeight = (1.0 - rimDist) * c.depth * 0.12;
        h += rimHeight;
      }
    }
    return h;
  }

  // Render pixels
  const du = 1.0 / width;
  const dv = 1.0 / height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Apply transformation (scale, rotation, shift)
      const cx = width / 2;
      const cy = height / 2;
      const nx = (x - cx) / scale;
      const ny = (y - cy) / scale;

      const rotX = nx * cosR - ny * sinR;
      const rotY = nx * sinR + ny * cosR;

      const targetX = rotX + cx - shiftX;
      const targetY = rotY + cy - shiftY;

      const u = targetX / width;
      const v = targetY / height;

      let intensity = 120; // baseline gray lunar albedo

      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
        // Sample height gradient (surface normals)
        const h0 = getHeight(u, v);
        const hX = getHeight(u + du, v);
        const hY = getHeight(u, v + dv);

        const dh_du = (hX - h0) / du;
        const dh_dv = (hY - h0) / dv;

        // Surface normal: N = [-dh_du, -dh_dv, 1] normalized
        const nx = -dh_du * 4.0;
        const ny = -dh_dv * 4.0;
        const nz = 1.0;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

        const normX = nx / len;
        const normY = ny / len;
        const normZ = nz / len;

        // Lambertian + Lommel-Seeliger Lunar Photometric Model
        const cosI = Math.max(0, normX * sunDirX + normY * sunDirY + normZ * sunDirZ);
        const cosE = Math.max(0.01, normZ); // emission angle towards zenith sensor
        const lommelSeeliger = cosI / (cosI + cosE + 1e-4);

        // Shadow cutoff
        const isShadow = cosI <= 0.02;
        const baseShading = isShadow ? 15 : 30 + 210 * (0.65 * cosI + 0.35 * lommelSeeliger);

        // Random lunar sensor shot noise
        const noise = (Math.random() - 0.5) * 255 * noiseLevel;
        intensity = Math.max(10, Math.min(250, Math.round(baseShading + noise)));
      } else {
        intensity = 15; // Space
      }

      const idx = (y * width + x) * 4;
      data[idx] = intensity;     // R
      data[idx + 1] = intensity; // G
      data[idx + 2] = intensity; // B
      data[idx + 3] = 255;       // A
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Built-in Demo Datasets
 */
export const DEMO_DATASETS: DemoDataset[] = [
  {
    id: 'demo_ch2_ohrc_tmc',
    title: 'Chandrayaan-2 OHRC vs TMC-2 (Lunar South Pole)',
    subtitle: 'Cross-sensor resolution (0.25m vs 5.0m) & sun elevation variation',
    description: 'Real-world simulation of Chandrayaan-2 Optical High Resolution Camera (OHRC) moving image registering to Terrain Mapping Camera-2 (TMC-2) reference grid over the Boguslawsky South Pole crater region with 14° sun angle difference.',
    region: 'Boguslawsky Crater (72.9° S, 43.2° E)',
    sourceSensor: 'OHRC',
    referenceSensor: 'TMC',
    sourceSunElevation: 42,
    referenceSunElevation: 28,
    expectedChallenge: 'Multi-scale resolution discrepancy, deep shadows, and minor orbit drift.',
    sourceImage: generateSyntheticLunarImage(480, 480, 55, 42, 0.06, -6.5, 1.08, 14, -12, 101),
    referenceImage: generateSyntheticLunarImage(480, 480, 40, 28, 0.08, 0, 1.0, 0, 0, 101),
    sourceMeta: {
      name: 'CH2_OHRC_20230815_SPOLE_042.PNG',
      sensor: 'OHRC',
      resolutionMeters: 0.25,
      sunAzimuthDeg: 55,
      sunElevationDeg: 42,
      targetRegion: 'Boguslawsky Lunar South Pole',
      geoCenterLat: -72.90,
      geoCenterLon: 43.20,
    },
    referenceMeta: {
      name: 'CH2_TMC2_20230712_REF_028.PNG',
      sensor: 'TMC',
      resolutionMeters: 5.0,
      sunAzimuthDeg: 40,
      sunElevationDeg: 28,
      targetRegion: 'Boguslawsky Lunar South Pole',
      geoCenterLat: -72.90,
      geoCenterLon: 43.20,
    },
  },
  {
    id: 'demo_tmc_stereo',
    title: 'Chandrayaan-2 TMC-2 Stereo Pair (Mare Tranquillitatis)',
    subtitle: 'Orbit Parallax & Viewpoint Shift',
    description: 'Stereo forward and aft camera passes observing lunar mare basaltic plains and crater ejecta blanket features with a 12° perspective viewpoint shift and rotation.',
    region: 'Mare Tranquillitatis (0.67° N, 23.47° E)',
    sourceSensor: 'TMC',
    referenceSensor: 'TMC',
    sourceSunElevation: 35,
    referenceSunElevation: 32,
    expectedChallenge: 'Perspective parallax distortion and low-contrast mare terrain.',
    sourceImage: generateSyntheticLunarImage(480, 480, 120, 35, 0.05, 11.2, 0.94, -18, 16, 202),
    referenceImage: generateSyntheticLunarImage(480, 480, 110, 32, 0.05, 0, 1.0, 0, 0, 202),
    sourceMeta: {
      name: 'CH2_TMC2_STEREO_FWD_MARE.PNG',
      sensor: 'TMC',
      resolutionMeters: 5.0,
      sunAzimuthDeg: 120,
      sunElevationDeg: 35,
      targetRegion: 'Mare Tranquillitatis',
      geoCenterLat: 0.67,
      geoCenterLon: 23.47,
    },
    referenceMeta: {
      name: 'CH2_TMC2_STEREO_AFT_MARE.PNG',
      sensor: 'TMC',
      resolutionMeters: 5.0,
      sunAzimuthDeg: 110,
      sunElevationDeg: 32,
      targetRegion: 'Mare Tranquillitatis',
      geoCenterLat: 0.67,
      geoCenterLon: 23.47,
    },
  },
  {
    id: 'demo_shackleton_shadow',
    title: 'Shackleton Crater Rim (Permanent Shadow & Grazing Sun)',
    subtitle: 'Extreme illumination contrast & 8° grazing sun angle',
    description: 'High-contrast lunar South Pole region with permanently shadowed crater floor and illuminated rim crest, requiring robust gradient-based feature detection.',
    region: 'Shackleton Crater (89.9° S, 0.0° E)',
    sourceSensor: 'OHRC',
    referenceSensor: 'LROC_NAC',
    sourceSunElevation: 8,
    referenceSunElevation: 14,
    expectedChallenge: 'Extreme shadow dynamic range and steep topographic gradients.',
    sourceImage: generateSyntheticLunarImage(480, 480, 210, 8, 0.07, -4.5, 1.05, 8, 10, 303),
    referenceImage: generateSyntheticLunarImage(480, 480, 185, 14, 0.06, 0, 1.0, 0, 0, 303),
    sourceMeta: {
      name: 'CH2_OHRC_SHACKLETON_RIM_08DEG.PNG',
      sensor: 'OHRC',
      resolutionMeters: 0.32,
      sunAzimuthDeg: 210,
      sunElevationDeg: 8,
      targetRegion: 'Shackleton Crater Rim',
      geoCenterLat: -89.90,
      geoCenterLon: 0.00,
    },
    referenceMeta: {
      name: 'LROC_NAC_SHACKLETON_REF_14DEG.PNG',
      sensor: 'LROC_NAC',
      resolutionMeters: 0.50,
      sunAzimuthDeg: 185,
      sunElevationDeg: 14,
      targetRegion: 'Shackleton Crater Rim',
      geoCenterLat: -89.90,
      geoCenterLon: 0.00,
    },
  },
];
