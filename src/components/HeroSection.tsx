import React from 'react';
import {
  Sun,
  Layers,
  ShieldCheck,
  Target,
  Maximize2,
  Cpu,
  ArrowRight,
  Sparkles,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import { SupportedLanguage } from '../types';
import { TRANSLATIONS } from '../i18n/locales';

interface HeroSectionProps {
  currentLang: SupportedLanguage;
  onStartClick: () => void;
  onDemoClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  currentLang,
  onStartClick,
  onDemoClick,
}) => {
  const t = TRANSLATIONS[currentLang];

  const pipelineSteps = [
    { title: 'Source & Ref Images', sub: 'Multi-Sensor Input' },
    { title: 'CLAHE & Gradients', sub: 'Illumination Invariance' },
    { title: 'Feature Detection', sub: 'SIFT / Crater Boundary' },
    { title: 'KNN Matching', sub: "Lowe's Ratio Test" },
    { title: 'RANSAC Filter', sub: 'Homography Matrix' },
    { title: 'Sub-Pixel Align', sub: 'Parabolic Refinement' },
    { title: 'Quality Evaluation', sub: 'RMSE & Lunar Map' },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#070a14] via-[#090e1f] to-[#080d1a] border-b border-cyan-950/40 py-10 lg:py-14 px-4 sm:px-6 lg:px-8">
      {/* Background Starfield & Subtle Lunar Grid Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-950/20 via-transparent to-purple-950/20 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-10 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/50 text-cyan-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            ISRO Chandrayaan-2 Optical Data Compatible
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            Sub-Pixel Geometric Alignment Engine
          </span>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              {t.heroHeadline}
            </h2>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl">
              {t.heroSubheadline}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                id="hero-start-registration-btn"
                onClick={onStartClick}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-cyan-950/60 transition transform hover:-translate-y-0.5 cursor-pointer"
              >
                <span>{t.startRegistration}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                id="hero-try-demo-btn"
                onClick={onDemoClick}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 font-semibold text-sm transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>{t.tryDemo}</span>
              </button>
            </div>
          </div>

          {/* Key Capabilities Showcase Grid */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 shadow-md">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-2">
                <Sun className="w-4 h-4 text-amber-400" />
              </div>
              <h4 className="text-xs font-bold text-white mb-0.5">Sun-Aware Matching</h4>
              <p className="text-[11px] text-slate-400 leading-snug">
                CLAHE & gradient-space descriptors to normalize solar elevation shifts.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 shadow-md">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-2">
                <Layers className="w-4 h-4 text-cyan-400" />
              </div>
              <h4 className="text-xs font-bold text-white mb-0.5">Cross-Sensor Align</h4>
              <p className="text-[11px] text-slate-400 leading-snug">
                Connects OHRC (0.25m) with TMC-2 (5.0m) and LROC NAC imagery.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 shadow-md">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <h4 className="text-xs font-bold text-white mb-0.5">RANSAC False Filter</h4>
              <p className="text-[11px] text-slate-400 leading-snug">
                Strict geometric consensus verification eliminating ambiguous terrain matches.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 shadow-md">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-2">
                <Target className="w-4 h-4 text-purple-400" />
              </div>
              <h4 className="text-xs font-bold text-white mb-0.5">Sub-Pixel Refinement</h4>
              <p className="text-[11px] text-slate-400 leading-snug">
                Parabolic NCC peak fitting achieving sub-pixel precision registration.
              </p>
            </div>
          </div>
        </div>

        {/* Section 32: Visual Concept Pipeline Diagram */}
        <div className="mt-8 pt-6 border-t border-slate-800/60">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-cyan-400" />
              Complete Core Lunar Pipeline Architecture
            </span>
            <span className="text-[11px] text-slate-500 font-mono">End-to-End Processing</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {pipelineSteps.map((step, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col justify-between text-left relative group hover:border-cyan-500/40 transition"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">
                    0{idx + 1}
                  </span>
                  <CheckCircle2 className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white leading-tight">{step.title}</div>
                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{step.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
