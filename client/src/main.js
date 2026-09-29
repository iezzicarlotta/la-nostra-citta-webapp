import './styles.css';
import { api, jsonBody, refreshCsrf } from './api.js';

const state = {
  user: null,
  meta: { neighborhoods: [], categories: [], statuses: [] },
  reports: [],
  page: 1,
  total: 0,
  limit: 12,
  authMode: 'login'
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
  $('#user-greeting').classList.toggle('hidden', !loggedIn);
  $('#user-greeting').textContent = loggedIn ? `Ciao, ${state.user.firstName}` : '';
  $('#mine-link').classList.toggle('hidden', !loggedIn);
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
  populateSelect($('#report-form [name="neighborhoodId"]'), state.meta.neighborhoods, 'Seleziona');
  $('#category-checkboxes').innerHTML = state.meta.categories.map((category) => `
    <label><input type="checkbox" name="categoryIds" value="${category.id}"> ${escapeHtml(category.name)}</label>
  `).join('');
}

function reportCard(report) {
  return `
    <article class="report-card">
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

function showReportForm() {
  if (!requireLogin('creare una segnalazione')) return;
  $('#report-error').textContent = '';
  openDialog($('#report-dialog'));
}

async function submitReport(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const categoryIds = formData.getAll('categoryIds');
  formData.delete('categoryIds');
  formData.set('categoryIds', JSON.stringify(categoryIds));
  if (!categoryIds.length) { $('#report-error').textContent = 'Scegli almeno una categoria.'; return; }
  setBusy(form, true);
  $('#report-error').textContent = '';
  try {
    await api('/reports', { method: 'POST', body: formData });
    form.reset();
    closeDialog($('#report-dialog'));
    showToast('Segnalazione inviata al comitato per la verifica.');
    await loadReports(1);
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
    const attachments = report.attachments.map((attachment) => {
      const source = `/api/reports/attachments/${attachment.id}/file`;
      return attachment.mediaType === 'IMMAGINE'
        ? `<img src="${source}" alt="Allegato della segnalazione: ${escapeHtml(attachment.originalName)}">`
        : `<video src="${source}" controls aria-label="Allegato video ${escapeHtml(attachment.originalName)}"></video>`;
    }).join('');
    $('#report-detail').innerHTML = `
      <div class="dialog-heading"><p class="eyebrow">${escapeHtml(report.statusName)}</p><h2>${escapeHtml(report.title)}</h2></div>
      <div class="detail-meta"><span>${escapeHtml(report.neighborhoodName)}</span><span>${formatDate(report.createdAt)}</span><span>${report.supportCount} sostegni</span>${report.authorDisplayName ? `<span>di ${escapeHtml(report.authorDisplayName)}</span>` : ''}</div>
      <div class="tag-list">${report.categories.map((category) => `<span class="tag">${escapeHtml(category)}</span>`).join('')}</div>
      <p class="detail-copy">${escapeHtml(report.description)}</p>
      ${report.address ? `<p><strong>Posizione:</strong> ${escapeHtml(report.address)}</p>` : ''}
      ${report.latitude !== null && report.longitude !== null ? `<p><a class="button button-small button-ghost" href="https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=18/${report.latitude}/${report.longitude}" target="_blank" rel="noreferrer">Apri sulla mappa</a></p>` : ''}
      <div class="attachment-grid">${attachments}</div>
      ${report.history.length ? `<h3>Storia della segnalazione</h3><div class="timeline">${report.history.map((item) => `<article><h4>${escapeHtml(item.statusName)}</h4><p>${formatDate(item.changedAt)} · ${escapeHtml(item.reason)}${item.operatorName ? ` · ${escapeHtml(item.operatorName)}` : ''}</p></article>`).join('')}</div>` : ''}
    `;
    openDialog($('#detail-dialog'));
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
  $('#auth-form').addEventListener('submit', submitAuth);
  $('#report-form').addEventListener('submit', submitReport);
  $('#filters-form').addEventListener('submit', (event) => { event.preventDefault(); loadReports(1); });
  $('#logout-button').addEventListener('click', async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch (error) { showToast(error.message); }
    state.user = null; updateAccountUi(); await refreshCsrf(); await loadReports(1);
  });
  $('#moderation-link').addEventListener('click', loadModeration);
  $('#mine-link').addEventListener('click', loadMine);
  $('#mine-mobile-button').addEventListener('click', loadMine);
  $('#admin-link').addEventListener('click', loadAdmin);
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
    if (detail) showDetail(detail.dataset.detail);
    if (support) toggleSupport(support);
    if (page && !page.disabled) loadReports(Number(page.dataset.page));
    if (stateButton) changeState(stateButton.dataset.changeState);
  });
  $('#users-list').addEventListener('change', (event) => {
    const row = event.target.closest('[data-user]');
    if (row) updateAdminUser(row);
  });
}

async function init() {
  bindEvents();
  await refreshCsrf();
  await Promise.all([loadSession(), loadMeta()]);
  await loadReports(1);
}

init().catch((error) => {
  console.error(error);
  $('#reports-status').textContent = 'Non è stato possibile avviare l’applicazione. Verifica che il server e MySQL siano attivi.';
});
