document.addEventListener('DOMContentLoaded', () => {
  const next = new URLSearchParams(window.location.search).get('next');
  if (next && next.startsWith('/')) document.querySelector('.auth-switch a')?.setAttribute('href', `/cadastro?next=${encodeURIComponent(next)}`);
  const form = document.querySelector('#login-form');
  if (!form || !window.TechCycleAuth) return;
  const message = form.querySelector('[data-auth-message]');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const data = new FormData(form);
      await TechCycleAuth.login(data.get('username'), data.get('password'), data.get('role'));
      window.location.assign(next && next.startsWith('/') ? next : '/feed');
    } catch (error) {
      if (message) message.textContent = error.message;
      else window.alert(error.message);
    }
  });
});
