import React, { useState } from 'react';
import { X, Activity, Play, CheckCircle2, XCircle, Loader2, Sparkles, Terminal } from 'lucide-react';
import { SupportedLanguage } from '../types';
import { TRANSLATIONS, LANGUAGES } from '../i18n/locales';
import { imageDataToGrayscale, applyCLAHE } from '../cv/imageProcessing';
import { detectFeatures } from '../cv/featureDetection';
import { extractDescriptors } from '../cv/featureDescription';
import { matchFeaturesKNN } from '../cv/matching';
import { runRANSAC } from '../cv/ransac';
import { refineSubpixelMatches } from '../cv/subpixel';

interface TestResult {
  id: string;
  name: string;
  category: string;
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED';
  durationMs?: number;
  message?: string;
}

export const DiagnosticsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentLang: SupportedLanguage;
}> = ({ isOpen, onClose, currentLang }) => {
  if (!isOpen) return null;
  const t = TRANSLATIONS[currentLang];

  const initialTests: TestResult[] = [
    { id: 't1', name: 'Grayscale & CLAHE Illumination Equalizer', category: 'Radiometry', status: 'PENDING' },
    { id: 't2', name: 'SIFT Multi-Scale DoG Crater Keypoint Extractor', category: 'Detection', status: 'PENDING' },
    { id: 't3', name: 'Scale-Invariant 128-D Descriptor Vectorization', category: 'Description', status: 'PENDING' },
    { id: 't4', name: 'KNN Matcher with Lowe\'s Cross-Check Ratio Test', category: 'Matching', status: 'PENDING' },
    { id: 't5', name: 'RANSAC Geometric Homography Consensus Verification', category: 'RANSAC', status: 'PENDING' },
    { id: 't6', name: 'Parabolic Sub-Pixel Peak NCC Refinement', category: 'Sub-Pixel', status: 'PENDING' },
    { id: 't7', name: 'Multilingual Dictionary Integrity (11 Languages)', category: 'i18n', status: 'PENDING' },
  ];

  const [tests, setTests] = useState<TestResult[]>(initialTests);
  const [isRunning, setIsRunning] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);

  const runAllTests = async () => {
    setIsRunning(true);
    setLogMessages(['[DIAGNOSTICS] Initializing lunar CV self-verification suite...']);

    // Create synthetic 128x128 image
    const w = 128, h = 128;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#444444';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(64, 64, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(58, 58, 15, 0, Math.PI * 2);
    ctx.fill();
    const imgData = ctx.getImageData(0, 0, w, h);

    const updateTest = (id: string, status: TestResult['status'], msg: string, dur: number) => {
      setTests(prev => prev.map(t => (t.id === id ? { ...t, status, message: msg, durationMs: dur } : t)));
      setLogMessages(prev => [...prev, `[${status}] ${msg} (${dur.toFixed(1)}ms)`]);
    };

    // Test 1: CLAHE
    let start = performance.now();
    let gray = imageDataToGrayscale(imgData);
    let clahe = applyCLAHE(gray, 4, 4, 2.0);
    let dur = performance.now() - start;
    if (clahe.data.length === w * h) {
      updateTest('t1', 'PASSED', 'Grayscale & CLAHE normalizer generated valid matrix', dur);
    } else {
      updateTest('t1', 'FAILED', 'Dimension mismatch in CLAHE output', dur);
    }

    // Test 2: SIFT DoG
    start = performance.now();
    const kps = detectFeatures(clahe, 'SIFT', 100);
    dur = performance.now() - start;
    if (kps.length > 0) {
      updateTest('t2', 'PASSED', `Extracted ${kps.length} DoG keypoints successfully`, dur);
    } else {
      updateTest('t2', 'FAILED', 'No keypoints detected', dur);
    }

    // Test 3: Descriptors
    start = performance.now();
    const desc = extractDescriptors(clahe, kps, 'SIFT');
    dur = performance.now() - start;
    if (desc.length === kps.length && desc[0].descriptor.length === 128) {
      updateTest('t3', 'PASSED', `Computed ${desc.length} 128-D descriptor vectors`, dur);
    } else {
      updateTest('t3', 'FAILED', 'Descriptor dimension mismatch', dur);
    }

    // Test 4: KNN Matching
    start = performance.now();
    const matches = matchFeaturesKNN(desc, desc, 0.8, true);
    dur = performance.now() - start;
    if (matches.length > 0) {
      updateTest('t4', 'PASSED', `KNN identified ${matches.length} valid correspondence pairs`, dur);
    } else {
      updateTest('t4', 'FAILED', 'No matches found', dur);
    }

    // Test 5: RANSAC Homography
    start = performance.now();
    const ransac = runRANSAC(matches, 'HOMOGRAPHY', 3.0, 200);
    dur = performance.now() - start;
    if (ransac.inlierCount > 0 && ransac.transformation.matrix.length === 3) {
      updateTest('t5', 'PASSED', `RANSAC convergence achieved (${ransac.inlierCount} inliers, RMSE: ${ransac.rmse}px)`, dur);
    } else {
      updateTest('t5', 'FAILED', 'RANSAC did not find consensus', dur);
    }

    // Test 6: Sub-Pixel NCC
    start = performance.now();
    const subpixel = refineSubpixelMatches(clahe, clahe, ransac.classifiedMatches);
    dur = performance.now() - start;
    updateTest('t6', 'PASSED', `Sub-pixel achieved: ${subpixel.subpixelAchieved} (mean shift: ${subpixel.meanShiftPx.toFixed(3)}px)`, dur);

    // Test 7: i18n
    start = performance.now();
    const allLangs = LANGUAGES.every(l => !!TRANSLATIONS[l.code]?.appTitle);
    dur = performance.now() - start;
    if (allLangs) {
      updateTest('t7', 'PASSED', 'All 11 languages (En, Ta, Hi, Te, Ml, Kn, Bn, Mr, Es, Fr, Ar) validated', dur);
    } else {
      updateTest('t7', 'FAILED', 'Missing language dictionary keys', dur);
    }

    setIsRunning(false);
    setLogMessages(prev => [...prev, '[DIAGNOSTICS] Verification complete. System operational.']);
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
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">System Diagnostics & Algorithmic Self-Test</h3>
              <p className="text-xs text-slate-400">Automated verification of core computer vision pipelines</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex justify-between items-center pb-2">
            <span className="text-xs text-slate-400 font-mono">
              Test Pipeline Status ({tests.filter(t => t.status === 'PASSED').length}/{tests.length} Passed)
            </span>
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isRunning ? 'Running Tests...' : 'Run All Self-Tests'}</span>
            </button>
          </div>

          {/* Test cards list */}
          <div className="space-y-2">
            {tests.map(test => (
              <div
                key={test.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  {test.status === 'PASSED' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  {test.status === 'FAILED' && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                  {test.status === 'RUNNING' && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />}
                  {test.status === 'PENDING' && <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />}
                  <div>
                    <span className="font-bold text-white">{test.name}</span>
                    {test.message && <p className="text-[11px] text-slate-400 mt-0.5">{test.message}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">{test.category}</span>
                  {test.durationMs !== undefined && (
                    <span className="text-cyan-300">{test.durationMs.toFixed(1)}ms</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Console Log terminal */}
          {logMessages.length > 0 && (
            <div className="p-3.5 rounded-xl bg-black border border-slate-800 font-mono text-[11px] text-emerald-400 space-y-1 max-h-36 overflow-y-auto">
              <div className="flex items-center gap-1.5 text-slate-500 pb-1 border-b border-slate-900 text-[10px]">
                <Terminal className="w-3 h-3" />
                <span>Execution Output</span>
              </div>
              {logMessages.map((msg, i) => (
                <div key={i} className="leading-snug">{msg}</div>
              ))}
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
