<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/ForecastService.php';
require_once __DIR__ . '/lib/Database.php';
require_once __DIR__ . '/lib/Auth.php';

$configPath = getenv('RESHIS_CONFIG') ?: dirname(__DIR__) . '/config.php';
if (!is_file($configPath)) {
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Создайте config.php по инструкции'], JSON_UNESCAPED_UNICODE);
    exit;
}
$config = require $configPath;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');

$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
session_name($config['session_name'] ?? 'reshis_session');
session_set_cookie_params([
    'lifetime' => 60 * 60 * 24 * 14,
    'path' => '/',
    'secure' => $secure,
    'httponly' => true,
    'samesite' => 'Lax',
]);
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}
if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}

function respond(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function input(): array
{
    $length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > 16384) {
        respond(['error' => 'Слишком большой запрос'], 413);
    }
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) return [];
    try {
        $data = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        respond(['error' => 'Ожидается корректный JSON'], 400);
    }
    if (!is_array($data)) respond(['error' => 'Ожидается JSON-объект'], 400);
    return $data;
}

function requireMethod(string $expected): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== $expected) {
        header('Allow: ' . $expected);
        respond(['error' => 'Метод не поддерживается'], 405);
    }
}

function requireCsrf(): void
{
    $site = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? 'same-origin';
    if (!in_array($site, ['same-origin', 'same-site', 'none'], true)) {
        respond(['error' => 'Запрос отклонён'], 403);
    }
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!$token || !hash_equals($_SESSION['csrf'], $token)) {
        respond(['error' => 'Обновите страницу и повторите действие'], 403);
    }
}
