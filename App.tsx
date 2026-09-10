import React, { useState, useEffect, useCallback } from 'react';
import { FullPortfolioState, DeveloperProfile, PortfolioThemeConfig, HostingConfig, ProjectItem } from './types';
import { loadPortfolioState, savePortfolioState, exportToJson, exportToMarkdownResume } from './utils/storage';
import {
  decodePortfolioFromUrl,
  loadPortfolioByHandle,
  savePortfolioForHandle,
} from './utils/shareUrl';
import { PRESET_PROFILES, DEFAULT_PORTFOLIO } from './data/presets';
import { Header } from './components/Header';
import { EditorSidebar } from './components/editor/EditorSidebar';
import { PortfolioView } from './components/portfolio/PortfolioView';
import { PortfolioNotFoundView } from './components/portfolio/PortfolioNotFoundView';
import { ShareModal } from './components/ShareModal';
import { CustomDomainModal } from './components/CustomDomainModal';
import { GitHubImportModal } from './components/editor/GitHubImportModal';
import { ArrowUpRight } from 'lucide-react';

export default function App() {
  const [portfolioState, setPortfolioState] = useState<FullPortfolioState>(() => loadPortfolioState());
  const [viewMode, setViewMode] = useState<'editor' | 'live' | 'not-found'>('editor');
  const [notFoundHandle, setNotFoundHandle] = useState<string>('');
  const [viewportSize, setViewportSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Modals
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [customDomainModalOpen, setCustomDomainModalOpen] = useState(false);
  const [githubModalOpen, setGithubModalOpen] = useState(false);

  // URL routing & Link resolver: detect ?u=handle, ?p=encoded, or ?view=live
  const resolveUrlRoute = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash;

      // 1. Portable state encoded in URL (?p=... or #p=...)
      const encodedState = params.get('p') || params.get('state');
      if (encodedState) {
        const decoded = decodePortfolioFromUrl(encodedState);
        if (decoded) {
          setPortfolioState(decoded);
          savePortfolioForHandle(decoded.profile.handle, decoded);
          setViewMode('live');
          setNotFoundHandle('');
          return;
        }
      }

      // 2. Direct user handle (?u=... or ?user=... or ?handle=... or #/@...)
      let handleParam = params.get('u') || params.get('user') || params.get('handle');
      if (!handleParam && hash) {
        const match = hash.match(/^#\/?@?([a-zA-Z0-9-_]+)$/);
        if (match && match[1] && match[1] !== 'live' && match[1] !== 'editor') {
          handleParam = match[1];
        }
      }

      if (handleParam) {
        const cleanHandle = handleParam.trim().toLowerCase();
        const loaded = loadPortfolioByHandle(cleanHandle);
        if (loaded) {
          setPortfolioState(loaded);
          setViewMode('live');
          setNotFoundHandle('');
        } else {
          // Instead of letting it hit an expired external 404, show friendly resolver
          setNotFoundHandle(cleanHandle);
          setViewMode('not-found');
        }
        return;
      }

      // 3. View mode toggle (?view=live or #live)
      const viewParam = params.get('view') || params.get('mode');
      if (viewParam === 'live' || viewParam === 'portfolio' || hash === '#live') {
        setViewMode('live');
        setNotFoundHandle('');
        return;
      }
    } catch (e) {
      console.warn('Failed to parse route params', e);
    }
  }, []);

  // Listen for initial route and back/forward navigation
  useEffect(() => {
    resolveUrlRoute();

    const handlePopState = () => resolveUrlRoute();
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [resolveUrlRoute]);

  // Auto-save on changes
  useEffect(() => {
    savePortfolioState(portfolioState);
    savePortfolioForHandle(portfolioState.profile.handle, portfolioState);
  }, [portfolioState]);

  const handleChangeViewMode = (mode: 'editor' | 'live') => {
    setViewMode(mode);
    setNotFoundHandle('');

    // Update browser URL query without reloading the page
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (mode === 'live') {
        url.searchParams.set('u', portfolioState.profile.handle);
        url.searchParams.delete('view');
      } else {
        url.searchParams.delete('u');
        url.searchParams.delete('view');
        url.searchParams.delete('p');
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleUpdateProfile = (updated: Partial<DeveloperProfile>) => {
    setPortfolioState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        ...updated,
      },
    }));
  };

  const handleUpdateTheme = (theme: PortfolioThemeConfig) => {
    setPortfolioState((prev) => ({
      ...prev,
      theme,
    }));
  };

  const handleUpdateHosting = (hosting: HostingConfig) => {
    setPortfolioState((prev) => ({
      ...prev,
      hosting,
    }));
  };

  const handleSelectPreset = (presetKey: string) => {
    const preset = PRESET_PROFILES[presetKey];
    if (preset && preset.data) {
      setPortfolioState((prev) => ({
        ...prev,
        ...preset.data,
        profile: {
          ...prev.profile,
          ...(preset.data.profile || {}),
        },
        theme: {
          ...prev.theme,
          ...(preset.data.theme || {}),
        },
        hosting: {
          ...prev.hosting,
          subdomain: preset.data.profile?.handle || prev.hosting.subdomain,
        },
      }));
    }
  };

  const handleGitHubImport = (imported: {
    profileUpdates: Partial<DeveloperProfile>;
    projects: ProjectItem[];
  }) => {
    setPortfolioState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        ...imported.profileUpdates,
        projects: imported.projects.length > 0 ? imported.projects : prev.profile.projects,
        socialLinks: {
          ...prev.profile.socialLinks,
          ...imported.profileUpdates.socialLinks,
        },
      },
      hosting: {
        ...prev.hosting,
        subdomain: imported.profileUpdates.handle || prev.hosting.subdomain,
      },
    }));
  };

  const handleExportJson = () => {
    exportToJson(portfolioState);
  };

  const handleExportResume = () => {
    exportToMarkdownResume(portfolioState);
  };

  const handleSaveSubdomain = (newSub: string) => {
    setPortfolioState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        handle: newSub,
      },
      hosting: {
        ...prev.hosting,
        subdomain: newSub,
      },
    }));
  };

  const handleClaimNotFoundHandle = (handle: string) => {
    setPortfolioState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        handle: handle,
        name: handle.charAt(0).toUpperCase() + handle.slice(1),
      },
      hosting: {
        ...prev.hosting,
        subdomain: handle,
      },
    }));
    handleChangeViewMode('editor');
  };

  const handleLoadSample = () => {
    setPortfolioState(DEFAULT_PORTFOLIO);
    handleChangeViewMode('live');
  };

  if (viewMode === 'not-found') {
    return (
      <PortfolioNotFoundView
        requestedHandle={notFoundHandle}
        onCreateHandle={handleClaimNotFoundHandle}
        onLoadSample={handleLoadSample}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Top Header */}
      <Header
        handle={portfolioState.profile.handle}
        viewMode={viewMode}
        onChangeViewMode={handleChangeViewMode}
        viewportSize={viewportSize}
        onChangeViewportSize={setViewportSize}
        onOpenShareModal={() => setShareModalOpen(true)}
        onOpenGitHubModal={() => setGithubModalOpen(true)}
        onOpenCustomDomainModal={() => setCustomDomainModalOpen(true)}
        onSelectPreset={handleSelectPreset}
        onExportJson={handleExportJson}
        onExportResume={handleExportResume}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 overflow-hidden relative">
        {viewMode === 'live' ? (
          /* Authentic Full-Screen Live Portfolio View */
          <div className="w-full h-full overflow-y-auto">
            <PortfolioView
              state={portfolioState}
              isStandaloneView={true}
              onSwitchToEditor={() => handleChangeViewMode('editor')}
              onOpenShareModal={() => setShareModalOpen(true)}
            />
          </div>
        ) : (
          /* Split Studio Editor & Live Responsive Preview */
          <div className="grid grid-cols-1 lg:grid-cols-12 h-full w-full overflow-hidden">
            {/* Left Column: Studio Customizer Controls */}
            <div className="lg:col-span-5 xl:col-span-4 h-full overflow-hidden">
              <EditorSidebar
                state={portfolioState}
                onChangeProfile={handleUpdateProfile}
                onChangeTheme={handleUpdateTheme}
                onChangeHosting={handleUpdateHosting}
                onOpenGitHubImport={() => setGithubModalOpen(true)}
                onOpenShareModal={() => setShareModalOpen(true)}
                onOpenCustomDomainModal={() => setCustomDomainModalOpen(true)}
              />
            </div>

            {/* Right Column: Live Interactive Viewport */}
            <div className="hidden lg:flex lg:col-span-7 xl:col-span-8 h-full bg-slate-950/90 flex-col overflow-hidden border-l border-slate-800">
              {/* Browser Preview Address Bar simulation */}
              <div className="h-10 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between gap-3 text-xs text-slate-400 select-none shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                </div>

                <div className="flex-1 max-w-md mx-auto bg-slate-950 border border-slate-800 rounded-md py-1 px-3 flex items-center justify-center gap-1.5 text-[11px] font-mono text-slate-300">
                  <span className="text-emerald-400">https://</span>
                  <span className="text-white font-semibold">itsfolio.tech/@{portfolioState.profile.handle}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleChangeViewMode('live')}
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  title="Expand to Full Screen View"
                >
                  <span>Full Screen</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Viewport Frame */}
              <div className="flex-1 overflow-hidden p-4 flex items-center justify-center bg-[#090d16]">
                <div
                  className={`h-full bg-slate-950 shadow-2xl transition-all duration-300 overflow-y-auto rounded-xl border border-slate-800 ${
                    viewportSize === 'mobile'
                      ? 'w-[390px] max-h-[844px] rounded-3xl border-4 border-slate-800 ring-1 ring-slate-700'
                      : viewportSize === 'tablet'
                      ? 'w-[768px] max-h-[1024px] rounded-2xl border-2 border-slate-800'
                      : 'w-full rounded-xl'
                  }`}
                >
                  <PortfolioView
                    state={portfolioState}
                    isStandaloneView={false}
                    onOpenShareModal={() => setShareModalOpen(true)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        state={portfolioState}
      />

      <CustomDomainModal
        isOpen={customDomainModalOpen}
        onClose={() => setCustomDomainModalOpen(false)}
        subdomain={portfolioState.hosting.subdomain}
        onSaveSubdomain={handleSaveSubdomain}
      />

      <GitHubImportModal
        isOpen={githubModalOpen}
        onClose={() => setGithubModalOpen(false)}
        onImport={handleGitHubImport}
      />
    </div>
  );
}
