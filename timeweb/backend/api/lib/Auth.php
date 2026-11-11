<?php
declare(strict_types=1);

final class Auth
{
    public static function user(PDO $db, array $input, bool $register): array
    {
        $email = mb_strtolower(trim((string) ($input['email'] ?? '')));
        $password = (string) ($input['password'] ?? '');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
            throw new DomainException('Введите корректный email');
        }
        if (mb_strlen($password) < 8 || mb_strlen($password) > 72) {
            throw new DomainException('Пароль должен содержать от 8 до 72 символов');
        }

        if ($register) {
            $name = trim((string) ($input['name'] ?? ''));
            if (mb_strlen($name) < 2 || mb_strlen($name) > 100) {
                throw new DomainException('Имя должно содержать от 2 до 100 символов');
            }
            $statement = $db->prepare('INSERT INTO users (name, email, password_hash) VALUES (:name, :email, :hash)');
            try {
                $statement->execute([
                    'name' => $name,
                    'email' => $email,
                    'hash' => password_hash($password, PASSWORD_DEFAULT),
                ]);
            } catch (PDOException $error) {
                if ($error->getCode() === '23000') {
                    respond(['error' => 'Пользователь с таким email уже зарегистрирован'], 409);
                }
                throw $error;
            }
            $user = ['id' => (int) $db->lastInsertId(), 'name' => $name, 'email' => $email];
        } else {
            $statement = $db->prepare('SELECT id, name, email, password_hash FROM users WHERE email = :email LIMIT 1');
            $statement->execute(['email' => $email]);
            $row = $statement->fetch();
            if (!$row || !password_verify($password, $row['password_hash'])) {
                respond(['error' => 'Неверный email или пароль'], 401);
            }
            $user = ['id' => (int) $row['id'], 'name' => $row['name'], 'email' => $row['email']];
        }

        session_regenerate_id(true);
        $_SESSION['user'] = $user;
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        return $user;
    }

    public static function requireUser(): array
    {
        if (empty($_SESSION['user']['id'])) {
            respond(['error' => 'Войдите, чтобы сохранять расчёты'], 401);
        }
        return $_SESSION['user'];
    }
}
