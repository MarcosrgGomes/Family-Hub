// =============================================================================
// FAMILYHUB — login-auth.js
// Autenticação via backend PHP + banco de dados MySQL.
// =============================================================================

// Base da API: config.js define API_BASE; fallback evita URL "undefinedphp/..." se o script faltar.
function getApiBase() {
  if (typeof API_BASE !== 'undefined' && API_BASE != null) {
    const s = String(API_BASE).trim();
    if (s) return s.endsWith('/') ? s : `${s}/`;
  }
  return './';
}

async function readJsonBody(res) {
  const text = await res.text();
  if (!text.trim()) throw new SyntaxError('empty body');
  return JSON.parse(text);
}

// ─── Persistência após login bem-sucedido ────────────────────────────────────
function applyLoginSuccess(data) {
  localStorage.setItem('fh_token', data.token);
  localStorage.setItem('fh_user',  JSON.stringify(data.user));

  const userEmail = data.user?.email?.toLowerCase() || '';
  const dbKey     = userEmail ? `familyHubDB_${userEmail}` : 'familyHubDB';

  if (data.family_data) {
    localStorage.setItem(dbKey, JSON.stringify(data.family_data));
  }

  window.location.href = 'dashboard.html';
}

// ============================================================
//  tryFetch() — Fetch com timeout automático
// ============================================================
async function tryFetch(url, options, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// ============================================================
//  submitLogin()
// ============================================================
async function submitLogin() {
  hideError('login');

  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;

  if (!email || !pass) {
    showError('login', 'Preencha e-mail e senha.');
    return;
  }

  setLoading('login', true);

  const base = getApiBase();

  try {
    const res  = await tryFetch(`${base}php/auth.php?action=login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password: pass }),
    });
    const data = await readJsonBody(res);

    if (!data.ok) {
      showError('login', data.error || 'Erro ao fazer login.');
      setLoading('login', false, 'Entrar na plataforma');
      return;
    }

    applyLoginSuccess(data);
  } catch (e) {
    const msg =
      e?.name === 'AbortError'
        ? 'Tempo esgotado. Tente novamente.'
        : e instanceof SyntaxError
          ? 'O servidor não retornou dados válidos. Verifique se o MySQL está rodando e se o .env está correto.'
          : 'Não foi possível conectar ao servidor. Verifique sua conexão.';
    showError('login', msg);
    setLoading('login', false, 'Entrar na plataforma');
  }
}

// ============================================================
//  submitRegister()
// ============================================================
async function submitRegister() {
  hideError('reg');

  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const pass     = document.getElementById('reg-password').value;
  const passConf = document.getElementById('reg-confirm').value;
  const phone    = document.getElementById('reg-phone').value;
  const age      = document.getElementById('reg-age').value;

  if (!name) {
    showError('reg', 'Informe seu nome completo.');
    return;
  }
  if (!email) {
    showError('reg', 'Informe um e-mail.');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('reg', 'Digite um e-mail válido.');
    return;
  }
  if (pass !== passConf) {
    showError('reg', 'As senhas não coincidem.');
    return;
  }

  setLoading('reg', true);

  const base = getApiBase();

  try {
    const res  = await tryFetch(`${base}php/auth.php?action=register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, password: pass, phone, age: parseInt(age, 10) || null }),
    });
    const data = await readJsonBody(res);

    if (!data.ok) {
      showError('reg', data.error || 'Erro ao criar conta.');
      setLoading('reg', false, 'Criar Conta');
      return;
    }

    applyLoginSuccess(data);
  } catch (e) {
    const msg =
      e?.name === 'AbortError'
        ? 'Tempo esgotado. Tente novamente.'
        : e instanceof SyntaxError
          ? 'O servidor não retornou dados válidos. Verifique se o MySQL está rodando e se o banco familyhub foi importado (schema.sql).'
          : 'Não foi possível conectar ao servidor. Verifique sua conexão.';
    showError('reg', msg);
    setLoading('reg', false, 'Criar Conta');
  }
}
