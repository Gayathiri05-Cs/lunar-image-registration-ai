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
} from 'lucide-react';
import {
  ImageMetadata,
  FeatureMethod,
  TransformModelType,
  SupportedLanguage,
  LunarSensorType,
} from '../types';
import { TRANSLATIONS } from '../i18n/locales';

interface ImageWorkspaceProps {
  sourceImage: string | null;
  referenceImage: string | null;
  sourceMeta: ImageMetadata | null;
  referenceMeta: ImageMetadata | null;
  onSourceUpload: (dataUrl: string, meta: ImageMetadata) => void;
  onReferenceUpload: (dataUrl: string, meta: ImageMetadata) => void;
  onClearSource: () => void;
  onClearReference: () => void;
  onExecute: (options: {
    featureMethod: FeatureMethod;
    transformModel: TransformModelType;
    inlierThresholdPx: number;
    enableCLAHE: boolean;
    enableSubpixel: boolean;
  }) => void;
  isProcessing: boolean;
  currentLang: SupportedLanguage;
}

export const ImageWorkspace: React.FC<ImageWorkspaceProps> = ({
  sourceImage,
  referenceImage,
  sourceMeta,
  referenceMeta,
  onSourceUpload,
  onReferenceUpload,
  onClearSource,
  onClearReference,
  onExecute,
  isProcessing,
  currentLang,
}) => {
  const t = TRANSLATIONS[currentLang];

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

  // Drag states
  const [dragSource, setDragSource] = useState(false);
  const [dragRef, setDragRef] = useState(false);

  const processFile = (file: File, isSource: boolean) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const meta: ImageMetadata = {
          name: file.name,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          sensor: isSource ? 'OHRC' : 'TMC',
          resolutionMeters: isSource ? 0.25 : 5.0,
          sunAzimuthDeg: isSource ? 55 : 40,
          sunElevationDeg: isSource ? 42 : 28,
          targetRegion: 'Lunar South Pole',
        };

        if (isSource) {
          onSourceUpload(dataUrl, meta);
        } else {
          onReferenceUpload(dataUrl, meta);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent, isSource: boolean) => {
    e.preventDefault();
    if (isSource) setDragSource(false);
    else setDragRef(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0], isSource);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isSource: boolean) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0], isSource);
    }
  };

  const canExecute = sourceImage !== null && referenceImage !== null && !isProcessing;

  return (
    <div className="space-y-6">
      {/* Top Section: Dual Upload Workspace Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 1. SOURCE / MOVING IMAGE CARD */}
        <div className="p-5 rounded-2xl bg-[#0a0e1c] border border-cyan-900/40 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {t.sourceImageTitle}
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60 text-[10px] font-mono text-cyan-300">
              Moving Image
            </span>
          </div>

          {sourceImage && sourceMeta ? (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-cyan-800/50 bg-black/60 group aspect-video flex items-center justify-center">
                <img
                  src={sourceImage}
                  alt="Source Lunar"
                  className="max-h-64 w-full object-contain"
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Sensor</span>
                  <span className="text-cyan-300 font-bold">{sourceMeta.sensor || 'OHRC'}</span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Dimension</span>
                  <span className="text-slate-200">{sourceMeta.width}x{sourceMeta.height}</span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Resolution</span>
                  <span className="text-slate-200">{sourceMeta.resolutionMeters ?? 0.25}m/px</span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Sun Elevation</span>
                  <span className="text-amber-400 font-bold">{sourceMeta.sunElevationDeg ?? 42}°</span>
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
              onDrop={e => handleDrop(e, true)}
              onClick={() => sourceInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition aspect-video ${
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
                onChange={e => handleFileChange(e, true)}
              />
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-3">
                <Upload className="w-6 h-6 text-cyan-400" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">{t.uploadSource}</h4>
              <p className="text-xs text-slate-400 max-w-xs mb-3">{t.dragDropText}</p>
              <span className="text-[10px] text-slate-500 font-mono">
                {t.supportedFormats}
              </span>
            </div>
          )}
        </div>

        {/* 2. REFERENCE / FIXED IMAGE CARD */}
        <div className="p-5 rounded-2xl bg-[#0a0e1c] border border-purple-900/40 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {t.referenceImageTitle}
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800/60 text-[10px] font-mono text-purple-300">
              Fixed Ground Truth
            </span>
          </div>

          {referenceImage && referenceMeta ? (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-purple-800/50 bg-black/60 group aspect-video flex items-center justify-center">
                <img
                  src={referenceImage}
                  alt="Reference Lunar"
                  className="max-h-64 w-full object-contain"
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-mono">
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Sensor</span>
                  <span className="text-purple-300 font-bold">{referenceMeta.sensor || 'TMC'}</span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Dimension</span>
                  <span className="text-slate-200">{referenceMeta.width}x{referenceMeta.height}</span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Resolution</span>
                  <span className="text-slate-200">{referenceMeta.resolutionMeters ?? 5.0}m/px</span>
                </div>
                <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Sun Elevation</span>
                  <span className="text-amber-400 font-bold">{referenceMeta.sunElevationDeg ?? 28}°</span>
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
              onDrop={e => handleDrop(e, false)}
              onClick={() => refInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition aspect-video ${
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
                onChange={e => handleFileChange(e, false)}
              />
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-3">
                <Upload className="w-6 h-6 text-purple-400" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">{t.uploadReference}</h4>
              <p className="text-xs text-slate-400 max-w-xs mb-3">{t.dragDropText}</p>
              <span className="text-[10px] text-slate-500 font-mono">
                {t.supportedFormats}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Control Bar: Algorithm selection & Execution button */}
      <div className="p-5 rounded-2xl bg-[#080c18] border border-cyan-950/60 shadow-xl flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Method and Transform Pickers */}
          <div className="flex flex-wrap items-center gap-3">
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
            <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/60 border border-slate-800/80 px-3 py-2 rounded-xl cursor-pointer hover:border-slate-700">
              <input
                type="checkbox"
                checked={enableCLAHE}
                onChange={e => setEnableCLAHE(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span>CLAHE Sun Equalizer</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900/60 border border-slate-800/80 px-3 py-2 rounded-xl cursor-pointer hover:border-slate-700">
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
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
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
            className={`flex items-center gap-2.5 px-7 py-3 rounded-xl font-bold text-sm shadow-xl transition transform ${
              canExecute
                ? 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-cyan-950/60 hover:-translate-y-0.5 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{t.startProcessingBtn}</span>
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
                Lower thresholds (1.5 - 2.5 px) enforce sub-pixel geometric rigidity. Higher thresholds (3.5 - 5.0 px) tolerate steeper lunar terrain parallax and large viewpoint baselines.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
