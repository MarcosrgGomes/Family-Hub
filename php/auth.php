<?php
// ============================================================
//  FamilyHub — auth.php
//  Gerencia login, registro, logout e dados do usuário logado.
//
//  Rotas disponíveis:
//  POST /auth.php?action=login    → Faz login
//  POST /auth.php?action=register → Cria conta
//  POST /auth.php?action=logout   → Encerra sessão
//  GET  /auth.php?action=me       → Dados do usuário logado
// ============================================================

require_once __DIR__ . '/db.php';

// ─── Configurações de Rate Limiting ──────────────────────
// Ajuste via .env se necessário (valores padrão seguros)
define('RATE_MAX_ATTEMPTS', (int)(($_ENV['RATE_LIMIT_ATTEMPTS'] ?? getenv('RATE_LIMIT_ATTEMPTS')) ?: 5));   // máximo de tentativas
define('RATE_WINDOW_MIN',   (int)(($_ENV['RATE_LIMIT_WINDOW'] ?? getenv('RATE_LIMIT_WINDOW')) ?: 15));  // janela em minutos
define('RATE_LOCKOUT_MIN',  (int)(($_ENV['RATE_LIMIT_LOCKOUT'] ?? getenv('RATE_LIMIT_LOCKOUT')) ?: 30));  // bloqueio em minutos

// Lê a ação da URL e o corpo da requisição em JSON
$action = $_GET['action'] ?? '';
$body   = json_decode(file_get_contents('php://input'), true) ?? [];

// ============================================================
//  checkRateLimit() — Proteção contra Brute Force
//
//  COMO FUNCIONA:
//  Conta quantas tentativas de login FALHAS vieram do mesmo IP
//  nos últimos RATE_WINDOW_MIN minutos.
//  Se ultrapassar RATE_MAX_ATTEMPTS, bloqueia por RATE_LOCKOUT_MIN.
//
//  Por que por IP e não por e-mail?
//  Bloquear por e-mail permitiria que um atacante bloqueie
//  propositalmente a conta de outra pessoa. Por IP é mais seguro.
// ============================================================
function checkRateLimit(string $ip): void {
    try {
        $pdo     = getPDO();
        $window  = date('Y-m-d H:i:s', time() - RATE_WINDOW_MIN * 60);

        // Conta tentativas FALHAS do IP na janela configurável (RATE_LIMIT_WINDOW)
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) as total FROM login_attempts
             WHERE ip_address = ? AND success = 0 AND attempted_at > ?'
        );
        $stmt->execute([$ip, $window]);
        $row = $stmt->fetch();

        if ((int)$row['total'] >= RATE_MAX_ATTEMPTS) {
            // Calcula quanto tempo falta para desbloquear
            $nextStmt = $pdo->prepare(
                'SELECT attempted_at FROM login_attempts
                 WHERE ip_address = ? AND success = 0
                 ORDER BY attempted_at DESC LIMIT 1'
            );
            $nextStmt->execute([$ip]);
            $last = $nextStmt->fetchColumn();
            $unlockAt = date('H:i', strtotime($last) + RATE_LOCKOUT_MIN * 60);

            jsonError(
                "Muitas tentativas de login. Tente novamente após {$unlockAt}.",
                429 // 429 = Too Many Requests
            );
        }
    } catch (Exception $e) {
        // Se a tabela não existir ou der erro, não bloqueia o fluxo
        // (fail open intencional para não travar o sistema)
        error_log('[FamilyHub] Rate limit check falhou: ' . $e->getMessage());
    }
}

// ─── Registra uma tentativa de login ──────────────────────
function recordLoginAttempt(string $ip, string $email, bool $success): void {
    try {
        getPDO()->prepare(
            'INSERT INTO login_attempts (ip_address, email, success) VALUES (?, ?, ?)'
        )->execute([$ip, $email, $success ? 1 : 0]);
    } catch (Exception $e) {
        error_log('[FamilyHub] Falha ao registrar tentativa: ' . $e->getMessage());
    }
}

// ─── Obtém o IP real do cliente ───────────────────────────
// Headers X-Forwarded-For e CF-Connecting-IP podem ser forjados por qualquer
// cliente — só os usamos se TRUSTED_PROXY=true estiver no .env,
// indicando que existe um proxy reverso confiável na frente do servidor.
// Sem essa flag, usamos sempre REMOTE_ADDR, que é o IP real da conexão TCP.
function getClientIp(): string {
    $trustProxy = (($_ENV['TRUSTED_PROXY'] ?? getenv('TRUSTED_PROXY')) ?: '') === 'true';

    if ($trustProxy) {
        foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR'] as $key) {
            if (!empty($_SERVER[$key])) {
                // X-Forwarded-For pode ter múltiplos IPs separados por vírgula — pega o primeiro
                $ip = trim(explode(',', $_SERVER[$key])[0]);
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }
    }

    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '0.0.0.0';
}

// Direciona para a função correta conforme a ação recebida
match ($action) {
    'login'    => handleLogin($body),
    'register' => handleRegister($body),
    'logout'   => handleLogout(),
    'me'       => handleMe(),
    default    => jsonError('Ação inválida.', 404),
};

// ============================================================
//  handleLogin() — Login com verificação segura de senha
//
//  APRESENTAÇÃO:
//  A senha NUNCA é salva em texto puro no banco de dados.
//  Ela é armazenada como um hash bcrypt (algoritmo de
//  criptografia unidirecional). Na hora do login, usamos
//  password_verify() para comparar a senha digitada com o hash.
//
//  Também implementamos rehash automático: se o custo do
//  algoritmo aumentar no futuro (segurança maior), o sistema
//  atualiza o hash da senha automaticamente no próximo login
//  do usuário, sem ele precisar fazer nada.
// ============================================================
function handleLogin(array $body): void {
    $email = strtolower(trim($body['email'] ?? ''));
    $pass  = $body['password'] ?? '';
    $ip    = getClientIp();

    // ─── Proteção contra Brute Force ─────────────────────────
    // Verifica se o IP excedeu o limite de tentativas antes de
    // qualquer consulta ao banco — interrompe logo no início.
    checkRateLimit($ip);

    // Validação básica antes de consultar o banco
    if (!$email || !$pass) {
        jsonError('E-mail e senha são obrigatórios.');
    }

    try {
        $pdo  = getPDO();
        $stmt = $pdo->prepare(
            // is_active = 1 impede login de contas desativadas
            'SELECT id, name, email, password_hash, family_name
             FROM users WHERE email = ? AND is_active = 1
             LIMIT 1'
        );
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        // ─── Verificação de senha com bcrypt ─────────────────
        // PHP usa prefixo $2y$, mas hashes gerados por outras
        // ferramentas (Python, Node.js) usam $2b$.
        // São funcionalmente idênticos — normalizamos para $2y$.
        if ($user) {
            $hashFixed = preg_replace('/^\$2b\$/', '$2y$', $user['password_hash']);
            $valid     = password_verify($pass, $hashFixed); // Compara senha com hash
        } else {
            $valid = false;
        }

        // Mensagem genérica para não revelar se o e-mail existe
        if (!$user || !$valid) {
            // Registra a tentativa FALHA para o rate limiter
            recordLoginAttempt($ip, $email, false);
            jsonError('E-mail ou senha incorretos.', 401);
        }

        // ─── Rehash automático ────────────────────────────────
        // Se o padrão de segurança evoluir (ex: custo aumentar),
        // atualiza o hash da senha silenciosamente no próximo login.
        if (password_needs_rehash($hashFixed, PASSWORD_BCRYPT, ['cost' => 12])) {
            $newHash = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);
            $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
                ->execute([$newHash, $user['id']]);
        }

        // Atualiza data do último login
        $pdo->prepare('UPDATE users SET last_login = NOW() WHERE id = ?')
            ->execute([$user['id']]);

        // Registra o login BEM-SUCEDIDO (limpa o histórico de falhas no IP)
        recordLoginAttempt($ip, $email, true);

        // Remove tokens expirados do usuário (limpeza automática)
        $pdo->prepare('DELETE FROM auth_tokens WHERE user_id = ? AND expires_at < NOW()')
            ->execute([$user['id']]);

        // Gera novo token de sessão e salva no banco
        $token   = generateToken();
        $expires = date('Y-m-d H:i:s', time() + TOKEN_EXPIRE_HOURS * 3600);
        $ua      = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);
        $ip      = $_SERVER['REMOTE_ADDR'] ?? null;

        $pdo->prepare(
            'INSERT INTO auth_tokens (user_id, token, expires_at, user_agent, ip_address)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([$user['id'], $token, $expires, $ua, $ip]);

        // Carrega os dados da família do usuário
        $dataStmt = $pdo->prepare('SELECT data_json FROM family_data WHERE user_id = ? LIMIT 1');
        $dataStmt->execute([$user['id']]);
        $familyRow = $dataStmt->fetch();

        $familyData = $familyRow ? json_decode($familyRow['data_json'], true) : null;
        $isNewUser  = !$familyRow; // true se nunca salvou dados antes

        // Retorna token + dados do usuário + dados da família
        jsonSuccess([
            'token'        => $token,
            'is_new_user'  => $isNewUser,
            'user'         => [
                'id'         => $user['id'],
                'name'       => $user['name'],
                'email'      => $user['email'],
                'familyName' => $user['family_name'],
            ],
            'family_data'  => $familyData,
        ]);

    } catch (Exception $e) {
        error_log('[FamilyHub] Erro no login: ' . $e->getMessage());
        $isDev = (getenv('APP_ENV') ?: 'production') === 'development';
        jsonError($isDev ? 'Erro interno: ' . $e->getMessage() : 'Erro interno do servidor.', 500);
    }
}

// ============================================================
//  handleRegister() — Criação de conta com validações
//
//  APRESENTAÇÃO:
//  Antes de criar qualquer conta, o sistema valida:
//  1. Formato do e-mail (filter_var com FILTER_VALIDATE_EMAIL)
//  2. Tamanho mínimo da senha (6 caracteres)
//  3. E-mail duplicado (consulta no banco antes de inserir)
//
//  Após criar a conta, já gera um token de login automático
//  (o usuário não precisa logar de novo) e dispara uma
//  notificação de boas-vindas dentro do sistema.
// ============================================================
function handleRegister(array $body): void {
    $name   = trim($body['name']     ?? '');
    $email  = strtolower(trim($body['email'] ?? ''));
    $pass   = $body['password']      ?? '';
    $phone  = trim($body['phone']    ?? '');
    $age    = isset($body['age']) ? (int)$body['age'] : null;

    // ─── Validações antes de tocar no banco ──────────────────
    if (!$name || !$email || !$pass) {
        jsonError('Nome, e-mail e senha são obrigatórios.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        // Verifica se o e-mail tem formato válido (ex: user@dominio.com)
        jsonError('E-mail inválido.');
    }
    if (strlen($pass) < 6) {
        jsonError('A senha deve ter pelo menos 6 caracteres.');
    }

    try {
        $pdo = getPDO();

        // ─── Impede e-mail duplicado ──────────────────────────
        // Consulta se já existe uma conta com esse e-mail antes de criar
        $check = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $check->execute([$email]);
        if ($check->fetch()) {
            jsonError('Este e-mail já está cadastrado.', 409); // 409 = Conflito
        }

        // Criptografa a senha com bcrypt (custo 12 = seguro e rápido)
        $hash       = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);
        $familyName = $name . "'s Family"; // Nome padrão da família

        // Insere o novo usuário no banco
        $pdo->prepare(
            'INSERT INTO users (name, email, password_hash, phone, age, family_name)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([$name, $email, $hash, $phone ?: null, $age, $familyName]);

        $userId = (int)$pdo->lastInsertId(); // ID gerado automaticamente

        // ─── Token de login automático ────────────────────────
        // Gera token para que o usuário já entre logado após o cadastro
        $token   = generateToken();
        $expires = date('Y-m-d H:i:s', time() + TOKEN_EXPIRE_HOURS * 3600);
        $ua      = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);
        $ip      = $_SERVER['REMOTE_ADDR'] ?? null;

        $pdo->prepare(
            'INSERT INTO auth_tokens (user_id, token, expires_at, user_agent, ip_address)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([$userId, $token, $expires, $ua, $ip]);

        // Cria estrutura de dados vazia para o novo usuário no banco
        $emptyData = json_encode([
            'settings'     => ['familyName' => $familyName, 'email' => $email, 'photo' => ''],
            'gamification' => [
                'pontos'            => (object)[],
                'conquistas'        => [],
                'streaks'           => (object)[],
                'lastActivityDate'  => (object)[],
                'premios_resgatados'=> [],
                'desafios'          => [],
            ],
            'notificacoes' => [],
            'atividades'   => [],
            'listas'       => [],
            'receitas'     => [],
            'membros'      => [],
        ], JSON_UNESCAPED_UNICODE);

        $pdo->prepare(
            'INSERT IGNORE INTO family_data (user_id, data_json, version) VALUES (?, ?, 1)'
        )->execute([$userId, $emptyData]);

        $dataStmt = $pdo->prepare('SELECT data_json FROM family_data WHERE user_id = ? LIMIT 1');
        $dataStmt->execute([$userId]);
        $familyRow = $dataStmt->fetch();
        $familyDataDecoded = $familyRow ? json_decode($familyRow['data_json'], true) : null;

        // ─── Notificação de boas-vindas ───────────────────────
        // Disparada automaticamente ao criar a conta — aparece
        // no sino de notificações quando o usuário entra pela primeira vez
        $pdo->prepare(
            'INSERT INTO notifications (user_id, title, message, type, icon)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([
            $userId,
            'Bem-vindo ao FamilyHub! 🎉',
            'Sua conta foi criada com sucesso. Comece adicionando membros da família!',
            'success',
            'party-popper',
        ]);

        jsonSuccess([
            'token'       => $token,
            'is_new_user' => true,
            'user'        => [
                'id'         => $userId,
                'name'       => $name,
                'email'      => $email,
                'familyName' => $familyName,
            ],
            'family_data' => $familyDataDecoded,
        ], 201); // 201 = Created

    } catch (Exception $e) {
        error_log('[FamilyHub] Erro no registro: ' . $e->getMessage());
        $isDev = (getenv('APP_ENV') ?: 'production') === 'development';
        jsonError($isDev ? 'Erro ao criar conta: ' . $e->getMessage() : 'Erro ao criar conta. Tente novamente.', 500);
    }
}

// ─────────────────────────────────────────────────
//  handleLogout() — Encerramento de sessão
//  Remove o token do banco, invalidando a sessão imediatamente.
// ─────────────────────────────────────────────────
function handleLogout(): void {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$authHeader && function_exists('apache_request_headers')) {
        $headers    = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) {
        try {
            // Deleta o token do banco — a sessão é encerrada imediatamente
            getPDO()->prepare('DELETE FROM auth_tokens WHERE token = ?')
                ->execute([$m[1]]);
        } catch (Exception $e) {}
    }
    jsonSuccess(['message' => 'Sessão encerrada.']);
}

// ─────────────────────────────────────────────────
//  handleMe() — Dados do usuário logado
//  Rota protegida: retorna os dados do usuário autenticado.
// ─────────────────────────────────────────────────
function handleMe(): void {
    $userId = requireAuth(); // Bloqueia se não estiver logado
    try {
        $pdo  = getPDO();
        $stmt = $pdo->prepare(
            'SELECT id, name, email, family_name FROM users WHERE id = ? LIMIT 1'
        );
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        if (!$user) {
            jsonError('Usuário não encontrado.', 404);
        }
        jsonSuccess(['user' => $user]);
    } catch (Exception $e) {
        jsonError('Erro ao buscar usuário.', 500);
    }
}
