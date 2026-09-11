(() => {
  const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  const request = async (url, options = {}) => { const response = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options }); const data = response.status === 204 ? null : await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a solicitação.'); return data; };
  let page = 1, pages = 1, knownTotal = 0, searchTimer;
  const list = document.querySelector('#ideas-list'), message = document.querySelector('#feed-message'), more = document.querySelector('#load-more');
  const initials = (name) => esc(name).slice(0, 2).toUpperCase();
  const avatar = (image, name) => `<span class="avatar">${image ? `<img src="${image}" alt="Foto de ${esc(name)}">` : initials(name)}</span>`;
  const card = (idea) => `<article class="post idea-card"><div class="post-meta">${avatar(idea.author_profile_image, idea.author_name)}<div><strong>${esc(idea.author_name)}</strong><small>${new Date(idea.created_at).toLocaleDateString('pt-BR')} · ${esc(idea.category_name || 'Sem categoria')}</small></div></div><h2><a href="/ideia/${idea.id}">${esc(idea.title)}</a></h2>${idea.image_data ? `<img class="idea-image" src="${idea.image_data}" alt="Imagem da ideia: ${esc(idea.title)}">` : ''}<p class="idea-description">${esc(idea.content)}</p><div class="tags">${(idea.tags || []).map((tag) => `<span class="tag">#${esc(tag)}</span>`).join('')}</div><div class="idea-stats"><span class="rating">★ ${Number(idea.average_rating).toFixed(1)} (${idea.rating_count})</span><span>◌ ${idea.comment_count} comentários</span></div><a class="button compact" href="/ideia/${idea.id}">Ver ideia</a></article>`;
  function setLoadButton({ loading = false, finished = false } = {}) {
    more.hidden = finished;
    more.disabled = loading;
    more.textContent = loading ? 'Carregando…' : 'Carregar mais';
  }
  async function load(reset = false) {
    if (reset) { page = 1; knownTotal = 0; list.innerHTML = ''; }
    message.textContent = reset ? 'Carregando ideias…' : '';
    setLoadButton({ loading: true });
    try {
      const params = new URLSearchParams({ page, limit: 10, sort: document.querySelector('#idea-sort').value, category: document.querySelector('#idea-category').value, search: document.querySelector('#idea-search').value.trim() });
      const data = await request(`/api/ideas?${params}`); pages = data.pages;
      if (!reset && data.ideas.length === 0 && data.total > knownTotal) {
        message.textContent = 'Novas publicações foram encontradas. O feed foi atualizado.';
        return load(true);
      }
      knownTotal = data.total;
      message.textContent = data.ideas.length || page > 1 ? '' : 'Ainda não existem ideias publicadas. Seja o primeiro a compartilhar uma!';
      list.insertAdjacentHTML('beforeend', data.ideas.map(card).join(''));
      const finished = page >= pages || data.ideas.length === 0;
      setLoadButton({ finished });
      if (finished && data.total > 0) message.textContent = 'Não há mais publicações para os filtros selecionados.';
    } catch (error) {
      message.textContent = 'Não foi possível carregar mais publicações. Verifique sua conexão e tente novamente.';
      setLoadButton();
    }
  }
  document.addEventListener('DOMContentLoaded', async () => {
    try { const { user } = await TechCycleAuth.session(); document.querySelectorAll('[data-user-name]').forEach((el) => el.textContent = user.username); const logout = document.querySelector('[data-logout]'); logout.hidden = false; logout.addEventListener('click', async () => { await TechCycleAuth.logout(); location.assign('/login'); }); } catch (_) {}
    try { const { categories } = await request('/api/categories'); document.querySelector('#idea-category').insertAdjacentHTML('beforeend', categories.map((c) => `<option value="${esc(c.slug)}">${esc(c.name)}</option>`).join('')); } catch (_) {}
    document.querySelector('#idea-search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => load(true), 300); });
    document.querySelector('#idea-category').addEventListener('change', () => load(true)); document.querySelector('#idea-sort').addEventListener('change', () => load(true));
    more.addEventListener('click', () => { if (page >= pages) { message.textContent = 'Não há mais publicações para os filtros selecionados.'; setLoadButton({ finished: true }); return; } page += 1; load(); }); load(true);
  });
})();
