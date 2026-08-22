import React from 'react';
import { X, Download, FileText, Image as ImageIcon, FileSpreadsheet, Code, Check } from 'lucide-react';
import { RegistrationResult, SupportedLanguage } from '../types';
import { TRANSLATIONS } from '../i18n/locales';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: RegistrationResult;
  currentLang: SupportedLanguage;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  result,
  currentLang,
}) => {
  if (!isOpen) return null;
  const t = TRANSLATIONS[currentLang];

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadDataUrl = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  const exportCSV = () => {
    const headers = ['Match_ID', 'Source_X', 'Source_Y', 'Ref_X', 'Ref_Y', 'Lunar_Lat_Deg', 'Lunar_Lon_Deg', 'Residual_Px', 'Inlier_Status'];
    const rows = result.matches.map(m => [
      m.id,
      m.sourceKeypoint.x.toFixed(3),
      m.sourceKeypoint.y.toFixed(3),
      m.referenceKeypoint.x.toFixed(3),
      m.referenceKeypoint.y.toFixed(3),
      m.lunarLat ?? -72.90,
      m.lunarLon ?? 43.20,
      m.residualPx?.toFixed(4) ?? 'N/A',
      m.inlier ? 'INLIER' : 'OUTLIER',
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvContent, `lunar_correspondences_${result.id}.csv`, 'text/csv');
  };

  const exportJSON = () => {
    const payload = {
      id: result.id,
      timestamp: result.timestamp,
      algorithm: result.featureMethod,
      transformModel: result.transformModel,
      sourceMetadata: result.sourceMeta,
      referenceMetadata: result.referenceMeta,
      transformationMatrix: result.transformation,
      metrics: result.metrics,
      correspondencePoints: result.matches,
      warnings: result.warnings,
    };
    downloadFile(JSON.stringify(payload, null, 2), `lunar_registration_${result.id}.json`, 'application/json');
  };

  const exportMarkdownReport = () => {
    const md = `# Lunar Image Registration Scientific Report
**Session ID:** ${result.id}  
**Date:** ${new Date(result.timestamp).toUTCString()}  
**Target Region:** ${result.referenceMeta.targetRegion || 'Lunar South Pole'}  

## 1. Input Image Parameters
* **Source (Moving):** ${result.sourceMeta.name} | Sensor: ${result.sourceMeta.sensor} | Sun Elev: ${result.sourceMeta.sunElevationDeg}°
* **Reference (Fixed):** ${result.referenceMeta.name} | Sensor: ${result.referenceMeta.sensor} | Sun Elev: ${result.referenceMeta.sunElevationDeg}°

## 2. Algorithmic Registration Metrics
* **Feature Detector:** ${result.featureMethod}
* **Geometric Model:** ${result.transformModel}
* **Total Candidate Matches:** ${result.metrics.totalCandidates}
* **Verified Inliers:** ${result.metrics.inlierCount} (${(result.metrics.inlierRatio * 100).toFixed(1)}%)
* **Root Mean Square Error (RMSE):** ${result.metrics.rmse} px
* **Mean Residual Error:** ${result.metrics.meanResidual} px
* **Sub-pixel Status:** ${result.metrics.subpixelAchieved ? 'Achieved (<0.5px shift)' : 'Standard'}
* **Spatial Grid Distribution:** ${result.metrics.spatialDistributionScore}%
* **Algorithmic Confidence:** ${result.metrics.confidenceScore}%
* **Processing Latency:** ${result.metrics.processingTimeMs} ms

## 3. Transformation Matrix (3x3)
\`\`\`
${result.transformation.matrix.map(row => row.map(v => v.toFixed(6)).join('\t')).join('\n')}
\`\`\`

## 4. Scientific Summary
${result.simpleExplanation}

${result.technicalExplanation}
`;
    downloadFile(md, `lunar_registration_report_${result.id}.md`, 'text/markdown');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-xl bg-[#0b0f1e] border border-cyan-900/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Download className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t.actions.downloadResults}</h3>
              <p className="text-xs text-slate-400">Export registered imagery, coordinate tables, and reports</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export options grid */}
        <div className="p-6 space-y-3">
          {/* 1. Registered Image */}
          <button
            onClick={() => downloadDataUrl(result.registeredDataUrl, `lunar_registered_${result.id}.png`)}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 transition cursor-pointer text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                  {t.actions.exportImages}
                </h4>
                <p className="text-[11px] text-slate-400">Projective aligned PNG in reference coordinate frame</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition" />
          </button>

          {/* 2. CSV Points */}
          <button
            onClick={exportCSV}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 transition cursor-pointer text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                  {t.actions.exportCsv}
                </h4>
                <p className="text-[11px] text-slate-400">All {result.matches.length} keypoints, selenographic lat/lon, residuals</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
          </button>

          {/* 3. JSON Metadata */}
          <button
            onClick={exportJSON}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 transition cursor-pointer text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                <Code className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition">
                  {t.actions.exportJson}
                </h4>
                <p className="text-[11px] text-slate-400">Transformation matrix, error metrics, and sensor metadata</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition" />
          </button>

          {/* 4. Markdown Report */}
          <button
            onClick={exportMarkdownReport}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 transition cursor-pointer text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <FileText className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition">
                  {t.actions.exportReport}
                </h4>
                <p className="text-[11px] text-slate-400">Complete formatted scientific summary for research/documentation</p>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition" />
          </button>
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
