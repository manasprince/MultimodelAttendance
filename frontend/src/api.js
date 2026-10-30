const API_BASE = '/api';

// Token Management
export const getToken = () => localStorage.getItem('manas_token');
export const setToken = (token) => localStorage.setItem('manas_token', token);
export const removeToken = () => {
  localStorage.removeItem('manas_token');
  localStorage.removeItem('manas_user');
};

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('manas_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const setStoredUser = (user) => localStorage.setItem('manas_user', JSON.stringify(user));

// Common Fetch Wrapper
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    if (response.status === 401) {
      // Token expired or invalid
      removeToken();
      window.dispatchEvent(new Event('auth-logout'));
      throw new Error('Authentication expired. Please log in again.');
    }

    if (!response.ok) {
      let errorDetail = 'API Request Failed';
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.detail || errorDetail;
      } catch (e) {
        errorDetail = response.statusText || errorDetail;
      }
      throw new Error(errorDetail);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return response;
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err);
    throw err;
  }
}

export const api = {
  // Auth
  login: async (username, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setToken(data.access_token);
    setStoredUser({
      id: data.user_id,
      username: data.username,
      full_name: data.full_name,
      role: data.role,
    });
    return data;
  },
  getMe: () => request('/auth/me'),

  // Dashboard & System
  getDashboardStats: () => request('/dashboard/stats'),
  getSystemStatus: () => request('/system/status'),

  // Classes
  getClasses: () => request('/classes'),
  createClass: (payload) => request('/classes', { method: 'POST', body: JSON.stringify(payload) }),
  deleteClass: (id) => request(`/classes/${id}`, { method: 'DELETE' }),

  // Students
  getStudents: (classId) => request(`/students${classId ? `?class_id=${classId}` : ''}`),
  createStudent: (payload) => request('/students', { method: 'POST', body: JSON.stringify(payload) }),
  updateStudent: (id, payload) => request(`/students/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteStudent: (id) => request(`/students/${id}`, { method: 'DELETE' }),
  registerStudentFace: (id, base64Image) => {
    const formData = new URLSearchParams();
    formData.append('image_base64', base64Image);
    const token = getToken();
    return fetch(`${API_BASE}/students/${id}/register-face`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData.toString(),
    }).then(r => r.json());
  },

  // Sessions
  getSessions: (classId) => request(`/sessions${classId ? `?class_id=${classId}` : ''}`),
  getSessionDetails: (id) => request(`/sessions/${id}`),
  createSession: (payload) => request('/sessions', { method: 'POST', body: JSON.stringify(payload) }),
  startSession: (id) => request(`/sessions/${id}/start`, { method: 'POST' }),
  endSession: (id) => request(`/sessions/${id}/end`, { method: 'POST' }),

  // Live Multimodal Telemetry
  processLiveFrame: (sessionId, payload) => request(`/sessions/${sessionId}/process-frame`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  submitAudioTelemetry: (sessionId, payload) => request(`/sessions/${sessionId}/audio-telemetry`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Human Review & Audit
  getPendingReviews: (sessionId) => request(`/reviews/pending${sessionId ? `?session_id=${sessionId}` : ''}`),
  updateReviewRecord: (recordId, payload) => request(`/reviews/${recordId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  batchConfirmRecords: (sessionId, minConfidence = 0.60) => request(`/reviews/batch-confirm?session_id=${sessionId}&min_confidence=${minConfidence}`, {
    method: 'POST',
  }),

  // History & CSV Export
  getAttendanceHistory: (params = {}) => {
    const q = new URLSearchParams();
    if (params.class_id) q.append('class_id', params.class_id);
    if (params.session_id) q.append('session_id', params.session_id);
    return request(`/attendance/history?${q.toString()}`);
  },
  getExportCSVUrl: (sessionId) => `${API_BASE}/sessions/${sessionId}/export-csv`,

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (settingsList) => request('/settings', {
    method: 'POST',
    body: JSON.stringify(settingsList),
  }),
};

