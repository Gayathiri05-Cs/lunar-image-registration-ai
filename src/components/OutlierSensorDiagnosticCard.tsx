import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Sliders,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
} from 'lucide-react';
import { TriSensorValidationResult, SensorType } from '../types';

interface OutlierSensorDiagnosticCardProps {
  validation: TriSensorValidationResult;
  onProceedWithVerifiedPair?: () => void;
  onReplaceOutlier?: () => void;
  onInspectPairwise?: (pairKey: 'ohrc_tmc' | 'ohrc_iirs' | 'tmc_iirs') => void;
}

export const OutlierSensorDiagnosticCard: React.FC<OutlierSensorDiagnosticCardProps> = ({
  validation,
  onProceedWithVerifiedPair,
  onReplaceOutlier,
  onInspectPairwise,
}) => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const {
    status,
    outlierSensor,
    outlierSlot,
    validSensors,
    pairwise,
    diagnosticMessage,
    detailedReason,
    canProceedWithPair,
    suggestedAction,
  } = validation;

  const isOutlier = status === 'OUTLIER_DETECTED';
  const allValid = status === 'ALL_VALID';

  // Sensor status helper
  const getSensorStatus = (sensor: 'OHRC' | 'TMC' | 'IIRS') => {
    if (allValid) return { isOk: true, label: 'Relevant', badge: '✓ Relevant' };
    if (sensor === outlierSensor || sensor === outlierSlot) {
      return { isOk: false, label: 'Inconsistent / Outlier', badge: '✕ Inconsistent' };
    }
    if (validSensors.includes(sensor as SensorType)) {
      return { isOk: true, label: 'Relevant', badge: '✓ Relevant' };
    }
    return { isOk: false, label: 'Unverified', badge: '? Unverified' };
  };

  const ohrcStatus = getSensorStatus('OHRC');
  const tmcStatus = getSensorStatus('TMC');
  const iirsStatus = getSensorStatus('IIRS');

  return (
    <div
      id="outlier-sensor-diagnostic-card"
      className={`rounded-2xl border transition-all duration-300 overflow-hidden shadow-2xl ${
        isOutlier
          ? 'bg-[#150d18] border-rose-500/50 shadow-rose-950/30'
          : allValid
          ? 'bg-[#09151c] border-emerald-500/40 shadow-emerald-950/20'
          : 'bg-[#12141f] border-amber-500/40'
      }`}
    >
      {/* Header Banner */}
      <div
        className={`px-5 py-4 flex items-center justify-between border-b ${
          isOutlier
            ? 'bg-rose-950/50 border-rose-900/60'
            : allValid
            ? 'bg-emerald-950/50 border-emerald-900/60'
            : 'bg-amber-950/50 border-amber-900/60'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isOutlier
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : allValid
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            }`}
          >
            {isOutlier ? (
              <ShieldAlert className="w-5 h-5" />
            ) : allValid ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Multi-Sensor Scene Triangulation
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wide ${
                  isOutlier
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : allValid
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {isOutlier
                  ? `OUTLIER DETECTED: ${outlierSensor || outlierSlot}`
                  : allValid
                  ? '3-SENSOR CONGRUENCE VERIFIED'
                  : 'MULTIPLE INCONSISTENCIES'}
              </span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {diagnosticMessage}
            </h3>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 transition-colors"
          title="Toggle Details"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Body */}
      {expanded && (
        <div className="p-5 space-y-6">
          {/* 1. THREE SENSOR RELEVANCE STATUS BADGES */}
          <div className="grid grid-cols-3 gap-3">
            {/* OHRC */}
            <div
              className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                ohrcStatus.isOk
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-800/60 text-rose-300 ring-2 ring-rose-500/30'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 font-mono font-bold text-xs uppercase">
                {ohrcStatus.isOk ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
                <span>OHRC</span>
              </div>
              <span
                className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                  ohrcStatus.isOk
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {ohrcStatus.badge}
              </span>
              <span className="text-[10px] text-slate-400 mt-1">
                0.25m High-Res Optical
              </span>
            </div>

            {/* TMC */}
            <div
              className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                tmcStatus.isOk
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-800/60 text-rose-300 ring-2 ring-rose-500/30'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 font-mono font-bold text-xs uppercase">
                {tmcStatus.isOk ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
                <span>TMC</span>
              </div>
              <span
                className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                  tmcStatus.isOk
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {tmcStatus.badge}
              </span>
              <span className="text-[10px] text-slate-400 mt-1">
                5.0m Stereo Mapping
              </span>
            </div>

            {/* IIRS */}
            <div
              className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                iirsStatus.isOk
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-800/60 text-rose-300 ring-2 ring-rose-500/30'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 font-mono font-bold text-xs uppercase">
                {iirsStatus.isOk ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
                <span>IIRS</span>
              </div>
              <span
                className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                  iirsStatus.isOk
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300 animate-pulse'
                }`}
              >
                {iirsStatus.badge}
              </span>
              <span className="text-[10px] text-slate-400 mt-1">
                0.8-5.0µm Infrared
              </span>
            </div>
          </div>

          {/* 2. PAIRWISE COMPATIBILITY COMPARISON MATRIX */}
          <div className="bg-[#0b0f19] p-4 rounded-xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Pairwise Lunar Compatibility Matrix
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Minimum inlier consensus threshold: 50%
              </span>
            </div>

            <div className="grid md:grid-cols-3 gap-3 pt-1">
              {/* Pair 1: OHRC ↔ TMC */}
              <div
                onClick={() => onInspectPairwise?.('ohrc_tmc')}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${
                  pairwise.ohrc_tmc.isCompatible
                    ? 'bg-emerald-950/20 border-emerald-800/50 hover:border-emerald-500'
                    : 'bg-rose-950/20 border-rose-800/50 hover:border-rose-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-white">OHRC ↔ TMC</span>
                  <span
                    className={`font-mono text-xs font-extrabold px-1.5 py-0.5 rounded ${
                      pairwise.ohrc_tmc.compatibilityScore >= 50
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {pairwise.ohrc_tmc.compatibilityScore}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pairwise.ohrc_tmc.compatibilityScore >= 50 ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                    style={{ width: `${pairwise.ohrc_tmc.compatibilityScore}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2">
                  {pairwise.ohrc_tmc.reason}
                </p>
                <div className="mt-2 text-[10px] font-mono text-cyan-400/80 flex items-center justify-between">
                  <span>Inliers: {pairwise.ohrc_tmc.inlierCount}</span>
                  <span>RMSE: {pairwise.ohrc_tmc.rmse.toFixed(2)}px</span>
                </div>
              </div>

              {/* Pair 2: OHRC ↔ IIRS */}
              <div
                onClick={() => onInspectPairwise?.('ohrc_iirs')}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${
                  pairwise.ohrc_iirs.isCompatible
                    ? 'bg-emerald-950/20 border-emerald-800/50 hover:border-emerald-500'
                    : 'bg-rose-950/20 border-rose-800/50 hover:border-rose-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-white">OHRC ↔ IIRS</span>
                  <span
                    className={`font-mono text-xs font-extrabold px-1.5 py-0.5 rounded ${
                      pairwise.ohrc_iirs.compatibilityScore >= 50
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {pairwise.ohrc_iirs.compatibilityScore}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pairwise.ohrc_iirs.compatibilityScore >= 50 ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                    style={{ width: `${pairwise.ohrc_iirs.compatibilityScore}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2">
                  {pairwise.ohrc_iirs.reason}
                </p>
                <div className="mt-2 text-[10px] font-mono text-cyan-400/80 flex items-center justify-between">
                  <span>Inliers: {pairwise.ohrc_iirs.inlierCount}</span>
                  <span>RMSE: {pairwise.ohrc_iirs.rmse.toFixed(2)}px</span>
                </div>
              </div>

              {/* Pair 3: TMC ↔ IIRS */}
              <div
                onClick={() => onInspectPairwise?.('tmc_iirs')}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${
                  pairwise.tmc_iirs.isCompatible
                    ? 'bg-emerald-950/20 border-emerald-800/50 hover:border-emerald-500'
                    : 'bg-rose-950/20 border-rose-800/50 hover:border-rose-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-white">TMC ↔ IIRS</span>
                  <span
                    className={`font-mono text-xs font-extrabold px-1.5 py-0.5 rounded ${
                      pairwise.tmc_iirs.compatibilityScore >= 50
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {pairwise.tmc_iirs.compatibilityScore}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pairwise.tmc_iirs.compatibilityScore >= 50 ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                    style={{ width: `${pairwise.tmc_iirs.compatibilityScore}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-2">
                  {pairwise.tmc_iirs.reason}
                </p>
                <div className="mt-2 text-[10px] font-mono text-cyan-400/80 flex items-center justify-between">
                  <span>Inliers: {pairwise.tmc_iirs.inlierCount}</span>
                  <span>RMSE: {pairwise.tmc_iirs.rmse.toFixed(2)}px</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. SCIENTIFIC REASONING & SUMMARY */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>Diagnostic Assessment:</span>
            </div>
            <p className="leading-relaxed text-slate-300">
              {detailedReason}
            </p>
          </div>

          {/* 4. ACTIONS */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            <div className="text-[11px] font-mono text-slate-400">
              {suggestedAction}
            </div>

            <div className="flex items-center gap-2.5">
              {isOutlier && canProceedWithPair && onProceedWithVerifiedPair && (
                <button
                  id="btn-register-verified-pair"
                  onClick={onProceedWithVerifiedPair}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Register Verified Pair ({validSensors.join(' ↔ ')})</span>
                </button>
              )}

              {isOutlier && onReplaceOutlier && (
                <button
                  id="btn-replace-outlier-sensor"
                  onClick={onReplaceOutlier}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Replace {outlierSensor || 'Outlier'} Image</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
