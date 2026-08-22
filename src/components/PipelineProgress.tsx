import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, Cpu, Clock, Layers } from 'lucide-react';
import { StageStatus, SupportedLanguage } from '../types';
import { TRANSLATIONS } from '../i18n/locales';

interface PipelineProgressProps {
  status: StageStatus;
  currentLang: SupportedLanguage;
}

export const PipelineProgress: React.FC<PipelineProgressProps> = ({
  status,
  currentLang,
}) => {
  const t = TRANSLATIONS[currentLang];

  const stagesList = [
    { key: 'VALIDATING', label: 'Validation' },
    { key: 'PREPROCESSING', label: 'CLAHE Radiometry' },
    { key: 'DETECTING_FEATURES', label: 'Keypoints' },
    { key: 'DESCRIBING_FEATURES', label: 'Descriptors' },
    { key: 'MATCHING_FEATURES', label: 'Cross-Match' },
    { key: 'GEOMETRIC_VERIFICATION', label: 'RANSAC' },
    { key: 'SUBPIXEL_REFINEMENT', label: 'Sub-Pixel' },
    { key: 'WARPING_REGISTRATION', label: 'Homography Warp' },
    { key: 'EVALUATING_QUALITY', label: 'Quality & Lat/Lon' },
  ];

  const getCurrentIndex = () => {
    return stagesList.findIndex(s => s.key === status.stage);
  };

  const currentIndex = getCurrentIndex();

  return (
    <div className="p-6 rounded-2xl bg-[#090d1c] border border-cyan-500/40 shadow-2xl space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              {t.processingTitle}
            </h3>
            <p className="text-xs text-cyan-300 font-mono">
              {status.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            {((status.elapsedMs || 0) / 1000).toFixed(2)}s
          </span>
          <span className="px-2.5 py-1 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300 font-bold">
            {status.progress}%
          </span>
        </div>
      </div>

      {/* Main Gradient Progress Bar */}
      <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-300 shadow-lg shadow-cyan-500/50"
          style={{ width: `${status.progress}%` }}
        />
      </div>

      {/* Micro Pipeline Step Tracker */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5 pt-2">
        {stagesList.map((step, idx) => {
          const isDone = currentIndex > idx || status.stage === 'COMPLETED';
          const isCurrent = currentIndex === idx;

          return (
            <div
              key={step.key}
              className={`px-2 py-1.5 rounded-lg border text-center transition ${
                isCurrent
                  ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-950'
                  : isDone
                  ? 'bg-slate-900/80 border-slate-800 text-emerald-400'
                  : 'bg-slate-950/40 border-slate-900 text-slate-600'
              }`}
            >
              <div className="text-[10px] font-mono font-bold flex items-center justify-center gap-1">
                {isDone ? (
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 className="w-2.5 h-2.5 text-cyan-400 animate-spin" />
                ) : (
                  <span>0{idx + 1}</span>
                )}
                <span className="truncate">{step.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
