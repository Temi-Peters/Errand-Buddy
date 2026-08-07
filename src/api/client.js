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
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, password) => request('/auth/reset-password', { method: 'POST', body: { token, password } }),
  adminDeleteUser: (userId, body = {}) => request(`/admin/users/${userId}`, { method: 'DELETE', body }),
  adminInsights: () => request('/admin/insights'),
  me: () => request('/auth/me'),
  bookings: () => request('/bookings'),
  createBooking: (data) => request('/bookings', { method: 'POST', body: data }),
  updateBooking: (id, data) => request(`/bookings/${id}`, { method: 'PATCH', body: data }),
  acceptBooking: (id) => request(`/bookings/${id}/accept`, { method: 'POST' }),
  startBooking: (id) => request(`/bookings/${id}/start`, { method: 'POST' }),
  completeBooking: (id, goodsCost = 0, overageReason = '') => request(`/bookings/${id}/complete`, { method: 'POST', body: { goodsCost, overageReason } }),
  reviewBooking: (id, data) => request(`/bookings/${id}/review`, { method: 'POST', body: data }),
  resumePayment: (id) => request(`/bookings/${id}/resume-payment`, { method: 'POST' }),
  bookingDetail: (id) => request(`/bookings/${id}/detail`),
  saveBookingItems: (id, items) => request(`/bookings/${id}/items`, { method: 'PUT', body: { items } }),
  updateBookingItem: (id, itemId, data) => request(`/bookings/${id}/items/${itemId}`, { method: 'PATCH', body: data }),
  proposeSubstitute: (id, itemId, data) => request(`/bookings/${id}/items/${itemId}/substitute`, { method: 'POST', body: data }),
  decideSubstitute: (id, itemId, approved) => request(`/bookings/${id}/items/${itemId}/decision`, { method: 'POST', body: { approved } }),
  addBookingPhoto: (id, data) => request(`/bookings/${id}/photos`, { method: 'POST', body: data }),
  deleteBookingPhoto: (id, photoId) => request(`/bookings/${id}/photos/${photoId}`, { method: 'DELETE' }),
  messages: (id) => request(`/bookings/${id}/messages`),
  sendMessage: (id, data) => request(`/bookings/${id}/messages`, { method: 'POST', body: data }),
  runners: () => request('/runners'),
  uploadRunnerDoc: (data) => request('/runners/documents', { method: 'POST', body: data }),
  runnerDocsMine: () => request('/runners/documents/mine'),
  runnerDocs: (runnerId) => request(`/runners/${runnerId}/documents`),
  runnerDocObjectUrl: async (docId) => {
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}/runners/documents/${docId}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new ApiRequestError('Could not load document', res.status);
    return URL.createObjectURL(await res.blob());
  },
  updateRunner: (id, data) => request(`/runners/${id}/status`, { method: 'PATCH', body: data }),
  rejectRunner: (id, data) => request(`/runners/${id}/reject`, { method: 'POST', body: data }),
  updateProfile: (role, id, data) => request(`/${role === 'runner' ? 'runners' : 'customers'}/${id}`, { method: 'PATCH', body: data }),
  customers: () => request('/customers'),
  adminOverview: () => request('/admin/overview'),
  runnerConnectLink: () => request('/payments/runner/connect', { method: 'POST' }),
  runnerConnectStatus: () => request('/payments/runner/connect/status'),
  wallet: () => request('/wallet'),
  walletTopUp: (amount) => request('/wallet/topup', { method: 'POST', body: { amount } }),
  walletWithdraw: (amount) => request('/wallet/withdraw', { method: 'POST', body: { amount } }),
  templates: () => request('/templates'),
  getTemplate: (id) => request(`/templates/${id}`),
  createTemplate: (data) => request('/templates', { method: 'POST', body: data }),
  deleteTemplate: (id) => request(`/templates/${id}`, { method: 'DELETE' }),
  pushPublicKey: () => request('/push/public-key'),
  pushSubscribe: (subscription) => request('/push/subscribe', { method: 'POST', body: { subscription } }),
  pushUnsubscribe: (endpoint) => request('/push/unsubscribe', { method: 'POST', body: { endpoint } }),
  submitContact: (data) => request('/contact', { method: 'POST', body: data }),
  accountExport: () => request('/account/export'),
  deleteAccount: (password) => request('/account', { method: 'DELETE', body: { password } }),
  claims: () => request('/claims'),
  createClaim: (data) => request('/claims', { method: 'POST', body: data }),
  resolveClaim: (id, data) => request(`/claims/${id}/resolve`, { method: 'POST', body: data }),
  submitFeedback: (data) => request('/feedback', { method: 'POST', body: data }),
  feedbackResults: () => request('/feedback'),
  carers: () => request('/carers'),
  inviteCarer: (email) => request('/carers', { method: 'POST', body: { email } }),
  acceptCarerInvite: (id) => request(`/carers/${id}/accept`, { method: 'POST' }),
  removeCarerLink: (id) => request(`/carers/${id}`, { method: 'DELETE' })
};
