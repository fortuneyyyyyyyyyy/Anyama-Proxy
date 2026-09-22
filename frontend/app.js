const API_BASE = '';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
let deferredInstallPrompt;
let artisansCache = [];
let artisansPage = 1;
let artisanRetryTimer;

function escapeHTML(value = '') { return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char])); }
function phoneLink(value) { return `tel:${String(value || '').replace(/[^+\d]/g, '')}`; }
function renderCard(artisan) { return `<article class="artisan-card profile-card" data-artisan-id="${artisan.id}" tabindex="0" role="button" aria-label="Voir le profil de ${escapeHTML(artisan.name)}"><div class="card-top"><span class="avatar">${escapeHTML(artisan.name.slice(0, 1))}</span><span class="status"><i data-lucide="circle-check"></i> Disponible</span></div><p class="category-label">${escapeHTML(artisan.category)}</p><h3>${escapeHTML(artisan.name)}</h3><p class="service">${escapeHTML(artisan.service || 'Service local')}</p><p class="location"><i data-lucide="map-pin"></i>${escapeHTML(artisan.zone || 'Quartier non renseigné')}</p><p class="description">${escapeHTML(artisan.description || 'Artisan local disponible pour vos besoins.')}</p><div class="card-action-hint">Voir le profil <i data-lucide="arrow-right"></i></div></article>`; }
function pageSize() { return window.matchMedia('(max-width: 700px)').matches ? 6 : 10; }
function renderPagination() { const mount = $('#pagination'); if (!mount) return; const totalPages = Math.ceil(artisansCache.length / pageSize()); if (totalPages <= 1) { mount.innerHTML = ''; return; } const safePage = Math.min(artisansPage, totalPages); artisansPage = safePage; const start = (safePage - 1) * pageSize(); $('#artisan-grid').innerHTML = artisansCache.slice(start, start + pageSize()).map(renderCard).join(''); mount.innerHTML = `<button class="pagination-button" type="button" data-page="${safePage - 1}" ${safePage === 1 ? 'disabled' : ''} aria-label="Page précédente">←</button>${Array.from({length: totalPages}, (_, index) => { const page = index + 1; return `<button class="pagination-button ${page === safePage ? 'is-active' : ''}" type="button" data-page="${page}" aria-label="Page ${page}" ${page === safePage ? 'aria-current="page"' : ''}>${page}</button>`; }).join('')}<button class="pagination-button" type="button" data-page="${safePage + 1}" ${safePage === totalPages ? 'disabled' : ''} aria-label="Page suivante">→</button>`; mount.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => { if (button.disabled) return; artisansPage = Number(button.dataset.page); renderPagination(); $('#annuaire').scrollIntoView({behavior: 'smooth', block: 'start'}); lucide.createIcons(); })); lucide.createIcons(); }
function renderArtisans() { const start = (artisansPage - 1) * pageSize(); $('#artisan-grid').innerHTML = artisansCache.slice(start, start + pageSize()).map(renderCard).join(''); renderPagination(); bindProfileCards(); }
function setState(type, message = '') { const state = $('#state'); state.className = `state ${type}`; state.innerHTML = message; }
function renderSkeletons(count = (window.matchMedia('(max-width: 700px)').matches ? 6 : 10)) { $('#artisan-grid').innerHTML = Array.from({length: count}, () => `<article class="artisan-card artisan-card-skeleton" aria-hidden="true"><div class="skeleton-row"><span class="skeleton skeleton-avatar"></span><span class="skeleton skeleton-status"></span></div><span class="skeleton skeleton-category"></span><span class="skeleton skeleton-title"></span><span class="skeleton skeleton-service"></span><span class="skeleton skeleton-location"></span><span class="skeleton skeleton-description"></span><span class="skeleton skeleton-description short"></span><span class="skeleton skeleton-button"></span></article>`).join(''); }
function retryArtisans(params) { clearTimeout(artisanRetryTimer); artisanRetryTimer = window.setTimeout(() => loadArtisans(params), 5000); }
async function loadMeta() { const response = await fetch(`${API_BASE}/api/meta`); const data = await response.json(); const options = data.categories || []; $$('select[name="category"]').forEach(select => { options.forEach(item => { const option = document.createElement('option'); option.value = item; option.textContent = item; select.append(option); }); if (select.id === 'category-select') { const other = document.createElement('option'); other.value = '__other__'; other.textContent = 'Autre métier…'; select.append(other); } }); const zoneSelect = $('#zone-select'); (data.zones || []).forEach(item => { const option = document.createElement('option'); option.value = item; option.textContent = item; zoneSelect?.append(option); }); if (zoneSelect) { const otherZone = document.createElement('option'); otherZone.value = '__other__'; otherZone.textContent = 'Autre quartier…'; zoneSelect.append(otherZone); } }
async function loadArtisans(params = new URLSearchParams()) { renderSkeletons(); setState('', ''); try { const response = await fetch(`${API_BASE}/api/artisans?${params}`, { cache: 'no-store' }); if (!response.ok) throw new Error('API'); const payload = await response.json(); $('#count-artisans').textContent = payload.meta.total; if (!payload.data.length) { artisansCache = []; $('#artisan-grid').innerHTML = ''; $('#pagination').innerHTML = ''; setState('empty', '<i data-lucide="search-x"></i><h3>Aucun artisan trouvé</h3><p>Essayez un autre métier.</p>'); } else { artisansCache = payload.data; artisansPage = 1; renderArtisans(); setState('', ''); } lucide.createIcons(); } catch { artisansCache = []; $('#pagination').innerHTML = ''; setState('', ''); renderSkeletons(); retryArtisans(params); } }
const REPORT_CONFIG = {
  error: { title: 'Demander une correction', kicker: 'CORRECTION D’INFORMATION', help: 'Vérifiez les informations ci-dessous puis indiquez votre nom et votre numéro. L’administration corrigera le profil après vérification.', reasons: ['Coordonnées incorrectes', 'Mauvais métier', 'Mauvais quartier', 'Description incorrecte', 'Autre'] },
  safety: { title: 'Signaler ce profil', kicker: 'SIGNALEMENT SÉRIEUX', help: 'Ce signalement est privé et transmis directement à l’administration.', reasons: ['Escroquerie présumée', 'Usurpation / faux profil', 'Activité inexistante', 'Profil qui ne correspond plus à la réalité', 'Autre'] },
  withdraw: { title: 'Demander le retrait', kicker: 'DEMANDE DE RETRAIT', help: 'Votre demande sera examinée par l’administration avant toute désactivation.', reasons: ['Profil à retirer', 'Coordonnées appartenant à une autre personne', 'Activité arrêtée', 'Autre'] }
};
let activeProfile;
let activeReportType;
function profileContactActions(artisan) { const phone = artisan.phone ? `<a class="morph-button tiny" href="${phoneLink(artisan.phone)}"><span>Appeler</span><i data-lucide="phone"></i></a>` : ''; const whatsapp = artisan.whatsapp_url ? `<a class="circle-action" href="${artisan.whatsapp_url}" target="_blank" rel="noopener" aria-label="WhatsApp ${escapeHTML(artisan.name)}"><i data-lucide="message-circle"></i></a>` : ''; return `${phone}${whatsapp}`; }
function openProfileModal(artisan) { activeProfile = artisan; const modal = $('#profile-modal'); $('#profile-modal-content').innerHTML = `<p class="eyebrow">PROFIL ARTISAN</p><h2 id="profile-modal-title">${escapeHTML(artisan.name)}</h2><p class="profile-modal-category">${escapeHTML(artisan.category)}</p><p class="location"><i data-lucide="map-pin"></i>${escapeHTML(artisan.zone || 'Quartier non renseigné')}</p><p class="profile-modal-description">${escapeHTML(artisan.description || artisan.service || 'Artisan local disponible pour vos besoins.')}</p>${artisan.service ? `<p class="profile-modal-service"><strong>Service proposé</strong><br>${escapeHTML(artisan.service)}</p>` : ''}<div class="profile-modal-actions">${profileContactActions(artisan)}</div>`; $('#report-choices').hidden = false; $('#report-form').hidden = true; $('#report-feedback').textContent = ''; modal.showModal(); lucide.createIcons(); }
function closeProfileModal() { const modal = $('#profile-modal'); if (modal?.open) modal.close(); }
function bindProfileCards() { $$('.profile-card').forEach(card => { card.addEventListener('click', () => { const artisan = artisansCache.find(item => String(item.id) === card.dataset.artisanId); if (artisan) openProfileModal(artisan); }); card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); card.click(); } }); }); }
function openReportForm(type) { activeReportType = type; const config = REPORT_CONFIG[type]; if (!config) return; const correctionFields = [['name','Nom','text'],['category','Métier','text'],['zone','Quartier','text'],['phone','Téléphone','tel'],['whatsapp','WhatsApp','tel'],['service','Service','text'],['description','Description','textarea']]; $('#profile-correction-fields').innerHTML = type === 'error' ? `<p class="snapshot-title">Informations à corriger</p><p class="correction-help">Les champs sont préremplis avec les informations actuellement publiées. Modifiez uniquement ce qui est incorrect.</p><div class="correction-fields-grid">${correctionFields.map(([key,label,inputType]) => `<label>${escapeHTML(label)}<${inputType === 'textarea' ? 'textarea' : 'input'} data-correction-field="${key}" name="correction_${key}" type="${inputType === 'textarea' ? '' : inputType}" rows="3">${inputType === 'textarea' ? escapeHTML(activeProfile[key] || '') : ''}</${inputType === 'textarea' ? 'textarea' : 'input'}></label>`).join('')}</div>` : ''; $('#report-form').classList.toggle('correction-mode', type === 'error'); $('#report-choices').hidden = true; $('#report-form').hidden = false; $('#report-form-kicker').textContent = config.kicker; $('#report-form-title').textContent = config.title; $('#report-form-help').textContent = config.help; $('#report-reasons').innerHTML = `<option value="" disabled>Choisissez un ou plusieurs motifs</option>${config.reasons.map(reason => `<option value="${escapeHTML(reason)}"${type === 'withdraw' && reason === config.reasons[0] ? ' selected' : ''}>${escapeHTML(reason)}</option>`).join('')}`; $('#report-feedback').className = 'form-feedback'; $('#report-feedback').textContent = ''; formContactRequirements(type); lucide.createIcons(); }
async function formContactRequirements(type) { const form = $('#report-form'); if (!form) return; const required = type === 'error'; form.elements.reporter_name.required = required; form.elements.reporter_phone.required = required; $('#reporter-name-required').textContent = required ? '*' : '(facultatif)'; $('#reporter-phone-required').textContent = required ? '*' : '(facultatif)'; $('#reporter-name-required').className = required ? 'required-mark' : 'optional'; $('#reporter-phone-required').className = required ? 'required-mark' : 'optional'; }
async function submitProfileReport(event) { event.preventDefault(); if (!activeProfile || !activeReportType) return; const form = event.currentTarget; const feedback = $('#report-feedback'); const reasons = [...form.elements.reasons.selectedOptions].map(option => option.value).filter(Boolean); if (!reasons.length) { feedback.className = 'form-feedback error'; feedback.textContent = 'Sélectionnez au moins un motif.'; return; } const payload = { artisan_id: activeProfile.id, report_type: activeReportType, reasons, proposed_profile: activeReportType === 'error' ? Object.fromEntries([...form.querySelectorAll('[data-correction-field]')].map(field => [field.dataset.correctionField, field.value.trim()])) : null, details: null, reporter_name: form.elements.reporter_name.value.trim(), reporter_phone: form.elements.reporter_phone.value.trim(), reporter_email: null }; feedback.className = 'form-feedback loading'; feedback.textContent = 'Envoi du signalement…'; try { const response = await fetch(`${API_BASE}/api/profile-reports`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Erreur'); feedback.className = 'form-feedback success'; feedback.textContent = 'Votre signalement a été transmis à l’administration.'; form.reset(); window.setTimeout(closeProfileModal, 1400); } catch (error) { feedback.className = 'form-feedback error'; feedback.textContent = error.message || 'Impossible d’envoyer le signalement.'; } }
function initProfileModal() { const modal = $('#profile-modal'); if (!modal) return; $('#profile-modal-close').addEventListener('click', closeProfileModal); modal.addEventListener('click', event => { if (event.target === modal) closeProfileModal(); }); $$('.report-choice').forEach(button => button.addEventListener('click', () => openReportForm(button.dataset.reportType))); $('#back-report').addEventListener('click', () => { $('#report-form').hidden = true; $('#report-choices').hidden = false; }); $('#report-form').addEventListener('submit', submitProfileReport); }

function updateSubmitState() { const form = $('#registration-form'); if (!form) return; const required = ['first_name','last_name','category','zone'].every(name => form.elements[name].value.trim()); const zoneReady = form.elements.zone.value !== '__other__' || form.elements.zone_custom.value.trim(); const categoryReady = form.elements.category.value !== '__other__' || form.elements.category_custom.value.trim(); const phone = form.elements.phone.value.trim(); const whatsapp = form.elements.whatsapp.value.trim(); const contact = phone || whatsapp; const contactsHavePrefix = [phone, whatsapp].filter(Boolean).every(value => value.replace(/\s/g, '').startsWith('+225')); const ready = required && zoneReady && categoryReady && contact && contactsHavePrefix && form.elements.consent.checked; $('.submit', form).disabled = !ready; }
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

$('#year') && ($('#year').textContent = new Date().getFullYear()); initMobileMenu(); initTheme(); initPWA(); initProfileModal(); lucide.createIcons(); if ($('#artisan-grid')) Promise.all([loadMeta(), loadArtisans()]);
