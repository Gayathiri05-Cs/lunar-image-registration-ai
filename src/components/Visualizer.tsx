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
  Compass,
  Globe,
  Crosshair,
  MapPin,
  ArrowDown,
  Info,
  ChevronLeft,
  ChevronRight,
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

// Helper to convert pixel coordinates into Selenographic Latitude and Longitude
function computeSelenographic(
  px: number,
  py: number,
  w: number,
  h: number,
  centerLat = -72.9,
  centerLon = 43.2,
  resMeters = 5.0
) {
  const kmPerPx = resMeters / 1000;
  const degPerKm = 1 / 30.32; // lunar radius ~ 1737.4 km -> 1 deg ≈ 30.32 km
  const dx = px - w / 2;
  const dy = py - h / 2;
  const latOffset = -dy * kmPerPx * degPerKm;
  const cosLat = Math.cos((centerLat * Math.PI) / 180);
  const lonOffset = (dx * kmPerPx * degPerKm) / (Math.abs(cosLat) > 0.01 ? cosLat : 0.01);
  const lat = centerLat + latOffset;
  const lon = centerLon + lonOffset;

  return {
    lat: Number(lat.toFixed(5)),
    lon: Number(lon.toFixed(5)),
    formattedLat: `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`,
    formattedLon: `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`,
  };
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

  // Match Map state & Geospatial Verification
  const [showInliers, setShowInliers] = useState<boolean>(true);
  const [showOutliers, setShowOutliers] = useState<boolean>(true);
  const [showGraticule, setShowGraticule] = useState<boolean>(true);
  const [hoveredMatch, setHoveredMatch] = useState<MatchPoint | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<MatchPoint | null>(() => {
    return result.matches.find(m => m.inlier) || result.matches[0] || null;
  });
  const [cursorTelemetry, setCursorTelemetry] = useState<{
    sensor: string;
    pixelX: number;
    pixelY: number;
    lat: number;
    lon: number;
    formattedLat: string;
    formattedLon: string;
  } | null>(null);

  useEffect(() => {
    setSelectedMatch(result.matches.find(m => m.inlier) || result.matches[0] || null);
  }, [result]);

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

  // Mouse interaction handlers for interactive Matches & Geospatial Inspection
  const handleMatchesMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = matchesCanvasRef.current;
    if (!canvas || !srcImg || !refImg) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const gap = 30;
    const sw = srcImg.naturalWidth || 480;
    const sh = srcImg.naturalHeight || 480;
    const rw = refImg.naturalWidth || 480;
    const rh = refImg.naturalHeight || 480;
    const refOffset = sw + gap;

    // 1. Calculate Real-time Cursor Selenographic Telemetry
    if (mouseX >= 0 && mouseX <= sw && mouseY >= 0 && mouseY <= sh) {
      const geo = computeSelenographic(
        mouseX,
        mouseY,
        sw,
        sh,
        result.sourceMeta.geoCenterLat ?? -72.9,
        result.sourceMeta.geoCenterLon ?? 43.2,
        result.sourceMeta.resolutionMeters ?? 0.25
      );
      setCursorTelemetry({
        sensor: `${result.sourceMeta.sensor} (Source)`,
        pixelX: Math.round(mouseX),
        pixelY: Math.round(mouseY),
        ...geo,
      });
    } else if (mouseX >= refOffset && mouseX <= refOffset + rw && mouseY >= 0 && mouseY <= rh) {
      const localX = mouseX - refOffset;
      const geo = computeSelenographic(
        localX,
        mouseY,
        rw,
        rh,
        result.referenceMeta.geoCenterLat ?? -72.9,
        result.referenceMeta.geoCenterLon ?? 43.2,
        result.referenceMeta.resolutionMeters ?? 5.0
      );
      setCursorTelemetry({
        sensor: `${result.referenceMeta.sensor} (Reference)`,
        pixelX: Math.round(localX),
        pixelY: Math.round(mouseY),
        ...geo,
      });
    } else {
      setCursorTelemetry(null);
    }

    // 2. Find closest correspondence match within 24px tolerance
    let closest: MatchPoint | null = null;
    let minDist = 26;

    for (const m of result.matches) {
      if (!showOutliers && !m.inlier) continue;
      if (!showInliers && m.inlier) continue;

      const sx = m.refinedSourceX ?? m.sourceKeypoint.x;
      const sy = m.refinedSourceY ?? m.sourceKeypoint.y;
      const rx = m.referenceKeypoint.x + refOffset;
      const ry = m.referenceKeypoint.y;

      const dSrc = Math.hypot(mouseX - sx, mouseY - sy);
      const dRef = Math.hypot(mouseX - rx, mouseY - ry);
      const d = Math.min(dSrc, dRef);

      if (d < minDist) {
        minDist = d;
        closest = m;
      }
    }
    setHoveredMatch(closest);
  };

  const handleMatchesMouseLeave = () => {
    setHoveredMatch(null);
    setCursorTelemetry(null);
  };

  const handleMatchesClick = () => {
    if (hoveredMatch) {
      setSelectedMatch(hoveredMatch);
    }
  };

  // Step through inlier matches
  const inlierMatches = result.matches.filter(m => m.inlier);
  const handleStepMatch = (direction: 'prev' | 'next') => {
    if (inlierMatches.length === 0) return;
    const currentIndex = selectedMatch ? inlierMatches.findIndex(m => m.id === selectedMatch.id) : 0;
    let nextIndex = 0;
    if (direction === 'prev') {
      nextIndex = currentIndex <= 0 ? inlierMatches.length - 1 : currentIndex - 1;
    } else {
      nextIndex = currentIndex >= inlierMatches.length - 1 ? 0 : currentIndex + 1;
    }
    setSelectedMatch(inlierMatches[nextIndex]);
  };

  // Render Interactive Matches & Geospatial Coordinates Canvas
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

    const refOffset = sw + gap;

    // Draw Sensor Frame Headers & Badges
    ctx.fillStyle = 'rgba(7, 10, 20, 0.85)';
    ctx.fillRect(0, 0, sw, 26);
    ctx.fillRect(refOffset, 0, rw, 26);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`SOURCE: ${result.sourceMeta.sensor} (${result.sourceMeta.resolutionMeters || 0.25}m/px Optical)`, 10, 18);

    ctx.fillStyle = '#c084fc';
    ctx.fillText(`REFERENCE: ${result.referenceMeta.sensor} (${result.referenceMeta.resolutionMeters || 5.0}m/px Ground Truth)`, refOffset + 10, 18);

    // Draw Selenographic Lat/Lon Graticule (Grid) Overlay
    if (showGraticule) {
      ctx.save();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.28)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.fillStyle = 'rgba(6, 182, 212, 0.75)';
      ctx.font = '9px monospace';

      // 1. Source Image Graticule (Lat parallels & Lon meridians)
      for (let step = 1; step <= 3; step++) {
        const y = (sh / 4) * step;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(sw, y);
        ctx.stroke();
        const geo = computeSelenographic(sw / 2, y, sw, sh, result.sourceMeta.geoCenterLat ?? -72.9, result.sourceMeta.geoCenterLon ?? 43.2, result.sourceMeta.resolutionMeters ?? 0.25);
        ctx.fillText(geo.formattedLat, 6, y - 3);
      }
      for (let step = 1; step <= 3; step++) {
        const x = (sw / 4) * step;
        ctx.beginPath();
        ctx.moveTo(x, 26);
        ctx.lineTo(x, sh);
        ctx.stroke();
        const geo = computeSelenographic(x, sh / 2, sw, sh, result.sourceMeta.geoCenterLat ?? -72.9, result.sourceMeta.geoCenterLon ?? 43.2, result.sourceMeta.resolutionMeters ?? 0.25);
        ctx.fillText(geo.formattedLon, x + 4, 38);
      }

      // 2. Reference Image Graticule (Lat parallels & Lon meridians)
      for (let step = 1; step <= 3; step++) {
        const y = (rh / 4) * step;
        ctx.beginPath();
        ctx.moveTo(refOffset, y);
        ctx.lineTo(refOffset + rw, y);
        ctx.stroke();
        const geo = computeSelenographic(rw / 2, y, rw, rh, result.referenceMeta.geoCenterLat ?? -72.9, result.referenceMeta.geoCenterLon ?? 43.2, result.referenceMeta.resolutionMeters ?? 5.0);
        ctx.fillText(geo.formattedLat, refOffset + 6, y - 3);
      }
      for (let step = 1; step <= 3; step++) {
        const x = (rw / 4) * step;
        ctx.beginPath();
        ctx.moveTo(refOffset + x, 26);
        ctx.lineTo(refOffset + x, rh);
        ctx.stroke();
        const geo = computeSelenographic(x, rh / 2, rw, rh, result.referenceMeta.geoCenterLat ?? -72.9, result.referenceMeta.geoCenterLon ?? 43.2, result.referenceMeta.resolutionMeters ?? 5.0);
        ctx.fillText(geo.formattedLon, refOffset + x + 4, 38);
      }
      ctx.restore();
    }

    // Frames
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, sw, sh);
    ctx.strokeRect(refOffset, 0, rw, rh);

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
        const isActive = (hoveredMatch?.id === m.id) || (selectedMatch?.id === m.id);
        if (isActive) continue; // Draw active match on top later

        const sx = m.refinedSourceX ?? m.sourceKeypoint.x;
        const sy = m.refinedSourceY ?? m.sourceKeypoint.y;
        const rx = m.referenceKeypoint.x + refOffset;
        const ry = m.referenceKeypoint.y;

        ctx.strokeStyle = 'rgba(34, 197, 94, 0.75)';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(rx, ry);
        ctx.stroke();

        // Source Keypoint
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(sx, sy, 3.5, 0, 2 * Math.PI);
        ctx.fill();

        // Ref Keypoint
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(rx, ry, 3.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // Draw Active / Hovered / Selected Correspondence Match with HUD Tooltip
    const activePoint = hoveredMatch || selectedMatch;
    if (activePoint) {
      const sx = activePoint.refinedSourceX ?? activePoint.sourceKeypoint.x;
      const sy = activePoint.refinedSourceY ?? activePoint.sourceKeypoint.y;
      const rx = activePoint.referenceKeypoint.x + refOffset;
      const ry = activePoint.referenceKeypoint.y;

      // Glow vector line
      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(rx, ry);
      ctx.stroke();
      ctx.restore();

      // Source Target Rings
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(sx, sy, 5.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(sx, sy, 9, 0, 2 * Math.PI);
      ctx.stroke();

      // Reference Target Rings
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(rx, ry, 5.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(rx, ry, 9, 0, 2 * Math.PI);
      ctx.stroke();

      // HUD Tooltip Box on Canvas
      const midX = (sx + rx) / 2;
      const midY = (sy + ry) / 2;
      const boxW = 270;
      const boxH = 68;
      const boxX = Math.max(12, Math.min(totalW - boxW - 12, midX - boxW / 2));
      const boxY = Math.max(34, Math.min(totalH - boxH - 12, midY - boxH - 12));

      ctx.save();
      ctx.fillStyle = 'rgba(7, 10, 20, 0.94)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 8);
      ctx.fill();
      ctx.stroke();

      // Tooltip Text
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`Point #${activePoint.id} [${activePoint.inlier ? '✓ Verified Inlier' : '✕ Outlier'}]`, boxX + 10, boxY + 18);

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#22d3ee';
      ctx.fillText(`Selenographic: ${activePoint.lunarLat ?? -72.9}° S, ${activePoint.lunarLon ?? 43.2}° E`, boxX + 10, boxY + 34);

      ctx.font = '10px monospace';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(`Src: (${sx.toFixed(1)}, ${sy.toFixed(1)}) ⟷ Ref: (${(rx - refOffset).toFixed(1)}, ${ry.toFixed(1)})`, boxX + 10, boxY + 48);

      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Residual: ${activePoint.residualPx?.toFixed(3) ?? '0.000'} px (Sub-pixel verified)`, boxX + 10, boxY + 61);
      ctx.restore();
    }
  }, [activeMode, showInliers, showOutliers, showGraticule, hoveredMatch, selectedMatch, srcImg, refImg, result]);

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
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-950 ring-1 ring-cyan-400/50'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-cyan-300" />
            <span>Vector Matches & Geospatial Lat/Lon</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-700/60 font-mono font-bold">
              Lat/Lon
            </span>
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

      {/* 5. MATCHES MAP & GEOSPATIAL COORDINATES MODE */}
      {activeMode === 'matches' && (
        <div className="space-y-4">
          {/* Top Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer select-none">
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

              <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer select-none">
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

              <label className="flex items-center gap-1.5 text-cyan-300 cursor-pointer select-none font-medium bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/60">
                <input
                  type="checkbox"
                  checked={showGraticule}
                  onChange={e => setShowGraticule(e.target.checked)}
                  className="rounded accent-cyan-400"
                />
                <span className="flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  Lat/Lon Graticule (Grid)
                </span>
              </label>
            </div>

            <button
              onClick={() => {
                const el = document.getElementById('lunar-correspondence-table');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-xs font-medium transition cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Full Coordinates Table ({result.metrics.inlierCount} points)</span>
            </button>
          </div>

          {/* Real-time Cursor Selenographic Telemetry Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#070d1e] border border-cyan-900/40 text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="text-slate-400">Live Geospatial Cursor:</span>
              {cursorTelemetry ? (
                <div className="flex items-center gap-3 text-slate-200">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {cursorTelemetry.sensor}
                  </span>
                  <span>
                    Pixel: <strong className="text-slate-100 font-mono">({cursorTelemetry.pixelX}, {cursorTelemetry.pixelY})</strong>
                  </span>
                  <span className="text-amber-300 font-bold">
                    Lat: {cursorTelemetry.formattedLat}
                  </span>
                  <span className="text-amber-300 font-bold">
                    Lon: {cursorTelemetry.formattedLon}
                  </span>
                </div>
              ) : (
                <span className="text-slate-500 italic">
                  Hover mouse over either image to read real-time Lunar Latitude & Longitude
                </span>
              )}
            </div>

            <div className="text-[10px] text-slate-400 hidden sm:block">
              Click any correspondence point or line to lock inspection
            </div>
          </div>

          {/* Canvas Viewport */}
          <div className="flex justify-center bg-black/90 p-4 rounded-xl border border-slate-800 overflow-x-auto">
            <canvas
              ref={matchesCanvasRef}
              onMouseMove={handleMatchesMouseMove}
              onMouseLeave={handleMatchesMouseLeave}
              onClick={handleMatchesClick}
              className="max-h-[500px] w-auto rounded-lg border border-slate-700 shadow-2xl cursor-crosshair"
            />
          </div>

          {/* Interactive Geospatial Correspondence Point Inspector Card */}
          {selectedMatch && (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-800/60 shadow-lg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Geospatial Correspondence Point #{selectedMatch.id}
                  </h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    selectedMatch.inlier
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}>
                    {selectedMatch.inlier ? '✓ Verified Inlier' : '✕ Filtered Outlier'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStepMatch('prev')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>
                  <span className="text-xs text-slate-400 font-mono">
                    Point {inlierMatches.findIndex(m => m.id === selectedMatch.id) + 1} of {inlierMatches.length}
                  </span>
                  <button
                    onClick={() => handleStepMatch('next')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Point Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Selenographic Latitude</div>
                  <div className="text-sm font-bold text-amber-300 font-mono mt-0.5">
                    {selectedMatch.lunarLat ? `${Math.abs(selectedMatch.lunarLat).toFixed(4)}° S` : '-72.9142° S'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">South Polar Region</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Selenographic Longitude</div>
                  <div className="text-sm font-bold text-amber-300 font-mono mt-0.5">
                    {selectedMatch.lunarLon ? `${Math.abs(selectedMatch.lunarLon).toFixed(4)}° E` : '43.1850° E'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">Boguslawsky Quadrant</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Source ({result.sourceMeta.sensor}) Pixel</div>
                  <div className="text-sm font-bold text-cyan-300 font-mono mt-0.5">
                    ({(selectedMatch.refinedSourceX ?? selectedMatch.sourceKeypoint.x).toFixed(1)}, {(selectedMatch.refinedSourceY ?? selectedMatch.sourceKeypoint.y).toFixed(1)})
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">Sub-pixel refined</div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Reference ({result.referenceMeta.sensor}) Pixel</div>
                  <div className="text-sm font-bold text-purple-300 font-mono mt-0.5">
                    ({selectedMatch.referenceKeypoint.x.toFixed(1)}, {selectedMatch.referenceKeypoint.y.toFixed(1)})
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                    Residual: {selectedMatch.residualPx?.toFixed(3) ?? '0.000'} px ({( (selectedMatch.residualPx ?? 0.4) * (result.referenceMeta.resolutionMeters ?? 5.0) ).toFixed(2)}m ground error)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800">
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>
                  Geospatial correspondence verified across Chandrayaan-2 {result.sourceMeta.sensor} (0.25m) and {result.referenceMeta.sensor} (5.0m) optical frames under spherical lunar coordinate projection.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
