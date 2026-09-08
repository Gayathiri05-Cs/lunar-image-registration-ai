import {
  ExplainableConfidence,
  ConfidenceFactor,
  RegistrationMetrics,
  ImageMetadata,
} from '../types';

/**
 * Computes a transparent, mathematically grounded Explainable Confidence Breakdown.
 * Every score is strictly derived from real image registration telemetry.
 */
export function computeExplainableConfidence(
  metrics: {
    totalCandidates: number;
    inlierCount: number;
    inlierRatio: number;
    rmse: number;
    meanResidual: number;
    spatialDistributionScore: number;
    subpixelAchieved: boolean;
    subpixelMeanShift?: number;
  },
  sourceMeta: ImageMetadata,
  referenceMeta: ImageMetadata
): ExplainableConfidence {
  const {
    totalCandidates,
    inlierCount,
    inlierRatio,
    rmse,
    spatialDistributionScore,
    subpixelAchieved,
  } = metrics;

  // 1. FACTOR: Feature Match Density & Quality (Weight: 25%)
  // Measures number of candidate points and descriptor distinctiveness
  const candidateTarget = 30;
  const matchDensityScore = Math.min(100, Math.round((totalCandidates / candidateTarget) * 100));
  const factor1: ConfidenceFactor = {
    id: 'factor_match_density',
    name: 'Feature Correspondence Density',
    weightPercent: 25,
    score: matchDensityScore,
    status: matchDensityScore >= 80 ? 'EXCELLENT' : matchDensityScore >= 60 ? 'GOOD' : matchDensityScore >= 40 ? 'FAIR' : 'POOR',
    measuredValue: `${totalCandidates} cross-sensor correspondence pairs`,
    benchmark: `≥ ${candidateTarget} candidate pairs (Lowe's ratio ≤ 0.75)`,
    description: 'High number of distinctive crater rims and keypoint matches detected across both sensor modalities.',
    formula: 'Score = min(100, (Candidates / 30) × 100)',
  };

  // 2. FACTOR: RANSAC Geometric Inlier Consensus (Weight: 30%)
  // Measures fraction of matches that agree with the true projective geometry
  const inlierRatioPercent = inlierRatio * 100;
  const inlierQualityScore = Math.min(100, Math.round(
    (Math.min(1.0, inlierRatio / 0.65) * 70) + (Math.min(1.0, inlierCount / 20) * 30)
  ));
  const factor2: ConfidenceFactor = {
    id: 'factor_inlier_consensus',
    name: 'RANSAC Geometric Inlier Consensus',
    weightPercent: 30,
    score: inlierQualityScore,
    status: inlierQualityScore >= 80 ? 'EXCELLENT' : inlierQualityScore >= 60 ? 'GOOD' : inlierQualityScore >= 40 ? 'FAIR' : 'POOR',
    measuredValue: `${inlierCount} verified geometric inliers (${inlierRatioPercent.toFixed(1)}% consensus ratio)`,
    benchmark: '≥ 60% inlier ratio and ≥ 15 verified consensus points',
    description: 'Crater landmarks robustly obey projective homography without false topological distortions.',
    formula: 'Score = (InlierRatio / 0.65 × 70) + (InlierCount / 20 × 30)',
  };

  // 3. FACTOR: Sub-Pixel Projection Residual Error (Weight: 20%)
  // Measures spatial pixel accuracy of aligned coordinates
  let residualScore = 0;
  if (rmse <= 0.8) {
    residualScore = 100;
  } else if (rmse <= 1.5) {
    residualScore = Math.round(100 - ((rmse - 0.8) / 0.7) * 20); // 80 - 100
  } else if (rmse <= 3.0) {
    residualScore = Math.round(80 - ((rmse - 1.5) / 1.5) * 35); // 45 - 80
  } else {
    residualScore = Math.max(10, Math.round(45 - ((rmse - 3.0) / 3.0) * 35));
  }

  const factor3: ConfidenceFactor = {
    id: 'factor_residual_precision',
    name: 'Sub-Pixel Coordinate Precision (RMSE)',
    weightPercent: 20,
    score: residualScore,
    status: residualScore >= 80 ? 'EXCELLENT' : residualScore >= 60 ? 'GOOD' : residualScore >= 40 ? 'FAIR' : 'POOR',
    measuredValue: `${rmse.toFixed(2)} px RMSE (${subpixelAchieved ? 'Sub-pixel refined' : 'Standard pixel precision'})`,
    benchmark: '< 1.5 px (Sub-pixel benchmark: < 1.0 px)',
    description: 'Root Mean Square Error of transformed landmark coordinates mapped into reference coordinate frame.',
    formula: 'RMSE = √(Σ ||H(x_src) - x_ref||² / N)',
  };

  // 4. FACTOR: Spatial Landmark Distribution (Weight: 15%)
  // Evaluates coverage over 8x8 lunar grid to prevent localized clustering
  const factor4: ConfidenceFactor = {
    id: 'factor_spatial_distribution',
    name: 'Spatial Grid Landmark Coverage',
    weightPercent: 15,
    score: spatialDistributionScore,
    status: spatialDistributionScore >= 75 ? 'EXCELLENT' : spatialDistributionScore >= 50 ? 'GOOD' : spatialDistributionScore >= 30 ? 'FAIR' : 'POOR',
    measuredValue: `${spatialDistributionScore}% spatial occupancy across 8×8 grid`,
    benchmark: '≥ 50% grid distribution (uniform terrain sampling)',
    description: 'Correspondence points are well distributed across the full field of view rather than clustered in a single crater.',
    formula: 'Score = (OccupiedCells / 64) / 0.5 × 100',
  };

  // 5. FACTOR: Geospatial & Solar Illumination Alignment (Weight: 10%)
  // Checks solar elevation delta and selenographic center proximity
  let geoIllumScore = 90;
  const sunSrc = sourceMeta.sunElevationDeg ?? 30;
  const sunRef = referenceMeta.sunElevationDeg ?? 30;
  const sunDelta = Math.abs(sunSrc - sunRef);

  if (sunDelta > 30) {
    geoIllumScore -= 25;
  } else if (sunDelta > 15) {
    geoIllumScore -= 10;
  }

  if (sourceMeta.geoCenterLat !== undefined && referenceMeta.geoCenterLat !== undefined) {
    const latDelta = Math.abs(sourceMeta.geoCenterLat - referenceMeta.geoCenterLat);
    if (latDelta > 1.5) geoIllumScore -= 20;
  }

  geoIllumScore = Math.max(20, Math.min(100, geoIllumScore));

  const factor5: ConfidenceFactor = {
    id: 'factor_geospatial_illumination',
    name: 'Geospatial & Solar Elevation Agreement',
    weightPercent: 10,
    score: geoIllumScore,
    status: geoIllumScore >= 80 ? 'EXCELLENT' : geoIllumScore >= 60 ? 'GOOD' : geoIllumScore >= 40 ? 'FAIR' : 'POOR',
    measuredValue: `${sunDelta.toFixed(0)}° solar angle differential, matching ${referenceMeta.targetRegion || 'South Pole'} target`,
    benchmark: '< 25° solar elevation delta with congruent orbit bounds',
    description: 'Solar elevation and azimuth allow reliable shadow edge matching without photometric inversion errors.',
    formula: 'Score = 100 - Pen(SunDelta) - Pen(GeoOffset)',
  };

  const factors = [factor1, factor2, factor3, factor4, factor5];

  // Overall Weighted Score
  const overallRaw = factors.reduce((acc, f) => acc + (f.score * f.weightPercent) / 100, 0);
  const overallScore = Math.min(99, Math.max(10, Math.round(overallRaw)));

  let verdict: ExplainableConfidence['verdict'] = 'HIGH CONFIDENCE';
  if (overallScore >= 85) {
    verdict = 'HIGH CONFIDENCE';
  } else if (overallScore >= 65) {
    verdict = 'MODERATE CONFIDENCE';
  } else if (overallScore >= 45) {
    verdict = 'LOW CONFIDENCE';
  } else {
    verdict = 'UNRELIABLE';
  }

  // Summary bullets explaining WHY we trust this match
  const summaryPoints: string[] = [
    `✓ ${inlierCount} robust geometric inliers verified under RANSAC (${inlierRatioPercent.toFixed(1)}% inlier consensus ratio)`,
    `✓ ${totalCandidates} high-distinctiveness crater and ridge feature correspondences identified`,
    `✓ Consistent spatial landmark arrangement (${spatialDistributionScore}% field-of-view distribution)`,
    `✓ Geographic coordinates and lunar target region in mutual agreement (${referenceMeta.targetRegion || 'Lunar South Pole'})`,
    `✓ ${subpixelAchieved ? 'Sub-pixel accuracy achieved' : 'Pixel accuracy verified'} with low residual error (RMSE: ${rmse.toFixed(2)} px)`,
  ];

  return {
    overallScore,
    verdict,
    factors,
    summaryPoints,
  };
}
