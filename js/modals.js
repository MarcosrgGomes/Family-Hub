// =============================================================================
// FAMILYHUB — modals.js
// Sistema de modais: abertura, fechamento e salvamento de formulários
//
// RESPONSABILIDADES DESTE ARQUIVO:
// 1. openModal()  → Gera o HTML do formulário correto e exibe o modal
// 2. closeModal() → Fecha o modal com animação e limpa o conteúdo
// 3. saveForm*()  → Valida os dados, salva no DB e atualiza a tela
//
// MODAIS DISPONÍVEIS:
// - formAtividade → Criar/editar uma atividade (tarefa)
// - formLista     → Criar/editar uma lista de compras
// - formMembro    → Criar/editar um membro da família
// - formReceita   → Criar/editar uma receita
// - viewReceita   → Visualizar os detalhes de uma receita (somente leitura)
// =============================================================================


// -----------------------------------------------------------------------------
// openModal(type, id, extraData)
//
// Abre o modal e renderiza o formulário correto de acordo com o "type".
//
// Parâmetros:
//   type      → String que define qual formulário mostrar (ex: 'formMembro')
//   id        → (opcional) ID do item a editar; null = modo criação
//   extraData → (opcional) Dado extra passado externamente (ex: data pré-selecionada no calendário)
// -----------------------------------------------------------------------------
function openModal(type, id=null, extraData=null) {

  // Referência ao container principal do modal (onde o conteúdo fica)
  const content = document.getElementById('modal-content');

  // O modal de visualização de receita tem layout mais largo (max-w-4xl)
  // Os demais usam largura padrão (max-w-lg)
  const isWide  = type === 'viewReceita';

  // Aplica as classes de estilo e animação de entrada ao container
  content.className = `bg-panel-light dark:bg-panel-dark rounded-2xl shadow-2xl w-full ${isWide ? 'max-w-4xl p-0' : 'max-w-lg p-6'} transform scale-95 transition-transform duration-300 overflow-hidden`;

  // Variável que vai acumular o HTML interno do modal
  let html = '';


  // ===========================================================================
  // MODAL: formAtividade
  // Formulário para criar ou editar uma atividade (tarefa da família)
  // ===========================================================================
  if (type === 'formAtividade') {

    // Busca a atividade existente caso seja edição (id informado)
    const at = id ? DB.atividades.find(a => a.id === id) : null;

    // Prioridade de data: extraData (ex: clique no calendário) > data da atividade existente > vazio
    const preDate = extraData || (at ? at.date : '');

    html = `<div class="space-y-4">

      <!-- Campo oculto para guardar o ID da atividade em edição (vazio = criação) -->
      <input type="hidden" id="mod-at-id" value="${at ? at.id : ''}">

      <!-- Campo: Título da atividade -->
      <div>
        <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Título *</label>
        <input type="text" id="mod-title" value="${at ? at.title : ''}" placeholder="Ex: Natação do Lucas"
          class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm">
      </div>

      <!-- Linha com Data e Hora lado a lado -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data *</label>
          <input type="date" id="mod-date" value="${preDate}"
            class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Hora</label>
          <input type="time" id="mod-time" value="${at ? at.time : ''}"
            class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm">
        </div>
      </div>

      <!-- Linha com Categoria e Responsável lado a lado -->
      <div class="grid grid-cols-2 gap-3">

        <!-- Categoria (tag) da atividade -->
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Categoria</label>
          <select id="mod-cat"
            class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm">
            ${['Tarefa Doméstica','Escola','Esporte','Saúde','Social'].map(c =>
              `<option ${at && at.tag === c.toUpperCase() ? 'selected' : ''}>${c}</option>`
            ).join('')}
          </select>
        </div>

        <!-- Responsável: se não há membros cadastrados, mostra aviso com link para ir à tela de membros -->
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Responsável *</label>
          ${DB.membros.length === 0
            ? `<div class="w-full p-3 border border-red-200 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">
                 ⚠️ Nenhum membro cadastrado.
                 <a href="#" onclick="closeModal();changeView('membros');" class="underline font-bold">Cadastre um membro</a>
                 antes de criar atividades.
               </div>
               <input type="hidden" id="mod-resp" value="">`
            : `<select id="mod-resp"
                 class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm">
                 ${DB.membros.map(m =>
                   `<option ${at && at.resp === m.name ? 'selected' : ''}>${m.name}</option>`
                 ).join('')}
               </select>`
          }
        </div>
      </div>

      <!-- Linha com Prioridade e Status lado a lado -->
      <div class="grid grid-cols-2 gap-3">

        <!-- Prioridade: baixa, media, alta, urgente — com label amigável de priorityConfig -->
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Prioridade</label>
          <select id="mod-prio"
            class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm">
            ${['baixa','media','alta','urgente'].map(p =>
              `<option value="${p}" ${at && at.priority === p ? 'selected' : ''}>${priorityConfig[p].label}</option>`
            ).join('')}
          </select>
        </div>

        <!-- Status atual da atividade -->
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Status</label>
          <select id="mod-status"
            class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm">
            <option value="pendente"  ${!at || at.status === 'pendente'  ? 'selected' : ''}>⏳ Pendente</option>
            <option value="andamento" ${at  && at.status === 'andamento' ? 'selected' : ''}>🔄 Andamento</option>
            <option value="concluida" ${at  && at.status === 'concluida' ? 'selected' : ''}>✅ Concluída</option>
          </select>
        </div>
      </div>

      <!-- Campo: Notas / observações livres -->
      <div>
        <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Notas</label>
        <textarea id="mod-notes" rows="2"
          class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm resize-none"
        >${at ? at.notes || '' : ''}</textarea>
      </div>

      <!-- Botões de ação: Cancelar fecha o modal sem salvar, Salvar chama saveFormAtividade() -->
      <div class="flex justify-end gap-3 pt-4 border-t border-border-light dark:border-border-dark">
        <button onclick="closeModal()"
          class="px-5 py-2.5 rounded-xl font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm">
          Cancelar
        </button>
        <button onclick="saveFormAtividade()"
          class="px-5 py-2.5 rounded-xl font-bold bg-brand-main text-white hover:bg-brand-dark shadow-sm text-sm">
          Salvar
        </button>
      </div>
    </div>`;
  }


  // ===========================================================================
  // MODAL: formLista
  // Formulário para criar ou editar uma lista de compras/tarefas
  // ===========================================================================
  else if (type === 'formLista') {

    // Busca a lista existente caso seja edição
    const lista = id ? DB.listas.find(l => l.id === id) : null;

    // Opções de cor de borda disponíveis para a lista
    const borderOpts = [
      {cls:'border-blue-500',   hex:'#3b82f6', name:'Azul'},
      {cls:'border-emerald-500',hex:'#10b981', name:'Verde'},
      {cls:'border-purple-500', hex:'#8b5cf6', name:'Roxo'},
      {cls:'border-rose-500',   hex:'#f43f5e', name:'Rosa'},
      {cls:'border-amber-500',  hex:'#f59e0b', name:'Amarelo'},
      {cls:'border-cyan-500',   hex:'#06b6d4', name:'Ciano'}
    ];

    // Ícones disponíveis para representar a lista (nomes do Lucide Icons)
    const iconOpts = ['shopping-cart','leaf','pill','home','package','coffee','gift','heart','star','zap'];

    html = `<div class="space-y-4">

      <!-- Campo oculto para guardar o ID da lista em edição -->
      <input type="hidden" id="mod-l-id" value="${lista ? lista.id : ''}">

      <!-- Campo: Nome da lista -->
      <div>
        <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome da Lista</label>
        <input type="text" id="mod-l-title" value="${lista ? lista.title : ''}" placeholder="Ex: Compras da Semana"
          class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm">
      </div>

      <!-- Seletor de cor: cada botão colorido representa uma opção.
           Ao clicar, remove o destaque dos outros e aplica no clicado,
           além de atualizar o input hidden com a classe CSS da cor escolhida. -->
      <div>
        <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Cor</label>
        <div class="flex flex-wrap gap-2">
          ${borderOpts.map(b => `
            <button type="button" id="cor-${b.cls.replace(/[^a-z0-9]/g, '-')}"
              onclick="
                document.querySelectorAll('[id^=cor-]').forEach(x => x.classList.remove('ring-2','ring-offset-2'));
                this.classList.add('ring-2','ring-offset-2');
                document.getElementById('mod-l-border').value='${b.cls}'
              "
              class="w-8 h-8 rounded-full border-4 ${b.cls} ${lista && lista.border === b.cls ? 'ring-2 ring-offset-2' : ''} transition-all hover:scale-110"
              style="background:${b.hex}" title="${b.name}">
            </button>`
          ).join('')}
        </div>
        <!-- Armazena a classe CSS da cor selecionada para uso no save -->
        <input type="hidden" id="mod-l-border" value="${lista ? lista.border : 'border-blue-500'}">
      </div>

      <!-- Seletor de ícone: ao clicar, destaca o botão selecionado (fundo da marca)
           e atualiza o input hidden com o nome do ícone Lucide. -->
      <div>
        <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Ícone</label>
        <div class="flex flex-wrap gap-2">
          ${iconOpts.map(ico => `
            <button type="button"
              onclick="
                document.querySelectorAll('[data-ico]').forEach(x => x.classList.remove('bg-brand-main','text-white'));
                this.classList.add('bg-brand-main','text-white');
                document.getElementById('mod-l-icon').value='${ico}'
              "
              data-ico="${ico}"
              class="p-2.5 rounded-xl border border-border-light dark:border-border-dark hover:border-brand-main transition-all ${lista && lista.icon === ico ? 'bg-brand-main text-white' : 'bg-white dark:bg-slate-800'}">
              <i data-lucide="${ico}" class="w-4 h-4"></i>
            </button>`
          ).join('')}
        </div>
        <!-- Armazena o nome do ícone selecionado para uso no save -->
        <input type="hidden" id="mod-l-icon" value="${lista ? lista.icon : 'shopping-cart'}">
      </div>

      <!-- Botões de ação -->
      <div class="flex justify-end gap-3 pt-4 border-t border-border-light dark:border-border-dark">
        <button onclick="closeModal()"
          class="px-5 py-2.5 rounded-xl font-medium text-slate-500 text-sm">Cancelar</button>
        <button onclick="saveFormLista()"
          class="px-5 py-2.5 rounded-xl font-bold bg-brand-main text-white text-sm">Salvar</button>
      </div>
    </div>`;
  }


  // ===========================================================================
  // MODAL: formMembro
  // Formulário para criar ou editar um membro da família
  //
  // CAMPOS:
  // - Foto de perfil (upload de arquivo local, com preview em tempo real)
  // - Nome (obrigatório)
  // - Parentesco (ex: Pai, Mãe, Filho...)
  // - Cor do perfil (bola colorida que aparece na borda do avatar)
  // ===========================================================================
  else if (type === 'formMembro') {

    // Busca o membro existente caso seja edição (id informado)
    const mem = id ? DB.membros.find(m => m.id === id) : null;

    // Paleta de cores disponíveis para o perfil do membro
    // Cada cor tem: cls (classe Tailwind da borda) e hex (valor hexadecimal para uso inline)
    const colorOpts = [
      {cls:'border-blue-500',   hex:'#3b82f6'},
      {cls:'border-pink-400',   hex:'#f472b6'},
      {cls:'border-orange-400', hex:'#fb923c'},
      {cls:'border-emerald-500',hex:'#10b981'},
      {cls:'border-purple-500', hex:'#8b5cf6'},
      {cls:'border-red-500',    hex:'#ef4444'},
      {cls:'border-amber-500',  hex:'#f59e0b'}
    ];

    html = `<div class="space-y-4">

      <!-- Campo oculto com o ID do membro (vazio = criação de novo membro) -->
      <input type="hidden" id="mod-m-id" value="${mem ? mem.id : ''}">

      <!-- ── Seção de Foto de Perfil ─────────────────────────────────────────
           Exibe um preview circular da foto atual (ou placeholder se não houver).
           Ao selecionar um arquivo, handleImageUpload() converte para base64
           e atualiza o src da <img> em tempo real (sem precisar salvar). -->
      <div class="flex items-center gap-4 mb-2">

        <!-- Preview da foto em formato circular -->
        <img id="mod-m-preview"
          src="${mem && mem.photo ? mem.photo : 'https://via.placeholder.com/150'}"
          class="w-16 h-16 rounded-full object-cover border-2 border-slate-200 flex-shrink-0">

        <!-- Input de arquivo + label -->
        <div class="flex-1">
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Foto de Perfil</label>

          <!-- Input file: aceita apenas PNG e JPEG.
               onchange → chama handleImageUpload() (utils.js) que lê o arquivo
               como base64 e passa o resultado via callback para atualizar o preview. -->
          <input type="file" id="mod-m-file" accept="image/png, image/jpeg"
            class="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-main/10 file:text-brand-main hover:file:bg-brand-main/20 cursor-pointer"
            onchange="handleImageUpload('mod-m-file', b => document.getElementById('mod-m-preview').src = b)">
        </div>
      </div>

      <!-- ── Linha com Nome e Parentesco ─────────────────────────────────── -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome *</label>
          <input type="text" id="mod-m-name" value="${mem ? mem.name : ''}"
            class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Parentesco</label>
          <input type="text" id="mod-m-role" value="${mem ? mem.role : ''}" placeholder="Ex: Pai, Filho..."
            class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light dark:border-border-dark outline-none focus:border-brand-main text-sm">
        </div>
      </div>

      <!-- ── Seletor de Cor do Perfil ─────────────────────────────────────
           Bolas coloridas clicáveis. Ao clicar em uma:
           1. Remove o destaque (scale-125 + ring-2) de todas as bolas
           2. Aplica o destaque na bola clicada
           3. Atualiza os dois inputs hidden:
              - mod-m-border  → classe CSS para a borda do card (Tailwind)
              - mod-m-borderhex → valor hex para uso nos estilos inline (ex: barra de progresso) -->
      <div>
        <label class="block text-xs font-bold text-slate-500 uppercase mb-2">Cor do Perfil</label>
        <div class="flex flex-wrap gap-2">
          ${colorOpts.map(c => `
            <button type="button"
              onclick="
                document.querySelectorAll('[data-mbrcor]').forEach(x => x.classList.remove('scale-125','ring-2'));
                this.classList.add('scale-125','ring-2');
                document.getElementById('mod-m-border').value='${c.cls}';
                document.getElementById('mod-m-borderhex').value='${c.hex}'
              "
              data-mbrcor="${c.cls}"
              class="w-7 h-7 rounded-full border-4 ${c.cls} ${mem && mem.border === c.cls ? 'scale-125 ring-2' : ''} transition-all hover:scale-110"
              style="background:${c.hex}">
            </button>`
          ).join('')}
        </div>

        <!-- Inputs hidden que guardam os valores da cor selecionada para leitura no save -->
        <input type="hidden" id="mod-m-border"    value="${mem ? mem.border    : 'border-blue-500'}">
        <input type="hidden" id="mod-m-borderhex" value="${mem ? mem.borderHex : '#3b82f6'}">
      </div>

      <!-- Botões de ação -->
      <div class="flex justify-end gap-3 pt-4 border-t border-border-light dark:border-border-dark">
        <button onclick="closeModal()"
          class="px-5 py-2.5 rounded-xl font-medium text-slate-500 text-sm">Cancelar</button>
        <button onclick="saveFormMembro()"
          class="px-5 py-2.5 rounded-xl font-bold bg-brand-main text-white text-sm">Salvar</button>
      </div>
    </div>`;
  }


  // ===========================================================================
  // MODAL: formReceita
  // Formulário para criar ou editar uma receita culinária
  //
  // CAMPOS:
  // - Nome da receita (obrigatório)
  // - Categoria, tempo de preparo, dificuldade, número de porções
  // - Foto do prato (upload com preview)
  // - Ingredientes (um por linha no textarea)
  // - Modo de preparo (texto livre)
  // ===========================================================================
  else if (type === 'formReceita') {

    // Busca a receita existente caso seja edição
    const rec = id ? DB.receitas.find(r => r.id === id) : null;

    html = `<div class="space-y-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">

      <!-- Campo oculto com o ID da receita (vazio = nova receita) -->
      <input type="hidden" id="mod-r-id" value="${rec ? rec.id : ''}">

      <!-- Campo: Nome da receita -->
      <div>
        <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome *</label>
        <input type="text" id="mod-r-title" value="${rec ? rec.title : ''}"
          class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light outline-none focus:border-brand-main text-sm">
      </div>

      <!-- Linha com 4 campos: Categoria, Tempo, Dificuldade e Porções -->
      <div class="grid grid-cols-4 gap-3">

        <!-- Categoria da receita -->
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Categoria</label>
          <select id="mod-r-tag"
            class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light text-sm">
            ${['Doces','Salgados','Bebidas'].map(c =>
              `<option ${rec && rec.tag === c.toUpperCase() ? 'selected' : ''}>${c}</option>`
            ).join('')}
          </select>
        </div>

        <!-- Tempo de preparo (texto livre, ex: "40 min") -->
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tempo</label>
          <input type="text" id="mod-r-time" value="${rec ? rec.time : ''}" placeholder="40 min"
            class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light text-sm">
        </div>

        <!-- Nível de dificuldade -->
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Dific.</label>
          <select id="mod-r-diff"
            class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light text-sm">
            ${['Fácil','Médio','Difícil'].map(d =>
              `<option ${rec && rec.diff === d ? 'selected' : ''}>${d}</option>`
            ).join('')}
          </select>
        </div>

        <!-- Número de porções (mínimo 1, padrão 4) -->
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Porções</label>
          <input type="number" id="mod-r-porcoes" value="${rec ? rec.porcoes || 4 : 4}" min="1"
            class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light text-sm">
        </div>
      </div>

      <!-- ── Foto do prato ────────────────────────────────────────────────
           Funciona igual ao upload de foto do membro: preview + input file.
           handleImageUpload() lê o arquivo e atualiza o src do preview via callback. -->
      <div>
        <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Foto do Prato</label>
        <!-- Preview retangular da foto atual -->
        <img id="mod-r-preview"
          src="${rec && rec.img ? rec.img : 'https://via.placeholder.com/400x150'}"
          class="w-full h-28 object-cover rounded-xl border border-slate-200 mb-2">
        <!-- Input file para novo upload -->
        <input type="file" id="mod-r-file" accept="image/png, image/jpeg"
          class="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:bg-brand-main/10 file:text-brand-main cursor-pointer"
          onchange="handleImageUpload('mod-r-file', b => document.getElementById('mod-r-preview').src = b)">
      </div>

      <!-- Campo: Ingredientes (um por linha — será convertido em array no save via split('\n')) -->
      <div>
        <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ingredientes (um por linha)</label>
        <textarea id="mod-r-ing" rows="4"
          class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light text-sm leading-relaxed"
        >${rec ? rec.ingredients.join('\n') : ''}</textarea>
      </div>

      <!-- Campo: Modo de preparo (texto livre) -->
      <div>
        <label class="block text-xs font-bold text-slate-500 uppercase mb-1.5">Modo de Preparo</label>
        <textarea id="mod-r-steps" rows="5"
          class="w-full p-3 border rounded-xl bg-slate-50 dark:bg-slate-900 border-border-light text-sm leading-relaxed"
        >${rec ? rec.steps : ''}</textarea>
      </div>

      <!-- Botões de ação -->
      <div class="flex justify-end gap-3 pt-4 border-t border-border-light">
        <button onclick="closeModal()"
          class="px-5 py-2.5 rounded-xl font-medium text-slate-500 text-sm">Cancelar</button>
        <button onclick="saveFormReceita()"
          class="px-5 py-2.5 rounded-xl font-bold bg-brand-main text-white text-sm">Salvar Receita</button>
      </div>
    </div>`;
  }


  // ===========================================================================
  // MODAL: viewReceita
  // Visualização detalhada de uma receita (somente leitura, sem formulário)
  //
  // LAYOUT: duas colunas lado a lado (em telas médias+)
  // - Esquerda (2/5): foto + título + botões de fechar e editar
  // - Direita (3/5): ingredientes (com checkboxes) + modo de preparo
  // ===========================================================================
  else if (type === 'viewReceita') {

    // Busca os dados completos da receita pelo ID
    const rec = DB.receitas.find(r => r.id === id);

    html = `<div class="flex flex-col md:flex-row h-full max-h-[88vh]">

      <!-- ── Coluna esquerda: foto e título ─────────────────────────────── -->
      <div class="w-full md:w-2/5 h-56 md:h-auto relative bg-slate-900 flex-shrink-0">

        <!-- Foto do prato com opacidade levemente reduzida -->
        <img src="${rec.img}" class="w-full h-full object-cover opacity-90">

        <!-- Gradiente escuro sobre a foto para legibilidade do texto -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40"></div>

        <!-- Botão de fechar o modal (canto superior esquerdo) -->
        <button onclick="closeModal()"
          class="absolute top-4 left-4 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-full">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>

        <!-- Botão de editar a receita (canto superior direito) — reabre o formReceita com o mesmo ID -->
        <button onclick="openModal('formReceita',${rec.id})"
          class="absolute top-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-2 rounded-full">
          <i data-lucide="edit-2" class="w-4 h-4"></i>
        </button>

        <!-- Título e categoria sobrepostos na foto (bottom) -->
        <div class="absolute bottom-6 left-6 right-6 text-white">
          <span class="inline-block px-2.5 py-1 bg-brand-main rounded-lg text-[10px] font-bold uppercase tracking-widest mb-3">
            ${rec.tag}
          </span>
          <h2 class="text-2xl font-bold leading-snug">${rec.title}</h2>
        </div>
      </div>

      <!-- ── Coluna direita: detalhes da receita ─────────────────────────── -->
      <div class="w-full md:w-3/5 p-7 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">

        <!-- Badges de info rápida: tempo, dificuldade e porções -->
        <div class="flex flex-wrap gap-3 mb-7 border-b border-border-light dark:border-border-dark pb-5">
          ${[{icon:'clock', label:rec.time}, {icon:'chef-hat', label:rec.diff}, {icon:'users', label:`${rec.porcoes || 4} porções`}]
            .map(i => `
              <span class="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-300 font-medium">
                <i data-lucide="${i.icon}" class="w-3.5 h-3.5 text-brand-main"></i>
                ${i.label}
              </span>`
            ).join('')}
        </div>

        <!-- ── Lista de ingredientes com checkboxes interativos ────────────
             Cada ingrediente pode ser "riscado" ao marcar o checkbox,
             usando a classe CSS group-has-[:checked] do Tailwind. -->
        <div class="mb-7">
          <h3 class="text-base font-bold mb-4 flex items-center gap-2">
            <i data-lucide="shopping-basket" class="w-4 h-4 text-brand-main"></i>
            Ingredientes
          </h3>
          <div class="space-y-1.5">
            ${rec.ingredients.map(i => `
              <label class="flex items-center gap-3 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer group">
                <input type="checkbox" class="w-4 h-4 text-brand-main rounded border-slate-300 flex-shrink-0">
                <!-- Ao marcar o checkbox, o texto fica riscado e opaco (efeito visual de "separado") -->
                <span class="text-[14px] text-slate-700 dark:text-slate-300 group-has-[:checked]:line-through group-has-[:checked]:opacity-50">
                  ${i}
                </span>
              </label>`
            ).join('')}
          </div>
        </div>

        <!-- ── Modo de preparo ────────────────────────────────────────────
             whitespace-pre-line preserva as quebras de linha do texto original.
             A borda esquerda colorida dá destaque visual ao bloco. -->
        <div>
          <h3 class="text-base font-bold mb-4 flex items-center gap-2">
            <i data-lucide="list-ordered" class="w-4 h-4 text-brand-main"></i>
            Modo de Preparo
          </h3>
          <div class="text-[14px] text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed pl-3 border-l-2 border-brand-main/30">
            ${rec.steps}
          </div>
        </div>
      </div>
    </div>`;
  }


  // ---------------------------------------------------------------------------
  // Injeta o HTML gerado no corpo do modal
  // ---------------------------------------------------------------------------
  document.getElementById('modal-body').innerHTML = html;

  // Define o título do modal de acordo com o tipo e se é criação ou edição
  document.getElementById('modal-title').textContent =
    type === 'formAtividade' ? (id ? 'Editar Atividade' : 'Nova Atividade') :
    type === 'formLista'     ? (id ? 'Editar Lista'     : 'Nova Lista')     :
    type === 'formMembro'    ? (id ? 'Editar Membro'    : 'Novo Membro')    :
    type === 'formReceita'   ? (id ? 'Editar Receita'   : 'Nova Receita')   :
    type === 'viewReceita'   ? 'Ver Receita' : '';

  // Reinicializa os ícones Lucide dentro do novo HTML injetado
  lucide.createIcons();

  // Exibe o overlay (fundo escuro) e inicia a animação de entrada do modal
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      // Dois frames aninhados garantem que o CSS de transição seja aplicado APÓS o display
      overlay.classList.remove('opacity-0', 'pointer-events-none');
      content.classList.remove('scale-95'); // Expande o modal (de 95% → 100%)
    })
  );
}


// -----------------------------------------------------------------------------
// closeModal()
// Fecha o modal com animação de saída e limpa o conteúdo após o fim da transição.
// -----------------------------------------------------------------------------
function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');

  // Inicia a animação de saída: fundo some e modal encolhe
  overlay.classList.add('opacity-0', 'pointer-events-none');
  content.classList.add('scale-95');

  // Aguarda o fim da animação CSS (300ms) para então esconder o overlay
  // e limpar o conteúdo do modal (evita flash de conteúdo vazio)
  setTimeout(() => {
    overlay.classList.add('hidden');
    document.getElementById('modal-body').innerHTML  = '';
    document.getElementById('modal-title').textContent = '';
  }, 300);
}


// =============================================================================
// FUNÇÕES DE SALVAMENTO
// Cada função lê os campos do formulário, valida o que for necessário,
// salva no DB em memória, registra no log de atividades e atualiza a tela.
// =============================================================================


// -----------------------------------------------------------------------------
// saveFormAtividade()
// Lê, valida e salva os dados do formulário de atividade (criar ou editar).
// -----------------------------------------------------------------------------
function saveFormAtividade() {

  // Lê o ID oculto — se preenchido, é edição; se vazio, é criação
  const idVal = document.getElementById('mod-at-id').value;

  // Leitura e validação dos campos obrigatórios
  const title = document.getElementById('mod-title').value.trim();
  const date  = document.getElementById('mod-date').value;
  if (!title) { toast('Informe o título!', 'error'); return; }
  if (!date)  { toast('Informe a data!',   'error'); return; }

  // Valida o responsável: campo pode estar desabilitado se não há membros
  const respVal = document.getElementById('mod-resp').value;
  if (!respVal) { toast('Selecione um responsável!', 'error'); return; }
  if (DB.membros.length === 0) { toast('Cadastre um membro antes de criar atividades!', 'error'); return; }

  const cat = document.getElementById('mod-cat').value;

  // Monta o objeto com todos os dados da atividade
  const atData = {
    title,
    date,
    time:     document.getElementById('mod-time').value,
    tag:      cat.toUpperCase(),                               // Tag sempre em maiúsculas
    resp:     document.getElementById('mod-resp').value,
    priority: document.getElementById('mod-prio').value,
    status:   document.getElementById('mod-status').value,
    notes:    document.getElementById('mod-notes').value,
    color:    getTagColor(cat.toUpperCase())                   // Cor gerada automaticamente pela tag (utils.js)
  };

  if (idVal) {
    // ── EDIÇÃO: encontra o índice e atualiza o objeto preservando campos não editados (spread)
    const idx = DB.atividades.findIndex(a => a.id == idVal);
    DB.atividades[idx] = {...DB.atividades[idx], ...atData};
    saveActivityLog(atData.resp || 'Sistema', `Editou a atividade "${atData.title}"`, 'editar');
    toast('Atividade atualizada!');
  } else {
    // ── CRIAÇÃO: adiciona nova atividade com ID único baseado no timestamp
    DB.atividades.push({id: Date.now(), ...atData});
    saveActivityLog(atData.resp || 'Sistema', `Criou a atividade "${atData.title}" para ${atData.date}`, 'criar');
    toast('Atividade criada!');
  }

  // Persiste, fecha o modal e re-renderiza a interface
  saveDB(); closeModal(); renderApp();
}


// -----------------------------------------------------------------------------
// saveFormLista()
// Lê, valida e salva os dados do formulário de lista (criar ou editar).
// -----------------------------------------------------------------------------
function saveFormLista() {

  const idVal = document.getElementById('mod-l-id').value;
  const title = document.getElementById('mod-l-title').value.trim();
  if (!title) { toast('Informe o nome!', 'error'); return; }

  // Monta o objeto da lista (sem itens — os itens são gerenciados separadamente)
  const listData = {
    title,
    border: document.getElementById('mod-l-border').value, // Classe CSS da cor
    icon:   document.getElementById('mod-l-icon').value    // Nome do ícone Lucide
  };

  if (idVal) {
    // ── EDIÇÃO: atualiza a lista existente mantendo os campos não editados
    const idx = DB.listas.findIndex(l => l.id == idVal);
    DB.listas[idx] = {...DB.listas[idx], ...listData};
    saveActivityLog('Sistema', `Editou a lista "${listData.title}"`, 'editar');
    toast('Lista atualizada!');
  } else {
    // ── CRIAÇÃO: nova lista começa com arrays vazios de pendentes e carrinho
    DB.listas.push({id: Date.now(), pendentes: [], carrinho: [], ...listData});
    saveActivityLog('Sistema', `Criou a lista "${listData.title}"`, 'lista');
    toast('Lista criada!');
  }

  saveDB(); closeModal(); renderApp();
}


// -----------------------------------------------------------------------------
// saveFormMembro()
// Lê, valida e salva os dados do formulário de membro (criar ou editar).
//
// LÓGICA DA FOTO:
// - Se o preview ainda contém o placeholder (via.placeholder), usa ui-avatars
//   para gerar um avatar automático com as iniciais do nome.
// - Se foi feito upload de uma foto real (base64), usa ela diretamente.
// - Se é edição e a foto mudou, registra log específico de "Atualizou a foto".
// -----------------------------------------------------------------------------
function saveFormMembro() {

  const idVal = document.getElementById('mod-m-id').value;
  const name  = document.getElementById('mod-m-name').value.trim();
  if (!name) { toast('Informe o nome!', 'error'); return; }

  // Lê o src atual do preview (pode ser base64 de upload ou URL de placeholder)
  const imgSrc = document.getElementById('mod-m-preview').src;

  // Se ainda é o placeholder genérico, gera um avatar automático com as iniciais
  const photo = imgSrc.includes('via.placeholder')
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`
    : imgSrc;

  // Monta o objeto do membro
  const memData = {
    name,
    role:      (document.getElementById('mod-m-role').value || '').toUpperCase(), // Parentesco em maiúsculas
    photo,
    border:    document.getElementById('mod-m-border').value,    // Classe CSS da cor (ex: 'border-blue-500')
    borderHex: document.getElementById('mod-m-borderhex').value  // Hex da cor (ex: '#3b82f6') para estilos inline
  };

  // Busca o membro original para comparar a foto (só em edição)
  const oldMem = idVal ? DB.membros.find(m => m.id == idVal) : null;

  if (idVal) {
    // ── EDIÇÃO: atualiza o membro mantendo campos não editados (ex: pontos de gamificação)
    const idx = DB.membros.findIndex(m => m.id == idVal);

    // Verifica se a foto foi alterada para registrar o log correto
    const hasNewPhoto = memData.photo
      && !memData.photo.includes('ui-avatars')                   // Nova foto é real (não avatar gerado)
      && memData.photo !== (oldMem && oldMem.photo);             // É diferente da foto anterior

    DB.membros[idx] = {...DB.membros[idx], ...memData};

    if (hasNewPhoto) saveActivityLog('Sistema', `Atualizou a foto de "${memData.name}"`, 'foto');
    else             saveActivityLog('Sistema', `Editou o membro "${memData.name}"`, 'editar');

    toast('Membro atualizado!');
  } else {
    // ── CRIAÇÃO: adiciona o novo membro ao array
    DB.membros.push({id: Date.now(), ...memData});
    saveActivityLog('Sistema', `Adicionou o membro "${memData.name}" (${memData.role})`, 'membro');
    toast('Membro adicionado!');
  }

  saveDB(); closeModal(); renderApp();
}


// -----------------------------------------------------------------------------
// saveFormReceita()
// Lê, valida e salva os dados do formulário de receita (criar ou editar).
//
// LÓGICA DA FOTO:
// - Se ainda é o placeholder, usa uma imagem padrão do Unsplash.
// - Se foi feito upload, usa o base64 gerado pelo handleImageUpload().
//
// INGREDIENTES:
// - O textarea contém um ingrediente por linha.
// - No save, é feito split('\n') e filtradas as linhas vazias, gerando um array.
// -----------------------------------------------------------------------------
function saveFormReceita() {

  const idVal = document.getElementById('mod-r-id').value;
  const title = document.getElementById('mod-r-title').value.trim();
  if (!title) { toast('Informe o título!', 'error'); return; }

  const imgSrc = document.getElementById('mod-r-preview').src;

  // Monta o objeto da receita
  const recData = {
    title,
    tag:         document.getElementById('mod-r-tag').value.toUpperCase(),       // Categoria em maiúsculas
    time:        document.getElementById('mod-r-time').value,
    diff:        document.getElementById('mod-r-diff').value,
    porcoes:     parseInt(document.getElementById('mod-r-porcoes').value) || 4,  // Garante número inteiro, padrão 4
    img:         imgSrc.includes('via.placeholder')
                   ? 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800' // Fallback padrão
                   : imgSrc,
    steps:       document.getElementById('mod-r-steps').value,
    ingredients: document.getElementById('mod-r-ing').value
                   .split('\n')             // Separa cada linha
                   .filter(i => i.trim())   // Remove linhas em branco
  };

  if (idVal) {
    // ── EDIÇÃO
    const idx = DB.receitas.findIndex(r => r.id == idVal);
    DB.receitas[idx] = {...DB.receitas[idx], ...recData};
    saveActivityLog('Sistema', `Editou a receita "${recData.title}"`, 'editar');
    toast('Receita atualizada!');
  } else {
    // ── CRIAÇÃO
    DB.receitas.push({id: Date.now(), ...recData});
    saveActivityLog('Sistema', `Criou a receita "${recData.title}" (${recData.tag})`, 'receita');
    toast('Receita criada!');
  }

  saveDB(); closeModal(); renderApp();
}