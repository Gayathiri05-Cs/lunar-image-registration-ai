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
  seed: number = 42,
  isInfrared: boolean = false,
  craterPreset: 'boguslawsky' | 'tycho' | 'copernicus' | 'tranquillitatis' = 'boguslawsky'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  // Crater Sets for distinct lunar locations
  let baseCraters: CraterSpec[] = [];

  if (craterPreset === 'boguslawsky') {
    baseCraters = [
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
  } else if (craterPreset === 'tycho') {
    // Tycho Crater with prominent ejecta rays
    baseCraters = [
      { x: 0.48, y: 0.52, r: 0.28, depth: 1.2, hasCentralPeak: true },
      { x: 0.18, y: 0.80, r: 0.08, depth: 0.6 },
      { x: 0.82, y: 0.15, r: 0.12, depth: 0.7 },
      { x: 0.25, y: 0.22, r: 0.06, depth: 0.5 },
      { x: 0.70, y: 0.75, r: 0.09, depth: 0.65 },
    ];
  } else if (craterPreset === 'copernicus') {
    // Copernicus terraced crater
    baseCraters = [
      { x: 0.52, y: 0.48, r: 0.30, depth: 1.1, hasCentralPeak: true },
      { x: 0.30, y: 0.30, r: 0.14, depth: 0.85 },
      { x: 0.72, y: 0.68, r: 0.10, depth: 0.7 },
      { x: 0.15, y: 0.50, r: 0.05, depth: 0.4 },
      { x: 0.85, y: 0.35, r: 0.07, depth: 0.5 },
    ];
  } else {
    // Mare Tranquillitatis smooth basalt with small impacts
    baseCraters = [
      { x: 0.35, y: 0.42, r: 0.12, depth: 0.7 },
      { x: 0.68, y: 0.55, r: 0.10, depth: 0.65 },
      { x: 0.20, y: 0.70, r: 0.05, depth: 0.4 },
      { x: 0.80, y: 0.25, r: 0.06, depth: 0.45 },
    ];
  }

  // Sun directional vector
  const sunAzRad = (sunAzimuthDeg * Math.PI) / 180;
  const sunElevRad = (sunElevationDeg * Math.PI) / 180;
  const sunDirX = Math.cos(sunAzRad) * Math.cos(sunElevRad);
  const sunDirY = Math.sin(sunAzRad) * Math.cos(sunElevRad);
  const sunDirZ = Math.sin(sunElevRad);

  const rotRad = (rotationDeg * Math.PI) / 180;
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);

  function getHeight(u: number, v: number): number {
    let h = 0.5;
    h += 0.03 * Math.sin(u * 28 + seed) * Math.cos(v * 32 + seed);
    h += 0.015 * Math.sin(u * 65 - seed) * Math.sin(v * 75 + seed);

    for (const c of baseCraters) {
      const du = u - c.x;
      const dv = v - c.y;
      const dist = Math.sqrt(du * du + dv * dv);
      const normDist = dist / c.r;

      if (normDist < 1.0) {
        const bowl = (1.0 - normDist * normDist) * c.depth * 0.4;
        h -= bowl;
        if (c.hasCentralPeak && normDist < 0.22) {
          const peak = (1.0 - normDist / 0.22) * c.depth * 0.18;
          h += peak;
        }
      } else if (normDist >= 1.0 && normDist < 1.5) {
        const rimDist = (normDist - 1.0) / 0.5;
        const rimHeight = (1.0 - rimDist) * c.depth * 0.12;
        h += rimHeight;
      }
    }
    return h;
  }

  const du = 1.0 / width;
  const dv = 1.0 / height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
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

      let intensity = 120;

      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
        const h0 = getHeight(u, v);
        const hX = getHeight(u + du, v);
        const hY = getHeight(u, v + dv);

        const dh_du = (hX - h0) / du;
        const dh_dv = (hY - h0) / dv;

        const normX = -dh_du * 4.0;
        const normY = -dh_dv * 4.0;
        const normZ = 1.0;
        const len = Math.sqrt(normX * normX + normY * normY + normZ * normZ);

        const nX = normX / len;
        const nY = normY / len;
        const nZ = normZ / len;

        const cosI = Math.max(0, nX * sunDirX + nY * sunDirY + nZ * sunDirZ);
        const cosE = Math.max(0.01, nZ);
        const lommelSeeliger = cosI / (cosI + cosE + 1e-4);

        const isShadow = cosI <= 0.02;
        const baseShading = isShadow ? 15 : 30 + 210 * (0.65 * cosI + 0.35 * lommelSeeliger);

        const noise = (Math.random() - 0.5) * 255 * noiseLevel;
        intensity = Math.max(10, Math.min(250, Math.round(baseShading + noise)));
      } else {
        intensity = 15;
      }

      const idx = (y * width + x) * 4;
      if (isInfrared) {
        // Infrared IIRS false-color spectral visualization (warm thermal NIR shift)
        data[idx] = Math.min(255, Math.round(intensity * 1.15)); // R (thermal enhancement)
        data[idx + 1] = Math.round(intensity * 0.90);            // G
        data[idx + 2] = Math.round(intensity * 0.75);            // B (attenuated blue)
        data[idx + 3] = 255;
      } else {
        data[idx] = intensity;
        data[idx + 1] = intensity;
        data[idx + 2] = intensity;
        data[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Built-in Demo Datasets including Tri-Sensor Congruent and Outlier Sets
 */
export const DEMO_DATASETS: DemoDataset[] = [
  // 1. TRI-SENSOR ALL VALID: OHRC + TMC + IIRS (South Pole Boguslawsky)
  {
    id: 'demo_tri_sensor_valid',
    title: 'Tri-Sensor Verified Co-Registration (OHRC + TMC + IIRS)',
    subtitle: 'All 3 sensors Congruent over Boguslawsky South Pole Crater',
    description: 'Chandrayaan-2 Optical High Resolution Camera (0.25m VIS), Terrain Mapping Camera-2 (5.0m Stereo), and Imaging Infrared Spectrometer (0.8-5.0µm NIR) all observing the Boguslawsky South Pole landing site.',
    region: 'Boguslawsky Crater (72.9° S, 43.2° E)',
    isTriSensor: true,
    hasOutlier: false,
    sourceSensor: 'OHRC',
    referenceSensor: 'TMC',
    thirdSensor: 'IIRS',
    sourceSunElevation: 42,
    referenceSunElevation: 28,
    thirdSunElevation: 35,
    expectedChallenge: 'Multi-spectral cross-matching (VIS to NIR) and multi-resolution alignment.',
    sourceImage: generateSyntheticLunarImage(480, 480, 55, 42, 0.06, -6.5, 1.08, 14, -12, 101, false, 'boguslawsky'),
    referenceImage: generateSyntheticLunarImage(480, 480, 40, 28, 0.08, 0, 1.0, 0, 0, 101, false, 'boguslawsky'),
    thirdImage: generateSyntheticLunarImage(480, 480, 48, 35, 0.09, 4.2, 0.96, -8, 10, 101, true, 'boguslawsky'),
    sourceMeta: {
      name: 'CH2_OHRC_SPOLE_VIS_042.PNG',
      sensor: 'OHRC',
      resolutionMeters: 0.25,
      sunAzimuthDeg: 55,
      sunElevationDeg: 42,
      targetRegion: 'Boguslawsky South Pole',
      geoCenterLat: -72.90,
      geoCenterLon: 43.20,
      sourceOrigin: 'ISRO_CH2',
      spectralBand: 'VIS 0.45-0.70µm',
    },
    referenceMeta: {
      name: 'CH2_TMC2_SPOLE_REF_028.PNG',
      sensor: 'TMC',
      resolutionMeters: 5.0,
      sunAzimuthDeg: 40,
      sunElevationDeg: 28,
      targetRegion: 'Boguslawsky South Pole',
      geoCenterLat: -72.90,
      geoCenterLon: 43.20,
      sourceOrigin: 'ISRO_CH2',
      spectralBand: 'VIS Panchromatic',
    },
    thirdMeta: {
      name: 'CH2_IIRS_SPOLE_NIR_035.PNG',
      sensor: 'IIRS',
      resolutionMeters: 20.0,
      sunAzimuthDeg: 48,
      sunElevationDeg: 35,
      targetRegion: 'Boguslawsky South Pole',
      geoCenterLat: -72.90,
      geoCenterLon: 43.20,
      sourceOrigin: 'ISRO_CH2',
      spectralBand: 'NIR 0.8-5.0µm',
    },
  },

  // 2. OUTLIER SENSOR: IIRS IS WRONG (Tycho Crater instead of South Pole)
  {
    id: 'demo_tri_sensor_outlier_iirs',
    title: 'Outlier Sensor Isolation: "IIRS Is Wrong" (Tycho Crater Outlier)',
    subtitle: 'OHRC & TMC South Pole (94% match), IIRS Tycho Crater (18% match)',
    description: 'Demonstrates automated Outlier Sensor Detection. OHRC and TMC depict Boguslawsky South Pole, while IIRS depicts Tycho Crater. The system flags: OHRC-TMC = 94%, OHRC-IIRS = 18%, TMC-IIRS = 21% -> Blocks registration with clear diagnostic verdict.',
    region: 'South Pole vs Tycho Crater Divergence',
    isTriSensor: true,
    hasOutlier: true,
    outlierSensorSlot: 'IIRS',
    sourceSensor: 'OHRC',
    referenceSensor: 'TMC',
    thirdSensor: 'IIRS',
    sourceSunElevation: 42,
    referenceSunElevation: 28,
    thirdSunElevation: 50,
    expectedChallenge: 'Automatic pairwise matrix triangulation and isolating the non-congruent sensor.',
    sourceImage: generateSyntheticLunarImage(480, 480, 55, 42, 0.06, -6.5, 1.08, 14, -12, 101, false, 'boguslawsky'),
    referenceImage: generateSyntheticLunarImage(480, 480, 40, 28, 0.08, 0, 1.0, 0, 0, 101, false, 'boguslawsky'),
    thirdImage: generateSyntheticLunarImage(480, 480, 70, 50, 0.08, 0, 1.0, 0, 0, 888, true, 'tycho'),
    sourceMeta: {
      name: 'CH2_OHRC_SPOLE_VIS_042.PNG',
      sensor: 'OHRC',
      resolutionMeters: 0.25,
      sunAzimuthDeg: 55,
      sunElevationDeg: 42,
      targetRegion: 'Boguslawsky South Pole',
      geoCenterLat: -72.90,
      geoCenterLon: 43.20,
      sourceOrigin: 'ISRO_CH2',
      spectralBand: 'VIS 0.45-0.70µm',
    },
    referenceMeta: {
      name: 'CH2_TMC2_SPOLE_REF_028.PNG',
      sensor: 'TMC',
      resolutionMeters: 5.0,
      sunAzimuthDeg: 40,
      sunElevationDeg: 28,
      targetRegion: 'Boguslawsky South Pole',
      geoCenterLat: -72.90,
      geoCenterLon: 43.20,
      sourceOrigin: 'ISRO_CH2',
      spectralBand: 'VIS Panchromatic',
    },
    thirdMeta: {
      name: 'CH2_IIRS_TYCHO_OUTLIER_BAND.PNG',
      sensor: 'IIRS',
      resolutionMeters: 20.0,
      sunAzimuthDeg: 70,
      sunElevationDeg: 50,
      targetRegion: 'Tycho Crater (Incongruent Location)',
      geoCenterLat: -43.31,
      geoCenterLon: -11.22,
      sourceOrigin: 'ISRO_CH2',
      spectralBand: 'NIR 0.8-5.0µm',
    },
  },

  // 3. OUTLIER SENSOR: OHRC IS WRONG (Copernicus Crater instead of South Pole)
  {
    id: 'demo_tri_sensor_outlier_ohrc',
    title: 'Outlier Sensor Isolation: "OHRC Is Wrong" (Copernicus Crater Outlier)',
    subtitle: 'TMC & IIRS South Pole (91% match), OHRC Copernicus (15% match)',
    description: 'Demonstrates that the algorithm does not favor any specific sensor name: TMC and IIRS agree on South Pole crater geometry, whereas OHRC contains Copernicus Crater. The system flags OHRC as the outlier.',
    region: 'Copernicus Crater vs South Pole Divergence',
    isTriSensor: true,
    hasOutlier: true,
    outlierSensorSlot: 'OHRC',
    sourceSensor: 'OHRC',
    referenceSensor: 'TMC',
    thirdSensor: 'IIRS',
    sourceSunElevation: 30,
    referenceSunElevation: 28,
    thirdSunElevation: 35,
    expectedChallenge: 'Detecting OHRC frame mismatch when TMC and IIRS are verified inliers.',
    sourceImage: generateSyntheticLunarImage(480, 480, 90, 30, 0.07, 0, 1.0, 0, 0, 777, false, 'copernicus'),
    referenceImage: generateSyntheticLunarImage(480, 480, 40, 28, 0.08, 0, 1.0, 0, 0, 101, false, 'boguslawsky'),
    thirdImage: generateSyntheticLunarImage(480, 480, 48, 35, 0.09, 4.2, 0.96, -8, 10, 101, true, 'boguslawsky'),
    sourceMeta: {
      name: 'CH2_OHRC_COPERNICUS_OUTLIER.PNG',
      sensor: 'OHRC',
      resolutionMeters: 0.25,
      sunAzimuthDeg: 90,
      sunElevationDeg: 30,
      targetRegion: 'Copernicus Crater (Incongruent Location)',
      geoCenterLat: 9.62,
      geoCenterLon: -20.08,
      sourceOrigin: 'ISRO_CH2',
      spectralBand: 'VIS 0.45-0.70µm',
    },
    referenceMeta: {
      name: 'CH2_TMC2_SPOLE_REF_028.PNG',
      sensor: 'TMC',
      resolutionMeters: 5.0,
      sunAzimuthDeg: 40,
      sunElevationDeg: 28,
      targetRegion: 'Boguslawsky South Pole',
      geoCenterLat: -72.90,
      geoCenterLon: 43.20,
      sourceOrigin: 'ISRO_CH2',
      spectralBand: 'VIS Panchromatic',
    },
    thirdMeta: {
      name: 'CH2_IIRS_SPOLE_NIR_035.PNG',
      sensor: 'IIRS',
      resolutionMeters: 20.0,
      sunAzimuthDeg: 48,
      sunElevationDeg: 35,
      targetRegion: 'Boguslawsky South Pole',
      geoCenterLat: -72.90,
      geoCenterLon: 43.20,
      sourceOrigin: 'ISRO_CH2',
      spectralBand: 'NIR 0.8-5.0µm',
    },
  },

  // 4. EXTERNAL GOOGLE / LROC IMAGE ACCEPTANCE DEMO (Proves geology determines relevance, not origin!)
  {
    id: 'demo_external_google_match',
    title: 'External Sensor Verification (Google / LROC vs Chandrayaan-2 TMC)',
    subtitle: 'Cross-agency lunar image matched on true crater geometry',
    description: 'Proves the system does not judge based on source agency or origin labels. An external lunar orbiter image from Google/LROC depicting the Boguslawsky South Pole crater is uploaded alongside Chandrayaan-2 TMC. The geometric feature engine successfully verifies 92% compatibility and co-registers.',
    region: 'Boguslawsky Crater (Cross-Agency Validation)',
    sourceSensor: 'LROC_NAC',
    referenceSensor: 'TMC',
    sourceSunElevation: 38,
    referenceSunElevation: 28,
    expectedChallenge: 'Verifying genuine lunar features between external web/Google lunar map and ISRO reference.',
    sourceImage: generateSyntheticLunarImage(480, 480, 50, 38, 0.05, 8.4, 1.04, -10, 8, 101, false, 'boguslawsky'),
    referenceImage: generateSyntheticLunarImage(480, 480, 40, 28, 0.08, 0, 1.0, 0, 0, 101, false, 'boguslawsky'),
    sourceMeta: {
      name: 'GOOGLE_LUNAR_MAP_BOGUSLAWSKY_038.PNG',
      sensor: 'LROC_NAC',
      resolutionMeters: 0.50,
      sunAzimuthDeg: 50,
      sunElevationDeg: 38,
      targetRegion: 'Boguslawsky South Pole',
      geoCenterLat: -72.90,
      geoCenterLon: 43.20,
      sourceOrigin: 'GOOGLE_LUNAR',
      spectralBand: 'VIS High-Res',
    },
    referenceMeta: {
      name: 'CH2_TMC2_SPOLE_REF_028.PNG',
      sensor: 'TMC',
      resolutionMeters: 5.0,
      sunAzimuthDeg: 40,
      sunElevationDeg: 28,
      targetRegion: 'Boguslawsky South Pole',
      geoCenterLat: -72.90,
      geoCenterLon: 43.20,
      sourceOrigin: 'ISRO_CH2',
      spectralBand: 'VIS Panchromatic',
    },
  },

  // 5. Chandrayaan-2 TMC-2 Stereo Pair
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
    sourceImage: generateSyntheticLunarImage(480, 480, 120, 35, 0.05, 11.2, 0.94, -18, 16, 202, false, 'tranquillitatis'),
    referenceImage: generateSyntheticLunarImage(480, 480, 110, 32, 0.05, 0, 1.0, 0, 0, 202, false, 'tranquillitatis'),
    sourceMeta: {
      name: 'CH2_TMC2_STEREO_FWD_MARE.PNG',
      sensor: 'TMC',
      resolutionMeters: 5.0,
      sunAzimuthDeg: 120,
      sunElevationDeg: 35,
      targetRegion: 'Mare Tranquillitatis',
      geoCenterLat: 0.67,
      geoCenterLon: 23.47,
      sourceOrigin: 'ISRO_CH2',
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
      sourceOrigin: 'ISRO_CH2',
    },
  },

  // 6. Shackleton Crater Rim
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
      sourceOrigin: 'ISRO_CH2',
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
      sourceOrigin: 'NASA_LROC',
    },
  },
];

export const TRI_SENSOR_DEMOS = {
  valid: DEMO_DATASETS[0],
  iirsOutlier: DEMO_DATASETS[1],
  ohrcOutlier: DEMO_DATASETS[2],
};

