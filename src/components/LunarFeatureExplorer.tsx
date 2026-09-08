import React, { useState, useEffect } from 'react';
import {
  Compass,
  Search,
  Filter,
  Download,
  Database,
  RotateCcw,
  Sparkles,
  Layers,
  MapPin,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { LunarFeatureIDCard, LunarFeatureType } from '../types';
import { LunarFeatureCard } from './LunarFeatureCard';
import {
  getStoredLunarFeatureRegistry,
  resetLunarFeatureRegistry,
} from '../cv/lunarFeatureDatabase';

interface LunarFeatureExplorerProps {
  currentResultFeatures?: LunarFeatureIDCard[];
  isOpen: boolean;
  onClose: () => void;
}

export const LunarFeatureExplorer: React.FC<LunarFeatureExplorerProps> = ({
  currentResultFeatures,
  isOpen,
  onClose,
}) => {
  const [registry, setRegistry] = useState<LunarFeatureIDCard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedFeature, setSelectedFeature] = useState<LunarFeatureIDCard | null>(null);

  const loadFeatures = () => {
    const data = getStoredLunarFeatureRegistry();
    setRegistry(data);
  };

  useEffect(() => {
    if (isOpen) {
      loadFeatures();
    }
  }, [isOpen, currentResultFeatures]);

  if (!isOpen) return null;

  // Filter features
  const filteredFeatures = registry.filter(f => {
    const matchesSearch =
      f.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === 'ALL' || f.type === selectedType;
    return matchesSearch && matchesType;
  });

  const handleReset = () => {
    if (window.confirm('Reset Lunar Feature Database to baseline reference catalog?')) {
      const resetData = resetLunarFeatureRegistry();
      setRegistry(resetData);
    }
  };

  const handleExportGeoJSON = () => {
    const geojson = {
      type: 'FeatureCollection',
      name: 'ISRO_Chandrayaan2_PRISM_Lunar_Features',
      crs: {
        type: 'name',
        properties: { name: 'urn:ogc:def:crs:IAU2000:30100' }, // Moon 2000 Selenographic
      },
      features: registry.map(f => ({
        type: 'Feature',
        id: f.id,
        geometry: {
          type: 'Point',
          coordinates: [f.lunarLon, f.lunarLat],
        },
        properties: {
          id: f.id,
          name: f.name,
          type: f.type,
          confidence: f.confidence,
          diameterMeters: f.diameterMeters,
          observationCount: f.observationCount,
          lastVerifiedDate: f.lastVerifiedDate,
          sensors: f.observedSensors.filter(s => s.detected).map(s => s.sensor),
        },
      })),
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], {
      type: 'application/geo+json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lunar_Features_Catalog_${Date.now()}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = [
      'Feature_ID',
      'Name',
      'Type',
      'Latitude_Deg',
      'Longitude_Deg',
      'Diameter_Meters',
      'Confidence_Pct',
      'Observation_Count',
      'Verified_Sensors',
      'Last_Verified_Date',
    ];

    const rows = registry.map(f => [
      f.id,
      `"${f.name}"`,
      f.type,
      f.lunarLat,
      f.lunarLon,
      f.diameterMeters || '',
      f.confidence,
      f.observationCount,
      `"${f.observedSensors.filter(s => s.detected).map(s => s.sensor).join(', ')}"`,
      f.lastVerifiedDate,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lunar_Features_Registry_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        id="lunar-feature-explorer-modal"
        className="w-full max-w-5xl max-h-[90vh] bg-[#090e1a] border border-cyan-900/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Lunar Feature Identity Registry
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {registry.length} Cataloged Features
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Persistent selenographic landmark database with multi-sensor cross-identification (PRISM-LF-XXXXX).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportGeoJSON}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Export GeoJSON for QGIS / Lunar GIS"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>GeoJSON</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Export CSV Table"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors font-mono ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID (e.g. PRISM-LF-00127) or landmark name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'CRATER', 'CENTRAL_PEAK', 'RIM_CREST', 'RIDGE', 'RILLE'].map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                  selectedType === type
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={handleReset}
            className="p-2 rounded-lg bg-slate-800/40 hover:bg-slate-700 text-slate-400 hover:text-amber-300 text-xs transition-colors"
            title="Reset database to seed landmarks"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Feature Cards Grid */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {filteredFeatures.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Database className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-sm font-semibold">No lunar features found matching criteria.</p>
              <p className="text-xs text-slate-500">
                Execute image registration to auto-catalog new verified lunar landmarks.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFeatures.map(feature => (
                <LunarFeatureCard
                  key={feature.id}
                  feature={feature}
                  onSelect={f => setSelectedFeature(f)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-xs text-slate-400 font-mono px-5">
          <span>
            Database Storage: <span className="text-emerald-400">localStorage</span> (Persistent across browser sessions)
          </span>
          <span>
            ISRO Chandrayaan-2 Planetary Nomenclature Standard
          </span>
        </div>
      </div>
    </div>
  );
};
