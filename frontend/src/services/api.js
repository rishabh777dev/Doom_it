// api.js - Centralized API client for Vakya-Bhed 2026

const BASE_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || 'https://doom-it-backend.onrender.com').replace(/\/+$/, '');


export const getToken = () => localStorage.getItem('token');
export const setToken = (token) => localStorage.setItem('token', token);
export const removeToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('role');
};

const getHeaders = (customHeaders = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res) => {
  if (res.status === 401) {
    const errorData = await res.json().catch(() => ({}));
    const detail = errorData.detail || '';
    if (detail.includes('SESSION_SUPERSEDED') || detail.includes('another device')) {
      window.dispatchEvent(new CustomEvent('session_superseded', { detail }));
    } else {
      removeToken();
      window.dispatchEvent(new Event('auth_change'));
    }
    throw new Error(detail || 'Session expired or invalidated.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Request failed with status ${res.status}`);
  }
  return data;
};

// ---------------- AUTH API ----------------
export const apiLogin = async (username, password) => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await handleResponse(res);
  if (data.access_token) {
    setToken(data.access_token);
    localStorage.setItem('username', data.username);
    localStorage.setItem('role', data.role);
    window.dispatchEvent(new Event('auth_change'));
  }
  return data;
};

export const apiLogout = async () => {
  try {
    await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: getHeaders(),
    });
  } catch (e) {
    // Ignore error on logout
  } finally {
    removeToken();
    window.dispatchEvent(new Event('auth_change'));
  }
};

export const apiGetMe = async () => {
  const res = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
};

// ---------------- COMPETITION & TIMER API ----------------
export const apiGetTimer = async () => {
  const res = await fetch(`${BASE_URL}/api/timer`);
  return handleResponse(res);
};

export const apiGetLeaderboard = async () => {
  const res = await fetch(`${BASE_URL}/api/leaderboard`);
  return handleResponse(res);
};

// ---------------- PARTICIPANT ARENA API ----------------
export const apiGetCurrentLevel = async () => {
  const res = await fetch(`${BASE_URL}/api/arena/level`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
};

export const apiGetLevels = async () => {
  const res = await fetch(`${BASE_URL}/api/levels`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
};

export const apiSubmitPrompt = async (prompt) => {
  const res = await fetch(`${BASE_URL}/api/arena/submit`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ prompt }),
  });
  return handleResponse(res);
};

export const apiVerifyPassword = async (levelId, capturedPassword) => {
  const res = await fetch(`${BASE_URL}/api/levels/${levelId}/verify`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ captured_password: capturedPassword }),
  });
  return handleResponse(res);
};

export const apiGetLevelHint = async () => {
  const res = await fetch(`${BASE_URL}/api/arena/level/hint`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
};

export const apiRevealLevelHint = async () => {
  const res = await fetch(`${BASE_URL}/api/arena/level/hint/reveal`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse(res);
};

export const apiGetParticipantStats = async () => {
  const res = await fetch(`${BASE_URL}/api/arena/stats`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
};

export const apiGetSubmissionHistory = async (limit = 50, levelId = null) => {
  const url = levelId !== null
    ? `${BASE_URL}/api/arena/history?limit=${limit}&level_id=${levelId}`
    : `${BASE_URL}/api/arena/history?limit=${limit}`;
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  return handleResponse(res);
};

// ---------------- ADMIN API ----------------
export const apiGetAdminHealth = async () => {
  const res = await fetch(`${BASE_URL}/api/admin/health`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
};

export const apiGetAdminLevels = async () => {
  const res = await fetch(`${BASE_URL}/api/admin/levels`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
};

export const apiUpdateLevelSecret = async (levelId, data) => {
  const res = await fetch(`${BASE_URL}/api/admin/levels/${levelId}/secret`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const apiGetAdminParticipants = async () => {
  const res = await fetch(`${BASE_URL}/api/admin/participants`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
};

export const apiCreateParticipant = async (data) => {
  const res = await fetch(`${BASE_URL}/api/admin/participants`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const apiUpdateParticipant = async (id, data) => {
  const res = await fetch(`${BASE_URL}/api/admin/participants/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
};

export const apiResetParticipantProgress = async (id) => {
  const res = await fetch(`${BASE_URL}/api/admin/participants/${id}/reset-progress`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse(res);
};

export const apiDeleteParticipant = async (id) => {
  const res = await fetch(`${BASE_URL}/api/admin/participants/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return handleResponse(res);
};

export const apiUnlockLevel = async (id, levelId) => {
  const res = await fetch(`${BASE_URL}/api/admin/participants/${id}/unlock-level?level_id=${levelId}`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse(res);
};

export const apiToggleHintRelease = async (levelId, released) => {
  const res = await fetch(`${BASE_URL}/api/admin/levels/${levelId}/hint?released=${released}`, {
    method: 'PUT',
    headers: getHeaders(),
  });
  return handleResponse(res);
};

export const apiGetAdminSubmissions = async (limit = 200) => {
  const res = await fetch(`${BASE_URL}/api/admin/submissions?limit=${limit}`, {
    headers: getHeaders(),
  });
  return handleResponse(res);
};

export const apiUpdateCompetitionState = async (updateData) => {
  const res = await fetch(`${BASE_URL}/api/admin/competition`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updateData),
  });
  return handleResponse(res);
};

