import React, { useState, useEffect } from 'react';
import { X, History, Trash2, ExternalLink, Calendar, CheckCircle2 } from 'lucide-react';
import { getLocalHistory } from '../services/aiService';
import { RegistrationResult, SupportedLanguage } from '../types';
import { TRANSLATIONS } from '../i18n/locales';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadItem: (result: RegistrationResult) => void;
  currentLang: SupportedLanguage;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  onLoadItem,
  currentLang,
}) => {
  if (!isOpen) return null;
  const t = TRANSLATIONS[currentLang];

  const [historyItems, setHistoryItems] = useState<any[]>([]);

  useEffect(() => {
    setHistoryItems(getLocalHistory());
  }, [isOpen]);

  const clearHistory = () => {
    localStorage.removeItem('lunar_registration_history');
    setHistoryItems([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-2xl bg-[#0b0f1e] border border-cyan-900/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <History className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t.actions.projectHistory}</h3>
              <p className="text-xs text-slate-400">Past lunar registrations & reusable checkpoints</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-3">
          {historyItems.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <History className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No past registrations saved in local storage.</p>
            </div>
          ) : (
            historyItems.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{item.projectName}</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-[10px] text-cyan-300 font-mono">
                      {item.sensor} ({item.algorithm})
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span>Inliers: {item.inlierCount}</span>
                    <span>RMSE: {item.rmse} px</span>
                    <span className="text-emerald-400 font-bold">Conf: {item.confidence}%</span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                {item.result && (
                  <button
                    onClick={() => {
                      onLoadItem(item.result);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    <span>Load</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/40 flex justify-between items-center">
          {historyItems.length > 0 ? (
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          ) : <div />}
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
