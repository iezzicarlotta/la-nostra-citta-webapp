import './styles.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { api, jsonBody, refreshCsrf } from './api.js';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow
});

const state = {
  user: null,
  meta: { neighborhoods: [], categories: [], statuses: [] },
  reports: [],
  page: 1,
  total: 0,
  limit: 12,
  authMode: 'login',
  nilFeatures: [],
  reportMap: null,
  reportMarker: null,
  publicReportsMap: null,
  publicReportMarkers: null,
  publishedMap: null,
  addressResults: []
};

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[character]));
const formatDate = (value) => new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium' }).format(new Date(value));

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.remove('visible'), 3200);
}

function openDialog(dialog) {
  if (!dialog.open) dialog.showModal();
}

function closeDialog(dialog) {
  if (dialog.open) dialog.close();
}

function setBusy(form, busy) {
  const button = $('button[type="submit"]', form);
  if (!button) return;
  button.disabled = busy;
  if (!button.dataset.label) button.dataset.label = button.textContent;
  button.textContent = busy ? 'Attendi…' : button.dataset.label;
}

function updateAccountUi() {
  const loggedIn = Boolean(state.user);
  $('#login-button').classList.toggle('hidden', loggedIn);
  $('#register-button').classList.toggle('hidden', loggedIn);
  $('#logout-button').classList.toggle('hidden', !loggedIn);
  $('#profile-link').classList.toggle('hidden', !loggedIn);
  $('#user-greeting').classList.toggle('hidden', !loggedIn);
  $('#user-greeting').textContent = loggedIn ? `Ciao, ${state.user.firstName}` : '';
  $('#mine-mobile-button').classList.toggle('hidden', !loggedIn);
  const isModerator = ['MODERATORE', 'AMMINISTRATORE'].includes(state.user?.role);
  const isAdmin = state.user?.role === 'AMMINISTRATORE';
  $('#moderation-link').classList.toggle('hidden', !isModerator);
  $('#admin-link').classList.toggle('hidden', !isAdmin);
  if (!isModerator) $('#moderation-panel').classList.add('hidden');
  if (!isAdmin) $('#admin-panel').classList.add('hidden');
  if (!loggedIn) $('#mine-panel').classList.add('hidden');
}

async function loadSession() {
  try {
    const { user } = await api('/auth/me');
    state.user = user;
  } catch (error) {
    if (error.code !== 'AUTH_REQUIRED') console.warn(error);
    state.user = null;
  }
  updateAccountUi();
}

function populateSelect(select, items, label = 'Tutti') {
  const first = select.options[0]?.outerHTML || `<option value="">${label}</option>`;
  select.innerHTML = first + items.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join('');
}

async function loadMeta() {
  state.meta = await api('/meta');
  populateSelect($('#filters-form [name="neighborhoodId"]'), state.meta.neighborhoods);
  populateSelect($('#filters-form [name="categoryId"]'), state.meta.categories);
  populateSelect($('#filters-form [name="statusId"]'), state.meta.statuses.filter((item) => item.publishable));
  populateSelect($('#auth-form [name="neighborhoodId"]'), state.meta.neighborhoods, 'Non specificato');
  populateSelect($('#report-neighborhood'), state.meta.neighborhoods.filter((item) => item.isNil), 'Seleziona il quartiere');
  $('#category-checkboxes').innerHTML = state.meta.categories.map((category) => `
    <label><input type="checkbox" name="categoryIds" value="${category.id}"> ${escapeHtml(category.name)}</label>
  `).join('');
}

function normalizePlaceName(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleUpperCase('it').replace(/[^A-Z0-9]+/g, ' ').trim();
}

function updateNeighborhoodFromPoint(latlng) {
  $('#report-latitude').value = latlng.lat.toFixed(7);
  $('#report-longitude').value = latlng.lng.toFixed(7);
  $('#confirm-neighborhood').checked = false;

  const feature = state.nilFeatures.find((item) => booleanPointInPolygon(
    { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [latlng.lng, latlng.lat] } },
    item
  ));
  const status = $('#report-map-status');
  if (!feature) {
    $('#report-neighborhood').value = '';
    $('#confirm-neighborhood').disabled = true;
    $('#confirm-neighborhood-label').textContent = 'Confermo che il quartiere selezionato è corretto';
    status.textContent = 'La puntina è fuori dai quartieri di Milano. Spostala all’interno dei confini NIL.';
    return;
  }

  const nilName = feature.properties.NIL;
  const neighborhood = state.meta.neighborhoods.find((item) => item.isNil && normalizePlaceName(item.name) === normalizePlaceName(nilName));
  if (!neighborhood) {
    $('#report-neighborhood').value = '';
    $('#confirm-neighborhood').disabled = true;
    status.textContent = `La mappa indica ${nilName}, ma il quartiere non è ancora presente nel database.`;
    return;
  }
  $('#report-neighborhood').value = String(neighborhood.id);
  $('#confirm-neighborhood').disabled = false;
  $('#confirm-neighborhood-label').textContent = `Confermo che ${neighborhood.name} è il quartiere corretto`;
  status.textContent = `La puntina ricade nel NIL ${neighborhood.name}. Verifica e conferma il quartiere.`;
}

function moveReportMarker(latlng, zoom = false) {
  if (!state.reportMap) return;
  if (!state.reportMarker) {
    state.reportMarker = L.marker(latlng, { draggable: true }).addTo(state.reportMap);
    state.reportMarker.on('dragend', () => updateNeighborhoodFromPoint(state.reportMarker.getLatLng()));
  } else {
    state.reportMarker.setLatLng(latlng);
  }
  if (zoom) state.reportMap.setView(latlng, 17);
  updateNeighborhoodFromPoint(latlng);
}

function resetReportLocation() {
  if (state.reportMarker) state.reportMap.removeLayer(state.reportMarker);
  state.reportMarker = null;
  state.addressResults = [];
  $('#address-results').replaceChildren();
  $('#address-results-label').classList.add('hidden');
  $('#report-latitude').value = '';
  $('#report-longitude').value = '';
  $('#report-neighborhood').value = '';
  $('#confirm-neighborhood').checked = false;
  $('#confirm-neighborhood').disabled = true;
  $('#confirm-neighborhood-label').textContent = 'Confermo che il quartiere selezionato è corretto';
  $('#address-search-status').textContent = '';
  $('#report-map-status').textContent = 'Cerca un indirizzo oppure sposta la puntina sulla mappa.';
  requestAnimationFrame(() => {
    state.reportMap?.invalidateSize();
    if (state.nilLayer) state.reportMap.fitBounds(state.nilLayer.getBounds(), { padding: [12, 12] });
  });
}

async function initReportMap() {
  const response = await fetch('/data/milano-nil.geojson');
  if (!response.ok) throw new Error('Confini dei quartieri non disponibili.');
  const geoJson = await response.json();
  state.nilFeatures = geoJson.features;
  state.reportMap = L.map('report-map', { scrollWheelZoom: false }).setView([45.4642, 9.19], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(state.reportMap);
  state.nilLayer = L.geoJSON(geoJson, {
    style: { color: '#b63862', weight: 1, opacity: .75, fillColor: '#f3dce4', fillOpacity: .1 },
    onEachFeature: (feature, layer) => layer.bindTooltip(feature.properties.NIL)
  }).addTo(state.reportMap);
  state.reportMap.on('click', (event) => moveReportMarker(event.latlng));
}

async function searchAddressOnMap() {
  const address = $('#report-address').value.trim();
  const button = $('#search-address-button');
  const status = $('#address-search-status');
  if (address.length < 5) {
    status.textContent = 'Inserisci una via e un numero civico.';
    $('#report-address').focus();
    return;
  }
  button.disabled = true;
  status.textContent = 'Ricerca indirizzo…';
  try {
    const { results } = await api('/locations/search', { method: 'POST', body: jsonBody({ address }) });
    if (!results.length) {
      status.textContent = 'Nessun risultato. Prova a specificare meglio la via.';
      return;
    }
    state.addressResults = results;
    const select = $('#address-results');
    select.replaceChildren(...results.map((result, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = result.displayName;
      return option;
    }));
    $('#address-results-label').classList.toggle('hidden', results.length < 2);
    const result = results[0];
    moveReportMarker(L.latLng(result.latitude, result.longitude), true);
    status.textContent = `${results.length} ${results.length === 1 ? 'risultato trovato' : 'risultati trovati'}. Controlla la posizione e il quartiere.`;
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

function useCurrentLocation() {
  const button = $('#use-current-location');
  const status = $('#report-map-status');
  if (!navigator.geolocation) {
    status.textContent = 'La geolocalizzazione non è disponibile in questo browser.';
    return;
  }
  button.disabled = true;
  status.textContent = 'Richiesta della posizione in corso…';
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    const position = L.latLng(coords.latitude, coords.longitude);
    moveReportMarker(position, true);
    const neighborhood = $('#report-neighborhood').selectedOptions[0]?.textContent;
    status.textContent = `Posizione selezionata: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}${$('#report-neighborhood').value ? ` · ${neighborhood}` : ''}. Verifica il punto sulla mappa.`;
    button.disabled = false;
  }, (error) => {
    status.textContent = error.code === error.PERMISSION_DENIED
      ? 'Permesso di posizione negato. Puoi selezionare il punto direttamente sulla mappa.'
      : 'Posizione non disponibile. Seleziona il punto direttamente sulla mappa.';
    button.disabled = false;
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
}

function selectAddressResult() {
  const result = state.addressResults[Number($('#address-results').value)];
  if (!result) return;
  moveReportMarker(L.latLng(result.latitude, result.longitude), true);
}

function reportCard(report) {
  const photo = report.previewAttachmentId
    ? `<div class="report-card-media"><img data-report-photo src="/api/reports/attachments/${report.previewAttachmentId}/file" alt="Foto della segnalazione: ${escapeHtml(report.title)}" loading="lazy"><span class="media-fallback hidden" data-media-fallback>Foto non disponibile</span></div>`
    : '<div class="report-card-media"><span class="media-fallback">Nessuna foto allegata</span></div>';
  return `
    <article class="report-card">
      ${photo}
      <div class="report-card-top">
        <span class="status-pill">${escapeHtml(report.statusName)}</span>
        <p>${escapeHtml(report.neighborhoodName)} · ${formatDate(report.createdAt)}</p>
      </div>
      <div class="report-card-body">
        <h3>${escapeHtml(report.title)}</h3>
        <p class="description">${escapeHtml(report.description)}</p>
        <div class="tag-list">${report.categories.map((category) => `<span class="tag">${escapeHtml(category)}</span>`).join('')}</div>
        <div class="card-footer">
          <span class="support-count">${report.supportCount} sostegn${report.supportCount === 1 ? 'o' : 'i'}</span>
          <div class="card-actions">
            ${state.user && state.user.id !== report.authorId ? `<button class="button button-small ${report.supportedByMe ? 'button-dark' : 'button-ghost'}" data-support="${report.id}" data-active="${report.supportedByMe}">${report.supportedByMe ? 'Sostenuta' : 'Sostieni'}</button>` : ''}
            <button class="button button-small button-primary" data-detail="${report.id}">Apri</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function publicMapMarkerClass(statusName) {
  if (statusName === 'Rifiutata') return 'rejected';
  if (statusName === 'Chiusa') return 'closed';
  return 'active';
}

function publicMapPopup(report) {
  const popup = document.createElement('article');
  popup.className = 'public-map-popup';
  const title = document.createElement('h3');
  title.textContent = report.title;
  const description = document.createElement('p');
  const brief = report.description.trim();
  description.textContent = brief.length > 180 ? `${brief.slice(0, 177)}…` : brief;
  const details = document.createElement('p');
  details.className = 'public-map-popup-meta';
  details.textContent = [report.categories.join(', '), report.statusName, report.neighborhoodName, report.address]
    .filter(Boolean).join(' · ');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button button-small button-primary';
  button.dataset.detail = String(report.id);
  button.textContent = 'Visualizza segnalazione';
  popup.append(title, description, details, button);
  return popup;
}

async function loadPublicReportsMap() {
  if (!state.publicReportsMap || !state.publicReportMarkers) return;
  const status = $('#public-map-status');
  status.textContent = 'Caricamento delle segnalazioni sulla mappa…';
  try {
    const { items } = await api('/reports/map');
    const reports = items.filter((report) => Number.isFinite(report.latitude)
      && Number.isFinite(report.longitude)
      && report.latitude >= -90 && report.latitude <= 90
      && report.longitude >= -180 && report.longitude <= 180);
    state.publicReportMarkers.clearLayers();
    const positions = [];
    for (const report of reports) {
      const position = L.latLng(report.latitude, report.longitude);
      positions.push(position);
      const markerClass = publicMapMarkerClass(report.statusName);
      const icon = L.divIcon({
        className: 'public-map-marker',
        html: `<span class="public-map-marker-dot public-map-marker-dot--${markerClass}"></span>`,
        iconSize: [24, 32],
        iconAnchor: [12, 30],
        popupAnchor: [0, -28]
      });
      L.marker(position, { icon, title: report.title, alt: report.title })
        .bindPopup(publicMapPopup(report), { maxWidth: 320 })
        .addTo(state.publicReportMarkers);
    }
    if (positions.length === 0) {
      state.publicReportsMap.setView([45.4642, 9.19], 12);
      status.textContent = 'Nessuna segnalazione pubblica con posizione disponibile.';
    } else {
      state.publicReportsMap.fitBounds(L.latLngBounds(positions), { padding: [28, 28], maxZoom: 15 });
      status.textContent = `${positions.length} segnalazion${positions.length === 1 ? 'e pubblica visualizzata' : 'i pubbliche visualizzate'} sulla mappa.`;
    }
  } catch (error) {
    status.textContent = `Mappa non aggiornata: ${error.message}`;
  }
}

async function initPublicReportsMap() {
  state.publicReportsMap = L.map('public-reports-map', { scrollWheelZoom: false }).setView([45.4642, 9.19], 12);
  const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(state.publicReportsMap);
  tiles.on('tileerror', () => {
    $('#public-map-status').textContent = 'Impossibile caricare le mappe OpenStreetMap. Controlla la connessione e riprova.';
  });
  state.publicReportMarkers = L.layerGroup().addTo(state.publicReportsMap);
  await loadPublicReportsMap();
}

function renderPagination() {
  const pages = Math.ceil(state.total / state.limit);
  const pagination = $('#pagination');
  if (pages <= 1) { pagination.innerHTML = ''; return; }
  pagination.innerHTML = `
    <button class="button button-small button-ghost" data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''}>Precedente</button>
    <span class="button button-small">${state.page} di ${pages}</span>
    <button class="button button-small button-ghost" data-page="${state.page + 1}" ${state.page === pages ? 'disabled' : ''}>Successiva</button>
  `;
}

async function loadReports(page = state.page) {
  const status = $('#reports-status');
  status.textContent = 'Caricamento delle segnalazioni…';
  const params = new URLSearchParams(new FormData($('#filters-form')));
  [...params.entries()].forEach(([key, value]) => { if (!value) params.delete(key); });
  params.set('page', page);
  params.set('limit', state.limit);
  try {
    const data = await api(`/reports?${params}`);
    state.reports = data.items;
    state.page = data.page;
    state.total = data.total;
    status.textContent = `${data.total} segnalazion${data.total === 1 ? 'e' : 'i'} trovate`;
    $('#reports-grid').innerHTML = data.items.length ? data.items.map(reportCard).join('') : '<p>Non ci sono segnalazioni con questi filtri.</p>';
    renderPagination();
  } catch (error) {
    status.textContent = error.message;
    $('#reports-grid').innerHTML = '';
  }
}

function showAuth(mode) {
  state.authMode = mode;
  const register = mode === 'register';
  $('#auth-title').textContent = register ? 'Crea il tuo profilo' : 'Bentornata';
  $('#register-fields').classList.toggle('hidden', !register);
  $$('#register-fields input').forEach((input) => { input.required = register; });
  $('#password-help').classList.toggle('hidden', !register);
  $('#auth-form [name="password"]').autocomplete = register ? 'new-password' : 'current-password';
  $('#auth-error').textContent = '';
  openDialog($('#auth-dialog'));
}

async function submitAuth(event) {
  event.preventDefault();
  const form = event.currentTarget;
  setBusy(form, true);
  $('#auth-error').textContent = '';
  const values = Object.fromEntries(new FormData(form));
  const path = state.authMode === 'register' ? '/auth/register' : '/auth/login';
  if (state.authMode === 'login') {
    delete values.firstName; delete values.lastName; delete values.neighborhoodId;
  } else {
    values.neighborhoodId = values.neighborhoodId || null;
  }
  try {
    const { user } = await api(path, { method: 'POST', body: jsonBody(values) });
    state.user = user;
    await refreshCsrf();
    updateAccountUi();
    closeDialog($('#auth-dialog'));
    form.reset();
    showToast('Accesso effettuato. Benvenuta nella community!');
    await loadReports(1);
  } catch (error) {
    $('#auth-error').textContent = error.message;
  } finally { setBusy(form, false); }
}

function requireLogin(action) {
  if (state.user) return true;
  showAuth('login');
  showToast(`Accedi per ${action}.`);
  return false;
}

async function showReportForm() {
  if (!requireLogin('creare una segnalazione')) return;
  $('#report-error').textContent = '';
  history.pushState({}, '', `${location.pathname}${location.search}#nuova-segnalazione`);
  await syncPageRoute();
  $('#new-report-title').focus();
}

function showPrioritySection() {
  history.pushState({}, '', `${location.pathname}${location.search}#come-funziona`);
  syncPageRoute();
  $('#come-funziona').scrollIntoView({ behavior: 'smooth' });
}

function showPublicReports() {
  history.pushState({}, '', `${location.pathname}${location.search}#segnalazioni`);
  syncPageRoute();
  $('#segnalazioni').scrollIntoView({ behavior: 'smooth' });
}

function showProfilePage() {
  history.pushState({}, '', `${location.pathname}${location.search}#profilo`);
  syncPageRoute();
  $('#profile-page').scrollIntoView({ behavior: 'smooth' });
}

function showMinePage() {
  $('#mine-panel').classList.remove('hidden');
  $('#mine-panel').scrollIntoView({ behavior: 'smooth' });
  if (location.hash !== '#segnalazioni') {
    history.pushState({}, '', `${location.pathname}${location.search}#segnalazioni`);
  }
}

function showModerationPage() {
  history.pushState({}, '', `${location.pathname}${location.search}#moderazione`);
  syncPageRoute();
  $('#moderation-panel').scrollIntoView({ behavior: 'smooth' });
}

function showAdminPage() {
  history.pushState({}, '', `${location.pathname}${location.search}#amministrazione`);
  syncPageRoute();
  $('#admin-panel').scrollIntoView({ behavior: 'smooth' });
}

function renderProfilePage() {
  if (!state.user) return;
  const profile = state.user;
  const accountStatus = { ATTIVO: 'Attivo', SOSPESO: 'Sospeso', ELIMINATO: 'Eliminato' }[profile.accountStatus] || 'Non specificato';
  $('#profile-content').innerHTML = `
    <section class="profile-section" aria-labelledby="profile-personal-title">
      <h3 id="profile-personal-title">Dati personali</h3>
      <dl class="profile-grid">
        <div><dt>Nome</dt><dd>${escapeHtml(profile.firstName || 'Non specificato')}</dd></div>
        <div><dt>Cognome</dt><dd>${escapeHtml(profile.lastName || 'Non specificato')}</dd></div>
        <div><dt>Indirizzo e-mail</dt><dd>${escapeHtml(profile.email || 'Non specificato')}</dd></div>
        <div><dt>Quartiere di residenza</dt><dd>${escapeHtml(profile.neighborhoodName || 'Non specificato')}</dd></div>
      </dl>
    </section>
    <section class="profile-section" aria-labelledby="profile-account-title">
      <h3 id="profile-account-title">Account</h3>
      <dl class="profile-grid">
        <div><dt>Ruolo</dt><dd>${escapeHtml(profile.role || 'Non specificato')}</dd></div>
        <div><dt>Stato</dt><dd>${escapeHtml(accountStatus)}</dd></div>
        <div><dt>Data di registrazione</dt><dd>${profile.registeredAt ? escapeHtml(formatDate(profile.registeredAt)) : 'Non specificato'}</dd></div>
      </dl>
    </section>
  `;
}

async function loadProfilePage() {
  const content = $('#profile-content');
  content.setAttribute('aria-busy', 'true');
  content.innerHTML = '<p role="status">Caricamento del profilo…</p>';
  try {
    const { user } = await api('/auth/me');
    state.user = user;
    updateAccountUi();
    renderProfilePage();
  } catch (error) {
    if (error.code === 'AUTH_REQUIRED') {
      state.user = null;
      updateAccountUi();
      history.replaceState({}, '', `${location.pathname}${location.search}#segnalazioni`);
      await syncPageRoute();
      showAuth('login');
      showToast('La sessione è scaduta. Accedi di nuovo per visualizzare il profilo.');
      return;
    }
    content.innerHTML = `<div class="profile-error" role="alert"><p>${escapeHtml(error.message)}</p><button class="button button-ghost" data-profile-retry type="button">Riprova</button></div>`;
  } finally {
    content.removeAttribute('aria-busy');
  }
}

async function syncPageRoute() {
  const currentHash = location.hash || '#segnalazioni';
  const isReportPage = currentHash === '#nuova-segnalazione';
  const isModerationPage = currentHash === '#moderazione';
  const isAdminPage = currentHash === '#amministrazione';
  const isProfilePage = currentHash === '#profilo';
  const isPriorityPage = currentHash === '#come-funziona';

  if (isReportPage && !state.user) {
    history.replaceState({}, '', `${location.pathname}${location.search}`);
    document.body.classList.remove('is-report-page');
    $('#new-report-page').classList.add('hidden');
    showAuth('login');
    showToast('Accedi per creare una segnalazione.');
    return;
  }

  if (isProfilePage && !state.user) {
    history.replaceState({}, '', `${location.pathname}${location.search}#segnalazioni`);
    showAuth('login');
    showToast('Accedi per visualizzare il tuo profilo.');
    return;
  }

  const isStandalonePage = isReportPage || isModerationPage || isAdminPage || isProfilePage;
  $('#come-funziona').classList.toggle('hidden', isStandalonePage);
  $('#segnalazioni').classList.toggle('hidden', isStandalonePage);
  $('#mine-panel').classList.toggle('hidden', isStandalonePage || !state.user);
  $('#moderation-panel').classList.toggle('hidden', !isModerationPage);
  $('#admin-panel').classList.toggle('hidden', !isAdminPage);
  $('#new-report-page').classList.toggle('hidden', !isReportPage);
  $('#profile-page').classList.toggle('hidden', !isProfilePage);
  $('#home-map-section').classList.toggle('hidden', isStandalonePage);
  document.body.classList.toggle('is-report-page', isReportPage);
  document.body.classList.toggle('is-workspace-page', isModerationPage || isAdminPage || isProfilePage);
  if (!isStandalonePage) requestAnimationFrame(() => state.publicReportsMap?.invalidateSize());

  if (isProfilePage && state.user) {
    await loadProfilePage();
    return;
  }

  if (isReportPage) {
    if (!state.reportMap) await initReportMap();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    requestAnimationFrame(() => {
      state.reportMap?.invalidateSize();
      if (state.nilLayer && !state.reportMarker) state.reportMap.fitBounds(state.nilLayer.getBounds(), { padding: [12, 12] });
    });
    return;
  }

  if (isModerationPage) {
    await loadModeration();
    return;
  }

  if (isAdminPage) {
    await loadAdmin();
    return;
  }

  if (isPriorityPage) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

async function submitReport(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const categoryIds = formData.getAll('categoryIds');
  formData.delete('categoryIds');
  formData.set('categoryIds', JSON.stringify(categoryIds));
  if (!categoryIds.length) { $('#report-error').textContent = 'Scegli almeno una categoria.'; return; }
  if (!$('#report-latitude').value || !$('#report-longitude').value || !$('#report-neighborhood').value) {
    $('#report-error').textContent = 'Cerca l’indirizzo e scegli un punto dentro un quartiere NIL di Milano.';
    return;
  }
  if (!$('#confirm-neighborhood').checked) {
    $('#report-error').textContent = 'Conferma che il quartiere indicato sulla mappa è corretto.';
    return;
  }
  setBusy(form, true);
  $('#report-error').textContent = '';
  try {
    await api('/reports', { method: 'POST', body: formData });
    form.reset();
    history.replaceState({}, '', `${location.pathname}${location.search}#segnalazioni`);
    syncPageRoute();
    showToast('Segnalazione inviata al comitato per la verifica.');
    await Promise.all([loadReports(1), loadPublicReportsMap()]);
    $('#segnalazioni').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    $('#report-error').textContent = error.message;
  } finally { setBusy(form, false); }
}

async function toggleSupport(button) {
  if (!requireLogin('sostenere una segnalazione')) return;
  const active = button.dataset.active === 'true';
  button.disabled = true;
  try {
    await api(`/reports/${button.dataset.support}/support`, { method: active ? 'DELETE' : 'POST' });
    showToast(active ? 'Sostegno rimosso.' : 'Hai sostenuto questa priorità.');
    await loadReports();
  } catch (error) { showToast(error.message); }
  finally { button.disabled = false; }
}

async function showDetail(id) {
  try {
    const { report } = await api(`/reports/${id}`);
    state.publishedMap?.remove();
    state.publishedMap = null;
    const attachments = report.attachments.map((attachment) => {
      const source = `/api/reports/attachments/${attachment.id}/file`;
      return attachment.mediaType === 'IMMAGINE'
        ? `<div class="attachment-item"><img data-detail-photo src="${source}" alt="Allegato della segnalazione: ${escapeHtml(attachment.originalName)}" loading="lazy"><span class="media-fallback hidden" data-media-fallback>Foto non disponibile</span></div>`
        : `<div class="attachment-item"><video data-detail-video src="${source}" controls aria-label="Allegato video ${escapeHtml(attachment.originalName)}"></video><span class="media-fallback hidden" data-media-fallback>Video non disponibile</span></div>`;
    }).join('');
    $('#report-detail').innerHTML = `
      <div class="dialog-heading"><p class="eyebrow">${escapeHtml(report.statusName)}</p><h2>${escapeHtml(report.title)}</h2></div>
      <div class="detail-meta"><span>${escapeHtml(report.neighborhoodName)}</span><span>${formatDate(report.createdAt)}</span><span>${report.supportCount} sostegni</span>${report.authorDisplayName ? `<span>di ${escapeHtml(report.authorDisplayName)}</span>` : ''}</div>
      <div class="tag-list">${report.categories.map((category) => `<span class="tag">${escapeHtml(category)}</span>`).join('')}</div>
      <p class="detail-copy">${escapeHtml(report.description)}</p>
      ${report.latitude !== null && report.longitude !== null ? `<section class="detail-map-section"><h3>Posizione</h3>${report.address ? `<p>${escapeHtml(report.address)}</p>` : ''}<div id="published-report-map" role="application" aria-label="Mappa della segnalazione"></div><p class="map-attribution">Mappa © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a></p></section>` : report.address ? `<p><strong>Posizione:</strong> ${escapeHtml(report.address)}</p>` : ''}
      <div class="attachment-grid">${attachments}</div>
      ${report.history.length ? `<h3>Storia della segnalazione</h3><div class="timeline">${report.history.map((item) => `<article><h4>${escapeHtml(item.statusName)}</h4><p>${formatDate(item.changedAt)} · ${escapeHtml(item.reason)}${item.operatorName ? ` · ${escapeHtml(item.operatorName)}` : ''}</p></article>`).join('')}</div>` : ''}
    `;
    openDialog($('#detail-dialog'));
    if (report.latitude !== null && report.longitude !== null) {
      const position = L.latLng(report.latitude, report.longitude);
      state.publishedMap = L.map('published-report-map', { scrollWheelZoom: false }).setView(position, 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(state.publishedMap);
      L.marker(position).addTo(state.publishedMap).bindPopup(escapeHtml(report.address || report.neighborhoodName));
      requestAnimationFrame(() => state.publishedMap?.invalidateSize());
    }
  } catch (error) { showToast(error.message); }
}

async function loadModeration() {
  const panel = $('#moderation-panel');
  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior: 'smooth' });
  try {
    const data = await api('/reports/moderation?page=1&limit=50');
    $('#moderation-list').innerHTML = data.items.map((report) => `
      <article class="workspace-item">
        <div><h3>${escapeHtml(report.title)}</h3><p>${escapeHtml(report.neighborhoodName)} · ${escapeHtml(report.statusName)} · ${report.categories.map(escapeHtml).join(', ')}</p></div>
        <div class="workspace-actions">
          <button class="button button-small button-ghost" data-detail="${report.id}">Apri</button>
          <select aria-label="Nuovo stato" data-state-select="${report.id}">${state.meta.statuses.map((status) => `<option value="${status.id}" ${status.id === report.statusId ? 'selected' : ''}>${escapeHtml(status.name)}</option>`).join('')}</select>
          <button class="button button-small button-primary" data-change-state="${report.id}">Aggiorna</button>
        </div>
      </article>
    `).join('') || '<p>Nessuna segnalazione da moderare.</p>';
  } catch (error) { showToast(error.message); }
}

async function loadMine() {
  const panel = $('#mine-panel');
  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior: 'smooth' });
  try {
    const data = await api('/reports/mine?page=1&limit=50');
    $('#mine-list').innerHTML = data.items.map((report) => `
      <article class="workspace-item">
        <div><h3>${escapeHtml(report.title)}</h3><p>${escapeHtml(report.neighborhoodName)} · ${escapeHtml(report.statusName)} · ${formatDate(report.createdAt)}</p></div>
        <button class="button button-small button-primary" data-detail="${report.id}">Apri e segui</button>
      </article>
    `).join('') || '<p>Non hai ancora inviato segnalazioni.</p>';
  } catch (error) { showToast(error.message); }
}

async function changeState(reportId) {
  const stateId = $(`[data-state-select="${reportId}"]`).value;
  const reason = window.prompt('Motivazione del cambiamento di stato:');
  if (!reason) return;
  try {
    await api(`/reports/${reportId}/state`, { method: 'PATCH', body: jsonBody({ stateId, reason }) });
    showToast('Stato aggiornato e registrato nello storico.');
    await Promise.all([loadModeration(), loadReports()]);
  } catch (error) { showToast(error.message); }
}

async function loadAdmin() {
  const panel = $('#admin-panel');
  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior: 'smooth' });
  try {
    const data = await api('/admin/users?page=1&limit=50');
    $('#users-list').innerHTML = data.items.map((user) => `
      <div class="user-row" data-user="${user.id}">
        <div><strong>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</strong><small>${escapeHtml(user.email)}</small></div>
        <select data-user-role aria-label="Ruolo di ${escapeHtml(user.firstName)}"><option ${user.role === 'CITTADINO' ? 'selected' : ''}>CITTADINO</option><option ${user.role === 'MODERATORE' ? 'selected' : ''}>MODERATORE</option><option ${user.role === 'AMMINISTRATORE' ? 'selected' : ''}>AMMINISTRATORE</option></select>
        <select data-user-status aria-label="Stato di ${escapeHtml(user.firstName)}"><option ${user.accountStatus === 'ATTIVO' ? 'selected' : ''}>ATTIVO</option><option ${user.accountStatus === 'SOSPESO' ? 'selected' : ''}>SOSPESO</option><option ${user.accountStatus === 'ELIMINATO' ? 'selected' : ''}>ELIMINATO</option></select>
      </div>
    `).join('');
  } catch (error) { showToast(error.message); }
}

async function updateAdminUser(row) {
  try {
    await api(`/admin/users/${row.dataset.user}`, { method: 'PATCH', body: jsonBody({ role: $('[data-user-role]', row).value, accountStatus: $('[data-user-status]', row).value }) });
    showToast('Utente aggiornato.');
  } catch (error) { showToast(error.message); await loadAdmin(); }
}

async function submitAdminEntity(event, kind) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form));
  if ('municipality' in values) values.municipality = values.municipality || null;
  try {
    await api(`/admin/${kind}`, { method: 'POST', body: jsonBody(values) });
    form.reset();
    await loadMeta();
    showToast(kind === 'categories' ? 'Categoria aggiunta.' : 'Quartiere aggiunto.');
  } catch (error) { showToast(error.message); }
}

function bindEvents() {
  $('#login-button').addEventListener('click', () => showAuth('login'));
  $('#register-button').addEventListener('click', () => showAuth('register'));
  $('#hero-report-button').addEventListener('click', showReportForm);
  $('#new-report-button').addEventListener('click', showReportForm);
  $('#priority-link').addEventListener('click', showPrioritySection);
  $('#segnalazioni-link').addEventListener('click', showPublicReports);
  $('#profile-link').addEventListener('click', showProfilePage);
  $('#mine-new-report-button').addEventListener('click', showReportForm);
  $('#report-back-button').addEventListener('click', showPublicReports);
  $('#auth-form').addEventListener('submit', submitAuth);
  $('#report-form').addEventListener('submit', submitReport);
  $('#report-form').addEventListener('reset', resetReportLocation);
  $('#search-address-button').addEventListener('click', searchAddressOnMap);
  $('#use-current-location').addEventListener('click', useCurrentLocation);
  $('#address-results').addEventListener('change', selectAddressResult);
  $('#refresh-public-map').addEventListener('click', loadPublicReportsMap);
  $('#report-address').addEventListener('input', () => {
    if (state.reportMarker) {
      state.reportMap.removeLayer(state.reportMarker);
      state.reportMarker = null;
    }
    $('#report-latitude').value = '';
    $('#report-longitude').value = '';
    $('#report-neighborhood').value = '';
    $('#confirm-neighborhood').checked = false;
    $('#confirm-neighborhood').disabled = true;
    $('#address-search-status').textContent = '';
    $('#report-map-status').textContent = 'Cerca di nuovo l’indirizzo per aggiornare la puntina.';
  });
  $('#report-neighborhood').addEventListener('change', () => {
    $('#confirm-neighborhood').checked = false;
    const name = $('#report-neighborhood').selectedOptions[0]?.textContent;
    const latitude = Number($('#report-latitude').value);
    const longitude = Number($('#report-longitude').value);
    const feature = state.nilFeatures.find((item) => booleanPointInPolygon(
      { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [longitude, latitude] } },
      item
    ));
    const pointNeighborhood = state.meta.neighborhoods.find((item) => item.isNil
      && normalizePlaceName(item.name) === normalizePlaceName(feature?.properties.NIL));
    const matchesPoint = pointNeighborhood && String(pointNeighborhood.id) === $('#report-neighborhood').value;
    $('#confirm-neighborhood').disabled = !matchesPoint;
    if ($('#report-neighborhood').value && matchesPoint) {
      $('#confirm-neighborhood-label').textContent = `Confermo che ${name} è il quartiere corretto`;
      $('#report-map-status').textContent = `Il NIL ${name} corrisponde alla posizione della puntina. Conferma la scelta.`;
    } else if ($('#report-neighborhood').value) {
      $('#confirm-neighborhood-label').textContent = 'Il quartiere deve corrispondere alla posizione sulla mappa';
      $('#report-map-status').textContent = 'Sposta la puntina nel quartiere scelto per poterlo confermare.';
    }
  });
  $('#filters-form').addEventListener('submit', (event) => { event.preventDefault(); loadReports(1); });
  $('#filters-form').addEventListener('change', (event) => {
    if (event.target.matches('select')) loadReports(1);
  });
  let searchTimer;
  $('#filters-form [name="search"]').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadReports(1), 300);
  });
  $('#logout-button').addEventListener('click', async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch (error) { showToast(error.message); }
    state.user = null; updateAccountUi(); await refreshCsrf(); await loadReports(1);
  });
  $('#moderation-link').addEventListener('click', showModerationPage);
  $('#mine-mobile-button').addEventListener('click', showMinePage);
  $('#admin-link').addEventListener('click', showAdminPage);
  $('#neighborhood-form').addEventListener('submit', (event) => submitAdminEntity(event, 'neighborhoods'));
  $('#category-form').addEventListener('submit', (event) => submitAdminEntity(event, 'categories'));
  $$('.dialog-close').forEach((button) => button.addEventListener('click', () => closeDialog(button.closest('dialog'))));
  $$('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog(dialog);
  }));
  document.addEventListener('click', (event) => {
    const detail = event.target.closest('[data-detail]');
    const support = event.target.closest('[data-support]');
    const page = event.target.closest('[data-page]');
    const stateButton = event.target.closest('[data-change-state]');
    const profileRetry = event.target.closest('[data-profile-retry]');
    if (detail) showDetail(detail.dataset.detail);
    if (support) toggleSupport(support);
    if (page && !page.disabled) loadReports(Number(page.dataset.page));
    if (stateButton) changeState(stateButton.dataset.changeState);
    if (profileRetry) loadProfilePage();
  });
  document.addEventListener('error', (event) => {
    const media = event.target;
    if (!media.matches?.('[data-report-photo], [data-detail-photo], [data-detail-video]')) return;
    media.classList.add('hidden');
    media.closest('.report-card-media, .attachment-item')?.querySelector('[data-media-fallback]')?.classList.remove('hidden');
  }, true);
  window.addEventListener('popstate', syncPageRoute);
  window.addEventListener('hashchange', syncPageRoute);
  $('#users-list').addEventListener('change', (event) => {
    const row = event.target.closest('[data-user]');
    if (row) updateAdminUser(row);
  });
}

async function init() {
  bindEvents();
  await refreshCsrf();
  await Promise.all([loadSession(), loadMeta()]);
  await initPublicReportsMap();
  window.setInterval(() => {
    if (document.visibilityState === 'visible'
      && !document.body.classList.contains('is-report-page')
      && !document.body.classList.contains('is-workspace-page')) loadPublicReportsMap();
  }, 60_000);
  await initReportMap();
  await loadReports(1);
  syncPageRoute();
}

init().catch((error) => {
  console.error(error);
  $('#reports-status').textContent = 'Non è stato possibile avviare l’applicazione. Verifica che il server e MySQL siano attivi.';
});
