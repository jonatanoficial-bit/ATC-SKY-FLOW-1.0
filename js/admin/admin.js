import { storage } from '../core/storage.js';
import { ContentManager } from '../core/content-manager.js';

const refs = {
  loginPanel: document.getElementById('loginPanel'),
  adminPanel: document.getElementById('adminPanel'),
  loginForm: document.getElementById('loginForm'),
  logoutButton: document.getElementById('logoutButton'),
  adminStats: document.getElementById('adminStats'),
  adminPackageGrid: document.getElementById('adminPackageGrid'),
  packageForm: document.getElementById('packageForm'),
  editorTitle: document.getElementById('editorTitle'),
  editorTag: document.getElementById('editorTag'),
  clearEditorButton: document.getElementById('clearEditorButton'),
  exportStateButton: document.getElementById('exportStateButton'),
  importStateInput: document.getElementById('importStateInput'),
  loadTemplateButton: document.getElementById('loadTemplateButton'),
  importPackageInput: document.getElementById('importPackageInput'),
  configForm: document.getElementById('configForm'),
  coverImageInput: document.getElementById('coverImageInput'),
  credentialForm: document.getElementById('credentialForm'),
  toastLayer: document.getElementById('adminToastLayer'),
  adminBuildChip: document.getElementById('adminBuildChip'),
  adminCompletionChip: document.getElementById('adminCompletionChip')
};

const contentManager = new ContentManager('./content');
const AUTH_KEY = 'skyflow.admin.auth.v1';
const SESSION_KEY = 'skyflow.admin.session.v1';
let editingPackageId = null;
let coverDataUrl = '';


const applyBuildInfo = async () => {
  try {
    const info = await fetch('./build-info.json', { cache: 'no-store' }).then((res) => res.json());
    if (refs.adminBuildChip) refs.adminBuildChip.textContent = `Build: ${info.buildLocal}`;
    if (refs.adminCompletionChip) refs.adminCompletionChip.textContent = `Conclusão: ${info.completion}`;
  } catch {
    if (refs.adminBuildChip) refs.adminBuildChip.textContent = 'Build: indisponível';
    if (refs.adminCompletionChip) refs.adminCompletionChip.textContent = 'Conclusão: n/d';
  }
};

const showToast = (message, type = 'info') => {
  const toast = document.createElement('article');
  toast.className = `toast ${type === 'warning' ? 'warning' : type === 'danger' ? 'danger' : ''}`;
  toast.textContent = message;
  refs.toastLayer.append(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(12px)'; }, 2300);
  setTimeout(() => toast.remove(), 3100);
};

const getAuth = () => storage.get(AUTH_KEY, { username: 'admin', password: 'tower123' });
const setSession = (active) => storage.set(SESSION_KEY, { active });
const isLoggedIn = () => Boolean(storage.get(SESSION_KEY, { active: false }).active);
const downloadJson = (name, data) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};
const parseArray = (value, label) => {
  try {
    const parsed = JSON.parse(value || '[]');
    if (!Array.isArray(parsed)) throw new Error('Precisa ser array.');
    return parsed;
  } catch (error) {
    throw new Error(`${label}: ${error.message}`);
  }
};

const setWorkspaceVisibility = (active) => {
  refs.loginPanel.hidden = active;
  refs.adminPanel.hidden = !active;
  refs.logoutButton.hidden = !active;
};

const renderStats = async () => {
  await contentManager.loadCatalog();
  const builtIn = contentManager.builtInPackages.length;
  const custom = contentManager.getCustomPackages().length;
  const config = contentManager.getConfig();
  refs.adminStats.innerHTML = `
    <article class="stat-surface"><span class="stat-label">Built-in</span><strong>${builtIn}</strong><small>Pacotes fixos do jogo</small></article>
    <article class="stat-surface"><span class="stat-label">Custom</span><strong>${custom}</strong><small>Pacotes salvos localmente</small></article>
    <article class="stat-surface"><span class="stat-label">Spawn base</span><strong>${config.baseSpawnInterval}s</strong><small>Config global</small></article>
    <article class="stat-surface"><span class="stat-label">Duração padrão</span><strong>${config.sessionDuration}s</strong><small>Ruleset local</small></article>`;
};

const fillForm = (pkg = null) => {
  editingPackageId = pkg?.id || null;
  refs.editorTitle.textContent = pkg ? `Editar ${pkg.title}` : 'Novo pacote';
  refs.editorTag.textContent = pkg?.builtIn ? 'Clone built-in antes de salvar' : 'JSON validado no save';
  refs.packageForm.id.value = pkg?.id || '';
  refs.packageForm.title.value = pkg?.title || '';
  refs.packageForm.subtitle.value = pkg?.subtitle || '';
  refs.packageForm.version.value = pkg?.version || '1.0.0';
  refs.packageForm.unlockRank.value = pkg?.unlockRank || 'cadet';
  refs.packageForm.accent.value = pkg?.theme?.accent || '#72f6d5';
  refs.packageForm.glow.value = pkg?.theme?.glow || '#6da9ff';
  refs.packageForm.description.value = pkg?.description || '';
  refs.packageForm.airports.value = JSON.stringify(pkg?.datasets?.airports || [], null, 2);
  refs.packageForm.routes.value = JSON.stringify(pkg?.datasets?.routes || [], null, 2);
  refs.packageForm.scenarios.value = JSON.stringify(pkg?.datasets?.scenarios || [], null, 2);
  coverDataUrl = pkg?.coverImage || '';
};

const renderPackages = async () => {
  const packages = contentManager.getAllPackages();
  refs.adminPackageGrid.innerHTML = packages.map((pkg) => `
    <article class="package-card ${pkg.builtIn ? '' : 'is-active'}">
      <div class="package-cover" style="background-image:${pkg.coverImage ? `url('${pkg.coverImage}')` : `linear-gradient(135deg,${pkg.theme?.accent || '#72f6d5'},${pkg.theme?.glow || '#6da9ff'})`}"></div>
      <div><p class="eyebrow">${pkg.builtIn ? 'Built-in' : 'Custom'}</p><h4>${pkg.title}</h4><p class="supporting-text">${pkg.description}</p></div>
      <div class="package-meta"><span>${pkg.datasets.airports?.length || 0} aeroportos</span><span>${pkg.datasets.routes?.length || 0} rotas</span><span>${pkg.datasets.scenarios?.length || 0} cenários</span></div>
      <div class="hero-actions">
        <button class="secondary-button" type="button" data-clone="${pkg.id}">${pkg.builtIn ? 'Clonar' : 'Editar'}</button>
        <button class="primary-button" type="button" data-export="${pkg.id}">Exportar</button>
        ${pkg.builtIn ? '' : `<button class="secondary-button" type="button" data-delete="${pkg.id}">Remover</button>`}
      </div>
    </article>`).join('');
};

const refreshAll = async () => {
  await renderStats();
  await renderPackages();
  const config = contentManager.getConfig();
  Object.entries(config).forEach(([key, value]) => {
    if (refs.configForm[key]) refs.configForm[key].value = value;
  });
  const auth = getAuth();
  refs.credentialForm.username.value = auth.username;
  refs.credentialForm.password.value = auth.password;
};

const readFileAsJson = async (file) => JSON.parse(await file.text());
const readFileAsDataUrl = async (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

refs.loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(refs.loginForm);
  const auth = getAuth();
  if (form.get('username') === auth.username && form.get('password') === auth.password) {
    setSession(true);
    setWorkspaceVisibility(true);
    refreshAll();
    showToast('Admin liberado.');
  } else {
    showToast('Credenciais inválidas.', 'danger');
  }
});

refs.logoutButton.addEventListener('click', () => {
  setSession(false);
  setWorkspaceVisibility(false);
});

refs.coverImageInput.addEventListener('change', async () => {
  const [file] = refs.coverImageInput.files || [];
  if (!file) return;
  coverDataUrl = await readFileAsDataUrl(file);
  showToast('Cover carregada.');
});

refs.packageForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const form = new FormData(refs.packageForm);
    const pkg = {
      id: String(form.get('id')).trim(),
      title: String(form.get('title')).trim(),
      subtitle: String(form.get('subtitle')).trim(),
      version: String(form.get('version')).trim() || '1.0.0',
      type: 'custom',
      unlockRank: form.get('unlockRank'),
      enabledByDefault: false,
      description: String(form.get('description')).trim(),
      theme: {
        accent: form.get('accent'),
        glow: form.get('glow'),
        surface: '#11203c'
      },
      coverImage: coverDataUrl,
      datasets: {
        airports: parseArray(form.get('airports'), 'Aeroportos'),
        routes: parseArray(form.get('routes'), 'Rotas'),
        scenarios: parseArray(form.get('scenarios'), 'Cenários')
      }
    };
    if (!pkg.id || !pkg.title) throw new Error('ID e título são obrigatórios.');
    contentManager.upsertCustomPackage(pkg);
    fillForm();
    await refreshAll();
    showToast(editingPackageId ? 'Pacote atualizado.' : 'Pacote salvo.');
  } catch (error) {
    showToast(error.message, 'danger');
  }
});

refs.adminPackageGrid.addEventListener('click', async (event) => {
  const cloneId = event.target.closest('[data-clone]')?.dataset.clone;
  const exportId = event.target.closest('[data-export]')?.dataset.export;
  const deleteId = event.target.closest('[data-delete]')?.dataset.delete;
  const packageList = contentManager.getAllPackages();
  if (cloneId) {
    const pkg = packageList.find((entry) => entry.id === cloneId);
    if (!pkg) return;
    const editable = pkg.builtIn ? { ...pkg, id: `${pkg.id}_copy`, title: `${pkg.title} Copy`, builtIn: false } : pkg;
    fillForm(editable);
    showToast(pkg.builtIn ? 'Built-in carregado para clonagem.' : 'Pacote carregado no editor.');
  }
  if (exportId) {
    const pkg = packageList.find((entry) => entry.id === exportId);
    if (!pkg) return;
    downloadJson(`${pkg.id}.json`, pkg);
  }
  if (deleteId) {
    contentManager.removeCustomPackage(deleteId);
    await refreshAll();
    showToast('Pacote removido.', 'warning');
  }
});

refs.clearEditorButton.addEventListener('click', () => fillForm());
refs.exportStateButton.addEventListener('click', () => {
  downloadJson('skyflow-admin-state.json', {
    auth: getAuth(),
    config: contentManager.getConfig(),
    customPackages: contentManager.getCustomPackages()
  });
});
refs.importStateInput.addEventListener('change', async () => {
  const [file] = refs.importStateInput.files || [];
  if (!file) return;
  try {
    const data = await readFileAsJson(file);
    if (data.auth) storage.set(AUTH_KEY, data.auth);
    if (data.config) contentManager.saveConfig(data.config);
    if (Array.isArray(data.customPackages)) contentManager.saveCustomPackages(data.customPackages);
    await refreshAll();
    showToast('Estado importado.');
  } catch (error) {
    showToast(`Falha ao importar: ${error.message}`, 'danger');
  }
});
refs.importPackageInput.addEventListener('change', async () => {
  const [file] = refs.importPackageInput.files || [];
  if (!file) return;
  try {
    const pkg = await readFileAsJson(file);
    contentManager.upsertCustomPackage(pkg);
    await refreshAll();
    showToast('Pacote importado.');
  } catch (error) {
    showToast(`Erro no pacote: ${error.message}`, 'danger');
  }
});
refs.loadTemplateButton.addEventListener('click', () => {
  fillForm({
    id: 'custom_global_lane',
    title: 'Custom Global Lane',
    subtitle: 'Expansão personalizada',
    version: '1.0.0',
    unlockRank: 'cadet',
    description: 'Pacote criado pelo painel Admin.',
    theme: { accent: '#72f6d5', glow: '#6da9ff' },
    datasets: {
      airports: [{ id: 'MAD', iata: 'MAD', name: 'Adolfo Suárez Madrid-Barajas', city: 'Madrid', country: 'Spain', lat: 40.4983, lon: -3.5676, traffic: 0.92 }],
      routes: [{ id: 'mad-lhr', from: 'MAD', to: 'LHR', difficulty: 0.92 }],
      scenarios: [{ id: 'iberia_flow', title: 'Fluxo Ibérico', blurb: 'Briefing curto para validar pacote custom.', difficulty: 'Médio', maxActive: 4, targetScore: 780, duration: 160, spawnInterval: 5.5, rankRequired: 'cadet' }]
    }
  });
  showToast('Template carregado no editor.');
});
refs.configForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(refs.configForm);
  const config = Object.fromEntries([...form.entries()].map(([key, value]) => [key, Number.isNaN(Number(value)) || value === '' ? value : Number(value)]));
  contentManager.saveConfig(config);
  refreshAll();
  showToast('Configuração global salva.');
});
refs.credentialForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(refs.credentialForm);
  storage.set(AUTH_KEY, { username: form.get('username'), password: form.get('password') });
  showToast('Credenciais atualizadas.');
});

(async () => {
  await contentManager.loadCatalog();
  await applyBuildInfo();
  fillForm();
  setWorkspaceVisibility(isLoggedIn());
  if (isLoggedIn()) refreshAll();
})();
