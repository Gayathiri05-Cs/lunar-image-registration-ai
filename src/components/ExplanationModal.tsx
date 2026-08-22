import React, { useState, useEffect } from 'react';
import { X, Sparkles, BookOpen, Cpu, Brain, Loader2, RefreshCw } from 'lucide-react';
import { RegistrationResult, SupportedLanguage } from '../types';
import { TRANSLATIONS } from '../i18n/locales';
import { fetchAIInsights } from '../services/aiService';

interface ExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: RegistrationResult;
  currentLang: SupportedLanguage;
}

export const ExplanationModal: React.FC<ExplanationModalProps> = ({
  isOpen,
  onClose,
  result,
  currentLang,
}) => {
  if (!isOpen) return null;
  const t = TRANSLATIONS[currentLang];

  const [activeTab, setActiveTab] = useState<'simple' | 'technical' | 'ai'>('simple');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  useEffect(() => {
    if (activeTab === 'ai' && !aiInsight && !aiLoading) {
      loadAIInsights();
    }
  }, [activeTab]);

  const loadAIInsights = async () => {
    setAiLoading(true);
    const insight = await fetchAIInsights(result, currentLang);
    setAiInsight(insight);
    setAiLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-3xl bg-[#0b0f1e] border border-cyan-900/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t.actions.explainResults}</h3>
              <p className="text-xs text-slate-400">
                Multi-level explanation & planetary science interpretation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('simple')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition cursor-pointer ${
              activeTab === 'simple'
                ? 'bg-slate-900 text-cyan-300 border-t border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.actions.simpleExplanation}</span>
          </button>

          <button
            onClick={() => setActiveTab('technical')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition cursor-pointer ${
              activeTab === 'technical'
                ? 'bg-slate-900 text-purple-300 border-t border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{t.actions.technicalExplanation}</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-slate-900 text-emerald-300 border-t border-x border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Selenological Insights</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === 'simple' && (
            <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
              <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-cyan-200 text-sm">
                {result.simpleExplanation}
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <h5 className="text-xs font-bold text-white mb-1">What was accomplished?</h5>
                  <p className="text-xs text-slate-400">
                    The moving image from {result.sourceMeta.sensor || 'OHRC'} was mathematically warped so that its crater rims and craters land on top of the reference {result.referenceMeta.sensor || 'TMC'} image with pixel-level precision.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <h5 className="text-xs font-bold text-white mb-1">Why is this important?</h5>
                  <p className="text-xs text-slate-400">
                    Different solar lighting angles cause shadows to change direction on the Moon. Our algorithm recognizes real crater edges regardless of lighting shifts.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'technical' && (
            <div className="space-y-4 text-slate-300 text-xs font-mono leading-relaxed">
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/40 text-purple-200">
                {result.technicalExplanation}
              </div>

              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <h5 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                  Pipeline Algorithmic Parameter Breakdown:
                </h5>
                <ul className="space-y-1.5 text-[11px] text-slate-300">
                  <li>• Feature Extraction Method: <span className="text-cyan-300 font-bold">{result.featureMethod}</span></li>
                  <li>• Geometric Transformation: <span className="text-purple-300 font-bold">{result.transformModel} (Projective)</span></li>
                  <li>• RANSAC Inlier Count: <span className="text-emerald-400 font-bold">{result.metrics.inlierCount} / {result.metrics.totalCandidates}</span> (Ratio: {(result.metrics.inlierRatio * 100).toFixed(1)}%)</li>
                  <li>• Root Mean Square Error (RMSE): <span className="text-cyan-300 font-bold">{result.metrics.rmse} px</span></li>
                  <li>• Sub-Pixel Parabolic Refinement: <span className="text-emerald-300 font-bold">{result.metrics.subpixelAchieved ? 'ENABLED (<0.5px mean shift)' : 'DISABLED'}</span></li>
                  <li>• Spatial 8x8 Grid Entropy Score: <span className="text-amber-300 font-bold">{result.metrics.spatialDistributionScore}%</span></li>
                  <li>• Latency: <span className="text-slate-300">{result.metrics.processingTimeMs} ms</span></li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-4">
              {aiLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-xs text-slate-400">
                    Generating planetary geomorphology & illumination interpretation via Gemini AI...
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-100 text-sm leading-relaxed whitespace-pre-line">
                    {aiInsight}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={loadAIInsights}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-700 transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Regenerate Insights</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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
