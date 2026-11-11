<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($path === '/api/meta') {
        requireMethod('GET');
        respond(ForecastService::meta());
    }

    if ($path === '/api/calculate') {
        requireMethod('POST');
        requireCsrf();
        $input = input();
        respond(ForecastService::calculate(
            (string) ($input['route'] ?? ''),
            (string) ($input['date'] ?? ''),
            $input['price'] ?? null
        ));
    }

    if ($path === '/api/me') {
        requireMethod('GET');
        respond(['user' => $_SESSION['user'] ?? null, 'csrfToken' => $_SESSION['csrf']]);
    }

    if ($path === '/api/register' || $path === '/api/login') {
        requireMethod('POST');
        requireCsrf();
        $user = Auth::user(Database::pdo($config), input(), $path === '/api/register');
        respond(['user' => $user, 'csrfToken' => $_SESSION['csrf']]);
    }

    if ($path === '/api/logout') {
        requireMethod('POST');
        requireCsrf();
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
        respond(['ok' => true]);
    }

    if ($path === '/api/save') {
        requireMethod('POST');
        requireCsrf();
        $user = Auth::requireUser();
        $input = input();
        $result = ForecastService::calculate(
            (string) ($input['route'] ?? ''),
            (string) ($input['date'] ?? ''),
            $input['price'] ?? null
        );
        $db = Database::pdo($config);
        $statement = $db->prepare('INSERT INTO saved_calculations
            (user_id, route, route_name, flight_date, price, seats, desired_demand, sales)
            VALUES (:user_id, :route, :route_name, :flight_date, :price, :seats, :desired_demand, :sales)');
        $statement->execute([
            'user_id' => $user['id'],
            'route' => $result['route']['route'],
            'route_name' => $result['route']['name'],
            'flight_date' => $result['date'],
            'price' => $result['price'],
            'seats' => $result['seats'],
            'desired_demand' => $result['desiredDemand'],
            'sales' => $result['sales'],
        ]);
        respond(['ok' => true, 'id' => (int) $db->lastInsertId()], 201);
    }

    if ($path === '/api/history') {
        requireMethod('GET');
        $user = Auth::requireUser();
        $statement = Database::pdo($config)->prepare('SELECT id, route, route_name AS routeName,
            flight_date AS flightDate, price, seats, desired_demand AS desiredDemand, sales, created_at AS createdAt
            FROM saved_calculations WHERE user_id = :user_id ORDER BY created_at DESC, id DESC LIMIT 12');
        $statement->execute(['user_id' => $user['id']]);
        $items = array_map(static function (array $row): array {
            foreach (['id', 'seats'] as $key) $row[$key] = (int) $row[$key];
            foreach (['price', 'desiredDemand', 'sales'] as $key) $row[$key] = (float) $row[$key];
            return $row;
        }, $statement->fetchAll());
        respond($items);
    }

    respond(['error' => 'API-маршрут не найден'], 404);
} catch (DomainException $error) {
    respond(['error' => $error->getMessage()], 422);
} catch (Throwable $error) {
    $safeMessage = 'Внутренняя ошибка сервера';
    if (!empty($config['debug'])) $safeMessage = $error->getMessage();
    respond(['error' => $safeMessage], 500);
}
