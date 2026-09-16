// Mantém a navegação idêntica em todas as páginas, independentemente da aba aberta.
const techCycleNavPath = location.pathname.startsWith('/ideia/') ? '/comunidade' : location.pathname;
const techCycleBaseNav = [
  ['/feed', '\u2302', 'Início'],
  ['/comunidade', '\u25cc', 'Comunidade'],
  ['/perfil', '\u25c9', 'Meu perfil'],
  ['/favoritos', '\u2661', 'Favoritos'],
  ['/criar-post', '\uff0b', 'Compartilhar ideia'],
  ['/tutoriais', '\u25b6', 'Tutoriais'],
  ['/notificacoes', '\ud83d\udd14', 'Notificações'],
  ['/denuncias', '\u26a0', 'Denúncias']
];

function renderTechCycleNav() {
  const techCycleSidebar = document.querySelector('.sidebar');
  if (!techCycleSidebar) return;
  const links = [...techCycleBaseNav];
  links.push(['/configuracoes', '⚙', 'Configurações']);
  links.push(['/administracao', '\u25c6', 'Administração']);
  techCycleSidebar.replaceChildren(...links.map(([href, icon, label]) => {
  const link = document.createElement('a');
  link.className = `nav-link${techCycleNavPath === href ? ' active' : ''}`;
  link.href = href;
  link.textContent = `${icon}  ${label}`;
  return link;
  }));
}

renderTechCycleNav();
if (location.pathname === '/favoritos') import('/js/favoritos.js');

function ensureSectionSidebar() {
  if (!['/notificacoes', '/denuncias'].includes(location.pathname) || document.querySelector('.app-grid')) return;
  const main = document.querySelector('main');
  if (!main) return;
  const grid = document.createElement('div');
  grid.className = 'app-grid';
  const sidebar = document.createElement('nav');
  sidebar.className = 'sidebar';
  main.parentNode.insertBefore(grid, main);
  grid.append(sidebar, main);
  renderTechCycleNav();
}
ensureSectionSidebar();
if (location.pathname === '/configuracoes') document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style'); style.textContent = '.settings-main{max-width:900px!important}.settings-main .settings-grid{display:grid;grid-template-columns:1fr;gap:20px;align-items:start}.settings-main .settings-card{margin:0;padding:24px}.settings-main .settings-card h2{margin-top:0;font-size:20px}.settings-main #password-form{display:none}.settings-main #export-data,.settings-main #logout-all{display:none}.settings-main .profile-option{margin-bottom:10px}.settings-main .field:has(#default-sort){margin-top:16px}.settings-main #default-sort{width:100%;appearance:none;border:1px solid #b9d8dc;border-radius:11px;padding:12px 42px 12px 14px;background:linear-gradient(135deg,#fff,#f5fbfb);color:var(--ink);font:600 14px inherit;cursor:pointer;outline:none}.settings-main #default-sort:focus{border-color:#008f8c;box-shadow:0 0 0 3px #b9e8e5}.settings-main .security-card{grid-column:1/-1}.settings-main .security-actions{display:flex;flex-wrap:wrap;gap:10px}.settings-main .security-actions .button{width:auto}.settings-main .danger-button{background:#b42318}@media(max-width:700px){.settings-main .security-actions{display:grid}.settings-main .security-actions .button{width:100%}}'; document.head.append(style);
  const main=document.querySelector('main'), first=document.querySelector('#settings-form'), password=document.querySelector('#password-form'), security=document.querySelector('#delete-account')?.closest('section'); if(!main||!first||!password||!security)return; main.classList.add('settings-main'); const grid=document.createElement('div'); grid.className='settings-grid'; [first,password,security].forEach(item=>item.classList.add('settings-card')); security.classList.add('security-card'); const actions=document.createElement('div'); actions.className='security-actions'; [...security.querySelectorAll('button')].forEach(button=>actions.append(button)); security.append(actions); first.after(grid); grid.append(first,password,security);
}, { once:true });
if (location.pathname === '/configuracoes') document.addEventListener('DOMContentLoaded', async () => {
  const form=document.querySelector('#settings-form'); if(!form)return;
  const response=await fetch('/api/categories',{credentials:'same-origin'}); const {categories=[]}=await response.json();
  const settings=await fetch('/api/me/settings',{credentials:'same-origin'}).then(r=>r.json());
  const block=document.createElement('fieldset'); block.className='settings-category-preferences'; block.innerHTML='<legend>Categorias favoritas</legend><small>Escolha os temas que deseja priorizar.</small><div class="settings-category-list"></div>';
  const list=block.querySelector('.settings-category-list'); categories.forEach(category=>{const label=document.createElement('label');label.className='profile-option';label.innerHTML=`<input type="checkbox" value="${category.id}"> <span>${category.name}</span>`;label.querySelector('input').checked=(settings.settings.favorite_categories||[]).map(Number).includes(Number(category.id));list.append(label);}); form.querySelector('#default-sort').closest('.field').after(block);
  form.addEventListener('submit', async()=>{await fetch('/api/me/settings',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({notificationsEnabled:document.querySelector('#notifications-enabled').checked,profilePublic:document.querySelector('#profile-public').checked,allowComments:document.querySelector('#allow-comments').checked,defaultSort:document.querySelector('#default-sort').value,favoriteCategoryIds:[...list.querySelectorAll('input:checked')].map(input=>Number(input.value))})});});
});
if (location.pathname === '/tutoriais') {
  const tutorialStyle = document.createElement('style');
  tutorialStyle.textContent = '.tutorial-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:24px!important}.tutorial-card{width:100%!important;min-width:0}.tutorial-card video,.tutorial-player{width:100%!important;aspect-ratio:16/9!important;min-height:190px;object-fit:cover}.tutorial-info{padding:18px!important}.tutorial-info h2{font-size:20px!important;margin-bottom:9px!important}.tutorial-info p{font-size:15px!important}.tutorial-author{margin-top:14px} @media(max-width:700px){.tutorial-grid{grid-template-columns:1fr!important}}';
  document.head.append(tutorialStyle);
  document.addEventListener('DOMContentLoaded', () => {
    const list = document.querySelector('#tutorials-list');
    if (!list) return;
    const addFavoriteButtons = () => list.querySelectorAll('.tutorial-card').forEach((card) => {
      if (card.querySelector('.tutorial-favorite')) return;
      const video = card.querySelector('.tutorial-player');
      const id = [...(window.__techCycleTutorialIds || [])].shift();
      if (!id) return;
      card.dataset.ideaId = id;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'button compact tutorial-favorite';
      button.textContent = '☆ Salvar favorito';
      button.style.cssText = 'width:auto;margin-top:14px;padding:9px 12px;font-size:14px;';
      button.onclick = async () => {
        const response = await fetch(`/api/ideas/${card.dataset.ideaId}/favorite`, { method:'POST', credentials:'same-origin' });
        if (response.ok) { button.textContent = '★ Favorito salvo'; button.disabled = true; }
      };
      card.querySelector('.tutorial-info')?.append(button);
    });
    new MutationObserver(addFavoriteButtons).observe(list, { childList:true, subtree:true });
  });
}

if (location.pathname === '/tutoriais') {
  document.addEventListener('DOMContentLoaded', async () => {
    const list = document.querySelector('#tutorials-list');
    if (!list) return;
    const response = await fetch('/api/ideas?type=tutorial&limit=50&sort=recent', { credentials:'same-origin' });
    const data = await response.json().catch(() => ({ ideas:[] }));
    const add = () => list.querySelectorAll('.tutorial-card').forEach((card, index) => {
      if (card.querySelector('.tutorial-favorite')) return;
      const idea = data.ideas?.[index];
      if (!idea) return;
      const button = document.createElement('button'); button.type='button'; button.className='button compact tutorial-favorite'; button.textContent='☆ Salvar favorito'; button.style.cssText='width:auto;margin-top:14px;padding:9px 12px;font-size:14px;';
      button.onclick = async () => { const result = await fetch(`/api/ideas/${idea.id}/favorite`, { method:'POST', credentials:'same-origin' }); if(result.ok){button.textContent='★ Favorito salvo';button.disabled=true;} };
      card.querySelector('.tutorial-info')?.append(button);
    });
    new MutationObserver(add).observe(list, { childList:true, subtree:true }); add();
  });
}

function enhanceFilePickers() {
  if (document.getElementById('techcycle-file-picker-style')) return;
  const style = document.createElement('style');
  style.id = 'techcycle-file-picker-style';
  style.textContent = '.tc-file-picker{display:flex;align-items:center;gap:12px;width:100%;padding:12px;border:1px dashed #9cc9c8;border-radius:12px;background:linear-gradient(135deg,#f7fcfc,#eef8f7);box-sizing:border-box}.tc-file-picker input[type=file]{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.tc-file-picker button{flex:0 0 auto;border:0;border-radius:9px;padding:10px 14px;background:#008f8c;color:#fff;font:700 14px inherit;cursor:pointer}.tc-file-picker button:hover{background:#007875}.tc-file-picker button:focus-visible{outline:3px solid #8bd8d4;outline-offset:2px}.tc-file-picker-text{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#45606d;font-size:14px}.tc-file-picker.has-file{border-style:solid;border-color:#55aaa6;background:#f1fbf9}.tc-file-picker.has-file .tc-file-picker-text{color:#087875;font-weight:700}';
  document.head.append(style);
  document.querySelectorAll('input[type="file"]').forEach((input) => {
    if (input.closest('.tc-file-picker')) return;
    const wrapper = document.createElement('span');
    wrapper.className = 'tc-file-picker';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Escolher arquivo';
    const text = document.createElement('span');
    text.className = 'tc-file-picker-text';
    text.textContent = input.multiple ? 'Nenhum arquivo escolhido' : 'Nenhum arquivo escolhido';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.append(button, text, input);
    button.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); input.click(); });
    input.addEventListener('change', () => {
      const files = [...input.files];
      text.textContent = files.length ? files.map((file) => file.name).join(', ') : 'Nenhum arquivo escolhido';
      wrapper.classList.toggle('has-file', files.length > 0);
    });
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhanceFilePickers, { once: true });
else enhanceFilePickers();

function enhanceCategorySelects() {
  if (document.getElementById('techcycle-category-style')) return;
  const style = document.createElement('style');
  style.id = 'techcycle-category-style';
  style.textContent = '.tc-category-select{position:relative;width:100%}.tc-category-select::after{content:"⌄";position:absolute;right:15px;top:50%;transform:translateY(-55%);pointer-events:none;color:#087875;font-size:20px;font-weight:700}.tc-category-select select{width:100%;appearance:none;border:1px solid #b9d8dc;border-radius:11px;padding:12px 42px 12px 14px;background:linear-gradient(135deg,#fff,#f5fbfb);color:var(--ink);font:600 14px inherit;cursor:pointer;outline:none}.tc-category-select select:hover{border-color:#67b4b0}.tc-category-select select:focus{border-color:#008f8c;box-shadow:0 0 0 3px #b9e8e5}.tc-category-select select:invalid{color:#607d8b}';
  document.head.append(style);
  document.querySelectorAll('select#idea-category, select#tutorial-category').forEach((select) => {
    if (select.closest('.tc-category-select')) return;
    const wrapper = document.createElement('span');
    wrapper.className = 'tc-category-select';
    select.parentNode.insertBefore(wrapper, select);
    wrapper.append(select);
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhanceCategorySelects, { once: true });
else enhanceCategorySelects();

function enhancePasswordFields() {
  const style = document.createElement('style');
  style.textContent = '.logout:hover{background:#d4eeee;color:var(--brand-dark)}.tc-password-field{position:relative;display:block}.tc-password-field input{padding-right:48px}.tc-password-toggle{position:absolute;right:9px;top:50%;transform:translateY(-50%);border:0;background:transparent;color:#087875;padding:7px;cursor:pointer;font-size:17px;line-height:1}.tc-password-toggle:hover{color:#005f5d}.tc-password-toggle:focus-visible{outline:2px solid #008f8c;border-radius:6px}';
  document.head.append(style);
  document.querySelectorAll('input[type="password"]').forEach((input) => {
    if (input.closest('.tc-password-field')) return;
    const wrapper = document.createElement('span');
    wrapper.className = 'tc-password-field';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.append(input);
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'tc-password-toggle';
    toggle.setAttribute('aria-label', 'Mostrar senha');
    toggle.textContent = '◉';
    toggle.addEventListener('click', () => {
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      toggle.textContent = visible ? '◉' : '◌';
      toggle.setAttribute('aria-label', visible ? 'Mostrar senha' : 'Ocultar senha');
    });
    wrapper.append(toggle);
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhancePasswordFields, { once: true });
else enhancePasswordFields();

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
