/**
 * Thin API client for the SignUp service.
 *
 * In development, Vite proxies /api -> the Express backend (see vite.config.js),
 * so callers can use relative paths without worrying about CORS.
 *
 * Each function throws on non-2xx responses so callers can use try/catch.
 */

// Base URL is configurable via env so the same client works in Docker and locally.
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Internal helper: parse the JSON body if present and surface API errors.
 */
async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  // Try to parse JSON regardless of status so we can surface the server message.
  let body = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await response.json().catch(() => null);
  }

  if (!response.ok) {
    const message = (body && body.error)
      || (response.status >= 500
        ? 'Unable to reach the signup service. Make sure the API is running.'
        : `Request failed with status ${response.status}`);
    const err = new Error(message);
    err.status = response.status;
    err.body = body;
    throw err;
  }

  return body;
}

/**
 * Fetch all sign-ups, newest first (server controls ordering).
 */
export async function getSignups() {
  return request('/signups', { method: 'GET' });
}

/**
 * Fetch all sign-ups in a given category, using the CategoryIndex GSI.
 */
export async function getSignupsByCategory(category) {
  if (!category) throw new Error('category is required');
  const encoded = encodeURIComponent(category);
  return request(`/signups/category/${encoded}`, { method: 'GET' });
}

/**
 * Persist a new sign-up. The server intentionally delays the response
 * by 5 seconds to demonstrate the "SAVING" UI state.
 */
export async function createSignup(payload) {
  return request('/signups', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Health check, exposed for diagnostics.
 */
export async function getHealth() {
  return request('/health', { method: 'GET' });
}
