document.addEventListener('DOMContentLoaded', async () => {
  const result = document.querySelector('#token-result');
  const token = document.querySelector('#admin-token');
  const message = document.querySelector('#admin-message');
  try { const { user } = await TechCycleAuth.session(); if (user.role !== 'admin') return location.replace('/feed'); document.querySelector('[data-user-name]').textContent = user.username; } catch (_) { return location.replace('/login'); }
  document.querySelector('[data-logout]').addEventListener('click', async () => { await TechCycleAuth.logout(); location.assign('/login'); });
  document.querySelector('#generate-admin-token').addEventListener('click', async (event) => { event.currentTarget.disabled = true; message.textContent = ''; try { const response = await fetch('/api/admin/tokens', { method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'} }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Não foi possível gerar o token.'); token.textContent = data.token; result.hidden = false; } catch (error) { message.textContent = error.message; event.currentTarget.disabled = false; } });
});
