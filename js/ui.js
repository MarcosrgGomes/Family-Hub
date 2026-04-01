// =============================================================================
// FAMILYHUB — ui.js
// Componentes de UI reutilizáveis: Toasts, Dialogs, Dark Mode, Sidebar, Header
//
// APRESENTAÇÃO:
// Este arquivo contém as funções que controlam a interface visual
// que aparece em QUALQUER tela do sistema — não dependem da tela atual.
// Exemplos: os toasts (avisos), os dialogs de confirmação, a sidebar
// com o menu, o header com título e botão de ação, e o widget
// de próximo evento.
// =============================================================================

// =============================================================================
// TOASTS — Mensagens temporárias de feedback
//
// APRESENTAÇÃO:
// Um "toast" é aquela mensagem que aparece no canto da tela por alguns
// segundos e depois desaparece sozinha — como um brinde que sobe e desce.
// São usados para confirmar ações: "Atividade criada!", "Erro ao salvar."
//
// A animação funciona em 3 etapas:
// 1. O elemento começa fora da tela (translate-x-full = 100% para a direita)
// 2. requestAnimationFrame duplo garante que o browser "veja" a posição inicial
//    antes de animar para a posição final (translate-x-0)
// 3. Após "duration" milissegundos, o elemento some e é removido do DOM
// =============================================================================
function toast(msg, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return; // Segurança: container pode não existir

  // Cores e ícones para cada tipo de mensagem
  const colors = {
    success: 'bg-emerald-500',
    error:   'bg-red-500',
    info:    'bg-blue-500',
    warning: 'bg-amber-500'
  };
  const icons = {
    success: 'check-circle',
    error:   'x-circle',
    info:    'info',
    warning: 'alert-triangle'
  };

  // Cria o elemento do toast
  const el = document.createElement('div');
  el.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium ${colors[type]} transform translate-x-full transition-all duration-300 max-w-xs`;
  el.innerHTML = `<i data-lucide="${icons[type]}" class="w-4 h-4 flex-shrink-0"></i><span>${msg}</span>`;
  container.appendChild(el);
  lucide.createIcons({ nodes: [el] });

  // Duplo requestAnimationFrame: força o browser a renderizar o estado inicial
  // antes de iniciar a animação de entrada. Sem isso, a animação não acontece.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => el.classList.remove('translate-x-full'))
  );

  // Após o tempo definido, anima a saída e remove o elemento do DOM
  setTimeout(() => {
    el.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => el.remove(), 300); // Aguarda o CSS da saída terminar
  }, duration);
}

// =============================================================================
// CONFIRM DIALOG — Caixa de confirmação antes de ações destrutivas
//
// APRESENTAÇÃO:
// Antes de excluir ou resetar dados importantes, o sistema exibe um
// diálogo pedindo confirmação. Isso evita exclusões acidentais.
//
// O padrão usado é "callback" — o chamador passa a função que deve
// ser executada SE o usuário confirmar. O dialog guarda essa função
// e a chama quando o usuário clicar em "Sim".
// =============================================================================
function confirmDialog(msg, onConfirm) {
  const overlay = document.getElementById('confirm-overlay');
  document.getElementById('confirm-msg').textContent = msg; // Exibe a mensagem
  overlay.classList.remove('hidden');
  requestAnimationFrame(() => overlay.classList.remove('opacity-0')); // Anima entrada

  // Botão "Sim": fecha o dialog e chama o callback
  document.getElementById('confirm-yes').onclick = () => {
    closeConfirm();
    onConfirm(); // Executa a ação confirmada pelo usuário
  };

  // Botão "Não" (ou "Cancelar"): apenas fecha sem fazer nada
  document.getElementById('confirm-no').onclick = closeConfirm;
}

// ─── closeConfirm() ───────────────────────────────────────────────────────────
// Fecha o dialog de confirmação com animação de fade out.
function closeConfirm() {
  const overlay = document.getElementById('confirm-overlay');
  overlay.classList.add('opacity-0');
  setTimeout(() => overlay.classList.add('hidden'), 200); // Aguarda o fade terminar
}

// =============================================================================
// DARK MODE — Alternância de tema claro/escuro
//
// APRESENTAÇÃO:
// O Tailwind CSS usa a classe 'dark' no elemento <html> para ativar
// o tema escuro em todo o sistema. Ao adicionar/remover essa classe,
// TODOS os elementos com classes "dark:..." mudam de aparência.
//
// A preferência é salva no localStorage para persistir entre sessões.
// =============================================================================

// toggleDarkMode(): alterna o tema e salva a preferência
function toggleDarkMode() {
  isDarkMode = !isDarkMode; // Inverte o estado
  localStorage.setItem('familyHubDarkMode', isDarkMode); // Persiste a escolha
  applyDarkMode(); // Aplica ao DOM
  // Se o usuário está na tela de configurações, re-renderiza para
  // atualizar o ícone do botão de tema (sol/lua)
  if (currentView === 'configuracoes') renderApp();
}

// applyDarkMode(): aplica (ou remove) a classe 'dark' no elemento <html>
// Chamada no boot do sistema para restaurar o tema salvo.
function applyDarkMode() {
  document.documentElement.classList.toggle('dark', isDarkMode);
}

// =============================================================================
// SIDEBAR — Menu lateral de navegação
//
// APRESENTAÇÃO:
// A sidebar é re-renderizada toda vez que renderApp() é chamada.
// Ela exibe o menu de navegação com destaque na tela atual,
// badges de contagem de tarefas, e um mini-ranking mostrando
// o líder da semana.
// =============================================================================
function renderSidebar() {
  const menu       = document.getElementById('nav-menu');
  const configMenu = document.getElementById('nav-config');
  menu.innerHTML   = '';

  const hoje = new Date().toISOString().split('T')[0];

  // Conta quantas atividades estão pendentes e quantas estão atrasadas
  // para exibir badges coloridos no item "Atividades" do menu
  const atividadesPendentes = DB.atividades.filter(a => a.status === 'pendente').length;
  const atrasadas = DB.atividades.filter(a => a.status === 'pendente' && a.date < hoje).length;

  // Gera um item de menu para cada tela definida no MENU (config.js)
  MENU.forEach(item => {
    const isActive = item.id === currentView;

    // Estilo diferente para o item ativo (fundo verde) vs inativo (hover cinza)
    const btnClass = isActive
      ? 'bg-brand-main text-white shadow-sm'
      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100';

    // Badge apenas para o item "Atividades" — mostra contagem de tarefas
    let badge = '';
    if (item.id === 'atividades') {
      if (atrasadas > 0 && !isActive)
        // Badge vermelho se houver tarefas atrasadas
        badge = `<span class="ml-auto text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-red-500 text-white">${atrasadas}</span>`;
      else if (atividadesPendentes > 0)
        // Badge verde/branco para tarefas pendentes normais
        badge = `<span class="ml-auto text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/30 text-white' : 'bg-brand-main/15 text-brand-main'}">${atividadesPendentes}</span>`;
    }

    menu.innerHTML += `<li><button onclick="changeView('${item.id}')"
      class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-[14px] ${btnClass}">
      <i data-lucide="${item.icon}" class="w-5 h-5 flex-shrink-0"></i>
      <span>${item.label}</span>${badge}</button></li>`;
  });

  // ── Mini-ranking do líder da semana ──────────────────────
  // Encontra o membro com mais pontos para exibir na parte inferior da sidebar
  const topMembro = DB.membros
    .map(m => ({ ...m, pts: DB.gamification.pontos[m.name] || 0 }))
    .sort((a, b) => b.pts - a.pts)[0];

  const miniRankHtml = topMembro ? `
    <li class="mb-1"><div class="px-4 py-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30">
      <p class="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-1.5">🏆 Líder da Semana</p>
      <div class="flex items-center gap-2">
        <img src="${topMembro.photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(topMembro.name)}" class="w-6 h-6 rounded-full object-cover">
        <p class="text-[12px] font-bold text-slate-700 dark:text-slate-200 truncate">${topMembro.name}</p>
        <span class="ml-auto text-[11px] font-black text-amber-600">${topMembro.pts}pts</span>
      </div></div></li>` : '';

  // ── Botão de Configurações e Logout ──────────────────────
  const isConfig  = currentView === 'configuracoes';
  const confClass = isConfig
    ? 'bg-brand-main text-white shadow-sm'
    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100';

  configMenu.innerHTML = `${miniRankHtml}
    <li><button onclick="changeView('configuracoes')"
      class="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-[14px] ${confClass}">
      <i data-lucide="settings" class="w-5 h-5"></i><span>Configurações</span></button></li>
    <li><button onclick="handleLogout()"
      class="w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all font-medium text-[13px] text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
      <i data-lucide="log-out" class="w-4 h-4"></i><span>Sair</span></button></li>`;
}

// ─── updateSidebarSettings() ──────────────────────────────────────────────────
// Atualiza o nome da família e a foto exibidos no topo da sidebar.
// Chamada toda vez que saveDB() é executado (dados foram alterados).
function updateSidebarSettings() {
  const sideTitle = document.querySelector('aside h1');
  if (sideTitle) sideTitle.textContent = DB.settings.familyName;

  const sidePhoto = document.querySelector('aside .bg-brand-main\\/10');
  if (!sidePhoto) return;

  // Se tiver foto da família: exibe como imagem circular
  // Se não: exibe o ícone de usuários padrão
  if (DB.settings.photo) {
    sidePhoto.innerHTML = `<img src="${DB.settings.photo}" class="w-full h-full rounded-full object-cover border-2 border-brand-main">`;
  } else {
    sidePhoto.innerHTML = `<i data-lucide="users" class="w-8 h-8"></i>`;
    lucide.createIcons();
  }
}

// =============================================================================
// HEADER — Barra superior com título e botão de ação
//
// APRESENTAÇÃO:
// O header muda conforme a tela atual:
// - O título e subtítulo refletem a tela ativa (ex: "Atividades" / "Gestão de tarefas")
// - O botão de ação muda ("Nova Atividade" no calendário, "Nova Receita" nas receitas)
// - Nas telas sem botão (ranking, logs), o botão fica oculto
// =============================================================================
function updateHeader() {
  const item = MENU.find(i => i.id === currentView);

  // Atualiza o título e subtítulo do header
  document.getElementById('page-title').textContent    = item ? item.label    : 'Configurações';
  document.getElementById('page-subtitle').textContent = item ? item.subtitle : 'Personalize o sistema.';

  const btn     = document.getElementById('header-btn');
  const btnText = document.getElementById('header-btn-text');
  btn.style.display = 'flex'; // Mostra por padrão (escondido abaixo se necessário)

  // Mapa de ações para o botão principal de cada tela
  // Telas não listadas aqui não terão botão de ação
  const headerActions = {
    dashboard:    { label: 'Nova Atividade', action: () => openModal('formAtividade') },
    calendario:   { label: 'Nova Atividade', action: () => openModal('formAtividade') },
    atividades:   { label: 'Nova Atividade', action: () => openModal('formAtividade') },
    receitas:     { label: 'Nova Receita',   action: () => openModal('formReceita')   },
    membros:      { label: 'Novo Membro',    action: () => openModal('formMembro')    },
    compras:      { label: 'Nova Lista',     action: () => openModal('formLista')     },
    estatisticas: { label: 'Exportar PDF',   action: () => toast('Exportação em breve!', 'info') },
  };

  const action = headerActions[currentView];
  if (action) {
    btnText.textContent = action.label;
    btn.onclick = action.action;
  } else {
    btn.style.display = 'none'; // Esconde o botão em telas sem ação primária
  }
}

// =============================================================================
// WIDGET PRÓXIMO EVENTO
//
// APRESENTAÇÃO:
// No header existe um pequeno widget que mostra o próximo evento futuro
// pendente, em ordem cronológica. É atualizado toda vez que renderApp() é chamado.
// Se não houver eventos futuros, exibe uma mensagem positiva.
// =============================================================================
function updateNextEventWidget() {
  const hoje = new Date().toISOString().split('T')[0];

  // Encontra a próxima atividade futura não concluída, ordenada por data e hora
  const proximo = DB.atividades
    .filter(a => a.date >= hoje && a.status !== 'concluida')
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0];

  const titleEl = document.getElementById('next-event-title');
  const dateEl  = document.getElementById('next-event-date');
  if (!titleEl || !dateEl) return; // Elementos podem não existir na tela de login

  if (proximo) {
    titleEl.textContent = proximo.title;
    const { label } = formatDateLabel(proximo.date); // "Hoje", "Amanhã", "Quinta"...
    dateEl.textContent = `${label} · ${proximo.time}`;
  } else {
    // Nenhum evento futuro — mensagem positiva
    titleEl.textContent = 'Nenhum evento futuro';
    dateEl.textContent  = 'Tudo em dia! 🎉';
  }
}
