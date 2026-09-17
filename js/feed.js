document.addEventListener('DOMContentLoaded', async () => {
  if (location.pathname === '/favoritos') return;
  const main = document.querySelector('.app-grid main'); const empty = main?.querySelector('.empty-card'); if (main && empty) { try { const response = await fetch('/api/ideas?limit=5&sort=recent'); const data = await response.json(); const dashboard = document.createElement('section'); dashboard.className='dashboard-news'; dashboard.innerHTML=`<h2>Novidades da comunidade</h2>${(data.ideas||[]).map(idea=>`<article><a href="/ideia/${idea.id}"><strong>${String(idea.title).replace(/[<>&]/g,'')}</strong></a><small>${new Date(idea.created_at).toLocaleDateString('pt-BR')} · ${String(idea.author_name).replace(/[<>&]/g,'')}</small><p>${String(idea.content).slice(0,140)}${idea.content.length>140?'…':''}</p></article>`).join('')||'<p class="muted-text">Ainda não há novidades publicadas.</p>'}`; empty.before(dashboard); } catch (_) {} }
  const brandAvatar = document.querySelector('.composer .avatar');
  if (brandAvatar) {
    brandAvatar.classList.add('brand-avatar');
    brandAvatar.replaceChildren(Object.assign(document.createElement('img'), {
      src: '/assets/images/techcycle-symbol.png',
      alt: 'Símbolo TechCycle'
    }));
  }

  try {
    const { user } = await TechCycleAuth.session();
    document.querySelectorAll('[data-user-name]').forEach((element) => { element.textContent = user.username; });
    if (!document.querySelector('.app-footer')) {
      const footer = document.createElement('footer');
      footer.className = 'app-footer';
      footer.textContent = '\u00A9 2026 TechCycle. Todos os direitos reservados.';
      document.querySelector('.site-shell')?.append(footer);
    }
  } catch (_) {
    window.location.replace('/login');
  }

  document.querySelector('[data-logout]')?.addEventListener('click', async () => {
    await TechCycleAuth.logout();
    window.location.assign('/login');
  });
  document.querySelector('.composer input')?.addEventListener('focus', () => { window.location.assign('/criar-post'); });
});
