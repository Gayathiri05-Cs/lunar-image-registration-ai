import React, { useState } from 'react';
import {
  Moon,
  Sparkles,
  Globe,
  History,
  Activity,
  RotateCcw,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { SupportedLanguage } from '../types';
import { LANGUAGES, TRANSLATIONS } from '../i18n/locales';

interface HeaderProps {
  currentLang: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onOpenDemo: () => void;
  onOpenHistory: () => void;
  onOpenDiagnostics: () => void;
  onReset: () => void;
  hasResult: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentLang,
  onLanguageChange,
  onOpenDemo,
  onOpenHistory,
  onOpenDiagnostics,
  onReset,
  hasResult,
}) => {
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const t = TRANSLATIONS[currentLang];
  const currentLangObj = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

  return (
    <header className="sticky top-0 z-40 bg-[#070a14]/90 backdrop-blur-md border-b border-cyan-950/50 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Logo & Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-indigo-500/20 to-purple-600/20 border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-950/40">
            <Moon className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>{t.appTitle}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 font-medium">
                  CH-2 OHRC / TMC
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block truncate max-w-md">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Right: Actions & Language Selector */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Try Demo Button */}
          <button
            id="header-try-demo-btn"
            onClick={onOpenDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-medium transition shadow-md shadow-cyan-950/50 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-cyan-200" />
            <span className="hidden xs:inline">{t.tryDemo}</span>
            <span className="xs:hidden">Demo</span>
          </button>

          {/* History Button */}
          <button
            id="header-history-btn"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs sm:text-sm transition cursor-pointer"
            title={t.actions.projectHistory}
          >
            <History className="w-4 h-4 text-slate-400" />
            <span className="hidden md:inline">{t.actions.projectHistory}</span>
          </button>

          {/* Diagnostics Button */}
          <button
            id="header-diagnostics-btn"
            onClick={onOpenDiagnostics}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs sm:text-sm transition cursor-pointer"
            title={t.actions.diagnostics}
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="hidden lg:inline">{t.actions.diagnostics}</span>
          </button>

          {/* Reset Workspace Button */}
          {hasResult && (
            <button
              id="header-reset-btn"
              onClick={onReset}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs sm:text-sm transition cursor-pointer"
              title={t.actions.resetAll}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">{t.actions.resetAll}</span>
            </button>
          )}

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              id="header-language-dropdown"
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs sm:text-sm transition cursor-pointer font-medium"
            >
              <Globe className="w-4 h-4 text-cyan-400" />
              <span className="mr-1">{currentLangObj.flag}</span>
              <span className="font-mono text-xs">{currentLangObj.nativeName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {langDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-48 bg-[#0c1020] border border-slate-700/80 rounded-xl shadow-2xl py-1.5 z-50 max-h-72 overflow-y-auto backdrop-blur-xl"
                dir="ltr"
              >
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
                  Select Language (11)
                </div>
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    id={`lang-select-${lang.code}`}
                    onClick={() => {
                      onLanguageChange(lang.code);
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-cyan-950/60 transition cursor-pointer ${
                      currentLang === lang.code
                        ? 'text-cyan-300 font-semibold bg-cyan-950/40'
                        : 'text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{lang.flag}</span>
                      <span>{lang.nativeName}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      {lang.code}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
