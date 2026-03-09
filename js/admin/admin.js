import { storage, STORAGE_KEYS, createDownload, readFileAsText, readFileAsDataUrl } from '../core/storage.js';
import { ContentManager } from '../core/content-manager.js';
import { loadProfile, saveProfile, togglePackageForProfile } from '../core/profile-manager.js';
import { DEFAULT_GAME_CONFIG } from '../core/fallback-content.js';

const refs = {
  loginPanel: document.getElementById('loginPanel'),
  adminPanel: document.getElementById('adminPanel'),
  loginForm: document.getElementById('loginForm'),
  logoutButton: document.getElementById('logoutButton'),
  adminStats: document.getElementById('adminStats'),
  packageGrid: document.getElementById('adminPackageGrid'),
  exportStateButton: document.getElementById('exportStateButton'),
  importStateInput: document.getElementById('importStateInput'),
  loadTemplateButton: document.getElementById('loadTemplateButton'),
  credentialForm: document.getElementById('credentialForm'),
  packageForm: document.getElementById('packageForm'),
  editorTitle: document.getElementById('editorTitle'),
  editorTag: document.getElementById('editorTag'),
  clearEditorButton: document.getElementById('clearEditorButton'),
  importPackageInput: document.getElementById('importPackageInput'),
  coverImageInput: document.getElementById('coverImageInput'),
  configForm: document.getElementById('configForm'),
  toastLayer: document.getElementById('adminToastLayer')
};

const state = {
  contentManager: new ContentManager('./content'),
  profile: loadProfile(),
  catalog: null,
  coverImage: '',
  editingPackageId: null
};

const ADMIN_SESSION_KEY = 'skyflow.admin.session';
const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'tower123'
};

const toast = (message, type = 'info') => {
  const node = document.createElement('article');
  node.className = `toast ${type === 'warning' ? 'warning' : type === 'danger' ? 'danger' : ''}`;
  node.textContent = message;
  refs.toastLayer.append(node);
  setTimeout(() => node.remove(), 2800);
};

const getAdminCredentials = () => storage.get(STORAGE_KEYS.ADMIN, DEFAULT_ADMIN);
const saveAdminCredentials = (credentials) => storage.set(STORAGE_KEYS.ADMIN, credentials);

const sanitizeEditorData = (formData) => ({
  id: String(formData.get('id') || '').trim(),
  title: String(formData.get('title') || '').trim(),
  subtitle: String(formData.get('subtitle') || '').trim(),
  version: String(formData.get('version') || '1.0.0').trim() || '1.0.0',
  unlockRank: String(formData.get('unlockRank') || 'cadet'),
  description: String(formData.get('description') || '').trim(),
  theme: {
    accent: String(formData.get('accent') || '#72f6d5'),
    glow: String(formData.get('glow') || '#6da9ff'),
    surface: '#0f1830'
  }
});

const setAuthState = (authenticated) => {
  refs.loginPanel.hidden = authenticated;
  refs.adminPanel.hidden = !authenticated;
  refs.logoutButton.hidden = !authenticated;
  if (authenticated) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
  } else {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }
};

const renderStats = () => {
  const packages = state.contentManager.getAllPackages();
  const customPackages = packages.filter((pkg) => pkg.origin === 'custom');
  const activePackages = state.profile.activePackages || [];
  refs.adminStats.innerHTML = `
    <article class="stat-surface"><span class="stat-label">Pacotes</span><strong>${packages.length}</strong><small>Total carregado</small></article>
    <article class="stat-surface"><span class="stat-label">Custom</span><strong>${customPackages.length}</strong><small>Editor local</small></article>
    <article class="stat-surface"><span class="stat-label">Ativos</span><strong>${activePackages.length}</strong><small>No perfil atual</small></article>
    <article class="stat-surface"><span class="stat-label">XP perfil</span><strong>${state.profile.xp}</strong><small>Reflete no unlock</small></article>
  `;
};

const packageCoverStyle = (pkg) => {
  if (pkg.coverImage) return `background-image: url('${pkg.coverImage}');`;
  if (pkg.coverAsset) return `background-image: url('${pkg.coverAsset}');`;
  return `background-image: linear-gradient(135deg, ${pkg.theme?.accent || '#72f6d5'}, ${pkg.theme?.glow || '#6da9ff'});`;
};

const renderPackages = () => {
  const packages = state.contentManager.getAllPackages();
  refs.packageGrid.innerHTML = packages.map((pkg) => {
    const active = (state.profile.activePackages || []).includes(pkg.id) || pkg.enabledByDefault;
    const builtIn = pkg.origin !== 'custom';
    return `
      <article class="package-card ${active ? 'is-active' : ''}">
        <div class="package-cover" style="${packageCoverStyle(pkg)}"></div>
        <div>
          <p class="eyebrow">${builtIn ? 'Built-in' : 'Custom local'}</p>
          <h4>${pkg.title}</h4>
          <p class="supporting-text">${pkg.description}</p>
        </div>
        <div class="package-meta">
          <span>${pkg.stats.airports} aeroportos</span>
          <span>${pkg.stats.routes} rotas</span>
          <span>${pkg.stats.scenarios} cenários</span>
        </div>
        <div class="hero-actions">
          <button class="secondary-button" type="button" data-package-clone="${pkg.id}">${builtIn ? 'Clonar' : 'Editar'}</button>
          <button class="secondary-button" type="button" data-package-toggle="${pkg.id}" ${pkg.id === 'core' ? 'disabled' : ''}>${active ? 'Desativar' : 'Ativar'}</button>
          ${builtIn ? '' : `<button class="secondary-button" type="button" data-package-delete="${pkg.id}">Excluir</button>`}
          <button class="secondary-button" type="button" data-package-export="${pkg.id}">Exportar</button>
        </div>
      </article>
    `;
  }).join('');
};

const renderConfig = () => {
  const config = { ...DEFAULT_GAME_CONFIG, ...(storage.get(STORAGE_KEYS.GAME_CONFIG, {}) || {}) };
  Object.entries(config).forEach(([key, value]) => {
    const input = refs.configForm.elements.namedItem(key);
    if (input) {
      input.value = String(value);
    }
  });
};

const fillEditor = (pkg) => {
  refs.editorTitle.textContent = pkg?.id ? `Editar ${pkg.title}` : 'Novo pacote';
  refs.editorTag.textContent = pkg?.origin === 'custom' ? 'Pacote local' : 'Clonando built-in';
  refs.packageForm.elements.id.value = pkg?.id || '';
  refs.packageForm.elements.title.value = pkg?.title || '';
  refs.packageForm.elements.subtitle.value = pkg?.subtitle || '';
  refs.packageForm.elements.version.value = pkg?.version || '1.0.0';
  refs.packageForm.elements.unlockRank.value = pkg?.unlockRank || 'cadet';
  refs.packageForm.elements.accent.value = pkg?.theme?.accent || '#72f6d5';
  refs.packageForm.elements.glow.value = pkg?.theme?.glow || '#6da9ff';
  refs.packageForm.elements.description.value = pkg?.description || '';
  refs.packageForm.elements.airports.value = JSON.stringify(pkg?.datasets?.airports || [], null, 2);
  refs.packageForm.elements.routes.value = JSON.stringify(pkg?.datasets?.routes || [], null, 2);
  refs.packageForm.elements.scenarios.value = JSON.stringify(pkg?.datasets?.scenarios || [], null, 2);
  state.coverImage = pkg?.coverImage || '';
  state.editingPackageId = pkg?.id || null;
};

const clearEditor = () => {
  refs.packageForm.reset();
  refs.packageForm.elements.version.value = '1.0.0';
  refs.packageForm.elements.unlockRank.value = 'cadet';
  refs.packageForm.elements.accent.value = '#72f6d5';
  refs.packageForm.elements.glow.value = '#6da9ff';
  refs.packageForm.elements.airports.value = '[]';
  refs.packageForm.elements.routes.value = '[]';
  refs.packageForm.elements.scenarios.value = '[]';
  refs.editorTitle.textContent = 'Novo pacote';
  refs.editorTag.textContent = 'JSON validado no save';
  state.coverImage = '';
  state.editingPackageId = null;
};

const bootCatalog = async () => {
  await state.contentManager.loadCatalog();
  state.catalog = state.contentManager.catalog;
  renderStats();
  renderPackages();
  renderConfig();
};

refs.loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(refs.loginForm);
  const credentials = getAdminCredentials();
  const valid =
    String(formData.get('username') || '').trim() === credentials.username &&
    String(formData.get('password') || '') === credentials.password;

  if (!valid) {
    toast('Credenciais inválidas.', 'danger');
    return;
  }

  setAuthState(true);
  bootCatalog();
  toast('Admin liberado.');
});

refs.logoutButton.addEventListener('click', () => {
  setAuthState(false);
});

refs.credentialForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(refs.credentialForm);
  const credentials = {
    username: String(formData.get('username') || '').trim(),
    password: String(formData.get('password') || '')
  };
  if (!credentials.username || !credentials.password) {
    toast('Preencha usuário e senha.', 'warning');
    return;
  }
  saveAdminCredentials(credentials);
  toast('Credenciais locais atualizadas.');
  refs.credentialForm.reset();
});

refs.packageGrid.addEventListener('click', (event) => {
  const cloneButton = event.target.closest('[data-package-clone]');
  const toggleButton = event.target.closest('[data-package-toggle]');
  const deleteButton = event.target.closest('[data-package-delete]');
  const exportButton = event.target.closest('[data-package-export]');

  if (cloneButton) {
    const pkg = state.contentManager.getAllPackages().find((item) => item.id === cloneButton.dataset.packageClone);
    if (!pkg) return;
    const clone = JSON.parse(JSON.stringify(pkg));
    if (pkg.origin !== 'custom') {
      clone.id = `${pkg.id}_clone`;
      clone.title = `${pkg.title} Copy`;
      clone.origin = 'custom';
    }
    fillEditor(clone);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    return;
  }

  if (toggleButton) {
    const packageId = toggleButton.dataset.packageToggle;
    const active = (state.profile.activePackages || []).includes(packageId);
    state.profile = togglePackageForProfile(state.profile, packageId, !active);
    saveProfile(state.profile);
    renderStats();
    renderPackages();
    toast(active ? 'Pacote desativado no perfil atual.' : 'Pacote ativado no perfil atual.');
    return;
  }

  if (deleteButton) {
    state.contentManager.deleteCustomPackage(deleteButton.dataset.packageDelete);
    bootCatalog();
    clearEditor();
    toast('Pacote custom removido.');
    return;
  }

  if (exportButton) {
    const pkg = state.contentManager.getAllPackages().find((item) => item.id === exportButton.dataset.packageExport);
    if (!pkg) return;
    createDownload(`${pkg.id}.json`, pkg);
  }
});

refs.loadTemplateButton.addEventListener('click', () => {
  fillEditor(state.contentManager.getSampleTemplate());
  toast('Template carregado no editor.');
});

refs.clearEditorButton.addEventListener('click', () => {
  clearEditor();
});

refs.coverImageInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  state.coverImage = await readFileAsDataUrl(file);
  toast('Imagem de cover carregada.');
});

refs.packageForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const formData = new FormData(refs.packageForm);
    const baseData = sanitizeEditorData(formData);
    const pkg = {
      ...baseData,
      type: 'dlc',
      coverImage: state.coverImage,
      datasets: {
        airports: JSON.parse(String(formData.get('airports') || '[]')),
        routes: JSON.parse(String(formData.get('routes') || '[]')),
        scenarios: JSON.parse(String(formData.get('scenarios') || '[]'))
      }
    };
    state.contentManager.saveCustomPackage(pkg);
    await bootCatalog();
    fillEditor(pkg);
    toast('Pacote salvo com sucesso.');
  } catch (error) {
    console.error(error);
    toast(`Falha ao salvar pacote: ${error.message}`, 'danger');
  }
});

refs.importPackageInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await readFileAsText(file);
    const payload = JSON.parse(text);
    if (payload.customPackages || payload.gameConfig) {
      state.contentManager.importState(payload);
      await bootCatalog();
      toast('Estado importado para o Admin.');
      return;
    }
    fillEditor(payload);
    toast('Pacote importado no editor.');
  } catch (error) {
    toast('Arquivo JSON inválido.', 'danger');
  }
});

refs.importStateInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await readFileAsText(file);
    state.contentManager.importState(JSON.parse(text));
    await bootCatalog();
    toast('Estado completo importado.');
  } catch (error) {
    toast('Não foi possível importar o estado.', 'danger');
  }
});

refs.exportStateButton.addEventListener('click', () => {
  createDownload('skyflow-admin-state.json', state.contentManager.exportState());
});

refs.configForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(refs.configForm);
  const config = {
    defaultPilotName: String(formData.get('defaultPilotName') || DEFAULT_GAME_CONFIG.defaultPilotName),
    starterCredits: Number(formData.get('starterCredits') || DEFAULT_GAME_CONFIG.starterCredits),
    baseSpawnInterval: Number(formData.get('baseSpawnInterval') || DEFAULT_GAME_CONFIG.baseSpawnInterval),
    baseConflictRadius: Number(formData.get('baseConflictRadius') || DEFAULT_GAME_CONFIG.baseConflictRadius),
    sessionDuration: Number(formData.get('sessionDuration') || DEFAULT_GAME_CONFIG.sessionDuration),
    scorePerLanding: Number(formData.get('scorePerLanding') || DEFAULT_GAME_CONFIG.scorePerLanding)
  };
  storage.set(STORAGE_KEYS.GAME_CONFIG, config);
  toast('Configuração global salva.');
});

const init = async () => {
  saveAdminCredentials(getAdminCredentials());
  const authenticated = sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
  setAuthState(authenticated);
  if (authenticated) {
    await bootCatalog();
  }
  clearEditor();
};

init().catch((error) => {
  console.error(error);
  toast('Falha ao iniciar o Admin.', 'danger');
});