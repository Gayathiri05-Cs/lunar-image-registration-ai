import React from 'react';
import { X, Sparkles, Sun, Compass, Play, Layers } from 'lucide-react';
import { DemoDataset, SupportedLanguage } from '../types';
import { DEMO_DATASETS } from '../data/demoData';
import { TRANSLATIONS } from '../i18n/locales';

interface DemoSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDataset: (dataset: DemoDataset, autoStart?: boolean) => void;
  currentLang: SupportedLanguage;
}

export const DemoSelectorModal: React.FC<DemoSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectDataset,
  currentLang,
}) => {
  if (!isOpen) return null;
  const t = TRANSLATIONS[currentLang];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-4xl bg-[#0b0f1e] border border-cyan-900/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t.demoTitle}</h3>
              <p className="text-xs text-slate-400">{t.demoSelectPrompt}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Datasets Grid */}
        <div className="p-6 overflow-y-auto space-y-4">
          {DEMO_DATASETS.map(demo => (
            <div
              key={demo.id}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 transition flex flex-col md:flex-row gap-4 items-center justify-between group"
            >
              {/* Previews */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="relative">
                  <img
                    src={demo.sourceImage}
                    alt="Source Preview"
                    className="w-24 h-24 object-cover rounded-lg border border-cyan-700/40 shadow"
                  />
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-cyan-300">
                    SRC: {demo.sourceSensor}
                  </span>
                </div>
                <div className="text-slate-500 font-mono text-xs">⟷</div>
                <div className="relative">
                  <img
                    src={demo.referenceImage}
                    alt="Ref Preview"
                    className="w-24 h-24 object-cover rounded-lg border border-purple-700/40 shadow"
                  />
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-purple-300">
                    REF: {demo.referenceSensor}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 space-y-1.5 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition">
                    {demo.title}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800 text-[10px] text-cyan-300 font-medium">
                    {demo.region}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-snug">{demo.description}</p>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    Sun Elevation: {demo.sourceSunElevation}° vs {demo.referenceSunElevation}°
                  </span>
                  <span className="flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    Challenge: {demo.expectedChallenge}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
                <button
                  id={`demo-autoregister-${demo.id}`}
                  onClick={() => {
                    onSelectDataset(demo, true);
                    onClose();
                  }}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Auto Register</span>
                </button>
                <button
                  id={`demo-loadonly-${demo.id}`}
                  onClick={() => {
                    onSelectDataset(demo, false);
                    onClose();
                  }}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Load Images</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
          >
            {t.actions.close}
          </button>
        </div>
      </div>
    </div>
  );
};
