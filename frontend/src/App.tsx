import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/guest/LoginPage';
import RequestRide from './pages/guest/RequestRide';
import RideStatus from './pages/guest/RideStatus';
import Dashboard from './pages/admin/Dashboard';
import MagicLink from './pages/driver/MagicLink';
import DriverDashboard from './pages/driver/DriverDashboard';

function App() {
  return (
    <Router>
      <Routes>
        {/* Guest Routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/request" element={<RequestRide />} />
        <Route path="/status" element={<RideStatus />} />

        {/* Admin Route */}
        <Route path="/admin" element={<Dashboard />} />

        {/* Driver Routes */}
        <Route path="/d/:magicLinkId" element={<MagicLink />} />
        <Route path="/driver" element={<DriverDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
