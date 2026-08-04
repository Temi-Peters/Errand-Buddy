import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiRequestError, ApiUnavailableError, getToken, setToken } from '../api/client';

const AppContext = createContext(null);

// VAPID public keys are base64url; the Push API needs a Uint8Array.
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
};

export const AppProvider = ({ children }) => {
  const [customers, setCustomers] = useState([]);
  const [runners, setRunnersState] = useState([]);
  const [bookings, setBookingsState] = useState([]);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(getToken()));
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('eb-theme') || 'light');
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [templates, setTemplates] = useState([]);
  const [carerLinks, setCarerLinks] = useState({ clients: [], pendingInvites: [], carers: [] });
  const [claims, setClaims] = useState([]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('eb-theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ id: Date.now(), message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const setBookings = (next) => setBookingsState((current) => typeof next === 'function' ? next(current) : next);
  const setRunners = (next) => setRunnersState((current) => typeof next === 'function' ? next(current) : next);

  const clearSession = () => {
    setAuthUser(null);
    setToken(null);
  };

  // The service-unavailable screen replaces the whole app, and nothing else
  // clears the flag unless a logged-in refresh succeeds — so without this a
  // logged-out visitor who hits one blip is stranded until they reload by hand.
  const retryConnection = async () => {
    try {
      await api.health();
      setServiceUnavailable(false);
      if (authUser) await refreshFromApi(authUser, { silent: true });
      return true;
    } catch {
      return false;
    }
  };

  const handleApiError = (error) => {
    if (error instanceof ApiUnavailableError) {
      setServiceUnavailable(true);
      showToast('Service temporarily unavailable', 'error');
      return;
    }

    if (error instanceof ApiRequestError && error.status === 401) {
      clearSession();
    }

    showToast(error.message, 'error');
  };

  const refreshFromApi = async (user = authUser, { silent = false } = {}) => {
    if (!getToken()) return false;

    try {
      const [customersResponse, runnersResponse, bookingsResponse] = await Promise.all([
        api.customers(),
        api.runners(),
        api.bookings()
      ]);

      setCustomers(customersResponse.customers);
      setRunnersState(runnersResponse.runners);
      setBookingsState(bookingsResponse.bookings);
      setServiceUnavailable(false);
      return true;
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        clearSession();
      } else if (!(error instanceof ApiUnavailableError) && !silent) {
        handleApiError(error);
      }
      if (error instanceof ApiUnavailableError && !silent) setServiceUnavailable(true);
      return false;
    }
  };

  // Auto-refresh data while the user is active, so bookings/wallet update without
  // a manual page reload. Polls every 45s when the tab is visible, and immediately
  // when the tab regains focus. Silent so transient blips don't spam toasts.
  useEffect(() => {
    if (!authUser) return undefined;

    const refresh = () => {
      if (document.visibilityState === 'visible' && getToken()) {
        refreshFromApi(authUser, { silent: true });
      }
    };

    const interval = setInterval(refresh, 45000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [authUser]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const restoreSession = async () => {
      // Retry up to 4 times (covers Render free tier cold start ~50s)
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          if (attempt > 0) await new Promise((r) => setTimeout(r, 15000));

          await api.health();
          setServiceUnavailable(false);

          if (!getToken()) { setAuthLoading(false); return; }

          const response = await api.me();
          setAuthUser(response.user);
          await refreshFromApi(response.user);
          setAuthLoading(false);
          return;
        } catch (error) {
          if (error instanceof ApiRequestError && error.status === 401) {
            clearSession();
            setAuthLoading(false);
            return;
          }
          if (error instanceof ApiUnavailableError && attempt < 3) continue;
          if (error instanceof ApiUnavailableError) setServiceUnavailable(true);
        }
      }
      setAuthLoading(false);
    };

    restoreSession();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await api.login(credentials);
      setToken(response.token);
      setAuthUser(response.user);
      setServiceUnavailable(false);
      showToast(`Logged in as ${response.user.name}`);
      await refreshFromApi(response.user);
      return response.user;
    } catch (error) {
      if (error instanceof ApiUnavailableError) {
        setServiceUnavailable(true);
        showToast('Service temporarily unavailable', 'error');
      } else {
        handleApiError(error);
      }
      throw error;
    }
  };

  const register = async (payload) => {
    try {
      const response = await api.register(payload);
      setToken(response.token);
      setAuthUser(response.user);
      setServiceUnavailable(false);
      showToast(`Account created for ${response.user.name}`);
      await refreshFromApi(response.user);
      return response.user;
    } catch (error) {
      if (error instanceof ApiUnavailableError) {
        setServiceUnavailable(true);
        showToast('Service temporarily unavailable', 'error');
      } else {
        handleApiError(error);
      }
      throw error;
    }
  };

  const logout = () => {
    clearSession();
    showToast('Logged out');
  };

  const deleteMyAccount = async (password) => {
    await api.deleteAccount(password);
    clearSession();
    showToast('Your account and data have been deleted');
  };

  const addBooking = async (booking) => {
    try {
      const response = await api.createBooking(booking);
      setBookings((current) => [response.booking, ...current]);
      return response.booking;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const replaceBooking = (nextBooking) => {
    setBookings((current) => current.map((booking) => booking.id === nextBooking.id ? nextBooking : booking));
  };

  const updateBooking = async (bookingId, updates) => {
    try {
      let response;
      if (updates.rating) {
        response = await api.reviewBooking(bookingId, updates.rating);
      } else if (authUser?.role === 'runner' && updates.status === 'In Progress') {
        response = await api.startBooking(bookingId);
      } else {
        response = await api.updateBooking(bookingId, updates);
      }
      replaceBooking(response.booking);
      return response.booking;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const acceptBooking = async (bookingId) => {
    try {
      const response = await api.acceptBooking(bookingId);
      replaceBooking(response.booking);
      return response.booking;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const completeRunnerTask = async (bookingId, runnerId, goodsCost = 0) => {
    try {
      const response = await api.completeBooking(bookingId, goodsCost);
      replaceBooking(response.booking);
      setRunners((current) => current.map((runner) => runner.id === runnerId ? { ...runner, completedTasks: runner.completedTasks + 1 } : runner));
      // The task is genuinely complete, but if the money side failed the runner
      // needs to hear it now rather than discover it when no payment arrives.
      if (response.booking?.completionProblems?.length) {
        showToast('Task completed, but the payment didn\'t go through. We\'ve been notified and will sort it.', 'error');
      }
      return response.booking;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const fetchMessages = async (bookingId) => {
    try {
      const response = await api.messages(bookingId);
      return response.messages;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const sendMessage = async (bookingId, body) => {
    try {
      const response = await api.sendMessage(bookingId, { body });
      showToast('Message sent');
      return response.message;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const updateRunnerStatus = async (runnerId, status, rejectionReason = '') => {
    try {
      const response = await api.updateRunner(runnerId, { status, rejectionReason });
      setRunners((current) => current.map((runner) => runner.id === runnerId ? response.runner : runner));
      showToast('Runner updated');
      return response.runner;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const rejectRunner = async (runnerId, { reason, blockEmail } = {}) => {
    try {
      await api.rejectRunner(runnerId, { reason, blockEmail });
      setRunners((current) => current.filter((runner) => runner.id !== runnerId));
      showToast(blockEmail ? 'Application rejected and email blocked' : 'Application rejected');
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  // Admin removal of another user's account. A 409 means the person still has
  // live bookings — the caller re-issues with force after confirming, so it must
  // NOT raise an error toast here or the admin sees a failure and a confirm at once.
  const adminDeleteUser = async (userId, { reason = '', force = false } = {}) => {
    try {
      const response = await api.adminDeleteUser(userId, { reason, force });
      setCustomers((current) => current.filter((customer) => customer.userId !== userId));
      setRunners((current) => current.filter((runner) => runner.userId !== userId));
      // Their bookings cascade away server-side, so pull fresh lists rather than
      // trying to unpick which rows disappeared.
      refreshFromApi(authUser, { silent: true });
      showToast(`${response.deleted?.name || 'Account'} deleted`);
      return response;
    } catch (error) {
      if (error.status !== 409) handleApiError(error);
      throw error;
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.templates();
      setTemplates(response.templates);
      return response.templates;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const saveTemplate = async (data) => {
    try {
      const response = await api.createTemplate(data);
      setTemplates((prev) => [response.template, ...prev]);
      showToast('Template saved');
      return response.template;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const removeTemplate = async (id) => {
    try {
      await api.deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      showToast('Template deleted');
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const enablePush = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        showToast('Notifications aren\'t supported on this device', 'error');
        return false;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showToast('Notification permission was denied', 'error');
        return false;
      }

      const { publicKey, enabled } = await api.pushPublicKey();
      if (!enabled || !publicKey) {
        showToast('Push notifications aren\'t configured yet', 'error');
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      await api.pushSubscribe(subscription.toJSON());
      showToast('Notifications enabled');
      return true;
    } catch (error) {
      showToast('Could not enable notifications', 'error');
      return false;
    }
  };

  const fetchCarerLinks = async () => {
    try {
      const response = await api.carers();
      setCarerLinks({
        clients: response.clients || [],
        pendingInvites: response.pendingInvites || [],
        carers: response.carers || []
      });
      return response;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const inviteCarer = async (email) => {
    try {
      const response = await api.inviteCarer(email);
      setCarerLinks((prev) => ({ ...prev, carers: [response.link, ...prev.carers] }));
      showToast('Carer invite sent');
      return response.link;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const acceptCarerInvite = async (id) => {
    try {
      await api.acceptCarerInvite(id);
      await fetchCarerLinks();
      showToast('Invite accepted');
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const removeCarerLink = async (id) => {
    try {
      await api.removeCarerLink(id);
      setCarerLinks((prev) => ({
        clients: prev.clients.filter((l) => l.id !== id),
        pendingInvites: prev.pendingInvites.filter((l) => l.id !== id),
        carers: prev.carers.filter((l) => l.id !== id)
      }));
      showToast('Link removed');
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const fetchClaims = async () => {
    try {
      const response = await api.claims();
      setClaims(response.claims);
      return response.claims;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const raiseClaim = async (data) => {
    try {
      const response = await api.createClaim(data);
      setClaims((prev) => [response.claim, ...prev]);
      showToast('Claim submitted — we\'ll be in touch');
      return response.claim;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const resolveClaim = async (id, data) => {
    try {
      const response = await api.resolveClaim(id, data);
      setClaims((prev) => prev.map((c) => c.id === id ? response.claim : c));
      showToast(`Claim ${data.action === 'reject' ? 'rejected' : 'resolved'}`);
      return response.claim;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const fetchWallet = async () => {
    try {
      const response = await api.wallet();
      setWallet(response);
      return response;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const updateProfile = async (data) => {
    try {
      const response = await api.updateProfile(authUser.role, authUser.id, data);
      const updated = response.customer || response.runner;
      // Refresh name/email on authUser if they changed
      if (data.name || data.email) {
        setAuthUser((prev) => ({
          ...prev,
          ...(data.name ? { name: data.name } : {}),
          ...(data.email ? { email: data.email } : {})
        }));
      }
      if (authUser.role === 'customer') {
        setCustomers((prev) => prev.map((c) => c.id === authUser.id ? updated : c));
      } else {
        setRunners((prev) => prev.map((r) => r.id === authUser.id ? updated : r));
      }
      showToast('Profile updated');
      return updated;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const value = useMemo(() => ({
    customers,
    runners,
    bookings,
    authUser,
    authLoading,
    serviceUnavailable,
    toast,
    theme,
    wallet,
    templates,
    carerLinks,
    showToast,
    toggleTheme,
    login,
    register,
    logout,
    addBooking,
    updateBooking,
    acceptBooking,
    completeRunnerTask,
    fetchMessages,
    sendMessage,
    updateRunnerStatus,
    adminDeleteUser,
    retryConnection,
    rejectRunner,
    updateProfile,
    fetchWallet,
    setWallet,
    fetchTemplates,
    saveTemplate,
    removeTemplate,
    fetchCarerLinks,
    inviteCarer,
    acceptCarerInvite,
    removeCarerLink,
    enablePush,
    claims,
    fetchClaims,
    raiseClaim,
    resolveClaim,
    deleteMyAccount
  }), [customers, runners, bookings, authUser, authLoading, serviceUnavailable, toast, theme, wallet, templates, carerLinks, claims]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
