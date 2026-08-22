import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Columns,
  Sparkles,
  Flame,
  GitCommit,
  Eye,
  Sliders,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Grid,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  RegistrationResult,
  VisualMode,
  BlendMode,
  SupportedLanguage,
  MatchPoint,
} from '../types';
import { TRANSLATIONS } from '../i18n/locales';

interface VisualizerProps {
  result: RegistrationResult;
  currentLang: SupportedLanguage;
}

export const Visualizer: React.FC<VisualizerProps> = ({ result, currentLang }) => {
  const t = TRANSLATIONS[currentLang];

  // Visual state
  const [activeMode, setActiveMode] = useState<VisualMode>('side_by_side');
  const [blendMode, setBlendMode] = useState<BlendMode>('split_wipe');
  const [opacity, setOpacity] = useState<number>(0.5);
  const [splitPos, setSplitPos] = useState<number>(50);
  const [checkerTiles, setCheckerTiles] = useState<number>(8);

  // Blink comparator state
  const [isBlinking, setIsBlinking] = useState<boolean>(true);
  const [blinkSpeedMs, setBlinkSpeedMs] = useState<number>(500);
  const [blinkFrame, setBlinkFrame] = useState<'ref' | 'reg'>('ref');

  // Match Map state
  const [showInliers, setShowInliers] = useState<boolean>(true);
  const [showOutliers, setShowOutliers] = useState<boolean>(true);
  const [hoveredMatch, setHoveredMatch] = useState<MatchPoint | null>(null);

  // Canvas refs
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const matchesCanvasRef = useRef<HTMLCanvasElement>(null);

  // Images cached objects
  const [refImg, setRefImg] = useState<HTMLImageElement | null>(null);
  const [regImg, setRegImg] = useState<HTMLImageElement | null>(null);
  const [srcImg, setSrcImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const rImg = new Image();
    rImg.src = result.referenceDataUrl;
    rImg.onload = () => setRefImg(rImg);

    const rgImg = new Image();
    rgImg.src = result.registeredDataUrl;
    rgImg.onload = () => setRegImg(rgImg);

    const sImg = new Image();
    sImg.src = result.sourceDataUrl;
    sImg.onload = () => setSrcImg(sImg);
  }, [result]);

  // Blink interval timer
  useEffect(() => {
    if (!isBlinking || activeMode !== 'blink') return;
    const timer = setInterval(() => {
      setBlinkFrame(prev => (prev === 'ref' ? 'reg' : 'ref'));
    }, blinkSpeedMs);
    return () => clearInterval(timer);
  }, [isBlinking, blinkSpeedMs, activeMode]);

  // Render Overlay Canvas (Alpha, Split Wipe, Checkerboard, Difference)
  useEffect(() => {
    if (activeMode !== 'overlay' || !refImg || !regImg) return;
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = refImg.naturalWidth || 480;
    const h = refImg.naturalHeight || 480;
    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);

    if (blendMode === 'alpha') {
      // Draw Reference base
      ctx.globalAlpha = 1.0;
      ctx.drawImage(refImg, 0, 0, w, h);
      // Draw Registered overlay with alpha
      ctx.globalAlpha = opacity;
      ctx.drawImage(regImg, 0, 0, w, h);
      ctx.globalAlpha = 1.0;
    } else if (blendMode === 'split_wipe') {
      const splitX = Math.round((splitPos / 100) * w);

      // Draw Reference on left
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, h);
      ctx.clip();
      ctx.drawImage(refImg, 0, 0, w, h);
      ctx.restore();

      // Draw Registered on right
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, w - splitX, h);
      ctx.clip();
      ctx.drawImage(regImg, 0, 0, w, h);
      ctx.restore();

      // Draw wipe divider line
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, h);
      ctx.stroke();

      // Wipe handle
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(splitX, h / 2, 8, 0, 2 * Math.PI);
      ctx.fill();
    } else if (blendMode === 'checkerboard') {
      const tileSizeX = w / checkerTiles;
      const tileSizeY = h / checkerTiles;

      for (let i = 0; i < checkerTiles; i++) {
        for (let j = 0; j < checkerTiles; j++) {
          const isEven = (i + j) % 2 === 0;
          ctx.save();
          ctx.beginPath();
          ctx.rect(i * tileSizeX, j * tileSizeY, tileSizeX, tileSizeY);
          ctx.clip();
          ctx.drawImage(isEven ? refImg : regImg, 0, 0, w, h);
          ctx.restore();
        }
      }

      // Draw subtle grid lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= checkerTiles; i++) {
        ctx.beginPath();
        ctx.moveTo(i * tileSizeX, 0);
        ctx.lineTo(i * tileSizeX, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * tileSizeY);
        ctx.lineTo(w, i * tileSizeY);
        ctx.stroke();
      }
    } else if (blendMode === 'difference') {
      // Draw difference map directly
      const diffImg = new Image();
      diffImg.src = result.differenceDataUrl;
      ctx.drawImage(diffImg, 0, 0, w, h);
    }
  }, [activeMode, blendMode, opacity, splitPos, checkerTiles, refImg, regImg, result]);

  // Render Interactive Matches Canvas
  useEffect(() => {
    if (activeMode !== 'matches' || !srcImg || !refImg) return;
    const canvas = matchesCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gap = 30;
    const sw = srcImg.naturalWidth || 480;
    const sh = srcImg.naturalHeight || 480;
    const rw = refImg.naturalWidth || 480;
    const rh = refImg.naturalHeight || 480;

    const totalW = sw + rw + gap;
    const totalH = Math.max(sh, rh);
    canvas.width = totalW;
    canvas.height = totalH;

    // Background
    ctx.fillStyle = '#070a14';
    ctx.fillRect(0, 0, totalW, totalH);

    // Draw images
    ctx.drawImage(srcImg, 0, 0, sw, sh);
    ctx.drawImage(refImg, sw + gap, 0, rw, rh);

    // Frames
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, sw, sh);
    ctx.strokeRect(sw + gap, 0, rw, rh);

    const refOffset = sw + gap;

    // Draw Outliers
    if (showOutliers) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      for (const m of result.matches) {
        if (m.inlier) continue;
        ctx.beginPath();
        ctx.moveTo(m.sourceKeypoint.x, m.sourceKeypoint.y);
        ctx.lineTo(m.referenceKeypoint.x + refOffset, m.referenceKeypoint.y);
        ctx.stroke();

        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.beginPath();
        ctx.arc(m.sourceKeypoint.x, m.sourceKeypoint.y, 2.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(m.referenceKeypoint.x + refOffset, m.referenceKeypoint.y, 2.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // Draw Inliers
    if (showInliers) {
      ctx.lineWidth = 1.5;
      for (const m of result.matches) {
        if (!m.inlier) continue;
        const isHover = hoveredMatch?.id === m.id;
        const sx = m.refinedSourceX ?? m.sourceKeypoint.x;
        const sy = m.refinedSourceY ?? m.sourceKeypoint.y;
        const rx = m.referenceKeypoint.x + refOffset;
        const ry = m.referenceKeypoint.y;

        ctx.strokeStyle = isHover ? '#f59e0b' : 'rgba(34, 197, 94, 0.85)';
        ctx.lineWidth = isHover ? 3 : 1.5;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(rx, ry);
        ctx.stroke();

        // Source Keypoint
        ctx.fillStyle = isHover ? '#f59e0b' : '#22c55e';
        ctx.beginPath();
        ctx.arc(sx, sy, isHover ? 6 : 3.5, 0, 2 * Math.PI);
        ctx.fill();

        // Ref Keypoint
        ctx.fillStyle = isHover ? '#f59e0b' : '#06b6d4';
        ctx.beginPath();
        ctx.arc(rx, ry, isHover ? 6 : 3.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  }, [activeMode, showInliers, showOutliers, hoveredMatch, srcImg, refImg, result]);

  return (
    <div className="p-6 rounded-2xl bg-[#090d1c] border border-cyan-900/50 shadow-2xl space-y-5">
      {/* Navigation Tabs for Visual Modes */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="tab-side-by-side"
            onClick={() => setActiveMode('side_by_side')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeMode === 'side_by_side'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-950'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>{t.visualModes.sideBySide}</span>
          </button>

          <button
            id="tab-overlay"
            onClick={() => setActiveMode('overlay')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeMode === 'overlay'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-950'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t.visualModes.overlay}</span>
          </button>

          <button
            id="tab-blink"
            onClick={() => setActiveMode('blink')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeMode === 'blink'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-950'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.visualModes.blink}</span>
          </button>

          <button
            id="tab-difference"
            onClick={() => setActiveMode('difference')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeMode === 'difference'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-950'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{t.visualModes.difference}</span>
          </button>

          <button
            id="tab-matches"
            onClick={() => setActiveMode('matches')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeMode === 'matches'
                ? 'bg-cyan-500 text-white shadow-md shadow-cyan-950'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>{t.visualModes.matches}</span>
          </button>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-400 font-semibold">
            Aligned ({result.metrics.inlierCount} inliers, RMSE {result.metrics.rmse}px)
          </span>
        </div>
      </div>

      {/* 1. SIDE-BY-SIDE MODE */}
      {activeMode === 'side_by_side' && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                Source (Original Moving)
              </span>
              <span className="font-mono text-[10px] text-slate-500">{result.sourceMeta.sensor}</span>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/60 aspect-square flex items-center justify-center">
              <img
                src={result.sourceDataUrl}
                alt="Source"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                Reference (Fixed Ground Truth)
              </span>
              <span className="font-mono text-[10px] text-slate-500">{result.referenceMeta.sensor}</span>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/60 aspect-square flex items-center justify-center">
              <img
                src={result.referenceDataUrl}
                alt="Reference"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-cyan-300 font-bold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Registered Aligned Output
              </span>
              <span className="font-mono text-[10px] text-emerald-400">RMSE {result.metrics.rmse}px</span>
            </div>
            <div className="rounded-xl overflow-hidden border border-cyan-500/50 bg-black/60 aspect-square flex items-center justify-center shadow-lg shadow-cyan-950">
              <img
                src={result.registeredDataUrl}
                alt="Registered"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. OVERLAY MODE */}
      {activeMode === 'overlay' && (
        <div className="space-y-4">
          {/* Overlay Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Blend Style:</span>
              <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-slate-800">
                {(['split_wipe', 'alpha', 'checkerboard', 'difference'] as BlendMode[]).map(b => (
                  <button
                    key={b}
                    onClick={() => setBlendMode(b)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer capitalize ${
                      blendMode === b
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {b.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {blendMode === 'split_wipe' && (
              <div className="flex items-center gap-3 flex-1 max-w-xs">
                <span className="text-slate-400 text-[11px]">Wipe Position:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={splitPos}
                  onChange={e => setSplitPos(Number(e.target.value))}
                  className="flex-1 accent-cyan-400"
                />
                <span className="font-mono text-cyan-300 text-xs">{splitPos}%</span>
              </div>
            )}

            {blendMode === 'alpha' && (
              <div className="flex items-center gap-3 flex-1 max-w-xs">
                <span className="text-slate-400 text-[11px]">Registered Opacity:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={opacity}
                  onChange={e => setOpacity(Number(e.target.value))}
                  className="flex-1 accent-cyan-400"
                />
                <span className="font-mono text-cyan-300 text-xs">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
            )}

            {blendMode === 'checkerboard' && (
              <div className="flex items-center gap-3">
                <span className="text-slate-400 text-[11px]">Tile Count:</span>
                <div className="flex gap-1">
                  {[4, 8, 16, 24].map(tNum => (
                    <button
                      key={tNum}
                      onClick={() => setCheckerTiles(tNum)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        checkerTiles === tNum
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {tNum}x{tNum}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Canvas container */}
          <div className="flex justify-center bg-black/80 p-4 rounded-xl border border-slate-800">
            <canvas
              ref={overlayCanvasRef}
              className="max-h-[500px] w-auto max-w-full object-contain rounded-lg border border-slate-700 shadow-xl"
            />
          </div>
        </div>
      )}

      {/* 3. BLINK COMPARATOR MODE */}
      {activeMode === 'blink' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsBlinking(!isBlinking)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  isBlinking
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                }`}
              >
                {isBlinking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isBlinking ? 'Pause Blink' : 'Resume Blink'}</span>
              </button>

              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-[11px] mr-1">Speed:</span>
                {[200, 400, 750, 1200].map(spd => (
                  <button
                    key={spd}
                    onClick={() => setBlinkSpeedMs(spd)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                      blinkSpeedMs === spd
                        ? 'bg-cyan-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}ms
                  </button>
                ))}
              </div>
            </div>

            {/* Active Frame Indicator */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">Viewing Frame:</span>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-bold font-mono ${
                  blinkFrame === 'ref'
                    ? 'bg-purple-950 border border-purple-600 text-purple-300'
                    : 'bg-cyan-950 border border-cyan-600 text-cyan-300'
                }`}
              >
                {blinkFrame === 'ref' ? 'REFERENCE (Ground Truth)' : 'REGISTERED (Aligned Source)'}
              </span>
            </div>
          </div>

          <div className="flex justify-center bg-black/80 p-4 rounded-xl border border-slate-800">
            <div className="relative max-h-[500px] aspect-square flex items-center justify-center">
              <img
                src={blinkFrame === 'ref' ? result.referenceDataUrl : result.registeredDataUrl}
                alt="Blink Comparator"
                className="max-h-[500px] w-auto rounded-lg border border-slate-700 shadow-2xl object-contain"
              />
              <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/80 border border-slate-700 text-[11px] font-mono text-white">
                {blinkFrame === 'ref' ? 'Frame A: Fixed Reference' : 'Frame B: Warped Registered'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. DIFFERENCE HEATMAP MODE */}
      {activeMode === 'difference' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <span className="text-slate-300 font-medium">
              Absolute Photometric Residual (|I_ref - I_reg|)
            </span>
            {/* Color ramp legend */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-mono">0.0 (Perfect Alignment)</span>
              <div className="w-32 h-3 rounded bg-gradient-to-r from-[#0a1828] via-[#06b6d4] via-[#facc15] to-[#f43f5e] border border-slate-700" />
              <span className="text-[10px] text-rose-400 font-mono">High Residual</span>
            </div>
          </div>

          <div className="flex justify-center bg-black/80 p-4 rounded-xl border border-slate-800">
            <img
              src={result.differenceDataUrl}
              alt="Difference Map"
              className="max-h-[500px] w-auto max-w-full rounded-lg border border-slate-700 shadow-xl object-contain"
            />
          </div>
        </div>
      )}

      {/* 5. MATCHES MAP MODE */}
      {activeMode === 'matches' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInliers}
                  onChange={e => setShowInliers(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Inliers ({result.metrics.inlierCount})
                </span>
              </label>

              <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOutliers}
                  onChange={e => setShowOutliers(e.target.checked)}
                  className="rounded accent-rose-500"
                />
                <span className="flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  Outliers ({result.metrics.outlierCount})
                </span>
              </label>
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              Hover table below to highlight vector correspondences
            </div>
          </div>

          <div className="flex justify-center bg-black/80 p-4 rounded-xl border border-slate-800 overflow-x-auto">
            <canvas
              ref={matchesCanvasRef}
              className="max-h-[480px] w-auto rounded-lg border border-slate-700 shadow-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
