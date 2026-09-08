export type SensorType = 'OHRC' | 'TMC' | 'IIRS' | 'LROC_NAC' | 'KAGUYA_TC' | 'OTHER' | 'UNKNOWN';
export type LunarSensorType = SensorType;

export type FeatureMethod = 'SIFT' | 'ORB' | 'AKAZE' | 'HYBRID' | 'HYBRID_LUNAR';
export type TransformModelType = 'HOMOGRAPHY' | 'AFFINE' | 'SIMILARITY' | 'RIGID';
export type VisualMode = 'side_by_side' | 'overlay' | 'blink' | 'difference' | 'matches' | 'tri_sensor';
export type VisualizationMode = 'SIDE_BY_SIDE' | 'OVERLAY' | 'BLINK' | 'DIFFERENCE' | 'MATCHES' | 'HEATMAP' | 'TRI_SENSOR' | VisualMode;
export type BlendMode = 'alpha' | 'split_wipe' | 'checkerboard' | 'difference' | 'ALPHA' | 'SPLIT_WIPE' | 'CHECKERBOARD' | 'DIFFERENCE' | 'EDGES';

export interface ImageMetadata {
  name: string;
  width: number;
  height: number;
  fileSize?: number;
  format?: string;
  sensor: SensorType;
  resolutionMeters?: number;
  sunAzimuthDeg?: number;
  sunElevationDeg?: number;
  acquisitionDate?: string;
  orbitNumber?: number;
  targetRegion?: string;
  geoCenterLat?: number;
  geoCenterLon?: number;
  pixelScaleKm?: number;
  sourceOrigin?: string; // e.g., 'ISRO_CH2', 'GOOGLE_LUNAR', 'NASA_LROC', 'USER_UPLOAD'
  spectralBand?: string; // e.g., 'VIS 0.45-0.70um', 'NIR 0.8-5.0um'
}

export interface Keypoint {
  id: number;
  x: number;
  y: number;
  scale: number;
  angle: number; // in radians or degrees
  response: number;
  octave: number;
}

export interface FeatureDescriptor {
  keypoint: Keypoint;
  descriptor: Float32Array | Uint8Array;
}

export interface MatchPoint {
  id: number;
  sourceKeypoint: Keypoint;
  referenceKeypoint: Keypoint;
  distance: number;
  inlier: boolean;
  residualError?: number; // in pixels
  residualPx?: number;
  refinedSourceX?: number;
  refinedSourceY?: number;
  lunarLat?: number;
  lunarLon?: number;
}

export interface TransformationMatrix {
  type: TransformModelType;
  matrix: number[][]; // 3x3 for homography or 2x3 for affine
  inverseMatrix?: number[][];
  determinant?: number;
  scaleFactor?: number;
  rotationDeg?: number;
  translationX?: number;
  translationY?: number;
}

// ----------------------------------------------------
// Feature 3: Explainable Confidence Factor Models
// ----------------------------------------------------
export interface ConfidenceFactor {
  id: string;
  name: string;
  weightPercent: number;
  score: number; // 0 - 100
  status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  measuredValue: string;
  benchmark: string;
  description: string;
  formula: string;
}

export interface ExplainableConfidence {
  overallScore: number; // 0 to 100
  verdict: 'HIGH CONFIDENCE' | 'MODERATE CONFIDENCE' | 'LOW CONFIDENCE' | 'UNRELIABLE';
  factors: ConfidenceFactor[];
  summaryPoints: string[];
}

export interface RegistrationMetrics {
  totalCandidates: number;
  inlierCount: number;
  outlierCount: number;
  inlierRatio: number; // 0 to 1
  rmse: number; // Root Mean Square Error in pixels
  meanResidual: number;
  maxResidual: number;
  confidenceScore: number; // 0 to 100%
  explainableConfidence?: ExplainableConfidence;
  spatialDistributionScore: number; // 0 to 100%
  spatialWarning?: string;
  subpixelAchieved: boolean;
  subpixelMeanShift?: number; // in pixels
  processingTimeMs: number;
  ransacIterations: number;
}

// ----------------------------------------------------
// Feature 2: Lunar Feature Identity Card Models
// ----------------------------------------------------
export type LunarFeatureType = 
  | 'CRATER' 
  | 'CENTRAL_PEAK' 
  | 'RIM_CREST' 
  | 'RIDGE' 
  | 'RILLE' 
  | 'BOULDER_FIELD' 
  | 'MARE_BASIN';

export interface LunarFeatureSensorDetection {
  sensor: SensorType;
  detected: boolean;
  pixelCoords?: { x: number; y: number };
  snr?: number;
  scale?: number;
}

export interface LunarFeatureIDCard {
  id: string; // e.g. "PRISM-LF-00127"
  name: string; // e.g. "Boguslawsky South Crater Rim A"
  type: LunarFeatureType;
  lunarLat: number; // e.g. -72.9142
  lunarLon: number; // e.g. 43.1850
  diameterMeters?: number;
  confidence: number; // 0 - 100
  observedSensors: LunarFeatureSensorDetection[];
  firstObservedDate: string;
  lastVerifiedDate: string;
  observationCount: number;
  isPreviouslyObserved: boolean;
  description: string;
  keypointThumbnail?: string;
}

// ----------------------------------------------------
// Feature 1: Tri-Sensor Outlier Detection Models
// ----------------------------------------------------
export interface PairwiseMatchResult {
  sensorA: SensorType;
  sensorB: SensorType;
  imageAName: string;
  imageBName: string;
  candidateCount: number;
  inlierCount: number;
  inlierRatio: number;
  rmse: number;
  spatialCoverage: number;
  compatibilityScore: number; // 0 to 100%
  isCompatible: boolean;
  reason: string;
  matches?: MatchPoint[];
}

export interface TriSensorValidationResult {
  status: 'ALL_VALID' | 'OUTLIER_DETECTED' | 'MULTIPLE_OUTLIERS' | 'INCONCLUSIVE';
  outlierSensor?: SensorType;
  outlierName?: string;
  outlierSlot?: 'OHRC' | 'TMC' | 'IIRS';
  validSensors: SensorType[];
  pairwise: {
    ohrc_tmc: PairwiseMatchResult;
    ohrc_iirs: PairwiseMatchResult;
    tmc_iirs: PairwiseMatchResult;
  };
  diagnosticMessage: string;
  detailedReason: string;
  canProceedWithPair: boolean;
  suggestedAction: string;
}

export interface TriSensorSlotData {
  image: string | null;
  meta: ImageMetadata | null;
}

export interface RegistrationResult {
  id: string;
  timestamp: string;
  sourceMeta: ImageMetadata;
  referenceMeta: ImageMetadata;
  thirdMeta?: ImageMetadata;
  featureMethod: FeatureMethod;
  transformModel: TransformModelType;
  sourceKeypoints: Keypoint[];
  referenceKeypoints: Keypoint[];
  thirdKeypoints?: Keypoint[];
  matches: MatchPoint[];
  transformation: TransformationMatrix;
  metrics: RegistrationMetrics;
  registeredDataUrl: string;
  differenceDataUrl?: string;
  matchesDataUrl?: string;
  sourceDataUrl: string;
  referenceDataUrl: string;
  thirdDataUrl?: string;
  triSensorValidation?: TriSensorValidationResult;
  lunarFeatures?: LunarFeatureIDCard[];
  explainableConfidence?: ExplainableConfidence;
  simpleExplanation: string;
  technicalExplanation: string;
  aiInsights?: string;
  warnings: string[];
}

export type PipelineStage = 
  | 'IDLE'
  | 'VALIDATING'
  | 'PAIRWISE_CHECK'
  | 'PREPROCESSING'
  | 'DETECTING_FEATURES'
  | 'DESCRIBING_FEATURES'
  | 'MATCHING_FEATURES'
  | 'GEOMETRIC_VERIFICATION'
  | 'SUBPIXEL_REFINEMENT'
  | 'FEATURE_ID_GENERATION'
  | 'WARPING_REGISTRATION'
  | 'EVALUATING_QUALITY'
  | 'COMPLETED'
  | 'BLOCKED_OUTLIER'
  | 'FAILED';

export interface StageStatus {
  stage: PipelineStage;
  progress: number; // 0 to 100
  message: string;
  startTime?: number;
  elapsedMs?: number;
}

export type SupportedLanguage = 
  | 'en' // English
  | 'ta' // Tamil
  | 'hi' // Hindi
  | 'te' // Telugu
  | 'ml' // Malayalam
  | 'kn' // Kannada
  | 'bn' // Bengali
  | 'mr' // Marathi
  | 'es' // Spanish
  | 'fr' // French
  | 'ar'; // Arabic

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
  flag: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  projectName: string;
  sourceName: string;
  referenceName: string;
  thirdName?: string;
  sensor: SensorType;
  algorithm: FeatureMethod;
  transformModel: TransformModelType;
  inlierCount: number;
  inlierRatio: number;
  rmse: number;
  confidence: number;
  status: 'SUCCESS' | 'WARNING' | 'FAILED' | 'BLOCKED_OUTLIER';
  result?: RegistrationResult;
}

export interface DemoDataset {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  region: string;
  isTriSensor?: boolean;
  hasOutlier?: boolean;
  outlierSensorSlot?: 'OHRC' | 'TMC' | 'IIRS';
  sourceSensor: SensorType;
  referenceSensor: SensorType;
  thirdSensor?: SensorType;
  sourceSunElevation: number;
  referenceSunElevation: number;
  thirdSunElevation?: number;
  expectedChallenge: string;
  sourceImage: string;
  referenceImage: string;
  thirdImage?: string;
  sourceMeta: Partial<ImageMetadata>;
  referenceMeta: Partial<ImageMetadata>;
  thirdMeta?: Partial<ImageMetadata>;
}
