import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
  Sparkles,
  Info,
  Scale,
  Compass,
  Cpu,
} from 'lucide-react';
import { ExplainableConfidence, ConfidenceFactor } from '../types';

interface ExplainableConfidenceCardProps {
  confidence: ExplainableConfidence;
}

export const ExplainableConfidenceCard: React.FC<ExplainableConfidenceCardProps> = ({
  confidence,
}) => {
  const [expandedFactorId, setExpandedFactorId] = useState<string | null>(null);
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);

  const { overallScore, verdict, factors, summaryPoints } = confidence;

  const getVerdictStyle = () => {
    switch (verdict) {
      case 'HIGH CONFIDENCE':
        return {
          bg: 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          gaugeColor: 'from-emerald-400 to-teal-400',
        };
      case 'MODERATE CONFIDENCE':
        return {
          bg: 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300',
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          gaugeColor: 'from-cyan-400 to-blue-400',
        };
      case 'LOW CONFIDENCE':
        return {
          bg: 'bg-amber-950/40 border-amber-500/50 text-amber-300',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          gaugeColor: 'from-amber-400 to-orange-400',
        };
      default:
        return {
          bg: 'bg-rose-950/40 border-rose-500/50 text-rose-300',
          badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          gaugeColor: 'from-rose-400 to-red-400',
        };
    }
  };

  const style = getVerdictStyle();

  const getStatusBadge = (status: ConfidenceFactor['status']) => {
    switch (status) {
      case 'EXCELLENT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Optimal
          </span>
        );
      case 'GOOD':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            Good
          </span>
        );
      case 'FAIR':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Fair
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Degraded
          </span>
        );
    }
  };

  return (
    <div
      id="explainable-confidence-card"
      className="p-5 rounded-2xl bg-[#090d18] border border-cyan-900/40 shadow-xl space-y-5"
    >
      {/* Top Banner: Score & Verdict */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Algorithmic Reliability Verification
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold border ${style.badgeBg}`}
              >
                {verdict}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
                {overallScore}%
              </span>
              <span className="text-sm font-semibold text-slate-300">
                – Explainable Registration Confidence
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowFormulaModal(!showFormulaModal)}
          className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Scale className="w-3.5 h-3.5 text-cyan-400" />
          <span>Formula Breakdown</span>
        </button>
      </div>

      {/* Summary Checklist ("Why do we trust this match?") */}
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2.5">
        <div className="text-xs font-bold font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Why Do We Trust This Lunar Registration?</span>
        </div>
        <ul className="grid sm:grid-cols-2 gap-2">
          {summaryPoints.map((point, idx) => (
            <li
              key={idx}
              className="text-xs text-slate-300 flex items-start gap-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/40"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{point.replace(/^✓\s*/, '')}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 5-Factor Mathematical Decomposition Accordion */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
          <span className="font-bold text-slate-300 uppercase tracking-wider">
            Contributing Factor Breakdown
          </span>
          <span>5-Factor Multi-Criteria Evaluation</span>
        </div>

        <div className="space-y-2">
          {factors.map(factor => {
            const isOpened = expandedFactorId === factor.id;
            return (
              <div
                key={factor.id}
                className={`rounded-xl border transition-all ${
                  isOpened
                    ? 'bg-slate-900/80 border-cyan-500/40 shadow-lg'
                    : 'bg-slate-900/30 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedFactorId(isOpened ? null : factor.id)}
                  className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center font-mono text-xs font-bold text-cyan-300 shrink-0">
                      {factor.weightPercent}%
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {factor.name}
                        </span>
                        {getStatusBadge(factor.status)}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                        {factor.measuredValue}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="font-mono text-sm font-extrabold text-white">
                        {factor.score}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">/100</span>
                    </div>
                    {isOpened ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Score Progress Bar */}
                <div className="px-3.5 pb-2">
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        factor.score >= 80
                          ? 'bg-emerald-400'
                          : factor.score >= 60
                          ? 'bg-cyan-400'
                          : factor.score >= 40
                          ? 'bg-amber-400'
                          : 'bg-rose-400'
                      }`}
                      style={{ width: `${factor.score}%` }}
                    />
                  </div>
                </div>

                {/* Expanded Details */}
                {isOpened && (
                  <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-800/80 text-xs space-y-2 bg-black/20 rounded-b-xl">
                    <p className="text-slate-300 leading-relaxed">
                      {factor.description}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 block text-[10px] uppercase">
                          Target Benchmark
                        </span>
                        <span className="text-cyan-300 font-semibold">{factor.benchmark}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                        <span className="text-slate-400 block text-[10px] uppercase">
                          Mathematical Formulation
                        </span>
                        <span className="text-amber-300/90 font-mono text-[10px]">
                          {factor.formula}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Formula Modal / Explanation Dialog */}
      {showFormulaModal && (
        <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold font-mono text-cyan-300 uppercase">
              Global Composite Confidence Formula
            </span>
            <button
              onClick={() => setShowFormulaModal(false)}
              className="text-slate-400 hover:text-white font-mono"
            >
              ✕ Close
            </button>
          </div>
          <p className="font-mono text-[11px] text-slate-300 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
            Confidence = 0.25 × MatchDensity + 0.30 × InlierConsensus + 0.20 × RMSEPrecision + 0.15 × SpatialCoverage + 0.10 × SolarGeoAgreement
          </p>
          <p className="text-slate-400 text-[11px]">
            Weights are configured according to ISRO planetary registration standards to prioritize geometric inlier consensus and sub-pixel projection precision over raw point quantity.
          </p>
        </div>
      )}
    </div>
  );
};
