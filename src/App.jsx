import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Admin from './pages/Admin';
import Book from './pages/Book';
import CustomerDashboard from './pages/CustomerDashboard';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import RunnerDashboard from './pages/RunnerDashboard';
import Services from './pages/Services';
import Pricing from './pages/Pricing';
import HowItWorks from './pages/HowItWorks';
import BecomeRunner from './pages/BecomeRunner';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Contact from './pages/Contact';
import Welcome from './pages/Welcome';
import { useApp } from './context/AppContext';

function ProtectedRoute({ role, children }) {
  const { authUser, authLoading } = useApp();
  if (authLoading) return <div className="py-10 text-center font-semibold text-muted">Loading...</div>;
  if (!authUser) return <Navigate to="/login" replace />;
  if (role && authUser.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { serviceUnavailable } = useApp();
  if (serviceUnavailable) {
    return <Layout><div className="mx-auto max-w-xl rounded-2xl border border-surface-hi bg-surface p-8 text-center shadow-soft"><h1 className="text-3xl font-extrabold text-ink">Service temporarily unavailable</h1><p className="mt-3 text-muted">We cannot reach ErrandBuddy right now. Please try again shortly.</p></div></Layout>;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/become-a-runner" element={<BecomeRunner />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/welcome" element={<ProtectedRoute role="customer"><Welcome /></ProtectedRoute>} />
        <Route path="/book" element={<Book />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/customer/dashboard" element={<ProtectedRoute role="customer"><CustomerDashboard /></ProtectedRoute>} />
        <Route path="/runner/dashboard" element={<ProtectedRoute role="runner"><RunnerDashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
