// =============================================================================
// FAMILYHUB — config.js
// Constantes globais, configuração de menu e dados estáticos
// =============================================================================

const API_BASE = './';

// ─── Menu de navegação lateral ───────────────────────────────────────────────
const MENU = [
  { id: 'dashboard',    label: 'Dashboard',       icon: 'layout-dashboard', subtitle: 'Visão geral da sua tribo.'          },
  { id: 'calendario',   label: 'Calendário',       icon: 'calendar',         subtitle: 'Navegue e filtre os eventos.'        },
  { id: 'atividades',   label: 'Atividades',       icon: 'check-square',     subtitle: 'Gestão de tarefas com filtros.'      },
  { id: 'compras',      label: 'Listas & Compras', icon: 'shopping-cart',    subtitle: 'Adicione, mova e remova itens.'      },
  { id: 'receitas',     label: 'Receitas',         icon: 'chef-hat',         subtitle: 'Gerencie seu cardápio e preparos.'   },
  { id: 'membros',      label: 'Membros',          icon: 'users',            subtitle: 'Gerencie quem faz parte da família.' },
  { id: 'ranking',      label: 'Ranking',          icon: 'trophy',           subtitle: 'Pontuação e conquistas da família.'  },
  { id: 'estatisticas', label: 'Estatísticas',     icon: 'bar-chart-2',      subtitle: 'Análise detalhada do progresso.'     },
  { id: 'logs',         label: 'Histórico',        icon: 'history',          subtitle: 'Histórico de alterações do sistema.' },
];

// ─── Configurações de prioridade e status ────────────────────────────────────
const priorityConfig = {
  baixa:   { label:'Baixa',   color:'text-slate-400', dot:'bg-slate-300', icon:'minus'    },
  media:   { label:'Média',   color:'text-amber-500', dot:'bg-amber-400', icon:'equal'    },
  alta:    { label:'Alta',    color:'text-red-500',   dot:'bg-red-400',   icon:'arrow-up' },
  urgente: { label:'Urgente', color:'text-red-700',   dot:'bg-red-600',   icon:'zap'      },
};

const statusConfig = {
  pendente:  { label:'Pendente',     color:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',       icon:'clock'           },
  andamento: { label:'Em Andamento', color:'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',           icon:'loader'          },
  concluida: { label:'Concluída',    color:'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',icon:'check-circle-2'  },
};

// ─── Configurações de gamificação ────────────────────────────────────────────
const LEVELS = [
  { min:0,    max:99,   label:'Iniciante', icon:'🌱', color:'text-slate-500',  bg:'bg-slate-100 dark:bg-slate-800'     },
  { min:100,  max:299,  label:'Ativo',     icon:'⭐', color:'text-blue-500',   bg:'bg-blue-50 dark:bg-blue-900/30'     },
  { min:300,  max:599,  label:'Dedicado',  icon:'🔥', color:'text-amber-500',  bg:'bg-amber-50 dark:bg-amber-900/30'   },
  { min:600,  max:999,  label:'Expert',    icon:'💎', color:'text-purple-500', bg:'bg-purple-50 dark:bg-purple-900/30' },
  { min:1000, max:9999, label:'Mestre',    icon:'👑', color:'text-brand-main', bg:'bg-brand-main/10'                   },
];

const CONQUISTAS_DEF = [
  { id:'first_task',    icon:'🎯', title:'Primeiro Passo',    desc:'Completou a primeira tarefa!',         check:(m,db)=>db.atividades.filter(a=>a.resp===m&&a.status==='concluida').length>=1 },
  { id:'five_tasks',    icon:'🏅', title:'Mãos à Obra',       desc:'Completou 5 tarefas.',                 check:(m,db)=>db.atividades.filter(a=>a.resp===m&&a.status==='concluida').length>=5 },
  { id:'twenty_tasks',  icon:'🚀', title:'Dedicado',           desc:'Completou 20 tarefas.',                check:(m,db)=>db.atividades.filter(a=>a.resp===m&&a.status==='concluida').length>=20 },
  { id:'fifty_tasks',   icon:'💯', title:'Implacável',         desc:'Completou 50 tarefas!',                check:(m,db)=>db.atividades.filter(a=>a.resp===m&&a.status==='concluida').length>=50 },
  { id:'streak_3',      icon:'🔥', title:'Em Chamas',          desc:'3 dias seguidos concluindo tarefas.',  check:(m,db)=>(db.gamification.streaks[m]||0)>=3 },
  { id:'streak_7',      icon:'⚡', title:'Imparável',          desc:'7 dias seguidos!',                     check:(m,db)=>(db.gamification.streaks[m]||0)>=7 },
  { id:'streak_14',     icon:'🌟', title:'Lendário',           desc:'14 dias seguidos!',                    check:(m,db)=>(db.gamification.streaks[m]||0)>=14 },
  { id:'all_urgent',    icon:'🚨', title:'Apagador de Fogo',   desc:'Concluiu uma tarefa urgente.',         check:(m,db)=>db.atividades.some(a=>a.resp===m&&a.status==='concluida'&&a.priority==='urgente') },
  { id:'health_master', icon:'❤️', title:'Saúde em Dia',       desc:'Completou 5 tarefas de saúde.',        check:(m,db)=>db.atividades.filter(a=>a.resp===m&&a.status==='concluida'&&a.tag==='SAÚDE').length>=5 },
  { id:'sport_fan',     icon:'⚽', title:'Esportista',         desc:'Completou 5 tarefas de esporte.',      check:(m,db)=>db.atividades.filter(a=>a.resp===m&&a.status==='concluida'&&a.tag==='ESPORTE').length>=5 },
  { id:'home_hero',     icon:'🏠', title:'Herói do Lar',       desc:'Completou 10 tarefas domésticas.',     check:(m,db)=>db.atividades.filter(a=>a.resp===m&&a.status==='concluida'&&a.tag==='TAREFA DOMÉSTICA').length>=10 },
  { id:'early_bird',    icon:'🌅', title:'Madrugador',         desc:'Concluiu tarefa antes do prazo.',      check:(m,db)=>{ const hoje=new Date().toISOString().split('T')[0]; return db.atividades.some(a=>a.resp===m&&a.status==='concluida'&&a.date>hoje); }},
  { id:'leader',        icon:'👑', title:'Líder da Família',   desc:'Maior pontuação da família!',          check:(m,db)=>{ const pts=db.gamification.pontos; const myPts=pts[m]||0; if(!myPts)return false; return Object.keys(pts).every(k=>k===m||(pts[k]||0)<=myPts); }},
  { id:'shopper',       icon:'🛒', title:'Comprador Mestre',   desc:'Marcou 20 itens como comprados.',      check:(m,db)=>{ return (db.gamification.pontos[m]||0)>=40; }},
  { id:'century',       icon:'💰', title:'Centenário',         desc:'Acumulou 100 pontos.',                 check:(m,db)=>(db.gamification.pontos[m]||0)>=100 },
  { id:'millionaire',   icon:'💎', title:'Colecionador',       desc:'Acumulou 500 pontos!',                 check:(m,db)=>(db.gamification.pontos[m]||0)>=500 },
];

const PREMIOS_DEF = [
  { id:'sorvete',     icon:'🍦', title:'Sorvete Especial',     custo:50,  desc:'Peça um sorvete do sabor que quiser!',           tier:1 },
  { id:'filme',       icon:'🎬', title:'Escolhe o Filme',      custo:100, desc:'Você escolhe o próximo filme da família.',       tier:1 },
  { id:'videogame',   icon:'🎮', title:'1h Extra de Videogame',custo:150, desc:'Ganhe 1 hora extra de tela.',                   tier:2 },
  { id:'restaurante', icon:'🍕', title:'Pizza em Família',     custo:200, desc:'Uma pizza no restaurante da sua escolha!',      tier:2 },
  { id:'passeio',     icon:'🎡', title:'Passeio Surpresa',     custo:300, desc:'Um passeio especial escolhido pelos pais.',     tier:3 },
  { id:'presente',    icon:'🎁', title:'Presente Surpresa',    custo:500, desc:'Um presente surpresa por atingir 500 pontos!', tier:3 },
];
