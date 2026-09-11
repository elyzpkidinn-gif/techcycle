document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#cadastro-form');
  if (!form || !window.TechCycleAuth) return;
  const message = form.querySelector('[data-auth-message]');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const data = new FormData(form);
      await TechCycleAuth.register(Object.fromEntries(data));
      const next = new URLSearchParams(window.location.search).get('next');
      window.location.assign(next && next.startsWith('/') ? next : '/feed');
    } catch (error) {
      if (message) message.textContent = error.message;
      else window.alert(error.message);
    }
  });
});
