document.addEventListener('DOMContentLoaded', async () => {
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
