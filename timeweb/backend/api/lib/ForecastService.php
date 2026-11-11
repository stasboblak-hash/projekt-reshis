<?php
declare(strict_types=1);

final class ForecastService
{
    private const QUANTILES = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    private static ?array $data = null;

    private static function number(array $row, string $key): float
    {
        if (!isset($row[$key]) || !is_numeric($row[$key]) || !is_finite((float) $row[$key])) {
            throw new RuntimeException("Некорректное числовое значение в колонке {$key}");
        }
        return (float) $row[$key];
    }

    private static function parseCsv(string $fileName): array
    {
        $path = dirname(__DIR__, 2) . '/data/' . $fileName;
        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw new RuntimeException("Файл данных недоступен: {$fileName}");
        }

        $headers = fgetcsv($handle);
        if ($headers === false) {
            fclose($handle);
            throw new RuntimeException("Пустой файл данных: {$fileName}");
        }
        $rows = [];
        while (($values = fgetcsv($handle)) !== false) {
            if ($values === [null]) {
                continue;
            }
            if (count($values) !== count($headers)) {
                fclose($handle);
                throw new RuntimeException("Некорректная строка CSV: {$fileName}");
            }
            $rows[] = array_combine($headers, $values);
        }
        fclose($handle);
        return $rows;
    }

    private static function load(): array
    {
        if (self::$data !== null) {
            return self::$data;
        }

        $routes = [];
        foreach (self::parseCsv('routes.csv') as $row) {
            $route = [
                'route' => $row['route'],
                'name' => $row['name'],
                'basePrice' => self::number($row, 'base_price'),
                'costPerPassenger' => self::number($row, 'cost_per_passenger'),
                'priceSensitivity' => self::number($row, 'price_sensitivity'),
                'priceMin' => self::number($row, 'price_min'),
                'priceMax' => self::number($row, 'price_max'),
            ];
            $routes[$route['route']] = $route;
        }

        $flights = [];
        $dates = [];
        foreach (self::parseCsv('forecast.csv') as $row) {
            $flights[$row['route'] . ':' . $row['date']] = $row;
            $dates[$row['date']] = true;
        }
        $dates = array_keys($dates);
        sort($dates);

        self::$data = [
            'routes' => $routes,
            'flights' => $flights,
            'meta' => [
                'routes' => array_values($routes),
                'dates' => $dates,
                'minDate' => $dates[0] ?? '',
                'maxDate' => $dates[count($dates) - 1] ?? '',
                'flightCount' => count($flights),
            ],
        ];
        return self::$data;
    }

    public static function meta(): array
    {
        return self::load()['meta'];
    }

    private static function label(float $quantile): string
    {
        if ($quantile === 0.1) return 'Пессимистичный';
        if ($quantile === 0.5) return 'Медиана';
        if ($quantile === 0.9) return 'Оптимистичный';
        return 'Сценарий ' . number_format($quantile, 1, ',', '');
    }

    public static function calculate(string $routeCode, string $date, mixed $priceInput): array
    {
        if (!preg_match('/^[A-Z0-9-]{3,16}$/', $routeCode)) {
            throw new DomainException('Некорректный код маршрута');
        }
        $parsedDate = DateTime::createFromFormat('!Y-m-d', $date);
        if ($parsedDate === false || $parsedDate->format('Y-m-d') !== $date) {
            throw new DomainException('Укажите дату в формате ГГГГ-ММ-ДД');
        }
        if (!is_numeric($priceInput) || !is_finite((float) $priceInput)) {
            throw new DomainException('Укажите корректную цену');
        }
        $price = (float) $priceInput;

        $data = self::load();
        if (!isset($data['routes'][$routeCode])) {
            throw new DomainException('Маршрут не найден');
        }
        $route = $data['routes'][$routeCode];
        $key = $routeCode . ':' . $date;
        if (!isset($data['flights'][$key])) {
            throw new DomainException('Для выбранных маршрута и даты нет прогноза');
        }
        if ($price < $route['priceMin'] || $price > $route['priceMax']) {
            throw new DomainException("Цена должна быть от {$route['priceMin']} до {$route['priceMax']} ₽");
        }

        $flight = $data['flights'][$key];
        $seats = (int) self::number($flight, 'seats');
        $scenarios = [];
        foreach (self::QUANTILES as $quantile) {
            $column = number_format($quantile, 1, '.', '') . '_base_demand';
            $baseDemand = self::number($flight, $column);
            $desired = $baseDemand - $route['priceSensitivity'] * ($price - $route['basePrice']);
            $sales = min($seats, max(0, $desired));
            $scenarios[] = [
                'quantile' => $quantile,
                'label' => self::label($quantile),
                'baseDemand' => $baseDemand,
                'desiredDemand' => $desired,
                'sales' => $sales,
                'isCapacityLimited' => $desired > $seats,
            ];
        }
        $median = $scenarios[4];
        $sales = $median['sales'];

        return [
            'route' => $route,
            'date' => $date,
            'price' => $price,
            'seats' => $seats,
            'desiredDemand' => $median['desiredDemand'],
            'sales' => $sales,
            'availableSeats' => max(0, $seats - $sales),
            'loadFactor' => $seats > 0 ? ($sales / $seats) * 100 : 0,
            'expectedRevenue' => $sales * $price,
            'expectedProfit' => $sales * ($price - $route['costPerPassenger']),
            'capacityLimitedScenarios' => count(array_filter($scenarios, fn($item) => $item['isCapacityLimited'])),
            'scenarios' => $scenarios,
        ];
    }
}
