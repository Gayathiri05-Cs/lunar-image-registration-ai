import React from 'react';
import {
  Compass,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Tag,
  Shield,
  Activity,
} from 'lucide-react';
import { LunarFeatureIDCard, LunarFeatureType } from '../types';

interface LunarFeatureCardProps {
  feature: LunarFeatureIDCard;
  onSelect?: (feature: LunarFeatureIDCard) => void;
}

export const LunarFeatureCard: React.FC<LunarFeatureCardProps> = ({
  feature,
  onSelect,
}) => {
  const {
    id,
    name,
    type,
    lunarLat,
    lunarLon,
    diameterMeters,
    confidence,
    observedSensors,
    observationCount,
    isPreviouslyObserved,
    description,
    lastVerifiedDate,
  } = feature;

  const getTypeColor = (featType: LunarFeatureType) => {
    switch (featType) {
      case 'CRATER':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'CENTRAL_PEAK':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'RIM_CREST':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'RIDGE':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'RILLE':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div
      id={`lunar-feature-card-${id}`}
      onClick={() => onSelect?.(feature)}
      className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 transition-all duration-200 shadow-md space-y-3 relative group"
    >
      {/* Header: ID, Badge, and Confidence */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-extrabold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
              {id}
            </span>
            {isPreviouslyObserved ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Observed ({observationCount}×)</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>New Landmark</span>
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-white mt-1.5 line-clamp-1">
            {name}
          </h4>
        </div>

        <div className="text-right shrink-0">
          <div className="font-mono text-sm font-extrabold text-emerald-400">
            {confidence}%
          </div>
          <span className="text-[9px] font-mono text-slate-400 uppercase">
            Confidence
          </span>
        </div>
      </div>

      {/* Selenographic Coordinates & Metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
        <div className="flex items-center gap-1.5 text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            {Math.abs(lunarLat).toFixed(4)}° {lunarLat < 0 ? 'S' : 'N'}, {Math.abs(lunarLon).toFixed(4)}° {lunarLon < 0 ? 'W' : 'E'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300 justify-end">
          <Tag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{diameterMeters ? `${(diameterMeters / 1000).toFixed(2)} km span` : type}</span>
        </div>
      </div>

      {/* Multi-Sensor Detection Badges */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
          Cross-Sensor Observation Record:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {observedSensors.map((det, idx) => (
            <div
              key={idx}
              className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1.5 border ${
                det.detected
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-slate-900/40 border-slate-800 text-slate-500'
              }`}
            >
              {det.detected ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : (
                <XCircle className="w-3 h-3 text-slate-600" />
              )}
              <span className="font-bold">{det.sensor}:</span>
              <span>
                {det.detected
                  ? det.pixelCoords
                    ? `(x: ${det.pixelCoords.x}, y: ${det.pixelCoords.y})`
                    : 'Detected'
                  : 'Not Covered'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Description / Geomorphic Notes */}
      <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
        {description}
      </p>

      {/* Footer Timestamp */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>Verified: {new Date(lastVerifiedDate).toLocaleDateString()}</span>
        </span>
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getTypeColor(type)}`}>
          {type.replace('_', ' ')}
        </span>
      </div>
    </div>
  );
};
