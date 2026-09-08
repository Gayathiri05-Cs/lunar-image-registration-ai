import React, { useRef, useState } from 'react';
import {
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Sliders,
  Play,
  Sun,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Camera,
  ShieldAlert,
  Radio,
  ExternalLink,
} from 'lucide-react';
import {
  ImageMetadata,
  FeatureMethod,
  TransformModelType,
  SupportedLanguage,
  LunarSensorType,
  TriSensorValidationResult,
} from '../types';
import { TRANSLATIONS } from '../i18n/locales';
import { OutlierSensorDiagnosticCard } from './OutlierSensorDiagnosticCard';

interface ImageWorkspaceProps {
  sourceImage: string | null;
  referenceImage: string | null;
  thirdImage?: string | null;
  sourceMeta: ImageMetadata | null;
  referenceMeta: ImageMetadata | null;
  thirdMeta?: ImageMetadata | null;
  onSourceUpload: (dataUrl: string, meta: ImageMetadata) => void;
  onReferenceUpload: (dataUrl: string, meta: ImageMetadata) => void;
  onThirdUpload?: (dataUrl: string, meta: ImageMetadata) => void;
  onClearSource: () => void;
  onClearReference: () => void;
  onClearThird?: () => void;
  onExecute: (options: {
    featureMethod: FeatureMethod;
    transformModel: TransformModelType;
    inlierThresholdPx: number;
    enableCLAHE: boolean;
    enableSubpixel: boolean;
  }) => void;
  onLoadTriSensorPreset?: (type: 'valid' | 'iirs_outlier' | 'ohrc_outlier') => void;
  triSensorValidation?: TriSensorValidationResult | null;
  onProceedWithVerifiedPair?: () => void;
  isProcessing: boolean;
  currentLang: SupportedLanguage;
}

export const ImageWorkspace: React.FC<ImageWorkspaceProps> = ({
  sourceImage,
  referenceImage,
  thirdImage,
  sourceMeta,
  referenceMeta,
  thirdMeta,
  onSourceUpload,
  onReferenceUpload,
  onThirdUpload,
  onClearSource,
  onClearReference,
  onClearThird,
  onExecute,
  onLoadTriSensorPreset,
  triSensorValidation,
  onProceedWithVerifiedPair,
  isProcessing,
  currentLang,
}) => {
  const t = TRANSLATIONS[currentLang];

  // Mode: 3-Sensor Triangulation vs 2-Sensor Pair
  const [workspaceMode, setWorkspaceMode] = useState<'TRI_SENSOR' | 'DUAL_SENSOR'>('TRI_SENSOR');

  // Pipeline Parameters State
  const [featureMethod, setFeatureMethod] = useState<FeatureMethod>('SIFT');
  const [transformModel, setTransformModel] = useState<TransformModelType>('HOMOGRAPHY');
  const [inlierThresholdPx, setInlierThresholdPx] = useState<number>(3.0);
  const [enableCLAHE, setEnableCLAHE] = useState<boolean>(true);
  const [enableSubpixel, setEnableSubpixel] = useState<boolean>(true);
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);

  // File Inputs Refs
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const thirdInputRef = useRef<HTMLInputElement>(null);

  // Drag states
  const [dragSource, setDragSource] = useState(false);
  const [dragRef, setDragRef] = useState(false);
  const [dragThird, setDragThird] = useState(false);

  const processFile = (file: File, slot: 'source' | 'ref' | 'third') => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const isSource = slot === 'source';
        const isThird = slot === 'third';

        const meta: ImageMetadata = {
          name: file.name,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          sensor: isThird ? 'IIRS' : isSource ? 'OHRC' : 'TMC',
          resolutionMeters: isThird ? 10.0 : isSource ? 0.25 : 5.0,
          sunAzimuthDeg: isThird ? 48 : isSource ? 55 : 40,
          sunElevationDeg: isThird ? 35 : isSource ? 42 : 28,
          targetRegion: 'Lunar South Pole (Shackleton / Boguslawsky Crater)',
        };

        if (slot === 'source') {
          onSourceUpload(dataUrl, meta);
        } else if (slot === 'ref') {
          onReferenceUpload(dataUrl, meta);
        } else if (slot === 'third' && onThirdUpload) {
          onThirdUpload(dataUrl, meta);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent, slot: 'source' | 'ref' | 'third') => {
    e.preventDefault();
    if (slot === 'source') setDragSource(false);
    else if (slot === 'ref') setDragRef(false);
    else setDragThird(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0], slot);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, slot: 'source' | 'ref' | 'third') => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0], slot);
    }
  };

  const isTriSensorMode = workspaceMode === 'TRI_SENSOR';
  const hasMinImages = sourceImage !== null && referenceImage !== null;
  const canExecute = hasMinImages && !isProcessing;

  return (
    <div className="space-y-6">
      {/* Mode Switcher & Quick Benchmark Buttons */}
      <div className="p-4 rounded-2xl bg-[#090d1a] border border-cyan-900/40 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              id="tab-tri-sensor-mode"
              onClick={() => setWorkspaceMode('TRI_SENSOR')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                isTriSensorMode
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
              <span>3-Sensor Triangulation (OHRC + TMC + IIRS)</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800">
                Outlier AI
              </span>
            </button>

            <button
              id="tab-dual-sensor-mode"
              onClick={() => setWorkspaceMode('DUAL_SENSOR')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                !isTriSensorMode
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>2-Sensor Pair Registration</span>
            </button>
          </div>
        </div>

        {/* Quick Demo Test Presets */}
        {onLoadTriSensorPreset && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              Test Tri-Sensor:
            </span>
            <button
              onClick={() => onLoadTriSensorPreset('valid')}
              className="px-2.5 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-[11px] font-mono border border-emerald-800/60 transition cursor-pointer"
              title="Load 3 valid lunar images from OHRC, TMC, and IIRS covering same region"
            >
              ✓ All 3 Valid
            </button>
            <button
              onClick={() => onLoadTriSensorPreset('iirs_outlier')}
              className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-[11px] font-mono border border-rose-800/60 transition cursor-pointer"
              title="Load IIRS Outlier (different lunar region / mismatched coordinates)"
            >
              ✕ IIRS Outlier
            </button>
            <button
              onClick={() => onLoadTriSensorPreset('ohrc_outlier')}
              className="px-2.5 py-1 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-[11px] font-mono border border-amber-800/60 transition cursor-pointer"
              title="Load OHRC Outlier"
            >
              ✕ OHRC Outlier
            </button>
          </div>
        )}
      </div>

      {/* Tri-Sensor Outlier Diagnostic Banner if calculated */}
      {triSensorValidation && (
        <OutlierSensorDiagnosticCard
          validation={triSensorValidation}
          onProceedWithVerifiedPair={onProceedWithVerifiedPair}
          onReplaceOutlier={() => {
            if (triSensorValidation.outlierSensor === 'IIRS' && onClearThird) {
              onClearThird();
              thirdInputRef.current?.click();
            } else if (triSensorValidation.outlierSensor === 'OHRC') {
              onClearSource();
              sourceInputRef.current?.click();
            } else if (triSensorValidation.outlierSensor === 'TMC') {
              onClearReference();
              refInputRef.current?.click();
            }
          }}
        />
      )}

      {/* Image Upload Workspace Slots Grid */}
      <div className={`grid gap-5 ${isTriSensorMode ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        {/* 1. SENSOR SLOT 1: OHRC (0.25m High-Res Optical) */}
        <div className="p-4 rounded-2xl bg-[#0a0e1c] border border-cyan-900/40 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {isTriSensorMode ? 'Sensor 1: OHRC' : t.sourceImageTitle}
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60 text-[10px] font-mono text-cyan-300">
              0.25m Optical
            </span>
          </div>

          {sourceImage && sourceMeta ? (
            <div className="space-y-2.5">
              <div className="relative rounded-xl overflow-hidden border border-cyan-800/50 bg-black/60 group aspect-video flex items-center justify-center">
                <img
                  src={sourceImage}
                  alt="OHRC Lunar"
                  className="max-h-56 w-full object-contain"
                />
                <div className="absolute top-2 right-2 flex gap-1.5 opacity-90 group-hover:opacity-100 transition">
                  <button
                    onClick={() => sourceInputRef.current?.click()}
                    className="px-2 py-1 rounded bg-black/80 hover:bg-black text-cyan-300 text-[10px] font-semibold border border-cyan-800 cursor-pointer"
                  >
                    {t.replace}
                  </button>
                  <button
                    onClick={onClearSource}
                    className="px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-[10px] font-semibold border border-rose-800 cursor-pointer"
                  >
                    {t.remove}
                  </button>
                </div>
              </div>

              {/* Metadata tags */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono">
                <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">Sensor</span>
                  <span className="text-cyan-300 font-bold">{sourceMeta.sensor || 'OHRC'}</span>
                </div>
                <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">Resolution</span>
                  <span className="text-slate-200">{sourceMeta.resolutionMeters ?? 0.25}m/px</span>
                </div>
                <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">Sun Elevation</span>
                  <span className="text-amber-400 font-bold">{sourceMeta.sunElevationDeg ?? 42}°</span>
                </div>
                <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">Dimensions</span>
                  <span className="text-slate-200">{sourceMeta.width}x{sourceMeta.height}</span>
                </div>
              </div>
            </div>
          ) : (
            <div
              id="source-image-dropzone"
              onDragOver={e => {
                e.preventDefault();
                setDragSource(true);
              }}
              onDragLeave={() => setDragSource(false)}
              onDrop={e => handleDrop(e, 'source')}
              onClick={() => sourceInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition aspect-video ${
                dragSource
                  ? 'border-cyan-400 bg-cyan-950/20'
                  : 'border-slate-800 hover:border-cyan-700/60 bg-slate-900/30'
              }`}
            >
              <input
                ref={sourceInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/tiff"
                className="hidden"
                onChange={e => handleFileChange(e, 'source')}
              />
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-2">
                <Upload className="w-5 h-5 text-cyan-400" />
              </div>
              <h4 className="text-xs font-semibold text-white mb-0.5">Upload OHRC Image</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mb-2">0.25m High-Res Optical</p>
              <span className="text-[9px] text-slate-500 font-mono">PNG, JPG, WEBP, TIFF</span>
            </div>
          )}
        </div>

        {/* 2. SENSOR SLOT 2: TMC (5.0m Stereo Mapping) */}
        <div className="p-4 rounded-2xl bg-[#0a0e1c] border border-purple-900/40 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                {isTriSensorMode ? 'Sensor 2: TMC' : t.referenceImageTitle}
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800/60 text-[10px] font-mono text-purple-300">
              5.0m Stereo
            </span>
          </div>

          {referenceImage && referenceMeta ? (
            <div className="space-y-2.5">
              <div className="relative rounded-xl overflow-hidden border border-purple-800/50 bg-black/60 group aspect-video flex items-center justify-center">
                <img
                  src={referenceImage}
                  alt="TMC Lunar"
                  className="max-h-56 w-full object-contain"
                />
                <div className="absolute top-2 right-2 flex gap-1.5 opacity-90 group-hover:opacity-100 transition">
                  <button
                    onClick={() => refInputRef.current?.click()}
                    className="px-2 py-1 rounded bg-black/80 hover:bg-black text-purple-300 text-[10px] font-semibold border border-purple-800 cursor-pointer"
                  >
                    {t.replace}
                  </button>
                  <button
                    onClick={onClearReference}
                    className="px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-[10px] font-semibold border border-rose-800 cursor-pointer"
                  >
                    {t.remove}
                  </button>
                </div>
              </div>

              {/* Metadata tags */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono">
                <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">Sensor</span>
                  <span className="text-purple-300 font-bold">{referenceMeta.sensor || 'TMC'}</span>
                </div>
                <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">Resolution</span>
                  <span className="text-slate-200">{referenceMeta.resolutionMeters ?? 5.0}m/px</span>
                </div>
                <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">Sun Elevation</span>
                  <span className="text-amber-400 font-bold">{referenceMeta.sunElevationDeg ?? 28}°</span>
                </div>
                <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[9px]">Dimensions</span>
                  <span className="text-slate-200">{referenceMeta.width}x{referenceMeta.height}</span>
                </div>
              </div>
            </div>
          ) : (
            <div
              id="ref-image-dropzone"
              onDragOver={e => {
                e.preventDefault();
                setDragRef(true);
              }}
              onDragLeave={() => setDragRef(false)}
              onDrop={e => handleDrop(e, 'ref')}
              onClick={() => refInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition aspect-video ${
                dragRef
                  ? 'border-purple-400 bg-purple-950/20'
                  : 'border-slate-800 hover:border-purple-700/60 bg-slate-900/30'
              }`}
            >
              <input
                ref={refInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/tiff"
                className="hidden"
                onChange={e => handleFileChange(e, 'ref')}
              />
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-2">
                <Upload className="w-5 h-5 text-purple-400" />
              </div>
              <h4 className="text-xs font-semibold text-white mb-0.5">Upload TMC Image</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mb-2">5.0m Stereo Mapping</p>
              <span className="text-[9px] text-slate-500 font-mono">PNG, JPG, WEBP, TIFF</span>
            </div>
          )}
        </div>

        {/* 3. SENSOR SLOT 3: IIRS (Infrared Spectrometer) - Rendered in TRI_SENSOR mode */}
        {isTriSensorMode && (
          <div className="p-4 rounded-2xl bg-[#0a0e1c] border border-amber-900/40 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Sensor 3: IIRS
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/60 text-[10px] font-mono text-amber-300">
                0.8-5.0µm NIR
              </span>
            </div>

            {thirdImage && thirdMeta ? (
              <div className="space-y-2.5">
                <div className="relative rounded-xl overflow-hidden border border-amber-800/50 bg-black/60 group aspect-video flex items-center justify-center">
                  <img
                    src={thirdImage}
                    alt="IIRS Lunar"
                    className="max-h-56 w-full object-contain"
                  />
                  <div className="absolute top-2 right-2 flex gap-1.5 opacity-90 group-hover:opacity-100 transition">
                    <button
                      onClick={() => thirdInputRef.current?.click()}
                      className="px-2 py-1 rounded bg-black/80 hover:bg-black text-amber-300 text-[10px] font-semibold border border-amber-800 cursor-pointer"
                    >
                      {t.replace}
                    </button>
                    {onClearThird && (
                      <button
                        onClick={onClearThird}
                        className="px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-[10px] font-semibold border border-rose-800 cursor-pointer"
                      >
                        {t.remove}
                      </button>
                    )}
                  </div>
                </div>

                {/* Metadata tags */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono">
                  <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">Sensor</span>
                    <span className="text-amber-300 font-bold">{thirdMeta.sensor || 'IIRS'}</span>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">Resolution</span>
                    <span className="text-slate-200">{thirdMeta.resolutionMeters ?? 10.0}m/px</span>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">Sun Elevation</span>
                    <span className="text-amber-400 font-bold">{thirdMeta.sunElevationDeg ?? 35}°</span>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-500 block text-[9px]">Dimensions</span>
                    <span className="text-slate-200">{thirdMeta.width}x{thirdMeta.height}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                id="third-image-dropzone"
                onDragOver={e => {
                  e.preventDefault();
                  setDragThird(true);
                }}
                onDragLeave={() => setDragThird(false)}
                onDrop={e => handleDrop(e, 'third')}
                onClick={() => thirdInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition aspect-video ${
                  dragThird
                    ? 'border-amber-400 bg-amber-950/20'
                    : 'border-slate-800 hover:border-amber-700/60 bg-slate-900/30'
                }`}
              >
                <input
                  ref={thirdInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/tiff"
                  className="hidden"
                  onChange={e => handleFileChange(e, 'third')}
                />
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-2">
                  <Upload className="w-5 h-5 text-amber-400" />
                </div>
                <h4 className="text-xs font-semibold text-white mb-0.5">Upload IIRS Image</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mb-2">0.8-5.0µm Infrared</p>
                <span className="text-[9px] text-slate-500 font-mono">PNG, JPG, WEBP, TIFF</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Algorithm Selection & Run Bar */}
      <div className="p-4 rounded-2xl bg-[#080c18] border border-cyan-950/60 shadow-xl flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Method and Transform Pickers */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5">
              <span className="text-xs text-slate-400 font-medium">{t.algorithm}:</span>
              <select
                id="select-feature-method"
                value={featureMethod}
                onChange={e => setFeatureMethod(e.target.value as FeatureMethod)}
                className="bg-transparent text-cyan-300 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="SIFT" className="bg-slate-900 text-white">SIFT (DoG + 128D)</option>
                <option value="ORB" className="bg-slate-900 text-white">ORB (FAST + 256bit)</option>
                <option value="AKAZE" className="bg-slate-900 text-white">Crater Rim Extremas</option>
                <option value="HYBRID" className="bg-slate-900 text-white">Hybrid Multi-Scale</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5">
              <span className="text-xs text-slate-400 font-medium">{t.transformModel}:</span>
              <select
                id="select-transform-model"
                value={transformModel}
                onChange={e => setTransformModel(e.target.value as TransformModelType)}
                className="bg-transparent text-purple-300 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="HOMOGRAPHY" className="bg-slate-900 text-white">Projective Homography (8-DOF)</option>
                <option value="AFFINE" className="bg-slate-900 text-white">Affine (6-DOF)</option>
                <option value="SIMILARITY" className="bg-slate-900 text-white">Similarity (4-DOF)</option>
              </select>
            </div>

            {/* Quick toggles */}
            <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-xl cursor-pointer hover:border-slate-700">
              <input
                type="checkbox"
                checked={enableCLAHE}
                onChange={e => setEnableCLAHE(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span>CLAHE Sun Equalizer</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-xl cursor-pointer hover:border-slate-700">
              <input
                type="checkbox"
                checked={enableSubpixel}
                onChange={e => setEnableSubpixel(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span>Sub-Pixel Refinement</span>
            </label>

            <button
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title="Advanced Tuning"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>

          {/* Big Action Button */}
          <button
            id="execute-registration-btn"
            disabled={!canExecute}
            onClick={() =>
              onExecute({
                featureMethod,
                transformModel,
                inlierThresholdPx,
                enableCLAHE,
                enableSubpixel,
              })
            }
            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-bold text-xs shadow-xl transition transform ${
              canExecute
                ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-cyan-950/60 hover:-translate-y-0.5 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {isTriSensorMode
                ? 'Run 3-Sensor Triangulation & Registration'
                : t.startProcessingBtn}
            </span>
          </button>
        </div>

        {/* Advanced Slider Panel */}
        {advancedOpen && (
          <div className="pt-3 border-t border-slate-800/80 grid sm:grid-cols-3 gap-4 text-xs text-slate-300 animate-fade-in">
            <div>
              <div className="flex justify-between mb-1">
                <span>RANSAC Inlier Threshold:</span>
                <span className="font-mono text-cyan-300">{inlierThresholdPx} px</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="6.0"
                step="0.2"
                value={inlierThresholdPx}
                onChange={e => setInlierThresholdPx(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
            <div className="sm:col-span-2 text-slate-400 text-[11px] flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                Threshold 1.5-2.5 px enforces sub-pixel rigidity. Multi-sensor outlier detection calculates pairwise homography matrices before full projective warping.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
