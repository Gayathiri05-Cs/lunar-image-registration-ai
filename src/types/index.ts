export type SensorType = 'OHRC' | 'TMC' | 'IIRS' | 'LROC_NAC' | 'KAGUYA_TC' | 'OTHER' | 'UNKNOWN';
export type LunarSensorType = SensorType;

export type FeatureMethod = 'SIFT' | 'ORB' | 'AKAZE' | 'HYBRID' | 'HYBRID_LUNAR';
export type TransformModelType = 'HOMOGRAPHY' | 'AFFINE' | 'SIMILARITY' | 'RIGID';
export type VisualMode = 'side_by_side' | 'overlay' | 'blink' | 'difference' | 'matches';
export type VisualizationMode = 'SIDE_BY_SIDE' | 'OVERLAY' | 'BLINK' | 'DIFFERENCE' | 'MATCHES' | 'HEATMAP' | VisualMode;
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

export interface RegistrationMetrics {
  totalCandidates: number;
  inlierCount: number;
  outlierCount: number;
  inlierRatio: number; // 0 to 1
  rmse: number; // Root Mean Square Error in pixels
  meanResidual: number;
  maxResidual: number;
  confidenceScore: number; // 0 to 100%
  spatialDistributionScore: number; // 0 to 100%
  spatialWarning?: string;
  subpixelAchieved: boolean;
  subpixelMeanShift?: number; // in pixels
  processingTimeMs: number;
  ransacIterations: number;
}

export interface RegistrationResult {
  id: string;
  timestamp: string;
  sourceMeta: ImageMetadata;
  referenceMeta: ImageMetadata;
  featureMethod: FeatureMethod;
  transformModel: TransformModelType;
  sourceKeypoints: Keypoint[];
  referenceKeypoints: Keypoint[];
  matches: MatchPoint[];
  transformation: TransformationMatrix;
  metrics: RegistrationMetrics;
  registeredDataUrl: string;
  differenceDataUrl?: string;
  matchesDataUrl?: string;
  sourceDataUrl: string;
  referenceDataUrl: string;
  simpleExplanation: string;
  technicalExplanation: string;
  aiInsights?: string;
  warnings: string[];
}

export type PipelineStage = 
  | 'IDLE'
  | 'VALIDATING'
  | 'PREPROCESSING'
  | 'DETECTING_FEATURES'
  | 'DESCRIBING_FEATURES'
  | 'MATCHING_FEATURES'
  | 'GEOMETRIC_VERIFICATION'
  | 'SUBPIXEL_REFINEMENT'
  | 'WARPING_REGISTRATION'
  | 'EVALUATING_QUALITY'
  | 'COMPLETED'
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
  sensor: SensorType;
  algorithm: FeatureMethod;
  transformModel: TransformModelType;
  inlierCount: number;
  inlierRatio: number;
  rmse: number;
  confidence: number;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  result?: RegistrationResult;
}

export interface DemoDataset {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  region: string;
  sourceSensor: SensorType;
  referenceSensor: SensorType;
  sourceSunElevation: number;
  referenceSunElevation: number;
  expectedChallenge: string;
  sourceImage: string;
  referenceImage: string;
  sourceMeta: Partial<ImageMetadata>;
  referenceMeta: Partial<ImageMetadata>;
}
