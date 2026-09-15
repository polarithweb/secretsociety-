import React, { useState, useEffect } from 'react';
import { Question, SocietySettings, Answersheet } from './types';
import { DEFAULT_SETTINGS, DEFAULT_QUESTIONS } from './lib/defaults';
import {
  subscribeToSettings,
  subscribeToQuestions,
  subscribeToSubmissions,
  getSocietySettings,
  getQuestions,
  getSubmissions
} from './lib/firebase';
import { CandidateForm } from './components/CandidateForm';
import { AdminPortal } from './components/AdminPortal';
import { MemberInfoPortal } from './components/MemberInfoPortal';

export type AppRoute = 'candidate' | 'admin' | 'info';

export default function App() {
  const [settings, setSettings] = useState<SocietySettings>(DEFAULT_SETTINGS);
  const [questions, setQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);
  const [submissions, setSubmissions] = useState<Answersheet[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Determine active route based strictly on URL /#/admin, /#/info, or pathname
  const detectRoute = (): AppRoute => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();

    if (
      hash === '#/admin' ||
      hash === '#admin' ||
      hash.startsWith('#/admin') ||
      path.endsWith('/admin') ||
      path.endsWith('/admin/') ||
      path.includes('/admin')
    ) {
      return 'admin';
    }

    if (
      hash === '#/info' ||
      hash === '#info' ||
      hash.startsWith('#/info') ||
      path.endsWith('/info') ||
      path.endsWith('/info/') ||
      path.includes('/info')
    ) {
      return 'info';
    }

    return 'candidate';
  };

  const [currentRoute, setCurrentRoute] = useState<AppRoute>(detectRoute);

  // Listen to browser navigation events (hashchange and popstate)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentRoute(detectRoute());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Set up real-time Firebase listeners
  useEffect(() => {
    let unsubscribeSettings = () => {};
    let unsubscribeQuestions = () => {};
    let unsubscribeSubmissions = () => {};

    try {
      unsubscribeSettings = subscribeToSettings((newSettings) => {
        setSettings(newSettings);
      });

      unsubscribeQuestions = subscribeToQuestions((newQuestions) => {
        setQuestions(newQuestions);
      });

      unsubscribeSubmissions = subscribeToSubmissions((newSubmissions) => {
        setSubmissions(newSubmissions);
      });
    } catch (err) {
      console.warn('Real-time listener notice:', err);
    }

    // Initial fetch
    const initData = async () => {
      try {
        const [sData, qData, subData] = await Promise.all([
          getSocietySettings(),
          getQuestions(),
          getSubmissions()
        ]);
        setSettings(sData);
        setQuestions(qData);
        setSubmissions(subData);
      } catch (e) {
        console.warn('Initial data load warning:', e);
      } finally {
        setIsLoading(false);
      }
    };

    initData();

    return () => {
      unsubscribeSettings();
      unsubscribeQuestions();
      unsubscribeSubmissions();
    };
  }, []);

  // Return to main candidate view
  const handleNavigateToCandidate = () => {
    try {
      let basePath = window.location.pathname.replace(/\/(admin|info)\/?$/i, '');
      if (!basePath) basePath = '/';
      window.history.pushState({}, '', basePath);
      window.location.hash = '';
    } catch (e) {
      window.location.hash = '';
    }
    setCurrentRoute('candidate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRefreshData = async () => {
    try {
      const [sData, qData, subData] = await Promise.all([
        getSocietySettings(),
        getQuestions(),
        getSubmissions()
      ]);
      setSettings(sData);
      setQuestions(qData);
      setSubmissions(subData);
    } catch (e) {
      console.error('Refresh error:', e);
    }
  };

  return (
    <div className="relative min-h-screen w-full max-w-full bg-black text-white font-body overflow-x-hidden selection:bg-white selection:text-black">
      {/* Optional background image if configured in admin portal */}
      {settings.backgroundImage && (
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-25 pointer-events-none"
          style={{ backgroundImage: `url(${settings.backgroundImage})` }}
        >
          <div className="absolute inset-0 bg-black/75" />
        </div>
      )}

      {/* Main Content Area */}
      <div className="relative z-10 min-h-screen flex flex-col justify-between w-full max-w-full overflow-x-hidden">
        <main className="flex-1 w-full max-w-full overflow-x-hidden">
          {isLoading ? (
            <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <div className="text-xs font-mono uppercase tracking-widest text-white/80">
                Loading...
              </div>
            </div>
          ) : currentRoute === 'admin' ? (
            <AdminPortal
              settings={settings}
              questions={questions}
              submissions={submissions}
              onNavigateToCandidate={handleNavigateToCandidate}
              onRefreshData={handleRefreshData}
            />
          ) : currentRoute === 'info' ? (
            <MemberInfoPortal
              settings={settings}
              questions={questions}
              onNavigateToCandidate={handleNavigateToCandidate}
            />
          ) : (
            <CandidateForm
              settings={settings}
              questions={questions}
            />
          )}
        </main>
      </div>
    </div>
  );
}
