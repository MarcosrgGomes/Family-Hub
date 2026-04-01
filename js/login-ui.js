// =============================================================================
// FAMILYHUB — login-ui.js
// Interface da tela de login: abas, validação de senha, feedback visual.
//
// APRESENTAÇÃO:
// Este arquivo cuida de tudo que o usuário VÊ e INTERAGE na tela de login:
// - Troca entre as abas Login / Cadastro
// - Barra de força de senha em tempo real
// - Animação de erro com shake
// - Máscara automática de telefone
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons(); // Inicializa os ícones da biblioteca Lucide

  // Limpa a sessão ao acessar a página de login —
  // garante que o usuário sempre precise logar manualmente.
  localStorage.removeItem('fh_token');
  localStorage.removeItem('fh_user');

  // Ativa a máscara de telefone no campo do formulário de cadastro
  document.getElementById('reg-phone')?.addEventListener('input', maskPhone);
});


// ─── Alternância entre abas Login / Registro ──────────────────────────────────
// Mostra o formulário correto e atualiza o estilo visual das abas.
function showForm(which) {
  const isLogin = which === 'login';

  // Mostra/esconde os formulários
  document.getElementById('form-login').classList.toggle('hidden', !isLogin);
  document.getElementById('form-register').classList.toggle('hidden', isLogin);

  // Aba login: verde se ativa, cinza se inativa
  const tabLogin = document.getElementById('tab-login');
  tabLogin.classList.toggle('tab-active',    isLogin);
  tabLogin.classList.toggle('text-brand-main', isLogin);
  tabLogin.classList.toggle('text-slate-400',  !isLogin);

  // Aba registro: verde se ativa, cinza se inativa
  const tabReg = document.getElementById('tab-register');
  tabReg.classList.toggle('tab-active',    !isLogin);
  tabReg.classList.toggle('text-brand-main', !isLogin);
  tabReg.classList.toggle('text-slate-400',  isLogin);
}

// ─── Toggle visibilidade da senha ─────────────────────────────────────────────
// Alterna entre mostrar/esconder a senha e troca o ícone do botão.
function togglePassVis(inputId, btn) {
  const input  = document.getElementById(inputId);
  const isPass = input.type === 'password';
  input.type   = isPass ? 'text' : 'password'; // Alterna o tipo do campo
  btn.innerHTML = isPass
    ? '<i data-lucide="eye-off" class="w-4 h-4"></i>' // Ícone "ocultar"
    : '<i data-lucide="eye"     class="w-4 h-4"></i>'; // Ícone "mostrar"
  lucide.createIcons({ nodes: [btn] });
}

// ============================================================
//  maskPhone() — Máscara de telefone automática
//
//  APRESENTAÇÃO:
//  Enquanto o usuário digita, formata o número automaticamente
//  no padrão brasileiro: (XX) XXXXX-XXXX
//  Remove tudo que não for número e aplica a máscara.
// ============================================================
function maskPhone(e) {
  // Remove tudo que não for dígito e captura grupos
  const x = e.target.value.replace(/\D/g, '').match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
  // Monta a string formatada progressivamente enquanto o usuário digita
  e.target.value = !x[2] ? x[1] : `(${x[1]}) ${x[2]}${x[3] ? '-' + x[3] : ''}`;
}

// ============================================================
//  validatePassword() — Validação de senha em tempo real
//
//  APRESENTAÇÃO:
//  Chamada a cada tecla digitada no campo de senha do cadastro.
//  Verifica 4 regras simultaneamente usando expressões regulares:
//  - Mínimo 8 caracteres
//  - Pelo menos 1 letra maiúscula
//  - Pelo menos 1 número
//  - Pelo menos 1 símbolo especial
//
//  A barra de força muda de cor conforme as regras são cumpridas:
//  Vermelho (0-1 regras) → Amarelo (2-3) → Verde (todas as 4)
//
//  O botão de cadastro só é habilitado quando TUDO estiver OK.
// ============================================================
const PASSWORD_RULES = {
  len:  /.{8,}/,        // Mínimo 8 caracteres
  caps: /[A-Z]/,        // Pelo menos 1 maiúscula
  num:  /[0-9]/,        // Pelo menos 1 número
  spec: /[@$!%*?&]/,    // Pelo menos 1 símbolo especial
};

function validatePassword() {
  const passVal    = document.getElementById('reg-password').value;
  const confirmVal = document.getElementById('reg-confirm').value;
  let count = 0; // Contador de regras cumpridas

  // Verifica cada regra e atualiza o ícone/cor correspondente na tela
  Object.entries(PASSWORD_RULES).forEach(([key, regex]) => {
    const el = document.querySelector(`[data-req="${key}"]`);
    const ok = regex.test(passVal); // Testa a regra contra a senha atual
    if (ok) count++;
    el.classList.toggle('text-brand-main', ok);  // Verde se cumpriu
    el.classList.toggle('text-slate-400',  !ok); // Cinza se não cumpriu
  });

  // Atualiza a barra de força de senha
  const bar = document.getElementById('strength-bar');
  bar.style.width = (count / 4 * 100) + '%'; // Largura proporcional às regras
  bar.className   = 'h-full transition-all duration-500 rounded-full '
    + (count < 2 ? 'bg-red-400'     // Vermelho: fraca
     : count < 4 ? 'bg-amber-400'   // Amarelo: média
                 : 'bg-brand-main'); // Verde: forte

  // Verifica se as senhas coincidem e exibe mensagem de erro se não
  const matches = passVal === confirmVal && passVal !== '';
  document.getElementById('match-error').classList.toggle('hidden', confirmVal === '' || matches);

  // Habilita o botão APENAS quando todas as regras forem cumpridas E as senhas coincidirem
  const allOk = count === 4 && matches;
  const btn   = document.getElementById('reg-btn');
  btn.disabled  = !allOk;
  btn.className = `w-full ${
    allOk
      ? 'bg-brand-main hover:bg-brand-dark cursor-pointer shadow-lg shadow-brand-main/20'
      : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed' // Botão desabilitado
  } text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2`;
}

// ============================================================
//  showError() — Exibição de erro com animação shake
//
//  APRESENTAÇÃO:
//  Exibe a mensagem de erro no campo correspondente e dispara
//  a animação "shake" do CSS — o campo treme por 0.4 segundos.
//  Após a animação terminar, remove a classe para poder
//  reutilizar o shake em erros futuros.
// ============================================================
function showError(prefix, msg) {
  const box  = document.getElementById(`${prefix}-error`);
  const span = document.getElementById(`${prefix}-error-msg`);
  span.textContent = msg;         // Define o texto do erro
  box.classList.remove('hidden'); // Torna o campo de erro visível
  box.classList.add('shake');     // Dispara a animação de tremida
  // Remove a classe após 400ms para poder usar o shake novamente
  setTimeout(() => box.classList.remove('shake'), 400);
  lucide.createIcons({ nodes: [box] });
}

// Esconde o campo de erro
function hideError(prefix) {
  document.getElementById(`${prefix}-error`).classList.add('hidden');
}

// ─── Estado de carregamento dos botões ───────────────────────────────────────
// Desabilita o botão e muda o texto para "Aguarde..." durante as requisições,
// evitando cliques duplos e dando feedback visual ao usuário.
function setLoading(prefix, isLoading, label = '') {
  const btn = document.getElementById(`${prefix}-btn`);
  const txt = document.getElementById(`${prefix}-btn-text`);
  btn.disabled = isLoading;
  if (isLoading) {
    txt.textContent = 'Aguarde...';       // Indica que está processando
    btn.classList.add('opacity-70');      // Visual de desabilitado
  } else {
    txt.textContent = label;              // Restaura o texto original
    btn.classList.remove('opacity-70');
  }
}
