const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const TOKEN_KEY = 'errandBuddy.apiToken';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const setToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export class ApiUnavailableError extends Error {
  constructor(message = 'API unavailable') {
    super(message);
    this.name = 'ApiUnavailableError';
  }
}

export class ApiRequestError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

const request = async (path, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
  } catch (error) {
    throw new ApiUnavailableError(error.message);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiRequestError(payload.error || 'API request failed', response.status);
  }

  return payload;
};

export const api = {
  health: () => request('/health'),
  register: (data) => request('/auth/register', { method: 'POST', body: data }),
  login: (data) => request('/auth/login', { method: 'POST', body: data }),
  me: () => request('/auth/me'),
  bookings: () => request('/bookings'),
  createBooking: (data) => request('/bookings', { method: 'POST', body: data }),
  updateBooking: (id, data) => request(`/bookings/${id}`, { method: 'PATCH', body: data }),
  acceptBooking: (id) => request(`/bookings/${id}/accept`, { method: 'POST' }),
  startBooking: (id) => request(`/bookings/${id}/start`, { method: 'POST' }),
  completeBooking: (id) => request(`/bookings/${id}/complete`, { method: 'POST' }),
  reviewBooking: (id, data) => request(`/bookings/${id}/review`, { method: 'POST', body: data }),
  messages: (id) => request(`/bookings/${id}/messages`),
  sendMessage: (id, data) => request(`/bookings/${id}/messages`, { method: 'POST', body: data }),
  runners: () => request('/runners'),
  updateRunner: (id, data) => request(`/runners/${id}/status`, { method: 'PATCH', body: data }),
  updateProfile: (role, id, data) => request(`/${role === 'runner' ? 'runners' : 'customers'}/${id}`, { method: 'PATCH', body: data }),
  customers: () => request('/customers'),
  adminOverview: () => request('/admin/overview'),
  runnerConnectLink: () => request('/payments/runner/connect', { method: 'POST' }),
  runnerConnectStatus: () => request('/payments/runner/connect/status')
};
