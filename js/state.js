// =============================================================================
// FAMILYHUB — state.js
// Estado global da aplicação
//
// APRESENTAÇÃO:
// Este arquivo centraliza todas as variáveis de estado do sistema —
// ou seja, tudo o que pode mudar conforme o usuário navega e interage.
//
// Por que ter um arquivo só para isso?
// Porque qualquer módulo (app.js, views, crud.js etc.) pode ler e
// escrever essas variáveis. Ao concentrá-las aqui, é fácil saber
// "qual é o estado atual do sistema" sem precisar procurar
// em vários arquivos.
// =============================================================================

// ─── Tela atual ───────────────────────────────────────────────────────────────
// Armazena o ID da tela exibida no momento.
// Começa no 'dashboard' — a primeira tela ao abrir o sistema.
// Toda vez que o usuário clica no menu, changeView() atualiza esta variável.
let currentView = 'dashboard';

// ─── Tema (claro/escuro) ──────────────────────────────────────────────────────
// Lê a preferência salva no localStorage. 'true' = modo escuro ativo.
// Se o usuário nunca definiu, começa em false (modo claro).
let isDarkMode = localStorage.getItem('familyHubDarkMode') === 'true';

// =============================================================================
// FILTROS DE ATIVIDADES
// Cada variável controla um filtro diferente na tela de Atividades.
// O usuário pode combinar múltiplos filtros ao mesmo tempo:
//   Ex: Lucas (membro) + Urgente (prioridade) + Pendente (status)
// =============================================================================

// Filtro por categoria: 'Todas' ou nome da categoria (ex: 'Saúde', 'Esporte')
let filterAtividades = 'Todas';

// Filtro por responsável: 'Todos' ou nome do membro (ex: 'Lucas', 'Mamãe')
let filterAtividadesMembro = 'Todos';

// Filtro por status: 'Todas', 'pendente', 'andamento' ou 'concluida'
let filterAtividadesStatus = 'Todas';

// Filtro por prioridade: 'Todas', 'baixa', 'media', 'alta' ou 'urgente'
let filterAtividadesPrioridade = 'Todas';

// Critério de ordenação: 'data', 'titulo', 'resp' ou 'prio'
let sortAtividades = 'data';

// Texto digitado na busca da tela de atividades
let searchAtividades = '';

// =============================================================================
// FILTROS DE RECEITAS
// =============================================================================

// Filtro por categoria: 'Todas', 'Doces', 'Salgados' ou 'Bebidas'
let filterReceitas = 'Todas';

// Texto digitado na busca de receitas
let searchReceitas = '';

// =============================================================================
// ESTADO DO CALENDÁRIO
// O calendário exibe um único mês por vez.
// O usuário pode navegar entre os meses com os botões ◀ ▶ (função mudaMes()).
// =============================================================================

// Mês atual exibido no calendário (0 = Janeiro, 11 = Dezembro)
let calMonth = new Date().getMonth();

// Ano atual exibido no calendário
let calYear = new Date().getFullYear();

// Filtro de membro no calendário: 'Todos' ou nome do membro
let calFilterMembro = 'Todos';

// Filtro de categoria no calendário: 'Todas' ou nome da categoria
let calFilterCat = 'Todas';

// =============================================================================
// BUSCA GLOBAL
// A busca global (lupa no header) procura em todas as seções ao mesmo tempo:
// atividades, receitas e membros. O dropdown aparece em tempo real.
// =============================================================================

// Texto digitado na busca global do header
let globalSearch = '';

// Controla se o dropdown de busca global está aberto ou fechado
let globalSearchOpen = false;
