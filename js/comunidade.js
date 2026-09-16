(() => {
  const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); const request=async(url,options={})=>{const r=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});const d=r.status===204?null:await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Não foi possível concluir.');return d;}; let page=1,pages=1,isAdmin=false;
  const card=idea=>`<article class="post idea-card"><h2><a href="/ideia/${idea.id}">${esc(idea.title)}</a></h2>${idea.image_data?`<img class="idea-image" src="${idea.image_data}" alt="Imagem da ideia">`:''}${idea.video_data?`<video class="idea-video" src="${idea.video_data}" controls preload="metadata"></video>`:''}<p class="idea-description">${esc(idea.content)}</p><div class="tags">${(idea.tags||[]).map(t=>`<span class="tag">#${esc(t)}</span>`).join('')}</div><div class="idea-stats"><span>★ ${Number(idea.average_rating).toFixed(1)} (${idea.rating_count})</span><span>◌ ${idea.comment_count} comentários</span></div><a class="button compact" href="/ideia/${idea.id}">Ver ideia</a>${isAdmin?`<button class="button danger-button" data-delete-idea="${idea.id}" type="button">Remover publicação</button>`:''}</article>`;
  async function load(reset=true){const list=document.querySelector('#ideas-list'),message=document.querySelector('#feed-message'),more=document.querySelector('#load-more');if(reset){page=1;list.innerHTML='';}message.textContent='Carregando ideias...';const params=new URLSearchParams({page,limit:10,sort:document.querySelector('#idea-sort').value,category:document.querySelector('#idea-category').value,search:document.querySelector('#idea-search').value.trim()});try{const data=await request(`/api/ideas?${params}`);pages=data.pages;list.insertAdjacentHTML('beforeend',data.ideas.map(card).join(''));message.textContent=data.ideas.length?'':(page>1?'Não há conteúdo recente.':'Nenhuma ideia encontrada para estes filtros.');more.hidden=page>=pages||!data.ideas.length;if(page>1&&!data.ideas.length)window.scrollTo({top:0,behavior:'smooth'});}catch(error){message.textContent=error.message;more.hidden=true;}}
  const askRemove=()=>new Promise(resolve=>{const modal=document.createElement('div');modal.className='modal-backdrop';modal.innerHTML='<section class="modal-card" role="dialog" aria-modal="true"><h2>Remover publicação?</h2><p>Esta publicação será ocultada da comunidade.</p><div class="modal-actions"><button class="button modal-cancel" type="button">Cancelar</button><button class="button modal-danger" type="button">Remover publicação</button></div></section>';document.body.append(modal);const close=value=>{modal.remove();resolve(value);};modal.querySelector('.modal-cancel').onclick=()=>close(false);modal.querySelector('.modal-danger').onclick=()=>close(true);});
  document.addEventListener('DOMContentLoaded',async()=>{try{const{user}=await TechCycleAuth.session();isAdmin=user.role==='admin';document.querySelectorAll('[data-user-name]').forEach(e=>e.textContent=user.username);const logout=document.querySelector('[data-logout]');logout.hidden=false;logout.addEventListener('click',async()=>{await TechCycleAuth.logout();location.assign('/login');});const{categories}=await request('/api/categories');document.querySelector('#idea-category').insertAdjacentHTML('beforeend',categories.map(c=>`<option value="${esc(c.slug)}">${esc(c.name)}</option>`).join(''));}catch(_){}document.querySelector('#idea-search').addEventListener('input',()=>load(true));document.querySelector('#idea-category').addEventListener('change',()=>load(true));document.querySelector('#idea-sort').addEventListener('change',()=>load(true));document.querySelector('#load-more').addEventListener('click',()=>{if(page<pages){page++;load(false);}else{document.querySelector('#feed-message').textContent='Não há conteúdo recente.';window.scrollTo({top:0,behavior:'smooth'});}});document.querySelector('#ideas-list').addEventListener('click',async e=>{const button=e.target.closest('[data-delete-idea]');if(!button)return;if(!await askRemove())return;try{await request(`/api/admin/ideas/${button.dataset.deleteIdea}`,{method:'DELETE'});button.closest('.idea-card').remove();}catch(error){alert(error.message);}});load(true);});
})();
document.addEventListener('DOMContentLoaded', () => {
  const list = document.querySelector('#ideas-list');
  if (!list) return;
  const decorate = () => list.querySelectorAll('.idea-card').forEach((card) => {
    card.querySelectorAll('.button').forEach((button) => { button.style.display = 'inline-flex'; button.style.width = 'auto'; button.style.margin = '0'; });
    const existingFavorite = card.querySelector('.favorite-button');
    const existingActions = card.querySelector('.community-actions');
    if (existingFavorite && existingActions) {
      const lateLike = card.querySelector('.like-button');
      if (lateLike && lateLike.parentElement !== existingActions) existingActions.prepend(lateLike);
      existingActions.style.flexWrap = 'nowrap';
      existingActions.querySelectorAll('.button').forEach((item) => { item.style.padding = '9px 12px'; item.style.fontSize = '14px'; });
      return;
    }
    if (existingFavorite) return;
    const link = card.querySelector('a[href^="/ideia/"]');
    if (!link) return;
    const button = document.createElement('button');
    button.className = 'button compact favorite-button';
    button.textContent = '☆ Salvar favorito';
    button.style.margin = '6px 6px 0 0';
    button.dataset.favorite = link.href.split('/').pop();
    card.querySelector('.idea-stats')?.after(button);
    const actions = document.createElement('div');
    actions.className = 'community-actions';
    actions.style.cssText = 'display:flex;flex-wrap:nowrap;gap:9px;margin-top:12px;';
    const view = card.querySelector('a.button[href^="/ideia/"]');
    const like = card.querySelector('.like-button');
    if (like) actions.append(like);
    actions.append(button);
    if (view) actions.append(view);
    card.querySelector('.idea-stats')?.after(actions);
    actions.querySelectorAll('.button').forEach((item) => { item.style.padding = '9px 12px'; item.style.fontSize = '14px'; });
  });
  new MutationObserver(decorate).observe(list, { childList: true, subtree: true });
  decorate();
  list.addEventListener('click', async (event) => {
    const button = event.target.closest('.favorite-button');
    if (!button) return;
    const response = await fetch(`/api/ideas/${button.dataset.favorite}/favorite`, { method: 'POST', credentials: 'same-origin' });
    const data = await response.json().catch(() => ({}));
    if (response.ok) { button.textContent = '★ Favorito salvo'; button.disabled = true; }
    else button.textContent = data.error || 'Erro';
  });
});
document.addEventListener('DOMContentLoaded',()=>{const list=document.querySelector('#ideas-list');if(!list)return;const decorate=()=>list.querySelectorAll('.idea-card').forEach(card=>{if(card.querySelector('.like-button'))return;const link=card.querySelector('a[href^="/ideia/"]');if(!link)return;const button=document.createElement('button');button.className='button compact like-button';button.textContent='♡ Curtir';button.dataset.like=link.href.split('/').pop();card.querySelector('.idea-stats')?.after(button);});new MutationObserver(decorate).observe(list,{childList:true});decorate();list.addEventListener('click',async e=>{const b=e.target.closest('.like-button');if(!b)return;const r=await fetch(`/api/ideas/${b.dataset.like}/like`,{method:'POST',credentials:'same-origin'}),d=await r.json();if(r.ok){b.textContent=`♥ ${d.likes} curtidas`;b.disabled=true;}else b.textContent=d.error||'Erro';});});
