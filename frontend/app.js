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
function pageSize() { return window.matchMedia('(max-width: 700px)').matches ? 6 : 12; }
function renderPagination() { const mount = $('#pagination'); if (!mount) return; const totalPages = Math.ceil(artisansCache.length / pageSize()); if (totalPages <= 1) { mount.innerHTML = ''; return; } const safePage = Math.min(artisansPage, totalPages); artisansPage = safePage; const start = (safePage - 1) * pageSize(); $('#artisan-grid').innerHTML = artisansCache.slice(start, start + pageSize()).map(renderCard).join(''); mount.innerHTML = `<button class="pagination-button" type="button" data-page="${safePage - 1}" ${safePage === 1 ? 'disabled' : ''} aria-label="Page précédente">←</button>${Array.from({length: totalPages}, (_, index) => { const page = index + 1; return `<button class="pagination-button ${page === safePage ? 'is-active' : ''}" type="button" data-page="${page}" aria-label="Page ${page}" ${page === safePage ? 'aria-current="page"' : ''}>${page}</button>`; }).join('')}<button class="pagination-button" type="button" data-page="${safePage + 1}" ${safePage === totalPages ? 'disabled' : ''} aria-label="Page suivante">→</button>`; mount.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => { if (button.disabled) return; artisansPage = Number(button.dataset.page); renderPagination(); $('#annuaire').scrollIntoView({behavior: 'smooth', block: 'start'}); lucide.createIcons(); })); lucide.createIcons(); }
function renderArtisans() { const start = (artisansPage - 1) * pageSize(); $('#artisan-grid').innerHTML = artisansCache.slice(start, start + pageSize()).map(renderCard).join(''); renderPagination(); bindProfileCards(); }
function setState(type, message = '') { const state = $('#state'); state.className = `state ${type}`; state.innerHTML = message; }
function renderSkeletons(count = (window.matchMedia('(max-width: 700px)').matches ? 6 : 12)) { $('#artisan-grid').innerHTML = Array.from({length: count}, () => `<article class="artisan-card artisan-card-skeleton" aria-hidden="true"><div class="skeleton-row"><span class="skeleton skeleton-avatar"></span><span class="skeleton skeleton-status"></span></div><span class="skeleton skeleton-category"></span><span class="skeleton skeleton-title"></span><span class="skeleton skeleton-service"></span><span class="skeleton skeleton-location"></span><span class="skeleton skeleton-description"></span><span class="skeleton skeleton-description short"></span><span class="skeleton skeleton-button"></span></article>`).join(''); }
function retryArtisans(params) { clearTimeout(artisanRetryTimer); artisanRetryTimer = window.setTimeout(() => loadArtisans(params), 5000); }
async function loadFeedbackSummary() { const average = $('#feedback-average'); const count = $('#feedback-count'); if (!average || !count) return; try { const response = await fetch(`${API_BASE}/api/feedback/summary`, {cache:'no-store'}); const data = await response.json(); if (!response.ok) throw new Error('summary'); if (data.average !== null && data.count) { average.innerHTML = `<i data-lucide="star" aria-hidden="true"></i> ${Number(data.average).toFixed(1)}`; count.textContent = `expérience Anyama Proxy · ${data.count} note${data.count > 1 ? 's' : ''}`; window.lucide?.createIcons(); } } catch {} }
async function loadMeta() { const response = await fetch(`${API_BASE}/api/meta`); const data = await response.json(); const options = data.categories || []; $$('select[name="category"]').forEach(select => { options.forEach(item => { const option = document.createElement('option'); option.value = item; option.textContent = item; select.append(option); }); if (select.id === 'category-select') { const other = document.createElement('option'); other.value = '__other__'; other.textContent = 'Autre métier…'; select.append(other); } }); const zoneSelect = $('#zone-select'); (data.zones || []).forEach(item => { const option = document.createElement('option'); option.value = item; option.textContent = item; zoneSelect?.append(option); }); if (zoneSelect) { const otherZone = document.createElement('option'); otherZone.value = '__other__'; otherZone.textContent = 'Autre quartier…'; zoneSelect.append(otherZone); } }
async function loadArtisans(params = new URLSearchParams()) { renderSkeletons(); setState('', ''); try { const response = await fetch(`${API_BASE}/api/artisans?${params}`, { cache: 'no-store' }); if (!response.ok) throw new Error('API'); const payload = await response.json(); $('#count-artisans').textContent = payload.meta.total; if (!payload.data.length) { artisansCache = []; $('#artisan-grid').innerHTML = ''; $('#pagination').innerHTML = ''; setState('empty', '<i data-lucide="search-x"></i><h3>Aucun artisan trouvé</h3><p>Essayez un autre métier.</p>'); } else { artisansCache = payload.data; artisansPage = 1; renderArtisans(); setState('', ''); } lucide.createIcons(); } catch { artisansCache = []; $('#pagination').innerHTML = ''; setState('', ''); renderSkeletons(); retryArtisans(params); } }
const REPORT_CONFIG = {
  error: { title: 'Demander une correction', kicker: 'CORRECTION D’INFORMATION', help: 'Vérifiez les informations ci-dessous puis indiquez votre nom et votre numéro. L’administration corrigera le profil après vérification.', reasons: ['Coordonnées incorrectes', 'Mauvais métier', 'Mauvais quartier', 'Description incorrecte', 'Autre'] },
  safety: { title: 'Signaler ce profil', kicker: 'SIGNALEMENT SÉRIEUX', help: 'Ce signalement est privé et transmis directement à l’administration.', reasons: ['Escroquerie présumée', 'Usurpation / faux profil', 'Activité inexistante', 'Profil qui ne correspond plus à la réalité', 'Autre'] },
  withdraw: { title: 'Demander le retrait', kicker: 'DEMANDE DE RETRAIT', help: 'Votre demande sera examinée par l’administration avant toute désactivation.', reasons: ['Profil à retirer', 'Coordonnées appartenant à une autre personne', 'Activité arrêtée', 'Autre'] }
};
let activeProfile;
let activeReportType;
function trackArtisanEvent(artisanId, type) { fetch(`${API_BASE}/api/artisans/${artisanId}/events`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({type}), keepalive: true }).catch(() => {}); }
function profileContactActions(artisan) { const phone = artisan.phone ? `<a class="morph-button tiny" href="${phoneLink(artisan.phone)}" data-contact-event="phone"><span>Appeler</span><i data-lucide="phone"></i></a>` : ''; const whatsapp = artisan.whatsapp_url ? `<a class="circle-action" href="${artisan.whatsapp_url}" target="_blank" rel="noopener" aria-label="WhatsApp ${escapeHTML(artisan.name)}" data-contact-event="whatsapp"><i data-lucide="message-circle"></i></a>` : ''; return `${phone}${whatsapp}`; }
function openProfileModal(artisan) { activeProfile = artisan; selectedRating = 0; const modal = $('#profile-modal'); $('#profile-modal-content').innerHTML = `<p class="eyebrow">PROFIL ARTISAN</p><h2 id="profile-modal-title">${escapeHTML(artisan.name)}</h2><p class="profile-modal-category">${escapeHTML(artisan.category)}</p><p class="location"><i data-lucide="map-pin"></i>${escapeHTML(artisan.zone || 'Quartier non renseigné')}</p><p class="profile-modal-description">${escapeHTML(artisan.description || artisan.service || 'Artisan local disponible pour vos besoins.')}</p>${artisan.service ? `<p class="profile-modal-service"><strong>Service proposé</strong><br>${escapeHTML(artisan.service)}</p>` : ''}<div class="profile-modal-actions">${profileContactActions(artisan)}</div><div class="profile-popularity" id="profile-popularity"></div><details class="profile-reputation" aria-labelledby="profile-rating-title"><summary class="reputation-summary"><span><p class="eyebrow">RÉPUTATION LOCALE</p><h3 id="profile-rating-title">Avis des visiteurs</h3></span><i data-lucide="chevron-down" aria-hidden="true"></i></summary><div class="reputation-content"><div class="rating-summary" id="rating-summary">Chargement…</div><div id="reviews-list" class="reviews-list"></div><form class="review-form" id="review-form"><h4>Comment évaluez-vous cet artisan ?</h4><div class="star-picker" role="radiogroup" aria-label="Choisir une note de 1 à 5 étoiles">${[1,2,3,4,5].map(value => `<button type="button" class="star-button" data-rating="${value}" role="radio" aria-label="${value} étoile${value > 1 ? 's' : ''}" aria-checked="false">☆</button>`).join('')}</div><label>Commentaire <span class="optional">(facultatif)</span><textarea name="comment" rows="3" maxlength="500" placeholder="Partagez votre expérience en quelques mots…"></textarea></label><p class="form-feedback" id="review-feedback" role="status"></p><button class="morph-button accent" type="submit" disabled><span>Envoyer mon avis</span><i data-lucide="send"></i></button></form></div></details>`; $('#report-choices').hidden = false; $('#report-choices').open = false; $('#report-form').hidden = true; $('#report-feedback').textContent = ''; modal.showModal(); trackArtisanEvent(artisan.id, 'view'); initReviewForm(); $$('.profile-modal-actions [data-contact-event]').forEach(link => link.addEventListener('click', () => trackArtisanEvent(artisan.id, link.dataset.contactEvent))); $('#profile-popularity').innerHTML = (artisan.popularity || []).map(label => `<span>${escapeHTML(label)}</span>`).join(''); loadProfileReviews(artisan.id); lucide.createIcons(); }
let selectedRating = 0;
function updateStarPicker() { $$('.star-button').forEach(button => { const value = Number(button.dataset.rating); button.innerHTML = '<i data-lucide="star"></i>'; button.classList.toggle('is-selected', value <= selectedRating); button.setAttribute('aria-checked', value === selectedRating); }); window.lucide?.createIcons(); const submit = $('#review-form .morph-button'); if (submit) submit.disabled = selectedRating === 0; }
function initReviewForm() { const form = $('#review-form'); if (!form) return; $$('.star-button', form).forEach(button => button.addEventListener('click', () => { selectedRating = Number(button.dataset.rating); updateStarPicker(); })); form.addEventListener('submit', submitReview); }
async function loadProfileReviews(artisanId) { const summary = $('#rating-summary'); const list = $('#reviews-list'); try { const response = await fetch(`${API_BASE}/api/artisans/${artisanId}/reviews`, { cache: 'no-store' }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Erreur'); summary.innerHTML = payload.summary.count ? `<strong>★ ${payload.summary.average.toFixed(1)}</strong><span>${payload.summary.count} avis</span>` : '<span>Pas encore d’avis</span>'; list.innerHTML = payload.reviews.length ? payload.reviews.slice(0, 3).map(review => `<article class="review-item"><div class="review-stars" aria-label="${review.rating} sur 5">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>${review.comment ? `<p>${escapeHTML(review.comment)}</p>` : ''}<small>Avis publié</small></article>`).join('') : '<p class="reviews-empty">Soyez le premier à donner votre avis.</p>'; if (!payload.can_review) { $('#review-form').innerHTML = '<p class="reviewed-note"><i data-lucide="check-circle"></i> Vous avez déjà noté cet artisan depuis ce navigateur.</p>'; } } catch { summary.innerHTML = '<span>Réputation indisponible</span>'; list.innerHTML = ''; } lucide.createIcons(); }
async function submitReview(event) { event.preventDefault(); if (!activeProfile || !selectedRating) return; const form = event.currentTarget; const feedback = $('#review-feedback'); feedback.className = 'form-feedback loading'; feedback.textContent = 'Envoi de votre avis…'; try { const response = await fetch(`${API_BASE}/api/artisans/${activeProfile.id}/reviews`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ rating: selectedRating, comment: form.elements.comment.value.trim() }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Erreur'); feedback.className = 'form-feedback success'; feedback.textContent = payload.message; form.reset(); selectedRating = 0; updateStarPicker(); loadProfileReviews(activeProfile.id); } catch (error) { feedback.className = 'form-feedback error'; feedback.textContent = error.message || 'Impossible d’envoyer votre avis.'; } }
function closeProfileModal() { const modal = $('#profile-modal'); if (modal?.open) modal.close(); }
function bindProfileCards() { $$('.profile-card').forEach(card => { card.addEventListener('click', () => { const artisan = artisansCache.find(item => String(item.id) === card.dataset.artisanId); if (artisan) openProfileModal(artisan); }); card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); card.click(); } }); }); }
function openReportForm(type) { activeReportType = type; const config = REPORT_CONFIG[type]; if (!config) return; const correctionFields = [['name','Nom','text'],['category','Métier','text'],['zone','Quartier','text'],['phone','Téléphone','tel'],['whatsapp','WhatsApp','tel'],['service','Service','text'],['description','Description','textarea']]; $('#profile-correction-fields').innerHTML = type === 'error' ? `<p class="snapshot-title">Informations à corriger</p><p class="correction-help">Les champs sont préremplis avec les informations actuellement publiées. Modifiez uniquement ce qui est incorrect.</p><div class="correction-fields-grid">${correctionFields.map(([key,label,inputType]) => { const value = escapeHTML(activeProfile?.[key] ?? ''); return `<label>${escapeHTML(label)}${inputType === 'textarea' ? `<textarea data-correction-field="${key}" name="correction_${key}" rows="3">${value}</textarea>` : `<input data-correction-field="${key}" name="correction_${key}" type="${inputType}" value="${value}">`}</label>`; }).join('')}</div>` : ''; $('#report-form').classList.toggle('correction-mode', type === 'error'); $('#report-choices').hidden = true; $('#report-choices').open = false; $('#report-form').hidden = false; $('#report-form-kicker').textContent = config.kicker; $('#report-form-title').textContent = config.title; $('#report-form-help').textContent = config.help; $('#report-reasons').innerHTML = `<option value="" disabled>Choisissez un ou plusieurs motifs</option>${config.reasons.map(reason => `<option value="${escapeHTML(reason)}"${type === 'withdraw' && reason === config.reasons[0] ? ' selected' : ''}>${escapeHTML(reason)}</option>`).join('')}`; $('#report-feedback').className = 'form-feedback'; $('#report-feedback').textContent = ''; formContactRequirements(type); lucide.createIcons(); }
async function formContactRequirements(type) { const form = $('#report-form'); if (!form) return; const required = type === 'error'; form.elements.reporter_name.required = required; form.elements.reporter_phone.required = required; $('#reporter-name-required').textContent = required ? '*' : '(facultatif)'; $('#reporter-phone-required').textContent = required ? '*' : '(facultatif)'; $('#reporter-name-required').className = required ? 'required-mark' : 'optional'; $('#reporter-phone-required').className = required ? 'required-mark' : 'optional'; }
async function submitProfileReport(event) { event.preventDefault(); if (!activeProfile || !activeReportType) return; const form = event.currentTarget; const feedback = $('#report-feedback'); const reasons = [...form.elements.reasons.selectedOptions].map(option => option.value).filter(Boolean); if (!reasons.length) { feedback.className = 'form-feedback error'; feedback.textContent = 'Sélectionnez au moins un motif.'; return; } const payload = { artisan_id: activeProfile.id, report_type: activeReportType, reasons, proposed_profile: activeReportType === 'error' ? Object.fromEntries([...form.querySelectorAll('[data-correction-field]')].map(field => [field.dataset.correctionField, field.value.trim()])) : null, details: null, reporter_name: form.elements.reporter_name.value.trim(), reporter_phone: form.elements.reporter_phone.value.trim(), reporter_email: null }; feedback.className = 'form-feedback loading'; feedback.textContent = 'Envoi du signalement…'; try { const response = await fetch(`${API_BASE}/api/profile-reports`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Erreur'); feedback.className = 'form-feedback success'; feedback.textContent = 'Votre signalement a été transmis à l’administration.'; form.reset(); window.setTimeout(closeProfileModal, 1400); } catch (error) { feedback.className = 'form-feedback error'; feedback.textContent = error.message || 'Impossible d’envoyer le signalement.'; } }
function initProfileModal() { const modal = $('#profile-modal'); if (!modal) return; $('#profile-modal-close').addEventListener('click', closeProfileModal); modal.addEventListener('click', event => { if (event.target === modal) closeProfileModal(); }); $$('.report-choice').forEach(button => button.addEventListener('click', () => openReportForm(button.dataset.reportType))); $('#back-report').addEventListener('click', () => { $('#report-form').hidden = true; $('#report-choices').hidden = false; $('#report-choices').open = true; }); $('#report-form').addEventListener('submit', submitProfileReport); }

function updateSubmitState() { const form = $('#registration-form'); if (!form) return; const required = ['first_name','last_name','category','zone'].every(name => form.elements[name].value.trim()); const zoneReady = form.elements.zone.value !== '__other__' || form.elements.zone_custom.value.trim(); const categoryReady = form.elements.category.value !== '__other__' || form.elements.category_custom.value.trim(); const phone = form.elements.phone.value.trim(); const whatsapp = form.elements.whatsapp.value.trim(); const contact = phone || whatsapp; const contactsHavePrefix = [phone, whatsapp].filter(Boolean).every(value => value.replace(/\s/g, '').startsWith('+225')); const ready = required && zoneReady && categoryReady && contact && contactsHavePrefix && form.elements.consent.checked; $('.submit', form).disabled = !ready; }
async function submitRegistration(event) { event.preventDefault(); const form = event.currentTarget; const feedback = $('#form-feedback'); const data = Object.fromEntries(new FormData(form).entries()); if (data.category === '__other__') data.category = data.category_custom.trim(); if (data.zone === '__other__') data.zone = data.zone_custom.trim(); data.consent = form.elements.consent.checked ? 'on' : ''; delete data.category_custom; delete data.zone_custom; feedback.className = 'form-feedback loading'; feedback.textContent = 'Enregistrement en cours…'; try { const response = await fetch(`${API_BASE}/api/artisans`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Erreur'); trackJourney('artisan_registration_submit'); feedback.className = 'form-feedback success'; feedback.textContent = 'Merci ! Votre inscription a été envoyée. Elle sera visible après validation par l’administrateur.'; form.reset(); $('#custom-category-wrap').hidden = true; $('#custom-zone-wrap').hidden = true; updateSubmitState(); } catch (error) { feedback.className = 'form-feedback error'; feedback.textContent = error.message || 'Impossible d’envoyer le formulaire.'; } }
function trackJourney(event, path = window.location.pathname) { fetch(`${API_BASE}/api/analytics/events`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({event, path}), keepalive:true}).catch(() => {}); }
document.addEventListener('click', event => { const profile = event.target.closest('.profile-card'); if (profile) trackJourney('profile_open', `${window.location.pathname}#annuaire`); const contact = event.target.closest('[data-contact-event]'); if (contact) trackJourney(`contact_${contact.dataset.contactEvent}`, `${window.location.pathname}#annuaire`); const report = event.target.closest('.report-choice'); if (report) trackJourney(`report_${report.dataset.reportType}_open`, `${window.location.pathname}#annuaire`); const signupLink = event.target.closest('a[href="#inscription"]'); if (signupLink) trackJourney('artisan_registration_cta', `${window.location.pathname}#inscription`); if (event.target.closest('#feedback-fab')) trackJourney('feedback_open', `${window.location.pathname}#feedback`); if (event.target.closest('#install-button')) trackJourney('install_prompt', `${window.location.pathname}#install`); });
function initPublicAnalytics() { if (document.body.classList.contains('admin-route')) return; trackJourney('page_view'); }
function initCookieConsent() { const banner = $('#cookie-banner'); if (!banner) return; const key = 'anyama_cookie_consent_v1'; if (localStorage.getItem(key) === 'accepted') return; banner.hidden = false; $('#cookie-accept').addEventListener('click', () => { localStorage.setItem(key, 'accepted'); banner.hidden = true; trackJourney('cookie_consent_accepted'); }); }
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

function initTheme() { const button = $('.theme-toggle'); const apply = theme => { document.documentElement.dataset.theme = theme; if (button) { button.innerHTML = `<i data-lucide="${theme === 'light' ? 'sun' : 'moon'}"></i>`; button.setAttribute('aria-label', theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'); lucide.createIcons(); } }; const saved = localStorage.getItem('anyama-theme') || 'light'; apply(saved); button?.addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'; localStorage.setItem('anyama-theme', next); apply(next); }); }
function initPWA() { window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstallPrompt = event; if ($('#install-button')) $('#install-button').hidden = false; }); $('#install-button')?.addEventListener('click', async () => { if (!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt = null; $('#install-button').hidden = true; }); if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {}); }
$('#search-form')?.addEventListener('submit', event => { event.preventDefault(); trackJourney('directory_search', `${window.location.pathname}#annuaire`); const params = new URLSearchParams(new FormData(event.currentTarget)); loadArtisans(params); document.querySelector('#annuaire').scrollIntoView({behavior: 'smooth'}); });
$('#registration-form')?.addEventListener('submit', submitRegistration);
$$('#registration-form input, #registration-form select').forEach(input => input.addEventListener('input', updateSubmitState));

$('#category-select')?.addEventListener('change', event => { $('#custom-category-wrap').hidden = event.target.value !== '__other__'; updateSubmitState(); }); $('#zone-select')?.addEventListener('change', event => { $('#custom-zone-wrap').hidden = event.target.value !== '__other__'; updateSubmitState(); });

$$('[data-scroll]').forEach(button => button.addEventListener('click', () => { if (button.dataset.scroll === '#annuaire') trackJourney('directory_open', `${window.location.pathname}#annuaire`); $(button.dataset.scroll).scrollIntoView({behavior:'smooth'}); }));
window.addEventListener('resize', () => { if (artisansCache.length) { const totalPages = Math.ceil(artisansCache.length / pageSize()); if (artisansPage > totalPages) artisansPage = totalPages; renderArtisans(); } });
document.querySelectorAll('.morph-panel').forEach(panel => {
  panel.addEventListener('toggle', () => {
    if (!panel.open) return;
    if (panel.classList.contains('registration-panel')) trackJourney('artisan_registration_open', `${window.location.pathname}#inscription`);
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

$('#year') && ($('#year').textContent = new Date().getFullYear()); initMobileMenu(); initTheme(); initPWA(); initProfileModal(); initPublicAnalytics(); initCookieConsent(); initPublicFeedback(); initFeedbackPrompt(); loadFeedbackSummary(); lucide.createIcons(); if ($('#artisan-grid')) Promise.all([loadMeta(), loadArtisans()]);


function initFeedbackPrompt() {
  if (document.body.classList.contains('admin-route')) return;
  const key = 'anyama-feedback-page-count';
  const count = Number(localStorage.getItem(key) || 0) + 1;
  localStorage.setItem(key, String(count));
  if (count < 3 || localStorage.getItem('anyama-feedback-prompt-seen') || localStorage.getItem('anyama-feedback-prompt-declined')) return;
  const invite = document.createElement('dialog');
  invite.className = 'feedback-invite-dialog';
  invite.id = 'feedback-invite-dialog';
  invite.innerHTML = '<div class="feedback-invite-card"><span class="feedback-invite-icon"><i data-lucide="sparkles"></i></span><p class="eyebrow">VOTRE EXPÉRIENCE COMPTE</p><h2>Avez-vous deux minutes pour nous aider ?</h2><p>Après quelques pages sur Anyama Proxy, votre retour nous aide à améliorer le site. Les réponses restent anonymes.</p><div class="feedback-invite-actions"><button class="morph-button accent" id="feedback-invite-yes" type="button"><span>Oui, je donne mon avis</span><i data-lucide="arrow-right"></i></button><button class="morph-button outline" id="feedback-invite-no" type="button">Non, pas maintenant</button></div></div>';
  document.body.append(invite); window.lucide?.createIcons();
  window.setTimeout(() => invite.showModal(), 700);
  $('#feedback-invite-yes', invite).addEventListener('click', () => { localStorage.setItem('anyama-feedback-prompt-seen', '1'); invite.close(); $('#feedback-dialog')?.showModal(); });
  $('#feedback-invite-no', invite).addEventListener('click', () => { localStorage.setItem('anyama-feedback-prompt-declined', '1'); invite.close(); });
}

function initPublicFeedback() {
  if (document.body.classList.contains('admin-route') || document.querySelector('#feedback-fab')) return;
  const fab = document.createElement('button'); fab.className = 'feedback-fab'; fab.id = 'feedback-fab'; fab.type = 'button'; fab.setAttribute('aria-label', 'Donner votre avis sur Anyama Proxy'); fab.innerHTML = '<i data-lucide="message-circle" aria-hidden="true"></i>'; document.body.append(fab); window.lucide?.createIcons();
  const dialog = document.createElement('dialog'); dialog.className = 'feedback-dialog'; dialog.id = 'feedback-dialog'; dialog.innerHTML = '<div class="feedback-card"><button class="feedback-close" type="button" aria-label="Fermer">×</button><p class="eyebrow"> OBSERVATION & FEEDBACK</p><h2>Votre avis sur Anyama Proxy</h2><p class="feedback-intro">Qu’est-ce que les utilisateurs veulent réellement ? Répondez simplement à quelques questions.</p><form id="feedback-form"><fieldset class="feedback-type-choice"><legend>Vous êtes ?</legend><input type="hidden" name="type" value=""><div class="feedback-type-options"><button type="button" class="feedback-type-button" data-feedback-type="visitor"><i data-lucide="user-round"></i><span>Visiteur</span></button><button type="button" class="feedback-type-button" data-feedback-type="artisan"><i data-lucide="briefcase-business"></i><span>Artisan / professionnel</span></button></div></fieldset><div id="feedback-questions"></div><p class="form-feedback" id="feedback-status" role="status"></p><button class="morph-button accent" type="submit"><span>Envoyer mon feedback</span></button></form></div>'; document.body.append(dialog);
  const form = dialog.querySelector('form'), type = form.elements.type, questions = dialog.querySelector('#feedback-questions'), typeButtons = [...dialog.querySelectorAll('.feedback-type-button')];
  const visitor = [['ease_rating','Comment trouvez-vous Anyama Proxy facile à utiliser ?','rating'],['design_rating','Comment trouvez-vous le design du site ?','rating'],['search_result','Avez-vous facilement trouvé ce que vous cherchiez ?','select|Oui, facilement|Oui, mais avec quelques difficultés|Non'],['artisan_result','Avez-vous réussi à trouver un artisan qui correspondait à votre recherche ?','select|Oui|Partiellement|Non'],['difficulty','Qu’est-ce qui vous a semblé difficile ou peu clair ?','select|Rien|Un bouton|La recherche|Les informations d’un artisan|La navigation|Autre'],['mobile_rating','L’utilisation du site sur téléphone vous semble-t-elle simple ?','select|Très simple|Simple|Moyenne|Difficile|Très difficile'],['profile_info','Les informations affichées sur les profils vous semblent-elles suffisantes ?','select|Oui|Partiellement|Non'],['improvement','Qu’aimeriez-vous voir ajouté ou amélioré ?','text'],['experience_rating','Globalement, quelle note donnez-vous à votre expérience ?','rating'],['comment','Un dernier commentaire ?','textarea']];
  const artisan = [['profile_usefulness','Votre profil sur Anyama Proxy vous semble-t-il utile ?','select|Très utile|Utile|Moyennement utile|Peu utile|Pas utile'],['profile_info','Les informations présentes sur votre profil sont-elles suffisantes ?','select|Oui|Partiellement|Non'],['received_contacts','Avez-vous reçu des appels ou messages grâce à Anyama Proxy ?','select|Oui|Non|Je ne sais pas'],['contact_channel','Si oui, par quel moyen ?','select|Appel|WhatsApp|Les deux|Autre'],['desired_features','Qu’aimeriez-vous pouvoir ajouter à votre profil ?','select|Photos de réalisations|Liste de services|Prix|Horaires|Zone d’intervention|Promotions|Autre'],['visibility_help','Qu’est-ce qui pourrait vous aider à obtenir davantage de clients ou de visibilité ?','text'],['visibility_interest','Êtes-vous intéressé par une visibilité supplémentaire ?','select|Oui|Peut-être|Non'],['paid_services','Pour quel type de service pourriez-vous éventuellement payer ?','select|Mise en avant du profil|Profil plus complet|Publicité locale|Statistiques sur mon profil|Aucun pour le moment|Autre'],['experience_rating','Quelle note donnez-vous globalement à Anyama Proxy ?','rating'],['comment','Un dernier commentaire ?','textarea']];
  const render = () => { questions.innerHTML=''; const items=type.value==='artisan'?artisan:type.value==='visitor'?visitor:[]; items.forEach(([name,label,kind],i)=>{const wrap=document.createElement('label');wrap.className='feedback-question';wrap.innerHTML=`<span>${i+1}. ${label}</span>`;if(kind==='rating'){const picker=document.createElement('div');picker.className='star-picker feedback-rating';picker.setAttribute('role','radiogroup');picker.setAttribute('aria-label','Choisir une note de 1 à 5 étoiles');const input=document.createElement('input');input.type='hidden';input.name=name;input.value='';picker.append(input);[1,2,3,4,5].forEach(value=>{const button=document.createElement('button');button.type='button';button.className='star-button';button.dataset.rating=value;button.setAttribute('role','radio');button.setAttribute('aria-label',`${value} étoile${value>1?'s':''}`);button.setAttribute('aria-checked','false');button.innerHTML='<i data-lucide="star"></i>';button.addEventListener('click',()=>{input.value=String(value);picker.querySelectorAll('.star-button').forEach(star=>{const selected=Number(star.dataset.rating)<=value;star.innerHTML='<i data-lucide="star"></i>';star.classList.toggle('is-selected',selected);star.setAttribute('aria-checked',String(Number(star.dataset.rating)===value));});window.lucide?.createIcons();});picker.append(button);});wrap.append(picker);}else if(kind==='text'||kind==='textarea'){const f=document.createElement(kind==='textarea'?'textarea':'input');f.name=name;if(kind==='textarea')f.rows=3;f.placeholder='Votre réponse';wrap.append(f);}else{const p=kind.split('|'),s=document.createElement('select');s.name=name;s.innerHTML='<option value="">Choisissez une réponse</option>'+p.slice(1).map(v=>`<option>${v}</option>`).join('');wrap.append(s);}questions.append(wrap);});};
  fab.addEventListener('click',()=>dialog.showModal()); dialog.querySelector('.feedback-close').addEventListener('click',()=>dialog.close()); typeButtons.forEach(button=>button.addEventListener('click',()=>{type.value=button.dataset.feedbackType;typeButtons.forEach(option=>{const selected=option===button;option.classList.toggle('is-selected',selected);option.setAttribute('aria-pressed',String(selected));});render();window.lucide?.createIcons();})); form.addEventListener('submit',async e=>{e.preventDefault();const status=form.querySelector('#feedback-status'),data=new FormData(form),answers={};for(const [k,v] of data.entries())if(k!=='type'&&String(v).trim())answers[k]=String(v).trim();if(!data.get('type')||Object.keys(answers).length<3){status.className='form-feedback error';status.textContent='Choisissez votre parcours et répondez à au moins trois questions.';return;}status.className='form-feedback loading';status.textContent='Envoi en cours…';try{const r=await fetch(`${API_BASE}/api/feedback`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:data.get('type'),answers})});const result=await r.json();if(!r.ok)throw new Error(result.error||'Erreur');status.className='form-feedback success';status.textContent=result.message;form.reset();questions.innerHTML='';typeButtons.forEach(button=>{button.classList.remove('is-selected');button.setAttribute('aria-pressed','false');});setTimeout(()=>dialog.close(),1200);}catch(err){status.className='form-feedback error';status.textContent=err.message||'Impossible d’envoyer le feedback.';}});
}


(() => {
  const form = document.querySelector('#contact-form');
  if (!form) return;
  const feedback = document.querySelector('#contact-feedback');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    feedback.className = 'form-feedback loading';
    feedback.textContent = 'Envoi en cours…';
    try {
      const response = await fetch(`${API_BASE}/api/contact`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Impossible d’envoyer votre message.');
      feedback.className = 'form-feedback success';
      feedback.textContent = result.message;
      form.reset();
    } catch (error) {
      feedback.className = 'form-feedback error';
      feedback.textContent = error.message;
    }
  });
  window.lucide?.createIcons();
})();
