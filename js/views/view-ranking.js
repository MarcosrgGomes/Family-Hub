// =============================================================================
// FAMILYHUB — views/view-ranking.js
// =============================================================================

// =============================================================================
// 24. VIEW — RANKING (aprimorado com prêmios)
// =============================================================================
function renderRanking() {
  const pts=DB.gamification.pontos;
  const totalPts=Object.values(pts).reduce((a,b)=>a+b,0);
  const totalConq=DB.gamification.conquistas.length;
  const totalResgatados=DB.gamification.premios_resgatados.length;
  const hoje = new Date().toISOString().split('T')[0];

  const membrosStats = DB.membros.map(m => {
    const mPts = pts[m.name]||0;
    const concluidas = DB.atividades.filter(a=>a.resp===m.name&&a.status==='concluida').length;
    const pendentes = DB.atividades.filter(a=>a.resp===m.name&&a.status==='pendente').length;
    const atrasadas = DB.atividades.filter(a=>a.resp===m.name&&a.status==='pendente'&&a.date<hoje).length;
    const streak = DB.gamification.streaks[m.name]||0;
    const conquistas = DB.gamification.conquistas.filter(c=>c.memberId===m.name);
    const lv = getLevel(mPts);
    const nextLv = LEVELS.find(l=>l.min>mPts)||lv;
    const pctNext = nextLv.min>lv.min ? Math.min(100,Math.max(0,Math.round(((mPts-lv.min)/(nextLv.min-lv.min))*100))) : 100;
    return {...m, pts:mPts, concluidas, pendentes, atrasadas, streak, conquistas, lv, nextLv, pctNext};
  }).sort((a,b)=>b.pts-a.pts);

  const podiumColors = ['from-amber-400 to-amber-600','from-slate-300 to-slate-500','from-orange-400 to-orange-600'];
  const podiumBg = ['bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40','bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700','bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40'];
  const medals=['🥇','🥈','🥉'];

  // Selector de membro para resgatar prêmio
  const membrosOpts=DB.membros.map(m=>`<option value="${m.name}">${m.name} (${pts[m.name]||0} pts)</option>`).join('');

  // Top 3 podium HTML
  const podiumHTML = membrosStats.length >= 2 ? (() => {
    // Ordem visual: 2º lugar (esquerda), 1º lugar (centro), 3º lugar (direita)
    const podiumOrder = [membrosStats[1], membrosStats[0], membrosStats[2]].filter(Boolean);
    const origIdx     = [1, 0, 2].slice(0, podiumOrder.length);
    const heights     = ['h-24', 'h-32', 'h-20'];
    return `<div class="flex items-end justify-center gap-4 mb-2">
      ${podiumOrder.map((m, i) => {
        const idx = origIdx[i];
        const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=fff`;
        return `<div class="flex flex-col items-center gap-2">
          <div class="text-xl">${medals[idx] || ''}</div>
          <img src="${m.photo || avatarFallback}" class="w-${idx===0?'16':'12'} h-${idx===0?'16':'12'} rounded-full object-cover border-4 shadow-lg" style="border-color:${m.borderHex || '#10b981'}">
          <p class="text-[12px] font-bold text-center max-w-[80px] truncate">${m.name}</p>
          <p class="text-[11px] font-black text-brand-main">${m.pts} pts</p>
          <div class="${heights[i] || 'h-20'} ${podiumBg[idx]} border rounded-t-xl w-20 flex items-end justify-center pb-2">
            <span class="text-2xl">${m.lv.icon}</span>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  })() : '';

  // Atividade recente por membro
  const atividadesRecentes = DB.atividades
    .filter(a=>a.status==='concluida')
    .sort((a,b)=>b.date.localeCompare(a.date))
    .slice(0,5);

  return `<div class="max-w-4xl mx-auto space-y-6">

    <!-- Hero banner -->
    <div class="bg-gradient-to-br from-brand-main to-[#2c5c4e] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
      <div class="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full blur-2xl"></div>
      <div class="absolute -left-4 bottom-0 w-48 h-48 bg-black/10 rounded-full blur-2xl"></div>
      <div class="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p class="text-emerald-200 text-[11px] font-bold uppercase tracking-widest mb-1">Sistema de Gamificação</p>
          <h2 class="text-2xl font-bold mb-3">Ranking da Família 🏆</h2>
          <p class="text-emerald-100 text-sm max-w-xs">Complete tarefas, ganhe pontos e suba no ranking familiar!</p>
        </div>
        <div class="flex gap-4 flex-wrap">
          <div class="text-center"><p class="text-2xl font-black">${totalPts}</p><p class="text-emerald-200 text-[10px] font-bold uppercase tracking-wide">Pontos Totais</p></div>
          <div class="text-center"><p class="text-2xl font-black">${totalConq}</p><p class="text-emerald-200 text-[10px] font-bold uppercase tracking-wide">Conquistas</p></div>
          <div class="text-center"><p class="text-2xl font-black">${totalResgatados}</p><p class="text-emerald-200 text-[10px] font-bold uppercase tracking-wide">Prêmios</p></div>
          <div class="text-center"><p class="text-2xl font-black">${DB.membros.length}</p><p class="text-emerald-200 text-[10px] font-bold uppercase tracking-wide">Membros</p></div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- Coluna esquerda: pódio + leaderboard -->
      <div class="lg:col-span-2 space-y-5">

        <!-- Pódio visual -->
        ${membrosStats.length >= 2 ? `
        <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-5 border border-border-light dark:border-border-dark shadow-sm">
          <h3 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2"><i data-lucide="trophy" class="w-4 h-4 text-amber-500"></i> Pódio</h3>
          ${podiumHTML}
        </div>` : ''}

        <!-- Leaderboard completo -->
        <div>
          <h3 class="text-base font-bold mb-4 flex items-center gap-2"><i data-lucide="list-ordered" class="w-5 h-5 text-brand-main"></i> Placar Geral</h3>
          <div class="space-y-3">${renderLeaderboard()}</div>
        </div>

        <!-- Stats por membro em cards -->
        ${membrosStats.length > 0 ? `
        <div>
          <h3 class="text-base font-bold mb-4 flex items-center gap-2"><i data-lucide="bar-chart-2" class="w-5 h-5 text-blue-500"></i> Estatísticas por Membro</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            ${membrosStats.map((m,i) => {
              const avatarFallback=`https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=fff`;
              return `<div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-4 border border-border-light dark:border-border-dark shadow-sm">
                <div class="flex items-center gap-3 mb-4">
                  <div class="relative">
                    <img src="${m.photo||avatarFallback}" class="w-11 h-11 rounded-full object-cover border-2" style="border-color:${m.borderHex}">
                    <span class="absolute -top-1 -right-1 text-sm">${medals[i]||''}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-bold truncate">${m.name}</p>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${m.lv.bg} ${m.lv.color}">${m.lv.icon} ${m.lv.label}</span>
                  </div>
                  <div class="text-right">
                    <p class="text-lg font-black text-brand-main">${m.pts}</p>
                    <p class="text-[9px] text-slate-400 font-bold">pontos</p>
                  </div>
                </div>
                <div class="grid grid-cols-3 gap-2 text-center mb-3">
                  <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl py-2">
                    <p class="text-sm font-black text-emerald-600">${m.concluidas}</p>
                    <p class="text-[9px] text-slate-400 font-bold">Concluídas</p>
                  </div>
                  <div class="bg-amber-50 dark:bg-amber-900/20 rounded-xl py-2">
                    <p class="text-sm font-black text-amber-600">${m.pendentes}</p>
                    <p class="text-[9px] text-slate-400 font-bold">Pendentes</p>
                  </div>
                  <div class="bg-orange-50 dark:bg-orange-900/20 rounded-xl py-2">
                    <p class="text-sm font-black text-orange-500">🔥${m.streak}</p>
                    <p class="text-[9px] text-slate-400 font-bold">Streak</p>
                  </div>
                </div>
                ${m.conquistas.length>0?`<div class="flex gap-1 flex-wrap"><p class="text-[9px] text-slate-400 font-bold uppercase tracking-wide w-full mb-1">Conquistas</p>${m.conquistas.slice(0,8).map(c=>{const def=CONQUISTAS_DEF.find(d=>d.id===c.id);return def?`<span title="${def.title}" class="text-base cursor-default">${def.icon}</span>`:''}).join('')}${m.conquistas.length>8?`<span class="text-[10px] text-slate-400 font-bold ml-1">+${m.conquistas.length-8}</span>`:''}</div>`:'<p class="text-[11px] text-slate-400 italic">Nenhuma conquista ainda</p>'}
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}

        <!-- Atividade recente concluída -->
        ${atividadesRecentes.length > 0 ? `
        <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-5 border border-border-light dark:border-border-dark shadow-sm">
          <h3 class="font-bold mb-4 flex items-center gap-2"><i data-lucide="activity" class="w-5 h-5 text-emerald-500"></i> Atividade Recente</h3>
          <div class="space-y-2">
            ${atividadesRecentes.map(a=>`
            <div class="flex items-center gap-3 p-2.5 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl">
              <div class="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></div>
              <div class="flex-1 min-w-0">
                <p class="text-[13px] font-semibold truncate">${a.title}</p>
                <p class="text-[11px] text-slate-400">${a.resp} · ${a.date.split('-').reverse().join('/')}</p>
              </div>
              <span class="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">✓ Concluída</span>
            </div>`).join('')}
          </div>
        </div>` : ''}
      </div>

      <!-- Coluna direita: como ganhar pontos + prêmios + conquistas -->
      <div class="space-y-5">

        <!-- Como ganhar pontos -->
        <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-5 border border-border-light dark:border-border-dark shadow-sm">
          <h3 class="font-bold mb-4 flex items-center gap-2"><i data-lucide="zap" class="w-5 h-5 text-brand-main"></i> Como Ganhar Pontos</h3>
          <div class="space-y-2">
            ${[
              {pts:'+10',label:'Concluir qualquer tarefa',color:'text-brand-main',bg:'bg-brand-main/10'},
              {pts:'+5', label:'Tarefa de prioridade Alta',color:'text-amber-500',bg:'bg-amber-50 dark:bg-amber-900/20'},
              {pts:'+15',label:'Tarefa Urgente concluída',color:'text-red-500',bg:'bg-red-50 dark:bg-red-900/20'},
              {pts:'+5', label:'Concluir no prazo',color:'text-blue-500',bg:'bg-blue-50 dark:bg-blue-900/20'},
              {pts:'+N', label:'Bônus de sequência',color:'text-orange-500',bg:'bg-orange-50 dark:bg-orange-900/20'},
              {pts:'+2', label:'Item de compra comprado',color:'text-emerald-500',bg:'bg-emerald-50 dark:bg-emerald-900/20'},
            ].map(r=>`<div class="flex items-center gap-2.5 p-2.5 ${r.bg} rounded-xl">
              <span class="font-black w-10 text-center text-sm flex-shrink-0 ${r.color}">${r.pts}</span>
              <span class="text-[12px] text-slate-600 dark:text-slate-300">${r.label}</span>
            </div>`).join('')}
          </div>
        </div>

        <!-- Níveis -->
        <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-5 border border-border-light dark:border-border-dark shadow-sm">
          <h3 class="font-bold mb-4 flex items-center gap-2"><i data-lucide="layers" class="w-5 h-5 text-purple-500"></i> Níveis</h3>
          <div class="space-y-2">
            ${LEVELS.map(l=>`<div class="flex items-center gap-2.5 p-2.5 ${l.bg} rounded-xl">
              <span class="text-lg flex-shrink-0">${l.icon}</span>
              <div class="flex-1 min-w-0">
                <p class="text-[12px] font-bold ${l.color}">${l.label}</p>
                <p class="text-[10px] text-slate-400">${l.min}+ pontos</p>
              </div>
            </div>`).join('')}
          </div>
        </div>

        <!-- Prêmios -->
        <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-5 border border-border-light dark:border-border-dark shadow-sm">
          <h3 class="font-bold mb-1 flex items-center gap-2"><i data-lucide="gift" class="w-5 h-5 text-rose-500"></i> Prêmios & Recompensas</h3>
          <p class="text-[12px] text-slate-400 mb-4">Acumule pontos e troque por recompensas reais!</p>
          ${DB.membros.length>0?`<div class="flex items-center gap-2 mb-4">
            <span class="text-[12px] text-slate-500 font-medium">Resgatar como:</span>
            <select id="premios-membro" class="px-3 py-1.5 rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-slate-800 text-sm font-medium flex-1">${membrosOpts}</select>
          </div>`:''}
          <div class="space-y-3">
            ${PREMIOS_DEF.map(p=>{
              const tierColors={1:'border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-900/10',2:'border-blue-200 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-900/10',3:'border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-900/10'};
              const tierBadge={1:'bg-emerald-100 text-emerald-700',2:'bg-blue-100 text-blue-700',3:'bg-amber-100 text-amber-700'};
              const tierLabels={1:'Básico',2:'Médio',3:'Premium'};
              const resgatados=DB.gamification.premios_resgatados.filter(r=>r.id===p.id).length;
              return `<div class="p-3.5 rounded-xl border ${tierColors[p.tier]||'border-border-light'}">
                <div class="flex items-start justify-between gap-2 mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-2xl">${p.icon}</span>
                    <div>
                      <p class="font-bold text-[13px]">${p.title}</p>
                      <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tierBadge[p.tier]}">${tierLabels[p.tier]}</span>
                    </div>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <p class="text-base font-black text-brand-main">${p.custo}</p>
                    <p class="text-[9px] text-slate-400 font-bold">pts</p>
                  </div>
                </div>
                <p class="text-[11px] text-slate-500 mb-2.5">${p.desc}</p>
                <div class="flex items-center justify-between">
                  ${resgatados>0?`<span class="text-[10px] text-slate-400">${resgatados}x resgatado</span>`:'<span></span>'}
                  <button onclick="resgatarPremio('${p.id}', document.getElementById('premios-membro')?.value || '${DB.membros[0]?.name||''}')"
                    class="px-3 py-1.5 rounded-lg bg-brand-main text-white text-[11px] font-bold hover:bg-brand-dark transition-colors shadow-sm">
                    Resgatar</button>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Conquistas disponíveis -->
        <div>
          <h3 class="text-base font-bold mb-4 flex items-center gap-2"><i data-lucide="award" class="w-5 h-5 text-purple-500"></i> Conquistas</h3>
          <div class="space-y-2">
            ${CONQUISTAS_DEF.map(def=>{
              const membrosComConq=DB.gamification.conquistas.filter(c=>c.id===def.id).map(c=>c.memberId);
              const ok=membrosComConq.length>0;
              return `<div class="flex items-center gap-3 p-3.5 rounded-2xl border transition-all
                ${ok?'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40':'bg-panel-light dark:bg-panel-dark border-border-light dark:border-border-dark opacity-60'}">
                <div class="text-2xl flex-shrink-0">${ok?def.icon:'🔒'}</div>
                <div class="flex-1 min-w-0">
                  <p class="font-bold text-[13px]">${def.title}</p>
                  <p class="text-[11px] text-slate-500 mt-0.5">${def.desc}</p>
                  ${ok?`<p class="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1">🏅 ${membrosComConq.slice(0,3).join(', ')}</p>`:''}
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Histórico de prêmios -->
        ${DB.gamification.premios_resgatados.length>0?`
        <div class="bg-panel-light dark:bg-panel-dark rounded-2xl p-5 border border-border-light dark:border-border-dark shadow-sm">
          <h3 class="font-bold mb-4 flex items-center gap-2"><i data-lucide="history" class="w-5 h-5 text-slate-500"></i> Histórico de Resgates</h3>
          <div class="space-y-2">
            ${DB.gamification.premios_resgatados.slice(-8).reverse().map(r=>{
              const p=PREMIOS_DEF.find(p=>p.id===r.id);
              return `<div class="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span class="text-xl">${p?p.icon:'🎁'}</span>
                <div class="flex-1"><p class="text-[13px] font-semibold">${r.titulo||p?.title||r.id}</p><p class="text-[11px] text-slate-400">${r.memberId} · ${r.date}</p></div>
              </div>`;
            }).join('')}
          </div>
        </div>`:``}
      </div>
    </div>
  </div>`;
}

function renderLeaderboard() {
  const pts=DB.gamification.pontos;
  const membros=DB.membros.map(m=>({
    name:m.name, photo:m.photo, borderHex:m.borderHex,
    pts:pts[m.name]||0, level:getLevel(pts[m.name]||0),
    conquistas:DB.gamification.conquistas.filter(c=>c.memberId===m.name),
    streak:DB.gamification.streaks[m.name]||0,
  })).sort((a,b)=>b.pts-a.pts);
  if(!membros.length) return '<p class="text-slate-400 text-sm text-center py-4">Adicione membros para ver o ranking.</p>';
  return membros.map((m,i)=>{
    const medals=["🥇","🥈","🥉"]; const medal=medals[i]||`#${i+1}`;
    const next=LEVELS.find(l=>l.min>m.pts)||m.level;
    const pctNext=next.min>m.level.min?Math.min(100,Math.max(0,Math.round(((m.pts-m.level.min)/(next.min-m.level.min))*100))):100;
    const avatarFallback=`https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=fff`;
    return `<div class="flex items-center gap-4 p-4 bg-panel-light dark:bg-panel-dark rounded-2xl border border-border-light dark:border-border-dark shadow-sm hover:shadow-md transition-all">
      <div class="text-2xl w-8 text-center flex-shrink-0">${medal}</div>
      <div class="relative flex-shrink-0">
        <img src="${m.photo||avatarFallback}" class="w-12 h-12 rounded-full object-cover border-2" style="border-color:${m.borderHex}">
        <div class="absolute -bottom-1 -right-1 text-sm leading-none">${m.level.icon}</div>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="font-bold text-slate-800 dark:text-slate-100">${m.name}</p>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${m.level.bg} ${m.level.color}">${m.level.label}</span>
          ${m.streak>=3?`<span class="text-[10px] font-bold text-amber-500">🔥 ${m.streak} dias</span>`:""}
        </div>
        <div class="flex items-center gap-2 mt-1.5">
          <div class="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-brand-main to-emerald-400" style="width:${pctNext}%"></div>
          </div>
          <span class="text-[10px] font-bold text-brand-main whitespace-nowrap">${m.pts} pts</span>
        </div>
        ${m.conquistas.length>0?`<div class="flex gap-1 mt-1.5 flex-wrap">${m.conquistas.slice(0,6).map(c=>{const def=CONQUISTAS_DEF.find(d=>d.id===c.id);return def?`<span title="${def.title}" class="text-base cursor-default">${def.icon}</span>`:""}).join("")}${m.conquistas.length>6?`<span class="text-[10px] text-slate-400 font-bold">+${m.conquistas.length-6}</span>`:""}</div>`:""}
      </div>
    </div>`;
  }).join("");
}

// ─── Sincronização do leaderboard com o servidor ─────────────────────────────
// Quando logado, busca pontos atualizados do backend e aplica ao DB local.
async function syncLeaderboardFromServer() {
  if (!Auth.isLoggedIn()) return;
  try {
    const res = await API.get("leaderboard");
    if (!res.ok || !res.leaderboard || !res.leaderboard.length) return;
    // Atualiza pontos locais com os valores autoritativos do servidor
    res.leaderboard.forEach(entry => {
      if (entry.member_name) {
        DB.gamification.pontos[entry.member_name] = entry.pts ?? 0;
      }
    });
    saveDB(false); // persiste localmente sem re-sincronizar ao servidor
    // Re-renderiza a view de ranking se ainda estiver ativa
    if (currentView === "ranking") {
      const container = document.getElementById("page-content");
      if (container) { container.innerHTML = renderRanking(); lucide.createIcons(); }
    }
  } catch (_) {}
}
