// utils/api.js - Centralized API calls

//const BASE_URL = process.env.REACT_APP_API_URL || 'httsp://localhost:5000';

const BASE_URL = process.env.REACT_APP_API_URL;

if (!BASE_URL) {
  throw new Error('REACT_APP_API_URL is not defined');
}


async function request(method, path, body = null, isFormData = false) {

  const options = {
    method,
    headers: isFormData ? {} : {
      'Content-Type': 'application/json'
    },
  };

  if (body) {
    options.body = isFormData ? body : JSON.stringify(body);
  }

  let res;

  try {
    res = await fetch(`${BASE_URL}${path}`, options);
  } catch (err) {
    throw new Error('Cannot connect to server');
  }

  let data;

  try {
    data = await res.json();
  } catch {
    throw new Error('Invalid server response');
  }

  if (!res.ok) {
    throw new Error(data.error || `API error: ${res.status}`);
  }

  return data;
}

export const api = {
  // Interview
  startInterview: (params) => request('POST', '/api/interview/start', params),
  submitAnswer: (params) => request('POST', '/api/interview/answer', params),
  endInterview: (sessionId) => request('POST', '/api/interview/end', { sessionId }),
  getResults: (sessionId) => request('GET', `/api/interview/results/${sessionId}`),
  getSession: (sessionId) => request('GET', `/api/interview/session/${sessionId}`),

  // Resume
  uploadResume: (formData) => request('POST', '/api/resume/upload', formData, true),

  // Session
  getRoles: () => request('GET', '/api/session/roles'),
};

export default api;
