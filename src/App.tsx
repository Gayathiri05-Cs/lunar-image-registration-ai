import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  BookOpen,
  Download,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Moon,
  ExternalLink,
} from 'lucide-react';
import {
  SupportedLanguage,
  ImageMetadata,
  RegistrationResult,
  StageStatus,
  FeatureMethod,
  TransformModelType,
  DemoDataset,
} from './types';
import { TRANSLATIONS } from './i18n/locales';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { ImageWorkspace } from './components/ImageWorkspace';
import { PipelineProgress } from './components/PipelineProgress';
import { Visualizer } from './components/Visualizer';
import { MetricsPanel } from './components/MetricsPanel';
import { DemoSelectorModal } from './components/DemoSelectorModal';
import { ExplanationModal } from './components/ExplanationModal';
import { HistoryModal } from './components/HistoryModal';
import { ExportModal } from './components/ExportModal';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { DEMO_DATASETS } from './data/demoData';
import { loadImageToCanvas, runRegistrationPipeline } from './cv/pipeline';
import { saveRegistrationToHistory } from './services/aiService';

export function App() {
  // 1. Language & Internationalization
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>('en');
  const t = TRANSLATIONS[currentLang];

  // 2. Images & Metadata State
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [sourceMeta, setSourceMeta] = useState<ImageMetadata | null>(null);
  const [referenceMeta, setReferenceMeta] = useState<ImageMetadata | null>(null);

  // 3. Pipeline Execution State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pipelineStatus, setPipelineStatus] = useState<StageStatus>({
    stage: 'IDLE',
    progress: 0,
    message: 'Ready',
  });
  const [registrationResult, setRegistrationResult] = useState<RegistrationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 4. Modal Open States
  const [demoModalOpen, setDemoModalOpen] = useState<boolean>(false);
  const [explanationModalOpen, setExplanationModalOpen] = useState<boolean>(false);
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [diagnosticsModalOpen, setDiagnosticsModalOpen] = useState<boolean>(false);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to workspace on hero start click
  const handleScrollToWorkspace = () => {
    workspaceRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Reset workspace
  const handleReset = () => {
    setSourceImage(null);
    setReferenceImage(null);
    setSourceMeta(null);
    setReferenceMeta(null);
    setRegistrationResult(null);
    setErrorMessage(null);
    setPipelineStatus({ stage: 'IDLE', progress: 0, message: 'Ready' });
  };

  // Load Demo Dataset
  const handleSelectDemo = async (demo: DemoDataset, autoStart: boolean = false) => {
    setSourceImage(demo.sourceImage);
    setReferenceImage(demo.referenceImage);
    setSourceMeta(demo.sourceMeta);
    setReferenceMeta(demo.referenceMeta);
    setRegistrationResult(null);
    setErrorMessage(null);

    if (autoStart) {
      setTimeout(() => {
        executePipeline({
          featureMethod: 'SIFT',
          transformModel: 'HOMOGRAPHY',
          inlierThresholdPx: 3.0,
          enableCLAHE: true,
          enableSubpixel: true,
        }, demo.sourceImage, demo.referenceImage, demo.sourceMeta, demo.referenceMeta);
      }, 100);
    }
  };

  // Execute Core Registration Pipeline
  const executePipeline = async (
    options: {
      featureMethod: FeatureMethod;
      transformModel: TransformModelType;
      inlierThresholdPx: number;
      enableCLAHE: boolean;
      enableSubpixel: boolean;
    },
    srcImgUrl = sourceImage,
    refImgUrl = referenceImage,
    srcM = sourceMeta,
    refM = referenceMeta
  ) => {
    if (!srcImgUrl || !refImgUrl || !srcM || !refM) {
      setErrorMessage('Please upload or load both Source and Reference images before running registration.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setRegistrationResult(null);

    try {
      // Convert images to HTMLCanvasElements
      const srcCanvas = await loadImageToCanvas(srcImgUrl);
      const refCanvas = await loadImageToCanvas(refImgUrl);

      // Run orchestrator
      const result = await runRegistrationPipeline(
        srcCanvas,
        refCanvas,
        srcM,
        refM,
        {
          ...options,
          onProgress: status => setPipelineStatus(status),
        }
      );

      setRegistrationResult(result);
      setIsProcessing(false);

      // Persist to history
      saveRegistrationToHistory(result, `${srcM.sensor} ⟷ ${refM.sensor} (${srcM.targetRegion || 'Lunar South Pole'})`);

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    } catch (err: any) {
      console.error('Registration pipeline failed:', err);
      setIsProcessing(false);
      setErrorMessage(err.message || 'Registration failed due to numerical instability or insufficient feature overlap.');
    }
  };

  // Set RTL attribute if Arabic
  const isRtl = currentLang === 'ar';

  return (
    <div
      className={`min-h-screen bg-[#060913] text-slate-100 font-sans selection:bg-cyan-500 selection:text-white flex flex-col ${
        isRtl ? 'rtl' : 'ltr'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <Header
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        onOpenDemo={() => setDemoModalOpen(true)}
        onOpenHistory={() => setHistoryModalOpen(true)}
        onOpenDiagnostics={() => setDiagnosticsModalOpen(true)}
        onReset={handleReset}
        hasResult={registrationResult !== null || sourceImage !== null}
      />

      {/* Hero Section */}
      <HeroSection
        currentLang={currentLang}
        onStartClick={handleScrollToWorkspace}
        onDemoClick={() => setDemoModalOpen(true)}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error notification banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 flex items-start gap-3 shadow-lg shadow-rose-950/50 animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold">Registration Alert</h4>
              <p className="text-xs text-rose-300 mt-0.5">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-400 hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. Dual Image Workspace */}
        <div ref={workspaceRef}>
          <ImageWorkspace
            sourceImage={sourceImage}
            referenceImage={referenceImage}
            sourceMeta={sourceMeta}
            referenceMeta={referenceMeta}
            onSourceUpload={(url, meta) => {
              setSourceImage(url);
              setSourceMeta(meta);
              setRegistrationResult(null);
            }}
            onReferenceUpload={(url, meta) => {
              setReferenceImage(url);
              setReferenceMeta(meta);
              setRegistrationResult(null);
            }}
            onClearSource={() => {
              setSourceImage(null);
              setSourceMeta(null);
              setRegistrationResult(null);
            }}
            onClearReference={() => {
              setReferenceImage(null);
              setReferenceMeta(null);
              setRegistrationResult(null);
            }}
            onExecute={options => executePipeline(options)}
            isProcessing={isProcessing}
            currentLang={currentLang}
          />
        </div>

        {/* 2. Pipeline Execution Tracker */}
        {isProcessing && (
          <PipelineProgress
            status={pipelineStatus}
            currentLang={currentLang}
          />
        )}

        {/* 3. Registration Results Dashboard */}
        {registrationResult && (
          <div ref={resultsRef} className="space-y-8 animate-fade-in">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#090d1c] border border-cyan-500/30 shadow-xl">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-bold text-white">
                  Registration Successfully Verified
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-xs font-mono text-emerald-300 font-bold">
                  RMSE: {registrationResult.metrics.rmse} px
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  id="action-explain-results-btn"
                  onClick={() => setExplanationModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-800 text-xs font-semibold shadow transition cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{t.actions.explainResults}</span>
                </button>

                <button
                  id="action-download-results-btn"
                  onClick={() => setExportModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{t.actions.downloadResults}</span>
                </button>
              </div>
            </div>

            {/* 5-Mode Visualizer */}
            <Visualizer
              result={registrationResult}
              currentLang={currentLang}
            />

            {/* Scientific Metrics Panel */}
            <MetricsPanel
              result={registrationResult}
              currentLang={currentLang}
              onExportCsv={() => setExportModalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#04060c] py-6 px-4 text-center text-xs text-slate-500 space-y-1">
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Moon className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-300">Lunar Image Registration Platform</span>
          <span>•</span>
          <span>Chandrayaan-2 OHRC / TMC-2 Compatible</span>
        </div>
        <p className="text-[11px] text-slate-600">
          Precision Planetary Image Processing & Sub-Pixel Correspondence Verification.
        </p>
      </footer>

      {/* Modals */}
      <DemoSelectorModal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        onSelectDataset={handleSelectDemo}
        currentLang={currentLang}
      />

      {registrationResult && (
        <>
          <ExplanationModal
            isOpen={explanationModalOpen}
            onClose={() => setExplanationModalOpen(false)}
            result={registrationResult}
            currentLang={currentLang}
          />
          <ExportModal
            isOpen={exportModalOpen}
            onClose={() => setExportModalOpen(false)}
            result={registrationResult}
            currentLang={currentLang}
          />
        </>
      )}

      <HistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        onLoadItem={result => {
          setRegistrationResult(result);
          setSourceImage(result.sourceDataUrl);
          setReferenceImage(result.referenceDataUrl);
          setSourceMeta(result.sourceMeta);
          setReferenceMeta(result.referenceMeta);
        }}
        currentLang={currentLang}
      />

      <DiagnosticsModal
        isOpen={diagnosticsModalOpen}
        onClose={() => setDiagnosticsModalOpen(false)}
        currentLang={currentLang}
      />
    </div>
  );
}

export default App;
