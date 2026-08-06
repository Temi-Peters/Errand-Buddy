import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Button from './components/Button';
import Layout from './components/Layout';
import Admin from './pages/Admin';
import Book from './pages/Book';
import CustomerDashboard from './pages/CustomerDashboard';
import Home from './pages/Home';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
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
import RevenueModel from './pages/RevenueModel';
import Coverage from './pages/Coverage';
import Feedback from './pages/Feedback';
import SurveyResults from './pages/SurveyResults';
import ClaimsAdmin from './pages/ClaimsAdmin';
import AdminInsights from './pages/AdminInsights';
import { useApp } from './context/AppContext';

function ProtectedRoute({ role, children }) {
  const { authUser, authLoading } = useApp();
  if (authLoading) return <div className="py-10 text-center font-semibold text-muted">Loading...</div>;
  if (!authUser) return <Navigate to="/login" replace />;
  if (role && authUser.role !== role) return <Navigate to="/" replace />;
  return children;
}

function ServiceUnavailable() {
  const { retryConnection } = useApp();
  const [retrying, setRetrying] = useState(false);
  const [failedAgain, setFailedAgain] = useState(false);

  const retry = async () => {
    setRetrying(true);
    setFailedAgain(false);
    const ok = await retryConnection();
    if (!ok) setFailedAgain(true);
    setRetrying(false);
  };

  return (
    <Layout>
      <div className="mx-auto max-w-xl rounded-2xl border border-surface-hi bg-surface p-8 text-center shadow-soft">
        <h1 className="text-3xl font-extrabold text-ink">Can't reach ErrandBuddy</h1>
        <p className="mt-3 text-muted">
          This is usually a brief hiccup. If nobody has used the app for a while, our server may be waking up — that can take up to a minute.
        </p>
        <div className="mt-6">
          <Button onClick={retry} loading={retrying}>Try again</Button>
        </div>
        {failedAgain ? (
          <p className="mt-4 text-sm font-semibold text-red-600">
            Still not responding. Give it a few seconds and try once more.
          </p>
        ) : null}
      </div>
    </Layout>
  );
}

export default function App() {
  const { serviceUnavailable } = useApp();
  if (serviceUnavailable) {
    return <ServiceUnavailable />;
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
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/welcome" element={<ProtectedRoute role="customer"><Welcome /></ProtectedRoute>} />
        <Route path="/book" element={<Book />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/coverage" element={<Coverage />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/customer/dashboard" element={<ProtectedRoute role="customer"><CustomerDashboard /></ProtectedRoute>} />
        <Route path="/runner/dashboard" element={<ProtectedRoute role="runner"><RunnerDashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
        <Route path="/admin/revenue-model" element={<ProtectedRoute role="admin"><RevenueModel /></ProtectedRoute>} />
        <Route path="/admin/survey" element={<ProtectedRoute role="admin"><SurveyResults /></ProtectedRoute>} />
        <Route path="/admin/claims" element={<ProtectedRoute role="admin"><ClaimsAdmin /></ProtectedRoute>} />
        <Route path="/admin/insights" element={<ProtectedRoute role="admin"><AdminInsights /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
