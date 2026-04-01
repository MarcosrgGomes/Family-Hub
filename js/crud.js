// =============================================================================
// FAMILYHUB — crud.js
// Operações de criar, editar e excluir dados do sistema.
//
// APRESENTAÇÃO:
// CRUD = Create, Read, Update, Delete — as 4 operações básicas
// de qualquer sistema. Este arquivo concentra toda a lógica
// de manipulação de dados: atividades, listas de compras,
// receitas, membros e configurações.
//
// Nota: as funções toggleStatusAtividade e setStatusAtividade
// são interceptadas pelo gamification.js para adicionar pontos
// após executar — sem modificar este arquivo.
// =============================================================================

// ============================================================
//  toggleStatusAtividade() — Alternar status com um clique
//
//  APRESENTAÇÃO:
//  Alterna o status de uma atividade entre "pendente" e "concluída"
//  com um único clique. A lógica é simples e direta:
//  se estava concluída, volta para pendente. Se estava pendente,
//  vai para concluída.
//
//  Esta função é interceptada pelo gamification.js que adiciona
//  pontos automaticamente quando a tarefa é concluída.
// ============================================================
function toggleStatusAtividade(id) {
  const at = DB.atividades.find(a => a.id === id);
  if (!at) return;
  // Alterna entre os dois estados possíveis
  at.status = at.status === 'concluida' ? 'pendente' : 'concluida';
  saveDB();    // Salva banco de dados
  renderApp(); // Atualiza a interface
}

// ─── setStatusAtividade() ─────────────────────────────────────────────────────
// Define um status específico via dropdown (pendente, em andamento, concluída).
function setStatusAtividade(id, status) {
  const at = DB.atividades.find(a => a.id === id);
  if (!at) return;
  at.status = status;
  // Registra a mudança no histórico de ações.
  saveActivityLog(at.resp || 'Sistema', `Alterou status de "${at.title}" para ${statusConfig[status]?.label || status}`, 'status');
  saveDB(); // Salva banco de dados
   renderApp();  // Atualiza a interface
   //Toast
  toast(`Status: ${statusConfig[status].label}`, 'info');
}

// ─── deleteAtividade() ────────────────────────────────────────────────────────
function deleteAtividade(id) {
  const at = DB.atividades.find(a => a.id === id);
  // Pede confirmação antes de excluir — evita exclusões acidentais.
  confirmDialog('Excluir esta atividade?', () => {
    const title = at ? at.title : 'atividade';
    DB.atividades = DB.atividades.filter(a => a.id !== id); // Remove do array
    // Registra a mudança no histórico de ações.
    saveActivityLog('Sistema', `Excluiu a atividade "${title}"`, 'excluir');
    saveDB(); // Salva banco de dados
   renderApp();  // Atualiza a interface
    //Toast
    toast('Atividade excluída.');
  });
}

// ============================================================
//  checkItem() — Marcar item como comprado
//
//  APRESENTAÇÃO:
//  Move o item da lista de "pendentes" para o "carrinho"
//  com um único clique. Usa splice() para remover da posição
//  e push() para adicionar no carrinho — tudo em 2 linhas.
//
//  Esta função também é interceptada pelo gamification.js
//  para adicionar 2 pontos ao primeiro membro da família.
// ============================================================
function checkItem(lIdx, iIdx) {
  // Remove da lista de pendentes e captura o item removido
  const item = DB.listas[lIdx].pendentes.splice(iIdx, 1)[0];
  DB.listas[lIdx].carrinho.push(item); // Adiciona ao carrinho
  saveActivityLog('Sistema', `Marcou "${item}" como comprado na lista "${DB.listas[lIdx].title}"`, 'lista');
  saveDB(); setTimeout(renderApp, 100); // Pequeno delay para animação visual
}

// ─── uncheckItem() ────────────────────────────────────────────────────────────
// Devolve o item do carrinho para a lista de pendentes.
function uncheckItem(lIdx, iIdx) {
  const item = DB.listas[lIdx].carrinho.splice(iIdx, 1)[0];
  DB.listas[lIdx].pendentes.push(item);
  saveDB(); setTimeout(renderApp, 100);
}

// ─── addListItem() ────────────────────────────────────────────────────────────
// Adiciona um novo item à lista de compras.
function addListItem(lIdx) {
  const input = document.getElementById(`add-item-${lIdx}`);
  if (!input.value.trim()) return;
  const item  = input.value.trim();
  const lista = DB.listas[lIdx];
  lista.pendentes.push(item); input.value = '';
  saveActivityLog('Sistema', `Adicionou item "${item}" na lista "${lista.title}"`, 'lista');
  saveDB(); renderApp();
}

// ─── deleteListItem() ─────────────────────────────────────────────────────────
// Remove um item específico da lista (pendente ou carrinho).
function deleteListItem(lIdx, iIdx, isCarrinho) {
  const item = isCarrinho ? DB.listas[lIdx].carrinho[iIdx] : DB.listas[lIdx].pendentes[iIdx];
  if (isCarrinho) DB.listas[lIdx].carrinho.splice(iIdx, 1);
  else            DB.listas[lIdx].pendentes.splice(iIdx, 1);
  saveActivityLog('Sistema', `Removeu item "${item}" da lista "${DB.listas[lIdx].title}"`, 'excluir');
  saveDB(); renderApp();
}

// ─── limparCarrinho() ─────────────────────────────────────────────────────────
// Remove todos os itens comprados do carrinho de uma vez.
function limparCarrinho(lIdx) {
  const count = DB.listas[lIdx].carrinho.length;
  const nome  = DB.listas[lIdx].title;
  DB.listas[lIdx].carrinho = []; // Esvazia o array
  saveActivityLog('Sistema', `Limpou o carrinho da lista "${nome}" (${count} item${count > 1 ? 's' : ''})`, 'lista');
  saveDB(); renderApp(); toast(`${count} item${count > 1 ? 'ns' : ''} removido${count > 1 ? 's' : ''}.`);
}

// ─── deleteLista() ────────────────────────────────────────────────────────────
function deleteLista(lIdx) {
  const nome = DB.listas[lIdx].title;
  confirmDialog(`Remover a lista "${nome}"?`, () => {
    DB.listas.splice(lIdx, 1);
    saveActivityLog('Sistema', `Excluiu a lista "${nome}"`, 'excluir');
    saveDB(); renderApp(); toast('Lista removida.');
  });
}

// ─── deleteReceita() ──────────────────────────────────────────────────────────
function deleteReceita(id) {
  const rec = DB.receitas.find(r => r.id === id);
  confirmDialog('Excluir esta receita?', () => {
    const title = rec ? rec.title : 'receita';
    DB.receitas = DB.receitas.filter(r => r.id !== id);
    saveActivityLog('Sistema', `Excluiu a receita "${title}"`, 'excluir');
    saveDB(); renderApp(); toast('Receita excluída.');
  });
}

// ─── deleteMembro() ───────────────────────────────────────────────────────────
function deleteMembro(id) {
  const mem = DB.membros.find(m => m.id === id);
  confirmDialog('Remover este membro?', () => {
    const nome = mem ? mem.name : 'membro';
    DB.membros = DB.membros.filter(m => m.id !== id);
    saveActivityLog('Sistema', `Removeu o membro "${nome}"`, 'excluir');
    saveDB(); renderApp(); toast('Membro removido.');
  });
}

// ============================================================
//  saveSettings() — Salvar configurações com log inteligente
//
//  APRESENTAÇÃO:
//  Ao salvar as configurações, o sistema detecta EXATAMENTE
//  o que mudou comparando os valores antigos com os novos.
//  Só registra no histórico as alterações que realmente ocorreram
//  — não apenas "configurações salvas" de forma genérica.
//
//  Ex: se o usuário só mudou o nome da família, o log registra
//  apenas "nome alterado para X", sem mencionar e-mail ou foto.
// ============================================================
function saveSettings() {
  const oldName  = DB.settings.familyName;
  const newName  = document.getElementById('cfg-name').value;
  const oldEmail = DB.settings.email;
  const newEmail = document.getElementById('cfg-email').value;
  const imgSrc   = document.getElementById('cfg-photo-preview').src;
  const hasNewPhoto = !imgSrc.includes('via.placeholder') && imgSrc !== DB.settings.photo;

  // Aplica as mudanças no banco local
  DB.settings.familyName = newName;
  DB.settings.email      = newEmail;
  if (!imgSrc.includes('via.placeholder')) DB.settings.photo = imgSrc;

  // Detecta e registra apenas o que mudou de verdade
  const changes = [];
  if (oldName  !== newName)  changes.push(`nome da família alterado para "${newName}"`);
  if (oldEmail !== newEmail) changes.push(`e-mail atualizado`);
  if (hasNewPhoto)           changes.push(`foto da família atualizada`);

  if (changes.length > 0) {
    // Registra as mudanças específicas no histórico
    saveActivityLog('Sistema', `Configurações: ${changes.join(', ')}`, hasNewPhoto ? 'foto' : 'config');
  } else {
    saveActivityLog('Sistema', 'Configurações salvas sem alterações', 'config');
  }

  saveDB(); toast('Configurações salvas com sucesso!');
}
