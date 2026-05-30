import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiRequestError, ApiUnavailableError, getToken, setToken } from '../api/client';

const AppContext = createContext(null);

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

  const refreshFromApi = async (user = authUser) => {
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
      } else if (!(error instanceof ApiUnavailableError)) {
        handleApiError(error);
      }
      if (error instanceof ApiUnavailableError) setServiceUnavailable(true);
      return false;
    }
  };

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

  const completeRunnerTask = async (bookingId, runnerId) => {
    try {
      const response = await api.completeBooking(bookingId);
      replaceBooking(response.booking);
      setRunners((current) => current.map((runner) => runner.id === runnerId ? { ...runner, completedTasks: runner.completedTasks + 1 } : runner));
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
    updateProfile,
    fetchWallet,
    setWallet,
    fetchTemplates,
    saveTemplate,
    removeTemplate
  }), [customers, runners, bookings, authUser, authLoading, serviceUnavailable, toast, theme, wallet, templates]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => useContext(AppContext);
