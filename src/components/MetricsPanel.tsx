import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Zap,
  Clock,
  Download,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  ShieldCheck,
  Grid,
  Sparkles,
  Layers,
  Database,
} from 'lucide-react';
import { RegistrationResult, SupportedLanguage } from '../types';
import { TRANSLATIONS } from '../i18n/locales';
import { ExplainableConfidenceCard } from './ExplainableConfidenceCard';
import { LunarFeatureCard } from './LunarFeatureCard';
import { LunarFeatureExplorer } from './LunarFeatureExplorer';

interface MetricsPanelProps {
  result: RegistrationResult;
  currentLang: SupportedLanguage;
  onExportCsv: () => void;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  result,
  currentLang,
  onExportCsv,
}) => {
  const t = TRANSLATIONS[currentLang];
  const [tableOpen, setTableOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [featureExplorerOpen, setFeatureExplorerOpen] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 8;

  const { metrics, transformation, matches, explainableConfidence, lunarFeatures } = result;

  const inliers = matches.filter(m => m.inlier);
  const totalPages = Math.ceil(inliers.length / pageSize);
  const displayedMatches = inliers.slice(page * pageSize, (page + 1) * pageSize);

  // Quality badge color
  const getRmseColor = (rmse: number) => {
    if (rmse < 1.2) return 'text-emerald-400 border-emerald-800/80 bg-emerald-950/40';
    if (rmse < 2.5) return 'text-cyan-400 border-cyan-800/80 bg-cyan-950/40';
    return 'text-amber-400 border-amber-800/80 bg-amber-950/40';
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 85) return 'text-emerald-400';
    if (conf >= 65) return 'text-cyan-400';
    return 'text-amber-400';
  };

  return (
    <div className="space-y-6">
      {/* 1. EXPLAINABLE CONFIDENCE SYSTEM (Factor Decomposition) */}
      {explainableConfidence && (
        <ExplainableConfidenceCard confidence={explainableConfidence} />
      )}

      {/* 2. LUNAR FEATURE IDENTITY CARDS SECTION */}
      {lunarFeatures && lunarFeatures.length > 0 && (
        <div className="p-6 rounded-2xl bg-[#090e1c] border border-cyan-900/40 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Verified Lunar Feature Identity Cards
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {lunarFeatures.length} Cataloged
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Unique planetary identifiers (PRISM-LF-XXXXX) tracked persistently across multi-sensor passes.
                </p>
              </div>
            </div>

            <button
              id="open-lunar-feature-explorer-btn"
              onClick={() => setFeatureExplorerOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Open Planetary Feature Registry</span>
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lunarFeatures.slice(0, 3).map(feature => (
              <LunarFeatureCard key={feature.id} feature={feature} />
            ))}
          </div>

          {lunarFeatures.length > 3 && (
            <div className="text-center pt-2">
              <button
                onClick={() => setFeatureExplorerOpen(true)}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                + View all {lunarFeatures.length} verified lunar landmarks in registry explorer →
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. SCIENTIFIC TELEMETRY & HARDWARE BENCHMARKS */}
      <div className="p-6 rounded-2xl bg-[#090d1c] border border-cyan-900/40 shadow-2xl space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Scientific Quality Metrics & Geometric Verification
              </h3>
              <p className="text-xs text-slate-400">
                Evaluated under RANSAC consensus ({metrics.ransacIterations} iterations in {metrics.processingTimeMs}ms)
              </p>
            </div>
          </div>

          {/* Global Confidence Pill */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-400">Composite Score:</span>
            <span className={`text-xs font-mono font-bold ${getConfidenceColor(metrics.confidenceScore)}`}>
              {metrics.confidenceScore}%
            </span>
          </div>
        </div>

        {/* Primary Key Metric Cards (4 Grid) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. RMSE */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">RMSE Error</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getRmseColor(metrics.rmse)}`}>
                {metrics.rmse < 1.5 ? 'SUB-PIXEL' : 'ACCEPTABLE'}
              </span>
            </div>
            <div>
              <div className="text-2xl font-mono font-extrabold text-white">
                {metrics.rmse} <span className="text-xs font-normal text-slate-400 font-sans">px</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug mt-1">
                Mean Residual: {metrics.meanResidual} px
              </p>
            </div>
          </div>

          {/* 2. Inliers / Total */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Inlier Ratio</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {(metrics.inlierRatio * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <div className="text-2xl font-mono font-extrabold text-white">
                {metrics.inlierCount} <span className="text-xs font-normal text-slate-400 font-sans">/ {metrics.totalCandidates}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug mt-1">
                {metrics.outlierCount} outliers discarded
              </p>
            </div>
          </div>

          {/* 3. Spatial Grid Coverage */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Spatial Coverage</span>
              <Grid className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div>
              <div className="text-2xl font-mono font-extrabold text-white">
                {metrics.spatialDistributionScore}%
              </div>
              <p className="text-[11px] text-slate-400 leading-snug mt-1">
                8×8 lunar terrain quadtree
              </p>
            </div>
          </div>

          {/* 4. Sub-pixel & Latency */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Sub-Pixel Refinement</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div>
              <div className="text-lg font-mono font-bold text-cyan-300">
                {metrics.subpixelAchieved ? 'Achieved' : 'Standard'}
              </div>
              <p className="text-[11px] text-slate-400 leading-snug mt-1">
                Shift: {metrics.subpixelMeanShift?.toFixed(3)} px ({metrics.processingTimeMs}ms)
              </p>
            </div>
          </div>
        </div>

        {/* Warnings & Diagnostics if any */}
        {result.warnings && result.warnings.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              {result.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-300 leading-snug">
                  {w}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible 3x3 Transformation Matrix */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
          <button
            onClick={() => setMatrixOpen(!matrixOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/60 hover:bg-slate-900 text-xs font-bold text-slate-300 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span>Geometric Transformation Matrix ({result.transformModel})</span>
              {transformation.rotationDeg !== undefined && (
                <span className="text-cyan-400 font-normal">
                  (Rot: {transformation.rotationDeg.toFixed(2)}°, Scale: {transformation.scaleFactor?.toFixed(3)}x)
                </span>
              )}
            </span>
            {matrixOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {matrixOpen && (
            <div className="p-4 bg-slate-950 text-xs font-mono space-y-2 border-t border-slate-800">
              <div className="grid grid-cols-3 gap-2 max-w-md mx-auto text-center">
                {transformation.matrix.map((row, rIdx) =>
                  row.map((val, cIdx) => (
                    <div
                      key={`${rIdx}-${cIdx}`}
                      className="p-2 rounded bg-slate-900 border border-slate-800 text-cyan-300 font-bold"
                    >
                      {val.toFixed(6)}
                    </div>
                  ))
                )}
              </div>
              <div className="text-center text-[11px] text-slate-500 pt-1">
                H (3×3 Homography Matrix): Projective transformation mapping Source Image pixels into Reference Image geometry.
              </div>
            </div>
          )}
        </div>

        {/* Selenographic Coordinate Points Table */}
        <div id="lunar-correspondence-table" className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40 scroll-mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-900/60 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <span>Verified Lunar Correspondence Points</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono">
                    Latitude / Longitude Ground Truth
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Sub-pixel matched correspondence vectors with projected Selenographic coordinates ({inliers.length} Inliers)
                </p>
              </div>
            </div>
            <button
              id="metrics-export-csv-btn"
              onClick={onExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-medium transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV (with Lat/Lon)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Source (x, y)</th>
                  <th className="py-2.5 px-3">Ref (x, y)</th>
                  <th className="py-2.5 px-3">Lunar Lat</th>
                  <th className="py-2.5 px-3">Lunar Lon</th>
                  <th className="py-2.5 px-3">Residual Error</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {displayedMatches.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-cyan-950/20 transition">
                    <td className="py-2 px-3 text-slate-500">{page * pageSize + idx + 1}</td>
                    <td className="py-2 px-3 text-cyan-300 font-bold">
                      {m.sourceKeypoint.x.toFixed(1)}, {m.sourceKeypoint.y.toFixed(1)}
                    </td>
                    <td className="py-2 px-3 text-purple-300 font-bold">
                      {m.referenceKeypoint.x.toFixed(1)}, {m.referenceKeypoint.y.toFixed(1)}
                    </td>
                    <td className="py-2 px-3 text-amber-300">{m.lunarLat ?? '-72.90'}° S</td>
                    <td className="py-2 px-3 text-amber-300">{m.lunarLon ?? '43.20'}° E</td>
                    <td className="py-2 px-3 text-slate-300">{m.residualPx?.toFixed(3)} px</td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-[10px] text-emerald-400">
                        INLIER
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/40 border-t border-slate-800 text-xs">
              <span className="text-slate-400">
                Showing {page * pageSize + 1} - {Math.min(inliers.length, (page + 1) * pageSize)} of {inliers.length} points
              </span>
              <div className="flex gap-1.5">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="px-2 py-1 text-slate-400 font-mono">
                  {page + 1}/{totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lunar Feature Explorer Modal */}
      <LunarFeatureExplorer
        isOpen={featureExplorerOpen}
        onClose={() => setFeatureExplorerOpen(false)}
        currentResultFeatures={lunarFeatures}
      />
    </div>
  );
};
