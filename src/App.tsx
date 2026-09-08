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
  ShieldAlert,
  Compass,
} from 'lucide-react';
import {
  SupportedLanguage,
  ImageMetadata,
  RegistrationResult,
  StageStatus,
  FeatureMethod,
  TransformModelType,
  DemoDataset,
  TriSensorValidationResult,
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
import { LunarFeatureExplorer } from './components/LunarFeatureExplorer';
import { DEMO_DATASETS, TRI_SENSOR_DEMOS } from './data/demoData';
import { loadImageToCanvas, runRegistrationPipeline } from './cv/pipeline';
import { validateTriSensorScene } from './cv/triSensorValidation';
import { saveRegistrationToHistory } from './services/aiService';

export function App() {
  // 1. Language & Internationalization
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>('en');
  const t = TRANSLATIONS[currentLang];

  // 2. Images & Metadata State (OHRC, TMC, IIRS)
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [thirdImage, setThirdImage] = useState<string | null>(null);

  const [sourceMeta, setSourceMeta] = useState<ImageMetadata | null>(null);
  const [referenceMeta, setReferenceMeta] = useState<ImageMetadata | null>(null);
  const [thirdMeta, setThirdMeta] = useState<ImageMetadata | null>(null);

  // 3. Pipeline Execution & Tri-Sensor State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pipelineStatus, setPipelineStatus] = useState<StageStatus>({
    stage: 'IDLE',
    progress: 0,
    message: 'Ready',
  });
  const [triSensorValidation, setTriSensorValidation] = useState<TriSensorValidationResult | null>(null);
  const [registrationResult, setRegistrationResult] = useState<RegistrationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 4. Modal Open States
  const [demoModalOpen, setDemoModalOpen] = useState<boolean>(false);
  const [explanationModalOpen, setExplanationModalOpen] = useState<boolean>(false);
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [diagnosticsModalOpen, setDiagnosticsModalOpen] = useState<boolean>(false);
  const [featureRegistryOpen, setFeatureRegistryOpen] = useState<boolean>(false);

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
    setThirdImage(null);
    setSourceMeta(null);
    setReferenceMeta(null);
    setThirdMeta(null);
    setTriSensorValidation(null);
    setRegistrationResult(null);
    setErrorMessage(null);
    setPipelineStatus({ stage: 'IDLE', progress: 0, message: 'Ready' });
  };

  // Load Demo Dataset
  const handleSelectDemo = async (demo: DemoDataset, autoStart: boolean = false) => {
    setSourceImage(demo.sourceImage);
    setReferenceImage(demo.referenceImage);
    setThirdImage(demo.thirdImage || null);

    setSourceMeta(demo.sourceMeta);
    setReferenceMeta(demo.referenceMeta);
    setThirdMeta(demo.thirdMeta || null);

    setTriSensorValidation(null);
    setRegistrationResult(null);
    setErrorMessage(null);

    if (autoStart) {
      setTimeout(() => {
        executePipeline(
          {
            featureMethod: 'SIFT',
            transformModel: 'HOMOGRAPHY',
            inlierThresholdPx: 3.0,
            enableCLAHE: true,
            enableSubpixel: true,
          },
          demo.sourceImage,
          demo.referenceImage,
          demo.thirdImage,
          demo.sourceMeta,
          demo.referenceMeta,
          demo.thirdMeta
        );
      }, 100);
    }
  };

  // Load Tri-Sensor Quick Benchmark Presets
  const handleLoadTriSensorPreset = (type: 'valid' | 'iirs_outlier' | 'ohrc_outlier') => {
    if (type === 'valid') {
      handleSelectDemo(TRI_SENSOR_DEMOS.valid);
    } else if (type === 'iirs_outlier') {
      handleSelectDemo(TRI_SENSOR_DEMOS.iirsOutlier);
    } else {
      handleSelectDemo(TRI_SENSOR_DEMOS.ohrcOutlier);
    }
  };

  // Execute Core Registration Pipeline (With Tri-Sensor Outlier Validation)
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
    thirdImgUrl = thirdImage,
    srcM = sourceMeta,
    refM = referenceMeta,
    thirdM = thirdMeta
  ) => {
    if (!srcImgUrl || !refImgUrl || !srcM || !refM) {
      setErrorMessage('Please upload or load at least OHRC and TMC images before running registration.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setRegistrationResult(null);

    try {
      // 1. Convert source and reference images to canvas
      const srcCanvas = await loadImageToCanvas(srcImgUrl);
      const refCanvas = await loadImageToCanvas(refImgUrl);
      let thirdCanvas: HTMLCanvasElement | undefined = undefined;

      if (thirdImgUrl) {
        thirdCanvas = await loadImageToCanvas(thirdImgUrl);
      }

      // 2. If 3 images are present, perform Outlier Sensor Detection First
      if (thirdCanvas && thirdM) {
        setPipelineStatus({
          stage: 'VALIDATION',
          progress: 15,
          message: 'Performing Tri-Sensor Scene Triangulation (OHRC ↔ TMC ↔ IIRS)...',
        });

        const validation = await validateTriSensorScene(
          srcCanvas,
          refCanvas,
          thirdCanvas,
          srcM,
          refM,
          thirdM,
          options.featureMethod
        );

        setTriSensorValidation(validation);

        // If an outlier is detected, block registration and prompt user!
        if (validation.status === 'OUTLIER_DETECTED') {
          setIsProcessing(false);
          setPipelineStatus({
            stage: 'IDLE',
            progress: 0,
            message: `Outlier Sensor Detected: ${validation.outlierSensor || validation.outlierSlot}. Registration blocked.`,
          });
          return;
        }
      }

      // 3. Run full registration pipeline
      const result = await runRegistrationPipeline(
        srcCanvas,
        refCanvas,
        srcM,
        refM,
        {
          ...options,
          thirdCanvas,
          thirdMeta: thirdM || undefined,
          onProgress: status => setPipelineStatus(status),
        }
      );

      setRegistrationResult(result);
      setIsProcessing(false);

      // Persist to history
      saveRegistrationToHistory(
        result,
        `${srcM.sensor} ⟷ ${refM.sensor}${thirdM ? ` ⟷ ${thirdM.sensor}` : ''} (${srcM.targetRegion || 'Lunar South Pole'})`
      );

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

  // Proceed with verified pair after outlier detection
  const handleProceedWithVerifiedPair = () => {
    if (!triSensorValidation) return;
    const { validSensors } = triSensorValidation;

    // Default to OHRC and TMC pair registration
    executePipeline(
      {
        featureMethod: 'SIFT',
        transformModel: 'HOMOGRAPHY',
        inlierThresholdPx: 3.0,
        enableCLAHE: true,
        enableSubpixel: true,
      },
      sourceImage,
      referenceImage,
      null, // Exclude outlier third image
      sourceMeta,
      referenceMeta,
      null
    );
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
        onOpenFeatureRegistry={() => setFeatureRegistryOpen(true)}
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

        {/* 1. Multi-Sensor Image Workspace */}
        <div ref={workspaceRef}>
          <ImageWorkspace
            sourceImage={sourceImage}
            referenceImage={referenceImage}
            thirdImage={thirdImage}
            sourceMeta={sourceMeta}
            referenceMeta={referenceMeta}
            thirdMeta={thirdMeta}
            onSourceUpload={(url, meta) => {
              setSourceImage(url);
              setSourceMeta(meta);
              setRegistrationResult(null);
              setTriSensorValidation(null);
            }}
            onReferenceUpload={(url, meta) => {
              setReferenceImage(url);
              setReferenceMeta(meta);
              setRegistrationResult(null);
              setTriSensorValidation(null);
            }}
            onThirdUpload={(url, meta) => {
              setThirdImage(url);
              setThirdMeta(meta);
              setRegistrationResult(null);
              setTriSensorValidation(null);
            }}
            onClearSource={() => {
              setSourceImage(null);
              setSourceMeta(null);
              setRegistrationResult(null);
              setTriSensorValidation(null);
            }}
            onClearReference={() => {
              setReferenceImage(null);
              setReferenceMeta(null);
              setRegistrationResult(null);
              setTriSensorValidation(null);
            }}
            onClearThird={() => {
              setThirdImage(null);
              setThirdMeta(null);
              setRegistrationResult(null);
              setTriSensorValidation(null);
            }}
            onExecute={options => executePipeline(options)}
            onLoadTriSensorPreset={handleLoadTriSensorPreset}
            triSensorValidation={triSensorValidation}
            onProceedWithVerifiedPair={handleProceedWithVerifiedPair}
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
                {registrationResult.explainableConfidence && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-xs font-mono text-cyan-300 font-bold">
                    Confidence: {registrationResult.explainableConfidence.overallScore}% ({registrationResult.explainableConfidence.verdict})
                  </span>
                )}
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

            {/* Scientific Metrics Panel + Explainable Confidence + Lunar Feature Cards */}
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
          <span>ISRO Chandrayaan-2 OHRC / TMC-2 / IIRS Standard</span>
        </div>
        <p className="text-[11px] text-slate-600">
          Precision Planetary Image Processing, Multi-Sensor Outlier Triangulation & Lunar Landmark Identity Registry.
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

      <LunarFeatureExplorer
        isOpen={featureRegistryOpen}
        onClose={() => setFeatureRegistryOpen(false)}
        currentResultFeatures={registrationResult?.lunarFeatures}
      />
    </div>
  );
}

export default App;
