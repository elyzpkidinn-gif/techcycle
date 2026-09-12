window.TechCycleAuth = (() => {
  async function request(url, options = {}) {
    const response = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
    const data = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || `Não foi possível concluir a solicitação (erro ${response.status}).`);
    return data;
  }
  return {
    checkUsername: (username) => request('/api/auth/username/check', { method: 'POST', body: JSON.stringify({ username }) }),
    register: (payload) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
    login: (username, password, role) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password, role }) }),
    session: () => request('/api/auth/session'), logout: () => request('/api/auth/logout', { method: 'POST' })
  };
})();
