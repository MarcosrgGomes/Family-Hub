<?php
// ============================================================
//  FamilyHub — api.php
//  Roteador central da API REST
//
//  Rotas disponíveis (passadas via query string ?r=):
//    GET  data              → carrega dados da família
//    POST data              → salva/sincroniza dados da família
//    GET  notifications     → lista notificações do usuário
//    POST notifications/read   → marca todas como lidas
//    POST notifications/create → cria notificação
//    POST achievements      → registra conquista desbloqueada
//    GET  stats             → estatísticas globais da família
//    GET  leaderboard       → ranking dos membros
//    POST points            → adiciona pontos manualmente
//    GET  logs              → lista histórico de atividades
//    POST logs              → salva log de atividade
// ============================================================

require_once __DIR__ . '/db.php';

$route  = trim($_GET['r'] ?? '', '/');
$method = $_SERVER['REQUEST_METHOD'];
$body   = json_decode(file_get_contents('php://input'), true) ?? [];

// ── Roteamento ──────────────────────────────────────────────
try {
    match (true) {
        $route === 'health'              && $method === 'GET'  => handleHealth(),
        $route === 'data'                && $method === 'GET'  => handleGetData(),
        $route === 'data'                && $method === 'POST' => handleSaveData($body),
        $route === 'notifications'       && $method === 'GET'  => handleGetNotifications(),
        $route === 'notifications/read'  && $method === 'POST' => handleMarkAllRead(),
        $route === 'notifications/create'&& $method === 'POST' => handleCreateNotification($body),
        $route === 'achievements'        && $method === 'POST' => handleSaveAchievement($body),
        $route === 'stats'               && $method === 'GET'  => handleGetStats(),
        $route === 'leaderboard'         && $method === 'GET'  => handleGetLeaderboard(),
        $route === 'points'              && $method === 'POST' => handleAddPoints($body),
        $route === 'logs'                && $method === 'GET'  => handleGetLogs(),
        $route === 'logs'                && $method === 'POST' => handleCreateLog($body),
        default                                                => jsonError("Rota não encontrada: $route", 404),
    };
} catch (Exception $e) {
    // Em produção, não expõe detalhes do erro — apenas loga internamente
    error_log('[FamilyHub] Erro na rota "' . $route . '": ' . $e->getMessage());
    $isDev = (getenv('APP_ENV') ?: 'production') === 'development';
    jsonError($isDev ? 'Erro interno: ' . $e->getMessage() : 'Erro interno do servidor.', 500);
}


// ============================================================
//  HANDLERS
// ============================================================

/**
 * GET /api.php?r=health
 * Health check — sem autenticação.
 * Usado por ferramentas de monitoramento (UptimeRobot, etc.)
 * para verificar se a aplicação e o banco estão respondendo.
 */
function handleHealth(): void {
    $start = microtime(true);
    $db    = false;
    $dbMs  = null;

    try {
        $t0   = microtime(true);
        getPDO()->query('SELECT 1');
        $dbMs = round((microtime(true) - $t0) * 1000, 2);
        $db   = true;
    } catch (Exception $e) {
        // Banco inacessível — retorna 503
    }

    $totalMs = round((microtime(true) - $start) * 1000, 2);

    http_response_code($db ? 200 : 503);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status'     => $db ? 'ok' : 'degraded',
        'version'    => '1.0.0',
        'php'        => PHP_VERSION,
        'database'   => $db ? 'connected' : 'unreachable',
        'db_ms'      => $dbMs,
        'total_ms'   => $totalMs,
        'timestamp'  => date('c'),
    ]);
    exit;
}

/**
 * GET /api.php?r=data
 * Carrega o JSON do estado da família salvo no banco.
 */
function handleGetData(): void {
    $userId = requireAuth();
    $pdo    = getPDO();

    $stmt = $pdo->prepare('SELECT data_json, version, updated_at FROM family_data WHERE user_id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    if (!$row) {
        jsonSuccess(['data' => null, 'version' => 0]);
    }

    jsonSuccess([
        'data'       => json_decode($row['data_json'], true),
        'version'    => $row['version'],
        'updated_at' => $row['updated_at'],
    ]);
}

/**
 * POST /api.php?r=data
 * Salva (upsert) o estado completo da família.
 */
function handleSaveData(array $body): void {
    $userId = requireAuth();

    if (empty($body['data'])) {
        jsonError('Payload de dados ausente.');
    }

    $json = json_encode($body['data'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) {
        jsonError('Dados inválidos (JSON incodificável).');
    }

    $pdo = getPDO();
    $pdo->prepare(
        'INSERT INTO family_data (user_id, data_json, version)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE
           data_json  = VALUES(data_json),
           version    = version + 1,
           updated_at = NOW()'
    )->execute([$userId, $json]);

    $stmt = $pdo->prepare('SELECT version, updated_at FROM family_data WHERE user_id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    jsonSuccess(['version' => $row['version'], 'updated_at' => $row['updated_at']]);
}

/**
 * GET /api.php?r=notifications
 */
function handleGetNotifications(): void {
    $userId = requireAuth();
    $pdo    = getPDO();

    $stmt = $pdo->prepare(
        'SELECT id, title, message, type, icon, is_read, created_at
         FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 50'
    );
    $stmt->execute([$userId]);

    jsonSuccess(['notifications' => $stmt->fetchAll()]);
}

/**
 * POST /api.php?r=notifications/read
 */
function handleMarkAllRead(): void {
    $userId = requireAuth();
    $pdo    = getPDO();

    $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?')
        ->execute([$userId]);

    jsonSuccess(['message' => 'Notificações marcadas como lidas.']);
}

/**
 * POST /api.php?r=notifications/create
 */
function handleCreateNotification(array $body): void {
    $userId = requireAuth();

    $title   = trim($body['title']   ?? '');
    $message = trim($body['message'] ?? '');
    $type    = in_array($body['type'] ?? '', ['info','success','warning','achievement'])
               ? $body['type'] : 'info';
    $icon    = trim($body['icon'] ?? 'bell');

    if (!$title || !$message) {
        jsonError('Título e mensagem são obrigatórios.');
    }

    $pdo = getPDO();
    $pdo->prepare(
        'INSERT INTO notifications (user_id, title, message, type, icon)
         VALUES (?, ?, ?, ?, ?)'
    )->execute([$userId, $title, $message, $type, $icon]);

    jsonSuccess(['id' => (int)$pdo->lastInsertId()], 201);
}

/**
 * POST /api.php?r=achievements
 */
function handleSaveAchievement(array $body): void {
    $userId = requireAuth();

    $achId      = trim($body['achievement_id'] ?? '');
    $memberName = trim($body['member_name']    ?? '');

    if (!$achId) jsonError('achievement_id obrigatório.');

    $pdo = getPDO();

    $pdo->prepare(
        'INSERT IGNORE INTO achievements_log (user_id, achievement_id, member_name)
         VALUES (?, ?, ?)'
    )->execute([$userId, $achId, $memberName]);

    jsonSuccess(['message' => 'Conquista registrada.'], 201);
}

/**
 * GET /api.php?r=stats
 */
function handleGetStats(): void {
    $userId = requireAuth();
    $pdo    = getPDO();

    $stmt = $pdo->prepare('SELECT data_json FROM family_data WHERE user_id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    if (!$row) {
        jsonSuccess(['stats' => null]);
    }

    $data       = json_decode($row['data_json'], true);
    $atividades = $data['atividades'] ?? [];
    $hoje       = date('Y-m-d');
    $semanaPassada = date('Y-m-d', strtotime('-7 days'));

    $stats = [
        'total_atividades'    => count($atividades),
        'concluidas'          => count(array_filter($atividades, fn($a) => $a['status'] === 'concluida')),
        'pendentes'           => count(array_filter($atividades, fn($a) => $a['status'] === 'pendente')),
        'andamento'           => count(array_filter($atividades, fn($a) => $a['status'] === 'andamento')),
        'atrasadas'           => count(array_filter($atividades, fn($a) => $a['status'] === 'pendente' && $a['date'] < $hoje)),
        'concluidas_semana'   => count(array_filter($atividades, fn($a) => $a['status'] === 'concluida' && $a['date'] >= $semanaPassada)),
        'total_membros'       => count($data['membros'] ?? []),
        'total_receitas'      => count($data['receitas'] ?? []),
        'total_listas'        => count($data['listas'] ?? []),
        'total_pontos'        => array_sum($data['gamification']['pontos'] ?? []),
        'total_conquistas'    => count($data['gamification']['conquistas'] ?? []),
        'por_categoria'       => [],
        'por_membro'          => [],
    ];

    $categorias = [];
    foreach ($atividades as $a) {
        $tag = $a['tag'] ?? 'OUTROS';
        $categorias[$tag] = ($categorias[$tag] ?? 0) + 1;
    }
    $stats['por_categoria'] = $categorias;

    $porMembro = [];
    foreach ($atividades as $a) {
        $resp = $a['resp'] ?? 'N/A';
        if (!isset($porMembro[$resp])) {
            $porMembro[$resp] = ['total' => 0, 'concluidas' => 0, 'pendentes' => 0];
        }
        $porMembro[$resp]['total']++;
        if ($a['status'] === 'concluida') $porMembro[$resp]['concluidas']++;
        if ($a['status'] === 'pendente')  $porMembro[$resp]['pendentes']++;
    }
    $stats['por_membro'] = $porMembro;

    $achStmt = $pdo->prepare(
        'SELECT achievement_id, member_name, unlocked_at FROM achievements_log WHERE user_id = ? ORDER BY unlocked_at DESC'
    );
    $achStmt->execute([$userId]);
    $stats['achievements_log'] = $achStmt->fetchAll();

    jsonSuccess(['stats' => $stats]);
}

/**
 * GET /api.php?r=leaderboard
 */
function handleGetLeaderboard(): void {
    $userId = requireAuth();
    $pdo    = getPDO();

    $stmt = $pdo->prepare('SELECT data_json FROM family_data WHERE user_id = ?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    if (!$row) {
        jsonSuccess(['leaderboard' => []]);
    }

    $data    = json_decode($row['data_json'], true);
    $pontos  = $data['gamification']['pontos'] ?? [];
    $membros = $data['membros'] ?? [];

    $leaderboard = array_map(function ($m) use ($pontos, $data) {
        return [
            'name'       => $m['name'],
            'pts'        => $pontos[$m['name']] ?? 0,
            'photo'      => $m['photo'] ?? '',
            'conquistas' => count(array_filter(
                $data['gamification']['conquistas'] ?? [],
                fn($c) => $c['memberId'] === $m['name']
            )),
            'streak'     => $data['gamification']['streaks'][$m['name']] ?? 0,
        ];
    }, $membros);

    usort($leaderboard, fn($a, $b) => $b['pts'] - $a['pts']);

    jsonSuccess(['leaderboard' => $leaderboard]);
}

/**
 * POST /api.php?r=points
 */
function handleAddPoints(array $body): void {
    $userId = requireAuth();

    $memberName = trim($body['member_name'] ?? '');
    $points     = (int)($body['points'] ?? 0);
    $reason     = trim($body['reason'] ?? 'Pontos manuais');

    if (!$memberName || $points <= 0) {
        jsonError('member_name e points > 0 são obrigatórios.');
    }

    $pdo  = getPDO();
    $stmt = $pdo->prepare('SELECT data_json FROM family_data WHERE user_id = ?');
    $stmt->execute([$userId]);
    $row  = $stmt->fetch();

    if (!$row) jsonError('Dados da família não encontrados.', 404);

    $data = json_decode($row['data_json'], true);
    $data['gamification']['pontos'][$memberName] = ($data['gamification']['pontos'][$memberName] ?? 0) + $points;

    $json = json_encode($data, JSON_UNESCAPED_UNICODE);
    $pdo->prepare('UPDATE family_data SET data_json = ?, version = version + 1 WHERE user_id = ?')
        ->execute([$json, $userId]);

    $pdo->prepare(
        'INSERT INTO notifications (user_id, title, message, type, icon)
         VALUES (?, ?, ?, ?, ?)'
    )->execute([
        $userId,
        "$memberName ganhou $points pontos! 🌟",
        "Motivo: $reason. Total: " . $data['gamification']['pontos'][$memberName] . " pontos.",
        'achievement',
        'star',
    ]);

    jsonSuccess(['new_total' => $data['gamification']['pontos'][$memberName]]);
}

/**
 * GET /api.php?r=logs[&page=1&limit=20]
 * Retorna o histórico de ações com paginação.
 */
function handleGetLogs(): void {
    $userId = requireAuth();
    $pdo    = getPDO();

    // Paginação — valores seguros com limites máximos
    $page  = max(1, (int)($_GET['page']  ?? 1));
    $limit = min(100, max(1, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    // Total de registros para o cliente calcular o número de páginas
    $countStmt = $pdo->prepare('SELECT COUNT(*) FROM activity_logs WHERE user_id = ?');
    $countStmt->execute([$userId]);
    $total = (int)$countStmt->fetchColumn();

    $stmt = $pdo->prepare(
        'SELECT description, created_at
         FROM activity_logs
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?'
    );
    $stmt->execute([$userId, $limit, $offset]);

    jsonSuccess([
        'data'       => $stmt->fetchAll(),
        'pagination' => [
            'page'        => $page,
            'limit'       => $limit,
            'total'       => $total,
            'total_pages' => (int)ceil($total / $limit),
            'has_more'    => ($page * $limit) < $total,
        ],
    ]);
}

/**
 * POST /api.php?r=logs
 * Salva um novo registro no histórico de atividades.
 * Body: { description }
 */
function handleCreateLog(array $body): void {
    $userId     = requireAuth();
    $description = trim($body['description'] ?? '');

    if (!$description) {
        jsonError('description é obrigatório.');
    }

    saveActivityLog($userId, $description);
    jsonSuccess(['message' => 'Log registrado.'], 201);
}

/**
 * Função auxiliar para salvar logs (usada internamente e em handleSaveData).
 */
function saveActivityLog(int $userId, string $message): void {
    $pdo = getPDO();
    $stmt = $pdo->prepare(
        'INSERT INTO activity_logs (user_id, description) VALUES (?, ?)'
    );
    $stmt->execute([$userId, $message]);
}
