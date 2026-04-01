// =============================================================================
// FAMILYHUB — app.js (Orquestrador Principal)
//
// APRESENTAÇÃO:
// Este é o arquivo central do sistema — o "maestro" que coordena
// todos os outros módulos. Ele controla a navegação entre telas,
// o carregamento inicial dos dados e a renderização da interface.
// =============================================================================

// ============================================================
//  changeView() — Navegação entre telas
//
//  APRESENTAÇÃO:
//  Toda vez que o usuário clica em um item do menu, esta função
//  é chamada. Ela troca a tela atual, reseta filtros e busca,
//  e chama renderApp() para atualizar a interface.
//
//  O sistema é um SPA (Single Page Application) — a página
//  NUNCA recarrega. Só o conteúdo interno muda.
// ============================================================
function changeView(viewId) {
  currentView      = viewId;    // Atualiza a tela ativa
  globalSearchOpen = false;     // Fecha a busca global
  globalSearch     = '';        // Limpa o texto da busca

  // Limpa o campo de busca visualmente
  const searchInput = document.getElementById('global-search');
  if (searchInput) searchInput.value = '';
  closeSearchDropdown();

  // Reseta os filtros do calendário ao sair dessa tela
  if (viewId !== 'calendario') {
    calFilterMembro = 'Todos';
    calFilterCat    = 'Todas';
  }

  renderApp(); // Atualiza a interface com a nova tela

  // Ao abrir o ranking, sincroniza os pontos com o servidor
  // para garantir que todos os membros vejam o ranking atualizado
  if (viewId === 'ranking') syncLeaderboardFromServer();
}

// ============================================================
//  renderApp() — Renderizador principal da interface
//
//  APRESENTAÇÃO:
//  Esta é a função mais importante do sistema. Toda vez que
//  algo muda (usuário clica, conclui tarefa, adiciona membro),
//  renderApp() é chamada e redesenha a tela do zero.
//
//  O mapa "views" conecta cada ID de tela com sua função de
//  renderização. Ao chamar views[currentView](), o sistema
//  gera o HTML da tela ativa e insere no page-content.
// ============================================================
function renderApp() {
  // Atualiza os elementos fixos da interface (sidebar, header, widgets)
  renderSidebar();
  updateHeader();
  updateSidebarSettings();
  updateNextEventWidget();

  const content = document.getElementById('page-content');

  // Mapa de telas: cada chave é um ID, cada valor é a função que gera o HTML
  const views = {
    dashboard:    renderDashboard,    // Visão geral
    calendario:   renderCalendar,     // Calendário mensal
    atividades:   renderAtividades,   // Lista de tarefas
    compras:      renderListas,       // Listas de compras
    receitas:     renderReceitas,     // Receitas culinárias
    membros:      renderMembros,      // Membros da família
    ranking:      renderRanking,      // Ranking de pontos
    estatisticas: renderEstatisticas, // Gráficos e análises
    configuracoes:renderConfiguracoes,// Configurações da conta
    logs:         renderLogs,         // Histórico de ações
  };

  // Chama a função da tela atual e insere o HTML gerado na página
  content.innerHTML = views[currentView] ? views[currentView]() : '';

  // Logs são carregados de forma assíncrona (podem vir do servidor)
  if (currentView === 'logs') {
    setTimeout(() => loadLogs(), 100);
  }

  lucide.createIcons(); // Inicializa os ícones após renderizar o HTML
}

// ─── Eventos globais de teclado ───────────────────────────────────────────────
// Tecla Escape fecha modais e dropdowns abertos
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const overlay = document.getElementById('modal-overlay');
  if (overlay && !overlay.classList.contains('hidden')) { closeModal(); return; }
  const confirmOverlay = document.getElementById('confirm-overlay');
  if (confirmOverlay && !confirmOverlay.classList.contains('hidden')) closeConfirm();
  closeSearchDropdown();
});

// ============================================================
//  DOMContentLoaded — Boot (inicialização) do sistema
//
//  APRESENTAÇÃO:
//  Executado uma única vez quando a página termina de carregar.
//  É a sequência de boot do FamilyHub:
//
//  1. Aplica o tema (claro/escuro) salvo na sessão anterior
//  2. Verifica notificações automáticas (tarefas atrasadas etc.)
//  3. Se estiver logado, carrega os dados do servidor
//  4. Normaliza os dados (garante que campos obrigatórios existam)
//  5. Renderiza a interface
//  6. Exibe mensagem de boas-vindas (apenas uma vez por sessão)
//  7. Configura eventos do menu mobile e do botão de tema
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  // ── 1. Configuração inicial ──────────────────────────────
  applyDarkMode();           // Aplica tema escuro se estava ativo
  updateUserInfo();          // Exibe nome/foto do usuário na sidebar
  checkAutoNotificacoes();   // Verifica tarefas atrasadas e do dia

  // ── 2. Carrega dados do servidor (se estiver logado) ─────
  if (Auth.isLoggedIn()) {
    const serverLoaded = await API.loadUserData().catch(() => false);

    if (serverLoaded) {
      // Normaliza campos — garante que dados antigos tenham os novos campos
      DB.atividades = (DB.atividades||[]).map(a => ({ status:'pendente', priority:'media', notes:'', ...a }));
      DB.listas     = (DB.listas    ||[]).map((l,i) => ({ id: l.id||Date.now()+i, icon: l.icon||'shopping-cart', ...l }));
      DB.receitas   = (DB.receitas  ||[]).map(r => ({ porcoes:4, ...r }));
      DB.membros    = (DB.membros   ||[]).map(m => ({ borderHex:'#3b82f6', ...m }));

      // Garante que a estrutura de gamificação existe (campos obrigatórios)
      if (!DB.gamification)                    DB.gamification = JSON.parse(JSON.stringify(emptyDB.gamification));
      if (!DB.gamification.pontos)             DB.gamification.pontos = {};
      if (!DB.gamification.conquistas)         DB.gamification.conquistas = [];
      if (!DB.gamification.streaks)            DB.gamification.streaks = {};
      if (!DB.gamification.lastActivityDate)   DB.gamification.lastActivityDate = {};
      if (!DB.gamification.premios_resgatados) DB.gamification.premios_resgatados = [];
      if (!DB.gamification.desafios)           DB.gamification.desafios = [];
      if (!DB.notificacoes)                    DB.notificacoes = [];
    }

    // Carrega notificações do servidor em paralelo (não bloqueia a tela)
    API.loadNotifications().catch(() => {});
  }

  // ── 3. Renderiza a interface ─────────────────────────────
  renderApp();
  initGlobalSearch(); // Inicializa a busca global

  // ── 4. Mensagem de boas-vindas (só na primeira vez da sessão) ──
  const welcomeKey = `fh_welcomed_${Auth.getUser()?.id || 'guest'}`;
  if (!localStorage.getItem(welcomeKey)) {
    const user = Auth.getUser();
    const nome = user?.name || DB.settings.familyName;
    addNotificacao(
      'Bem-vindo, ' + nome + '! 👋',
      'Seu FamilyHub está pronto. Comece adicionando membros e atividades!',
      'success', 'smile'
    );
    localStorage.setItem(welcomeKey, '1'); // Marca como exibida
    saveDB(false);
  }
  updateNotifBadge(); // Atualiza o número de notificações não lidas

  // ── 5. Eventos do menu mobile ────────────────────────────
  // Botão hambúrguer (☰) abre/fecha a sidebar no celular
  document.getElementById('btn-menu')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('-translate-x-full'); // Mostra/esconde sidebar
    overlay.classList.toggle('hidden');             // Mostra/esconde overlay escuro
  });

  // Clique no overlay fecha a sidebar
  document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('-translate-x-full');
    document.getElementById('sidebar-overlay').classList.add('hidden');
  });

  // Botão de alternância de tema claro/escuro
  document.getElementById('btn-theme')?.addEventListener('click', toggleDarkMode);
});
