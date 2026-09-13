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

export default function App() {
  const [settings, setSettings] = useState<SocietySettings>(DEFAULT_SETTINGS);
  const [questions, setQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);
  const [submissions, setSubmissions] = useState<Answersheet[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Determine if route ends with /admin or #admin
  const checkIsAdminRoute = () => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return (
      path.endsWith('/admin') ||
      path.endsWith('/admin/') ||
      path.includes('/admin') ||
      hash === '#admin' ||
      hash === '#/admin' ||
      hash.includes('admin')
    );
  };

  const [isAdminView, setIsAdminView] = useState<boolean>(checkIsAdminRoute);

  // Listen to browser navigation changes (popstate and hashchange)
  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminView(checkIsAdminRoute());
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

  // Navigation handlers
  const handleNavigateToCandidate = () => {
    try {
      let basePath = window.location.pathname.replace(/\/admin\/?$/i, '');
      if (!basePath) basePath = '/';
      window.history.pushState({}, '', basePath);
    } catch (e) {
      window.location.hash = '';
    }
    setIsAdminView(false);
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
    <div className="relative min-h-screen w-full max-w-full bg-black text-white font-sans overflow-x-hidden selection:bg-white selection:text-black">
      {/* Optional background image if uploaded in admin portal */}
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
          ) : isAdminView ? (
            <AdminPortal
              settings={settings}
              questions={questions}
              submissions={submissions}
              onNavigateToCandidate={handleNavigateToCandidate}
              onRefreshData={handleRefreshData}
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
