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
import { getAuthSession, getHomeRouteForRole } from './lib/auth';
import { activateServiceWorkerUpdate, subscribeToServiceWorkerUpdates } from './lib/serviceWorker';

function App() {
  const session = getAuthSession();
  const [waitingWorkerScriptUrl, setWaitingWorkerScriptUrl] = useState<string | null>(null);
  const [dismissedWorkerScriptUrl, setDismissedWorkerScriptUrl] = useState<string | null>(null);

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

  async function handleRefreshApp() {
    const updateStarted = await activateServiceWorkerUpdate();
    if (!updateStarted) {
      setWaitingWorkerScriptUrl(null);
      setDismissedWorkerScriptUrl(null);
    }
  }

  const isUpdateAvailable = Boolean(
    waitingWorkerScriptUrl && waitingWorkerScriptUrl !== dismissedWorkerScriptUrl
  );

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
    </>
  );
}

export default App;
