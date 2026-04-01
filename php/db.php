<?php
// ============================================================
//  FamilyHub — Conexão com o Banco de Dados (PDO)
//
//  Este arquivo é o coração da comunicação com o banco MySQL.
//  Ele é importado por todos os outros arquivos PHP do sistema
//  usando require_once, garantindo que as funções estejam
//  disponíveis em qualquer parte do backend.
// ============================================================

// ─── Carrega .env se existir ──────────────────────────────
// Lê o arquivo .env linha por linha e registra cada variável
// no ambiente do servidor, evitando expor credenciais no código.
$envFile = __DIR__ . '/../.env';
if (!file_exists($envFile)) $envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        if (!str_contains($line, '=')) continue;
        [$key, $val] = array_map('trim', explode('=', $line, 2));
        // Sempre aplica o .env (inclui DB_PASS vazio) e preenche $_ENV para leitura confiável no Windows/PHP-FPM
        $_ENV[$key] = $val;
        putenv("$key=$val");
    }
}

// ─── Constantes de configuração ──────────────────────────
// Todas as variáveis OBRIGATORIAMENTE vêm do .env.
// Se alguma estiver faltando, o sistema aborta com erro claro.
// Isso evita rodar em produção com credenciais vazias.

function requireEnv(string $key): string {
    $value = $_ENV[$key] ?? getenv($key);
    if ($value === false || $value === null || $value === '') {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        // Em produção, nunca exponha qual variável está faltando
        $isDev = (getenv('APP_ENV') ?: 'production') === 'development';
        echo json_encode([
            'ok'    => false,
            'error' => $isDev
                ? "Variável de ambiente obrigatória não definida: {$key}. Configure o arquivo .env."
                : 'Erro de configuração do servidor. Contate o administrador.'
        ]);
        exit;
    }
    return $value;
}

define('DB_HOST',    ($_ENV['DB_HOST'] ?? getenv('DB_HOST')) ?: 'localhost');
define('DB_PORT',    (int)(($_ENV['DB_PORT'] ?? getenv('DB_PORT')) ?: 3306));
define('DB_NAME',    requireEnv('DB_NAME'));
define('DB_USER',    requireEnv('DB_USER'));
define('DB_PASS',    array_key_exists('DB_PASS', $_ENV) ? $_ENV['DB_PASS'] : (getenv('DB_PASS') !== false ? getenv('DB_PASS') : '')); // Senha pode ser vazia em ambientes locais
define('DB_CHARSET', 'utf8mb4'); // Suporte completo a emojis e acentos

define('JWT_SECRET',         requireEnv('JWT_SECRET'));
define('TOKEN_EXPIRE_HOURS', 24 * 7); // Token válido por 7 dias
define('APP_ENV',            ($_ENV['APP_ENV'] ?? getenv('APP_ENV')) ?: 'production');

// ─── Headers CORS ─────────────────────────────────────────
// Em produção: defina APP_URL no .env com a URL do seu frontend.
// Em desenvolvimento: permite qualquer localhost.
$allowedOrigin = ($_ENV['APP_URL'] ?? getenv('APP_URL')) ?: 'http://localhost';
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (
    $requestOrigin === $allowedOrigin ||
    (APP_ENV === 'development' && str_starts_with($requestOrigin, 'http://localhost'))
) {
    header("Access-Control-Allow-Origin: {$requestOrigin}");
} else {
    header("Access-Control-Allow-Origin: {$allowedOrigin}");
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

// Requisições OPTIONS são o "preflight" do navegador — respondemos
// com 204 (sem conteúdo) para liberar a comunicação.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ============================================================
//  getPDO() — Conexão com o banco de dados
//
//  APRESENTAÇÃO:
//  Usa o padrão "Singleton" via variável estática.
//  Não importa quantas vezes getPDO() seja chamada —
//  a conexão com o banco só é aberta UMA vez por requisição.
//  Isso economiza recursos e evita erros de "muitas conexões".
//
//  PDO protege automaticamente contra SQL Injection usando
//  "prepared statements" — nunca concatenamos strings SQL.
// ============================================================
function getPDO(): PDO {
    // Na primeira chamada: $pdo é null, abre a conexão.
    // Nas chamadas seguintes: $pdo já existe, retorna direto.
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    // DSN = Data Source Name — identifica o banco a conectar (inclui porta configurável)
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        DB_HOST, DB_PORT, DB_NAME, DB_CHARSET
    );

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,  // Lança exceção em erros
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,        // Retorna array associativo ex: $row['nome']
        PDO::ATTR_EMULATE_PREPARES   => false,                   // Prepared statements reais do MySQL
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (\PDOException $e) {
        // Loga o erro real internamente, nunca expõe ao cliente
        error_log('[FamilyHub] Falha ao conectar ao MySQL: ' . $e->getMessage());
        $isDev = (getenv('APP_ENV') ?: 'production') === 'development';
        http_response_code(503);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'ok'               => false,
            'offline_fallback' => true,
            'error'            => $isDev
                ? 'Banco de dados inacessível: ' . $e->getMessage()
                : 'Banco de dados temporariamente indisponível.',
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    return $pdo;
}

// ─── Helpers de resposta JSON ─────────────────────────────
// Padronizam todas as respostas do backend no formato:
// { ok: true/false, ...dados }  — fácil de tratar no JavaScript.

function jsonSuccess(array $data = [], int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => true, ...$data], JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $message, int $status = 400): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

// ============================================================
//  generateToken() — Gerador de token seguro
//
//  APRESENTAÇÃO:
//  random_bytes(32) usa o gerador criptográfico do sistema
//  operacional — impossível de prever ou adivinhar.
//  bin2hex converte os 32 bytes em 64 caracteres hexadecimais.
//  Esse token é salvo no banco e enviado ao usuário após o login.
//  Toda requisição protegida precisa enviar esse token.
// ============================================================
function generateToken(): string {
    return bin2hex(random_bytes(32)); // 32 bytes = 64 caracteres hex
}

// ─── validateToken() ──────────────────────────────────────
// Verifica se um token existe no banco E ainda não expirou.
// Retorna o ID do usuário dono do token, ou null se inválido.
function validateToken(string $token): ?int {
    try {
        $pdo  = getPDO();
        $stmt = $pdo->prepare(
            // expires_at > NOW() rejeita tokens expirados automaticamente
            'SELECT user_id FROM auth_tokens
             WHERE token = ? AND expires_at > NOW()'
        );
        $stmt->execute([$token]);
        $row = $stmt->fetch();
        return $row ? (int)$row['user_id'] : null;
    } catch (Exception $e) {
        return null;
    }
}

// ============================================================
//  requireAuth() — Proteção de rotas
//
//  APRESENTAÇÃO:
//  Chamada no início de toda rota protegida do sistema.
//  Lê o token do cabeçalho HTTP "Authorization: Bearer <token>",
//  valida no banco e retorna o ID do usuário logado.
//
//  Se o token estiver ausente, inválido ou expirado, encerra
//  a requisição com erro 401 (Não autorizado) — nenhuma linha
//  de código a seguir é executada.
//
//  Isso garante que nenhum dado da família seja acessado
//  por usuários não autenticados.
// ============================================================
function requireAuth(): int {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    // Apache + mod_php às vezes não passa o header Authorization diretamente
    if (!$authHeader && function_exists('apache_request_headers')) {
        $headers     = apache_request_headers();
        $authHeader  = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    // Fallback para nginx / CGI
    if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }

    // Verifica o formato "Bearer <token>" — se não encontrar, bloqueia com 401
    if (!preg_match('/^Bearer\s+(.+)$/i', $authHeader, $m)) {
        jsonError('Token de autenticação ausente.', 401);
    }

    // Valida o token no banco de dados
    $userId = validateToken($m[1]);
    if (!$userId) {
        // Token inválido ou expirado — usuário precisa fazer login novamente
        jsonError('Token inválido ou expirado. Faça login novamente.', 401);
    }

    return $userId; // Retorna o ID do usuário para uso na rota protegida
}
