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

document.addEventListener('DOMContentLoaded', async () => {
  const shell = document.querySelector('.site-shell');
  let sidebar = document.querySelector('.sidebar');
  const main = shell?.querySelector(':scope > main');
  if (!sidebar && shell && main) {
    const grid = document.createElement('div');
    grid.className = 'app-grid';
    sidebar = document.createElement('nav');
    sidebar.className = 'sidebar';
    grid.append(sidebar, main);
    shell.insertBefore(grid, shell.querySelector('.app-footer') || null);
  }
  if (!sidebar) return;
  const path = window.location.pathname.replace(/\/$/, '') || '/feed';
  const removeDuplicateLinks = () => {
    const seen = new Set();
    sidebar.querySelectorAll('a.nav-link').forEach((link) => {
      const href = link.getAttribute('href');
      if (seen.has(href)) link.remove();
      else seen.add(href);
    });
  };
  removeDuplicateLinks();
  new MutationObserver(removeDuplicateLinks).observe(sidebar, { childList: true });
  [['/feed','⌂  Início'],['/comunidade','◌  Comunidade'],['/perfil','◉  Meu perfil'],['/favoritos','♡  Favoritos'],['/criar-post','＋  Compartilhar ideia'],['/notificacoes','🔔  Notificações'],['/denuncias','⚠  Denúncias']].forEach(([href, label]) => {
    if (!sidebar.querySelector(`a[href="${href}"]`)) {
      const link = document.createElement('a'); link.className = 'nav-link'; link.href = href; link.textContent = label; sidebar.append(link);
    }
  });
  try {
    const { user } = await TechCycleAuth.session();
    if (user.role === 'admin' && !sidebar.querySelector('a[href="/administracao"]')) {
      const link = document.createElement('a'); link.className = 'nav-link'; link.href = '/administracao'; link.textContent = '◆  Administração'; sidebar.append(link);
    }
    const isAdmin = user.role === 'admin';
    const navigation = [['/feed','⌂  Início'],['/comunidade','◌  Comunidade'],['/perfil','◉  Meu perfil'],['/favoritos','♡  Favoritos'],['/criar-post','＋  Compartilhar ideia'],['/notificacoes','🔔  Notificações'],['/denuncias','⚠  Denúncias']];
    if (isAdmin) navigation.push(['/administracao','◆  Administração']);
    sidebar.querySelectorAll('a.nav-link').forEach((link) => link.remove());
    navigation.forEach(([href, label]) => {
      const link = document.createElement('a'); link.className = 'nav-link'; link.href = href; link.textContent = label;
      link.classList.toggle('active', href === path); sidebar.append(link);
    });
  } catch (_) {}
  sidebar.querySelectorAll('a.nav-link').forEach((link) => link.classList.toggle('active', link.getAttribute('href') === path));
});
