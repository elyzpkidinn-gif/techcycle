const loadFavorites = async () => {
  const main = document.querySelector('main');
  const style = document.createElement('style');
  style.textContent = '#favorites-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;max-width:100%;align-items:start}#favorites-list .idea-card{overflow:hidden;padding:0;margin:0;min-width:0}#favorites-list .idea-image,#favorites-list .idea-video{display:block;width:100%;height:250px;max-height:250px;object-fit:contain;margin:0;border-radius:0;background:#fff}#favorites-list h2{margin:15px 16px 10px;font-size:19px}#favorites-list .idea-description,#favorites-list .tags,#favorites-list .idea-stats{display:none}#favorites-list .button{display:inline-flex;align-items:center;width:auto;margin:10px 16px 16px;padding:7px 11px;font-size:13px;line-height:1.1;white-space:nowrap}#favorites-list .favorite-video-wrap{position:relative}#favorites-list .favorite-fullscreen{position:absolute!important;right:12px;bottom:12px;margin:0!important;width:36px!important;height:36px;padding:0!important;border-radius:9px!important;font-size:0;display:grid!important;place-items:center}#favorites-list .favorite-fullscreen::before{content:"⛶";font-size:21px}#favorites-list .empty-card{grid-column:1/-1}@media(max-width:700px){#favorites-list{grid-template-columns:1fr}}';
  document.head.append(style);
  const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  try {
    const response = await fetch('/api/favorites', { credentials: 'same-origin' });
    const { ideas = [] } = await response.json();
    const section = document.createElement('section');
    section.id = 'favorites-list';
    section.innerHTML = ideas.length ? ideas.map((idea) => `<article class="post idea-card"><h2><a href="/ideia/${idea.id}">${esc(idea.title)}</a></h2>${idea.image_data ? `<img class="idea-image" src="${idea.image_data}" alt="Imagem da ideia">` : ''}${idea.video_data ? `<video class="idea-video" src="${idea.video_data}" controls preload="metadata"></video>` : ''}<p class="idea-description">${esc(idea.content)}</p><div class="idea-stats"><span>★ ${Number(idea.average_rating).toFixed(1)} (${idea.rating_count})</span><span>◌ ${idea.comment_count} comentários</span></div><a class="button compact" href="/ideia/${idea.id}">Ver ideia</a></article>`).join('') : '<section class="empty-card"><div style="font-size:35px">♡</div><h3>Nenhum favorito ainda</h3><p>Quando encontrar algo inspirador, salve aqui para ler depois.</p><p><a href="/comunidade">Explorar a comunidade</a></p></section>';
    main.querySelector('.empty-card')?.remove();
    main.append(section);
    section.querySelectorAll('.idea-video').forEach((video) => {
      const fullscreen = document.createElement('button');
      fullscreen.type = 'button';
      fullscreen.className = 'favorite-fullscreen';
      fullscreen.textContent = '⛶ Tela cheia';
      fullscreen.style.cssText = 'border:0;background:#008f8c;color:#fff;font-weight:700;cursor:pointer;';
      fullscreen.addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (video.requestFullscreen) video.requestFullscreen();
      });
      const wrapper = document.createElement('span');
      wrapper.className = 'favorite-video-wrap';
      video.parentNode.insertBefore(wrapper, video);
      wrapper.append(video, fullscreen);
    });
  } catch (_) {}
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadFavorites, { once: true });
else loadFavorites();
