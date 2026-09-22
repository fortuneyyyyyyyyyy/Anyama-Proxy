const API_BASE = '';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let deferredInstallPrompt;
let artisansCache = [];
let artisansPage = 1;
let artisanRetryTimer;

function escapeHTML(value = '') { return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char])); }
function phoneLink(value) { return `tel:${String(value || '').replace(/[^+\d]/g, '')}`; }
function renderCard(artisan) { const phoneAction = artisan.phone ? `<a class="morph-button tiny" href="${phoneLink(artisan.phone)}"><span>Appeler</span><i data-lucide="phone"></i></a>` : ''; const whatsappAction = artisan.whatsapp_url ? `<a class="circle-action" href="${artisan.whatsapp_url}" target="_blank" rel="noopener" aria-label="WhatsApp ${escapeHTML(artisan.name)}"><i data-lucide="message-circle"></i></a>` : ''; return `<article class="artisan-card"><div class="card-top"><span class="avatar">${escapeHTML(artisan.name.slice(0, 1))}</span><span class="status"><i data-lucide="circle-check"></i> Disponible</span></div><p class="category-label">${escapeHTML(artisan.category)}</p><h3>${escapeHTML(artisan.name)}</h3><p class="service">${escapeHTML(artisan.service || 'Service local')}</p><p class="location"><i data-lucide="map-pin"></i>${escapeHTML(artisan.zone || 'Quartier non renseigné')}</p><p class="description">${escapeHTML(artisan.description || 'Artisan local disponible pour vos besoins.')}</p><div class="card-actions">${phoneAction}${whatsappAction}</div></article>`; }
function pageSize() { return window.matchMedia('(max-width: 700px)').matches ? 6 : 10; }
function renderPagination() { const mount = $('#pagination'); if (!mount) return; const totalPages = Math.ceil(artisansCache.length / pageSize()); if (totalPages <= 1) { mount.innerHTML = ''; return; } const safePage = Math.min(artisansPage, totalPages); artisansPage = safePage; const start = (safePage - 1) * pageSize(); $('#artisan-grid').innerHTML = artisansCache.slice(start, start + pageSize()).map(renderCard).join(''); mount.innerHTML = `<button class="pagination-button" type="button" data-page="${safePage - 1}" ${safePage === 1 ? 'disabled' : ''} aria-label="Page précédente">←</button>${Array.from({length: totalPages}, (_, index) => { const page = index + 1; return `<button class="pagination-button ${page === safePage ? 'is-active' : ''}" type="button" data-page="${page}" aria-label="Page ${page}" ${page === safePage ? 'aria-current="page"' : ''}>${page}</button>`; }).join('')}<button class="pagination-button" type="button" data-page="${safePage + 1}" ${safePage === totalPages ? 'disabled' : ''} aria-label="Page suivante">→</button>`; mount.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => { if (button.disabled) return; artisansPage = Number(button.dataset.page); renderPagination(); $('#annuaire').scrollIntoView({behavior: 'smooth', block: 'start'}); lucide.createIcons(); })); lucide.createIcons(); }
function renderArtisans() { const start = (artisansPage - 1) * pageSize(); $('#artisan-grid').innerHTML = artisansCache.slice(start, start + pageSize()).map(renderCard).join(''); renderPagination(); }
function setState(type, message = '') { const state = $('#state'); state.className = `state ${type}`; state.innerHTML = message; }
function renderSkeletons(count = (window.matchMedia('(max-width: 700px)').matches ? 6 : 10)) { $('#artisan-grid').innerHTML = Array.from({length: count}, () => `<article class="artisan-card artisan-card-skeleton" aria-hidden="true"><div class="skeleton-row"><span class="skeleton skeleton-avatar"></span><span class="skeleton skeleton-status"></span></div><span class="skeleton skeleton-category"></span><span class="skeleton skeleton-title"></span><span class="skeleton skeleton-service"></span><span class="skeleton skeleton-location"></span><span class="skeleton skeleton-description"></span><span class="skeleton skeleton-description short"></span><span class="skeleton skeleton-button"></span></article>`).join(''); }
function retryArtisans(params) { clearTimeout(artisanRetryTimer); artisanRetryTimer = window.setTimeout(() => loadArtisans(params), 5000); }
async function loadMeta() { const response = await fetch(`${API_BASE}/api/meta`); const data = await response.json(); const options = data.categories || []; $$('select[name="category"]').forEach(select => { options.forEach(item => { const option = document.createElement('option'); option.value = item; option.textContent = item; select.append(option); }); if (select.id === 'category-select') { const other = document.createElement('option'); other.value = '__other__'; other.textContent = 'Autre métier…'; select.append(other); } }); const zoneSelect = $('#zone-select'); (data.zones || []).forEach(item => { const option = document.createElement('option'); option.value = item; option.textContent = item; zoneSelect?.append(option); }); if (zoneSelect) { const otherZone = document.createElement('option'); otherZone.value = '__other__'; otherZone.textContent = 'Autre quartier…'; zoneSelect.append(otherZone); } }
async function loadArtisans(params = new URLSearchParams()) { renderSkeletons(); setState('', ''); try { const response = await fetch(`${API_BASE}/api/artisans?${params}`, { cache: 'no-store' }); if (!response.ok) throw new Error('API'); const payload = await response.json(); $('#count-artisans').textContent = payload.meta.total; if (!payload.data.length) { artisansCache = []; $('#artisan-grid').innerHTML = ''; $('#pagination').innerHTML = ''; setState('empty', '<i data-lucide="search-x"></i><h3>Aucun artisan trouvé</h3><p>Essayez un autre métier.</p>'); } else { artisansCache = payload.data; artisansPage = 1; renderArtisans(); setState('', ''); } lucide.createIcons(); } catch { artisansCache = []; $('#pagination').innerHTML = ''; setState('', ''); renderSkeletons(); retryArtisans(params); } }
function updateSubmitState() { const form = $('#registration-form'); if (!form) return; const required = ['first_name','last_name','category','zone'].every(name => form.elements[name].value.trim()); const zoneReady = form.elements.zone.value !== '__other__' || form.elements.zone_custom.value.trim(); const categoryReady = form.elements.category.value !== '__other__' || form.elements.category_custom.value.trim(); const phone = form.elements.phone.value.trim(); const whatsapp = form.elements.whatsapp.value.trim(); const contact = phone || whatsapp; const contactsHavePrefix = [phone, whatsapp].filter(Boolean).every(value => value.replace(/\s/g, '').startsWith('+225')); const ready = required && zoneReady && categoryReady && contact && contactsHavePrefix && form.elements.consent.checked; $('.submit', form).disabled = !ready; }
function updateRemovalSubmitState() { const form = $('#removal-form'); if (!form) return; const ready = ['requester_name','requester_phone','artisan_name'].every(name => form.elements[name]?.value.trim()); const submitBtn = $('.submit', form); if (submitBtn) submitBtn.disabled = !ready; }
async function submitRemoval(event) { event.preventDefault(); const form = event.currentTarget; const feedback = $('#removal-feedback'); const data = Object.fromEntries(new FormData(form).entries()); feedback.className = 'form-feedback loading'; feedback.textContent = 'Envoi de la demande…'; try { const response = await fetch(`${API_BASE}/api/removal-requests`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Erreur'); feedback.className = 'form-feedback success'; feedback.textContent = 'Votre demande a été envoyée. Elle sera vérifiée par l’administrateur.'; form.reset(); updateRemovalSubmitState(); } catch (error) { feedback.className = 'form-feedback error'; feedback.textContent = error.message || 'Impossible d’envoyer la demande.'; } }
async function submitRegistration(event) { event.preventDefault(); const form = event.currentTarget; const feedback = $('#form-feedback'); const data = Object.fromEntries(new FormData(form).entries()); if (data.category === '__other__') data.category = data.category_custom.trim(); if (data.zone === '__other__') data.zone = data.zone_custom.trim(); data.consent = form.elements.consent.checked ? 'on' : ''; delete data.category_custom; delete data.zone_custom; feedback.className = 'form-feedback loading'; feedback.textContent = 'Enregistrement en cours…'; try { const response = await fetch(`${API_BASE}/api/artisans`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Erreur'); feedback.className = 'form-feedback success'; feedback.textContent = 'Merci ! Votre inscription a été envoyée. Elle sera visible après validation par l’administrateur.'; form.reset(); $('#custom-category-wrap').hidden = true; $('#custom-zone-wrap').hidden = true; updateSubmitState(); } catch (error) { feedback.className = 'form-feedback error'; feedback.textContent = error.message || 'Impossible d’envoyer le formulaire.'; } }
function initMobileMenu() {
  const header = $('.site-header');
  const toggle = $('.mobile-menu-toggle');
  const nav = $('#site-navigation');
  if (!header || !toggle || !nav) return;
  const close = () => {
    header.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Ouvrir le menu');
    toggle.innerHTML = '<i data-lucide="menu"></i>';
    lucide.createIcons();
  };
  toggle.addEventListener('click', () => {
    const open = !header.classList.contains('nav-open');
    if (open) {
      header.classList.add('nav-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Fermer le menu');
      toggle.innerHTML = '<i data-lucide="x"></i>';
      lucide.createIcons();
    } else close();
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
  document.addEventListener('pointerdown', event => {
    if (!header.contains(event.target)) close();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 700) close();
  });
}

function initTheme() { const saved = localStorage.getItem('anyama-theme') || 'light'; document.documentElement.dataset.theme = saved; $('.theme-toggle')?.addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'; document.documentElement.dataset.theme = next; localStorage.setItem('anyama-theme', next); $('.theme-toggle').innerHTML = `<i data-lucide="${next === 'light' ? 'sun' : 'moon'}"></i>`; lucide.createIcons(); }); }
function initPWA() { window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstallPrompt = event; if ($('#install-button')) $('#install-button').hidden = false; }); $('#install-button')?.addEventListener('click', async () => { if (!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt = null; $('#install-button').hidden = true; }); if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {}); }
$('#search-form')?.addEventListener('submit', event => { event.preventDefault(); const params = new URLSearchParams(new FormData(event.currentTarget)); loadArtisans(params); document.querySelector('#annuaire').scrollIntoView({behavior: 'smooth'}); });
$('#registration-form')?.addEventListener('submit', submitRegistration); $('#removal-form')?.addEventListener('submit', submitRemoval);
$$('#registration-form input, #registration-form select').forEach(input => input.addEventListener('input', updateSubmitState));
$$('#removal-form input, #removal-form textarea').forEach(input => input.addEventListener('input', updateRemovalSubmitState));
updateRemovalSubmitState();
$('#category-select')?.addEventListener('change', event => { $('#custom-category-wrap').hidden = event.target.value !== '__other__'; updateSubmitState(); }); $('#zone-select')?.addEventListener('change', event => { $('#custom-zone-wrap').hidden = event.target.value !== '__other__'; updateSubmitState(); });

$$('[data-scroll]').forEach(button => button.addEventListener('click', () => $(button.dataset.scroll).scrollIntoView({behavior:'smooth'})));
window.addEventListener('resize', () => { if (artisansCache.length) { const totalPages = Math.ceil(artisansCache.length / pageSize()); if (artisansPage > totalPages) artisansPage = totalPages; renderArtisans(); } });
document.querySelectorAll('.morph-panel').forEach(panel => {
  panel.addEventListener('toggle', () => {
    if (!panel.open) return;
    document.querySelectorAll('.morph-panel').forEach(other => {
      if (other !== panel) other.removeAttribute('open');
    });
  });
});

document.addEventListener('pointerdown', event => {
  if (event.target.closest('.morph-panel')) return;
  document.querySelectorAll('.morph-panel[open]').forEach(panel => panel.removeAttribute('open'));
});


function initSpringMorphButtons() {
  const stiffness = 0.18;
  const friction = 0.65;
  const buttons = $$('.morph-button');
  const states = buttons.map(button => ({
    button,
    currentX: 0, currentY: 0, currentScale: 1,
    targetX: 0, targetY: 0, targetScale: 1,
    vxX: 0, vxY: 0, vxScale: 0
  }));
  if (!states.length) return;
  const pointerFine = window.matchMedia('(pointer: fine)').matches;
  states.forEach(state => {
    if (!pointerFine) return;
    state.button.addEventListener('mousemove', event => {
      const rect = state.button.getBoundingClientRect();
      state.targetX = (event.clientX - (rect.left + rect.width / 2)) * 0.08;
      state.targetY = (event.clientY - (rect.top + rect.height / 2)) * 0.08;
      state.targetScale = 1.025;
    });
    state.button.addEventListener('mouseleave', () => {
      state.targetX = 0; state.targetY = 0; state.targetScale = 1;
    });
    state.button.addEventListener('focus', () => { state.targetScale = 1.025; });
    state.button.addEventListener('blur', () => { state.targetScale = 1; });
  });
  const tick = () => {
    states.forEach(state => {
      state.vxX += (state.targetX - state.currentX) * stiffness; state.vxX *= friction; state.currentX += state.vxX;
      state.vxY += (state.targetY - state.currentY) * stiffness; state.vxY *= friction; state.currentY += state.vxY;
      state.vxScale += (state.targetScale - state.currentScale) * stiffness; state.vxScale *= friction; state.currentScale += state.vxScale;
      state.button.style.setProperty('--morph-x', `${state.currentX.toFixed(2)}px`);
      state.button.style.setProperty('--morph-y', `${state.currentY.toFixed(2)}px`);
      state.button.style.setProperty('--morph-scale', state.currentScale.toFixed(4));
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const studioCard = document.querySelector('.footer-hover-credit');
const studioLink = document.querySelector('.footer-studio-link');
if (studioCard && studioLink) {
  const reveal = () => studioCard.classList.add('is-visible');
  const hide = () => studioCard.classList.remove('is-visible');
  studioLink.addEventListener('mouseenter', reveal);
  studioLink.addEventListener('focus', reveal);
  studioLink.addEventListener('mouseleave', hide);
  studioLink.addEventListener('blur', hide);
  studioLink.addEventListener('pointerdown', reveal);
  studioLink.addEventListener('pointerup', hide);
  studioLink.addEventListener('pointerleave', hide);
}

$('#year') && ($('#year').textContent = new Date().getFullYear()); initMobileMenu(); initTheme(); initPWA(); lucide.createIcons(); if ($('#artisan-grid')) Promise.all([loadMeta(), loadArtisans()]);
