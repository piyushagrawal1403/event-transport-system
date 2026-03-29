import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/guest/LoginPage';
import GuestHome from './pages/guest/GuestHome';
import EventDetailsPage from './pages/guest/EventDetailsPage';
import Dashboard from './pages/admin/Dashboard';
import DriverDashboard from './pages/driver/DriverDashboard';

function App() {
  return (
    <Router>
      <Routes>
        {/* Guest Routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<GuestHome />} />
        <Route path="/events/:eventId" element={<EventDetailsPage />} />

        {/* Admin Route */}
        <Route path="/admin" element={<Dashboard />} />

        {/* Driver Routes */}
        <Route path="/driver" element={<DriverDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
