const API_BASE = 'https://anyama-proxy-api.onrender.com';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let deferredInstallPrompt;

function escapeHTML(value = '') { return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char])); }
function phoneLink(value) { return `tel:${String(value || '').replace(/[^+\d]/g, '')}`; }
function renderCard(artisan) { return `<article class="artisan-card"><div class="card-top"><span class="avatar">${escapeHTML(artisan.name.slice(0, 1))}</span><span class="status"><i data-lucide="circle-check"></i> Disponible</span></div><p class="category-label">${escapeHTML(artisan.category)}</p><h3>${escapeHTML(artisan.name)}</h3><p class="service">${escapeHTML(artisan.service || 'Service local à Anyama')}</p><p class="location"><i data-lucide="map-pin"></i>Anyama</p><p class="description">${escapeHTML(artisan.description || 'Artisan local disponible pour vos besoins à Anyama.')}</p><div class="card-actions"><a class="morph-button tiny" href="${phoneLink(artisan.phone)}"><span>Appeler</span><i data-lucide="phone"></i></a>${artisan.whatsapp_url ? `<a class="circle-action" href="${artisan.whatsapp_url}" target="_blank" rel="noopener" aria-label="WhatsApp ${escapeHTML(artisan.name)}"><i data-lucide="message-circle"></i></a>` : ''}</div></article>`; }
function setState(type, message = '') { const state = $('#state'); state.className = `state ${type}`; state.innerHTML = message; }
async function loadMeta() { const response = await fetch(`${API_BASE}/api/meta`); const data = await response.json(); const options = data.categories || []; $$('select[name="category"]').forEach(select => { options.forEach(item => { const option = document.createElement('option'); option.value = item; option.textContent = item; select.append(option); }); if (select.id === 'category-select') { const other = document.createElement('option'); other.value = '__other__'; other.textContent = 'Autre métier…'; select.append(other); } }); }
async function loadArtisans(params = new URLSearchParams()) { setState('loading', '<span class="loader"></span> Recherche des artisans…'); try { const response = await fetch(`${API_BASE}/api/artisans?${params}`); if (!response.ok) throw new Error('API'); const payload = await response.json(); $('#count-artisans').textContent = payload.meta.total; if (!payload.data.length) { $('#artisan-grid').innerHTML = ''; setState('empty', '<i data-lucide="search-x"></i><h3>Aucun artisan trouvé</h3><p>Essayez un autre métier.</p>'); } else { $('#artisan-grid').innerHTML = payload.data.map(renderCard).join(''); setState('', ''); } lucide.createIcons(); } catch { setState('error', '<i data-lucide="wifi-off"></i><h3>Le service se réveille…</h3><p>Render peut prendre quelques secondes au premier chargement. Réessayez.</p><button class="morph-button outline" id="retry"><span>Réessayer</span><i data-lucide="refresh-cw"></i></button>'); $('#retry')?.addEventListener('click', () => loadArtisans(params)); lucide.createIcons(); } }
function updateSubmitState() { const form = $('#registration-form'); const required = ['first_name','last_name','category'].every(name => form.elements[name].value.trim()); const categoryReady = form.elements.category.value !== '__other__' || form.elements.category_custom.value.trim(); const contact = form.elements.phone.value.trim() || form.elements.whatsapp.value.trim(); const ready = required && categoryReady && contact && form.elements.consent.checked; $('.submit', form).disabled = !ready; }
async function submitRegistration(event) { event.preventDefault(); const form = event.currentTarget; const feedback = $('#form-feedback'); const data = Object.fromEntries(new FormData(form).entries()); if (data.category === '__other__') data.category = data.category_custom.trim(); data.consent = form.elements.consent.checked ? 'on' : ''; delete data.category_custom; feedback.className = 'form-feedback loading'; feedback.textContent = 'Enregistrement en cours…'; try { const response = await fetch(`${API_BASE}/api/artisans`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Erreur'); feedback.className = 'form-feedback success'; feedback.textContent = 'Merci ! Votre inscription est reçue et sera vérifiée avant publication.'; form.reset(); $('#custom-category-wrap').hidden = true; updateSubmitState(); } catch (error) { feedback.className = 'form-feedback error'; feedback.textContent = error.message || 'Impossible d’envoyer le formulaire.'; } }
function initTheme() { const saved = localStorage.getItem('anyama-theme') || 'light'; document.documentElement.dataset.theme = saved; $('.theme-toggle').addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'; document.documentElement.dataset.theme = next; localStorage.setItem('anyama-theme', next); $('.theme-toggle').innerHTML = `<i data-lucide="${next === 'light' ? 'sun' : 'moon'}"></i>`; lucide.createIcons(); }); }
function initPWA() { window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstallPrompt = event; $('#install-button').hidden = false; }); $('#install-button').addEventListener('click', async () => { if (!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt = null; $('#install-button').hidden = true; }); if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {}); }
$('#search-form').addEventListener('submit', event => { event.preventDefault(); const params = new URLSearchParams(new FormData(event.currentTarget)); loadArtisans(params); document.querySelector('#annuaire').scrollIntoView({behavior: 'smooth'}); });
$('#registration-form').addEventListener('submit', submitRegistration); $$('#registration-form input, #registration-form select').forEach(input => input.addEventListener('input', updateSubmitState));
$('#category-select').addEventListener('change', event => { $('#custom-category-wrap').hidden = event.target.value !== '__other__'; updateSubmitState(); });
$$('[data-scroll]').forEach(button => button.addEventListener('click', () => $(button.dataset.scroll).scrollIntoView({behavior:'smooth'})));
document.querySelectorAll('.morph-panel').forEach(panel => {
  panel.addEventListener('toggle', () => {
    if (!panel.open) return;
    document.querySelectorAll('.morph-panel').forEach(other => {
      if (other !== panel) other.removeAttribute('open');
    });
  });
});

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

$('#year').textContent = new Date().getFullYear(); initTheme(); initPWA(); lucide.createIcons(); Promise.all([loadMeta(), loadArtisans()]);
