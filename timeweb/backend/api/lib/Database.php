<?php
declare(strict_types=1);

final class Database
{
    private static ?PDO $connection = null;

    public static function pdo(array $config): PDO
    {
        if (self::$connection !== null) {
            return self::$connection;
        }
        $db = $config['db'] ?? [];
        $driver = $db['driver'] ?? 'mysql';

        if ($driver === 'sqlite') {
            if (empty($db['path'])) {
                throw new RuntimeException('Не указан путь к SQLite');
            }
            $pdo = new PDO('sqlite:' . $db['path'], null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            $pdo->exec('PRAGMA foreign_keys = ON');
        } else {
            foreach (['host', 'name', 'user'] as $key) {
                if (empty($db[$key])) {
                    throw new RuntimeException('Заполните доступы к MySQL в config.php');
                }
            }
            $dsn = sprintf(
                'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
                $db['host'],
                $db['port'] ?? 3306,
                $db['name']
            );
            $pdo = new PDO($dsn, $db['user'], $db['password'] ?? '', [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        }
        self::migrate($pdo, $driver);
        self::$connection = $pdo;
        return $pdo;
    }

    private static function migrate(PDO $pdo, string $driver): void
    {
        if ($driver === 'sqlite') {
            $pdo->exec('CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(190) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )');
            $pdo->exec('CREATE TABLE IF NOT EXISTS saved_calculations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                route VARCHAR(16) NOT NULL,
                route_name VARCHAR(255) NOT NULL,
                flight_date DATE NOT NULL,
                price DECIMAL(12,2) NOT NULL,
                seats INTEGER NOT NULL,
                desired_demand DOUBLE NOT NULL,
                sales DOUBLE NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )');
            $pdo->exec('CREATE INDEX IF NOT EXISTS saved_calculations_user_created ON saved_calculations (user_id, created_at)');
        } else {
            $pdo->exec('CREATE TABLE IF NOT EXISTS users (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(190) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY users_email_unique (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
            $pdo->exec('CREATE TABLE IF NOT EXISTS saved_calculations (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                user_id BIGINT UNSIGNED NOT NULL,
                route VARCHAR(16) NOT NULL,
                route_name VARCHAR(255) NOT NULL,
                flight_date DATE NOT NULL,
                price DECIMAL(12,2) NOT NULL,
                seats INT NOT NULL,
                desired_demand DOUBLE NOT NULL,
                sales DOUBLE NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY saved_calculations_user_created (user_id, created_at),
                CONSTRAINT fk_saved_calculations_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
        }
    }
}
