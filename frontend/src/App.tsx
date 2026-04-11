import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LoginPage from './pages/guest/LoginPage';
import GuestHome from './pages/guest/GuestHome';
import EventDetailsPage from './pages/guest/EventDetailsPage';
import Dashboard from './pages/admin/Dashboard';
import DriverDashboard from './pages/driver/DriverDashboard';
import RequestRide from './pages/guest/RequestRide';
import RideStatus from './pages/guest/RideStatus';
import ProtectedRoute from './components/ProtectedRoute';
import ServiceWorkerUpdateBanner from './components/ServiceWorkerUpdateBanner';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import { getAuthSession, getHomeRouteForRole } from './lib/auth';
import { activateServiceWorkerUpdate, subscribeToServiceWorkerUpdates } from './lib/serviceWorker';

type DeferredInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function App() {
  const session = getAuthSession();
  const [waitingWorkerScriptUrl, setWaitingWorkerScriptUrl] = useState<string | null>(null);
  const [dismissedWorkerScriptUrl, setDismissedWorkerScriptUrl] = useState<string | null>(null);
  const [startupChoiceDone, setStartupChoiceDone] = useState<boolean>(Boolean(session));
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<DeferredInstallPromptEvent | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'luxury');
    localStorage.removeItem('uiThemeMode');
    localStorage.removeItem('weddingPalette');
  }, []);

  useEffect(() => {
    return subscribeToServiceWorkerUpdates((registration) => {
      const nextWaitingWorkerScriptUrl = registration?.waiting?.scriptURL ?? null;
      setWaitingWorkerScriptUrl(nextWaitingWorkerScriptUrl);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as DeferredInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setStartupChoiceDone(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (session) {
      setStartupChoiceDone(true);
      return;
    }

    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      setStartupChoiceDone(false);
    }
  }, [session]);

  async function handleRefreshApp() {
    const updateStarted = await activateServiceWorkerUpdate();
    if (!updateStarted) {
      setWaitingWorkerScriptUrl(null);
      setDismissedWorkerScriptUrl(null);
      setStartupChoiceDone(true);
    }
  }

  async function handleInstallFromPopup() {
    if (!deferredInstallPrompt) {
      setStartupChoiceDone(true);
      return;
    }

    await deferredInstallPrompt.prompt();
    try {
      await deferredInstallPrompt.userChoice;
    } finally {
      setDeferredInstallPrompt(null);
      setStartupChoiceDone(true);
    }
  }

  const isUpdateAvailable = Boolean(
    waitingWorkerScriptUrl && waitingWorkerScriptUrl !== dismissedWorkerScriptUrl
  );

  const isLoginRoute = typeof window !== 'undefined' && window.location.pathname === '/';
  const shouldBlockLoginUntilChoice = !session && isLoginRoute && !startupChoiceDone && (isUpdateAvailable || Boolean(deferredInstallPrompt));

  if (shouldBlockLoginUntilChoice) {
    return (
      <div className="wedding-app-bg min-h-dvh flex items-center justify-center p-4">
        <div className="w-full max-w-md wedding-shell rounded-2xl p-6 space-y-4 text-center">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--w-text)', fontFamily: "'Playfair Display', serif" }}>
            {isUpdateAvailable ? 'Update Available' : 'Install App'}
          </h2>
          <p className="text-sm" style={{ color: 'var(--w-muted)' }}>
            {isUpdateAvailable
              ? 'A newer version is ready. Please choose to refresh now or continue with current version.'
              : 'For best experience, install Event Transport before login.'}
          </p>

          <div className="flex gap-2 justify-center">
            {isUpdateAvailable ? (
              <>
                <button
                  type="button"
                  className="wedding-button-muted px-4 py-2 text-sm"
                  onClick={() => {
                    setDismissedWorkerScriptUrl(waitingWorkerScriptUrl);
                    setStartupChoiceDone(true);
                  }}
                >
                  Continue
                </button>
                <button type="button" className="wedding-button-primary px-4 py-2 text-sm" onClick={() => void handleRefreshApp()}>
                  Refresh App
                </button>
              </>
            ) : (
              <>
                <button type="button" className="wedding-button-muted px-4 py-2 text-sm" onClick={() => setStartupChoiceDone(true)}>
                  Continue
                </button>
                <button type="button" className="wedding-button-primary px-4 py-2 text-sm" onClick={() => void handleInstallFromPopup()}>
                  Install App
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/home" element={<ProtectedRoute allowedRoles={['GUEST']}><GuestHome /></ProtectedRoute>} />
          <Route path="/request" element={<ProtectedRoute allowedRoles={['GUEST']}><RequestRide /></ProtectedRoute>} />
          <Route path="/status" element={<ProtectedRoute allowedRoles={['GUEST']}><RideStatus /></ProtectedRoute>} />
          <Route path="/events/:eventId" element={<ProtectedRoute allowedRoles={['GUEST']}><EventDetailsPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><Dashboard /></ProtectedRoute>} />
          <Route path="/driver" element={<ProtectedRoute allowedRoles={['DRIVER']}><DriverDashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to={session ? getHomeRouteForRole(session.user.role) : '/'} replace />} />
        </Routes>
      </Router>

      <ServiceWorkerUpdateBanner
        isVisible={isUpdateAvailable}
        onRefresh={handleRefreshApp}
        onDismiss={() => setDismissedWorkerScriptUrl(waitingWorkerScriptUrl)}
      />

      <PwaInstallPrompt />
    </>
  );
}

export default App;
