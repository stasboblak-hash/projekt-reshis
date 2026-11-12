#!/usr/bin/env python3
"""Прогноз спроса «Решись Авиа» с параметрами командной строки."""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from datetime import datetime
from pathlib import Path

QUANTILES = ("0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "0.9")
DATA_DIR = Path(__file__).resolve().parent / "public" / "data"


class ForecastError(ValueError):
    """Ошибка входных параметров или исходных данных."""


def read_csv(name: str) -> list[dict[str, str]]:
    path = DATA_DIR / name
    try:
        with path.open(encoding="utf-8-sig", newline="") as handle:
            return list(csv.DictReader(handle))
    except OSError as error:
        raise ForecastError(f"Не удалось прочитать {path}: {error.strerror}") from error


def finite_number(value: str | float, field: str) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError) as error:
        raise ForecastError(f"Некорректное числовое значение: {field}") from error
    if not math.isfinite(result):
        raise ForecastError(f"Некорректное числовое значение: {field}")
    return result


def calculate(origin: str, destination: str, date: str, price_value: str | float) -> dict:
    origin = origin.strip().upper()
    destination = destination.strip().upper()
    route_code = f"{origin}-{destination}"

    try:
        parsed_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError as error:
        raise ForecastError("Дата должна быть в формате ГГГГ-ММ-ДД") from error
    date = parsed_date.strftime("%Y-%m-%d")
    price = finite_number(price_value, "price")

    routes = {row["route"]: row for row in read_csv("routes.csv")}
    if route_code not in routes:
        origins = sorted({code.split("-", 1)[0] for code in routes})
        available = ", ".join(origins)
        raise ForecastError(
            f"Маршрут {route_code} не найден. "
            f"Пункты отправления в текущем наборе данных: {available}"
        )

    route = routes[route_code]
    base_price = finite_number(route["base_price"], "base_price")
    sensitivity = finite_number(route["price_sensitivity"], "price_sensitivity")
    price_min = finite_number(route["price_min"], "price_min")
    price_max = finite_number(route["price_max"], "price_max")
    if not price_min <= price <= price_max:
        raise ForecastError(f"Цена должна быть от {price_min:g} до {price_max:g} ₽")

    flights = {
        (row["route"], row["date"]): row
        for row in read_csv("forecast.csv")
    }
    flight = flights.get((route_code, date))
    if flight is None:
        raise ForecastError("Для выбранных маршрута и даты нет прогноза")

    seats = int(finite_number(flight["seats"], "seats"))
    scenarios = []
    for quantile in QUANTILES:
        base_demand = finite_number(flight[f"{quantile}_base_demand"], quantile)
        desired = base_demand - sensitivity * (price - base_price)
        sales = min(seats, max(0.0, desired))
        scenarios.append({
            "quantile": float(quantile),
            "baseDemand": base_demand,
            "desiredDemand": desired,
            "sales": sales,
            "isCapacityLimited": desired > seats,
        })

    median = scenarios[4]
    sales = median["sales"]
    cost = finite_number(route["cost_per_passenger"], "cost_per_passenger")
    return {
        "origin": origin,
        "destination": destination,
        "route": route_code,
        "routeName": route["name"],
        "date": date,
        "price": price,
        "seats": seats,
        "desiredDemand": median["desiredDemand"],
        "sales": sales,
        "availableSeats": max(0, seats - sales),
        "expectedRevenue": sales * price,
        "expectedProfit": sales * (price - cost),
        "capacityLimitedScenarios": sum(item["isCapacityLimited"] for item in scenarios),
        "scenarios": scenarios,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Рассчитывает спрос по девяти сценариям. Все параметры передаются при вызове."
    )
    parser.add_argument("origin", help="IATA-код пункта отправления, например MOW")
    parser.add_argument("destination", help="IATA-код пункта назначения, например AER")
    parser.add_argument("date", help="Дата вылета в формате ГГГГ-ММ-ДД")
    parser.add_argument("price", help="Цена билета в рублях")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        result = calculate(args.origin, args.destination, args.date, args.price)
    except ForecastError as error:
        print(f"Ошибка: {error}", file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
