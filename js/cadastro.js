document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#cadastro-form');
  if (!form || !window.TechCycleAuth) return;
  const message = form.querySelector('[data-auth-message]');
  const adminOption = form.querySelector('input[name="role"][value="admin"]');
  const profileChoice = form.querySelector('.profile-choice');
  const updateAdminToken = () => {
    let field = form.querySelector('.admin-token-field');
    if (adminOption?.checked && !field) {
      field = document.createElement('label'); field.className = 'field admin-token-field';
      field.innerHTML = 'Token administrativo<input name="adminToken" inputmode="numeric" pattern="[0-9]{8}" minlength="8" maxlength="8" placeholder="Ex.: 48291630"><small class="field-help">Solicite um token a um administrador.</small>';
      profileChoice.after(field);
    } else if (!adminOption?.checked && field) field.remove();
  };
  form.querySelectorAll('input[name="role"]').forEach((input) => input.addEventListener('change', updateAdminToken));
  updateAdminToken();
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      if (message) message.textContent = 'Preencha os campos corretamente. A senha deve ter pelo menos 8 caracteres.';
      return;
    }
    try {
      const data = new FormData(form);
      if (data.get('password') !== data.get('confirmPassword')) {
        if (message) message.textContent = 'As senhas não conferem.';
        return;
      }
      await TechCycleAuth.register(Object.fromEntries(data));
      const next = new URLSearchParams(window.location.search).get('next');
      window.location.assign(next && next.startsWith('/') ? next : '/feed');
    } catch (error) {
      if (message) message.textContent = error.message;
      else window.alert(error.message);
    }
  });
});
