import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import {
  QUANTILES,
  demandAtPrice,
  salesAtPrice,
  scenarioLabel,
  type ForecastMeta,
  type ForecastResult,
  type RouteInfo,
} from "@contracts/forecast";

type CsvRow = Record<string, string>;

let cache: { routes: Map<string, RouteInfo>; flights: Map<string, CsvRow>; meta: ForecastMeta } | null = null;

function dataDirectory() {
  const relative = process.env.NODE_ENV === "production" ? "dist/public/data" : "public/data";
  return path.resolve(process.cwd(), relative);
}

function parseCsv(fileName: string) {
  const filePath = path.join(dataDirectory(), fileName);
  if (!existsSync(filePath)) throw new Error(`Data file is unavailable: ${fileName}`);
  const parsed = Papa.parse<CsvRow>(readFileSync(filePath, "utf8"), {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length) throw new Error(`Cannot parse ${fileName}: ${parsed.errors[0].message}`);
  return parsed.data;
}

function numberValue(row: CsvRow, key: string) {
  const value = Number(row[key]);
  if (!Number.isFinite(value)) throw new Error(`Invalid numeric value in column ${key}`);
  return value;
}

function loadData() {
  if (cache) return cache;

  const routes = new Map<string, RouteInfo>();
  for (const row of parseCsv("routes.csv")) {
    const route: RouteInfo = {
      route: row.route,
      name: row.name,
      basePrice: numberValue(row, "base_price"),
      costPerPassenger: numberValue(row, "cost_per_passenger"),
      priceSensitivity: numberValue(row, "price_sensitivity"),
      priceMin: numberValue(row, "price_min"),
      priceMax: numberValue(row, "price_max"),
    };
    routes.set(route.route, route);
  }

  const flights = new Map<string, CsvRow>();
  const dates = new Set<string>();
  for (const row of parseCsv("forecast.csv")) {
    flights.set(`${row.route}:${row.date}`, row);
    dates.add(row.date);
  }
  const sortedDates = [...dates].sort();
  cache = {
    routes,
    flights,
    meta: {
      routes: [...routes.values()],
      dates: sortedDates,
      minDate: sortedDates[0],
      maxDate: sortedDates.at(-1) ?? sortedDates[0],
      flightCount: flights.size,
    },
  };
  return cache;
}

export function getForecastMeta() {
  return loadData().meta;
}

export function calculateForecast(routeCode: string, date: string, price: number): ForecastResult {
  const data = loadData();
  const route = data.routes.get(routeCode);
  if (!route) throw new Error("Маршрут не найден");
  const flight = data.flights.get(`${routeCode}:${date}`);
  if (!flight) throw new Error("Для выбранных маршрута и даты нет прогноза");
  if (price < route.priceMin || price > route.priceMax) {
    throw new Error(`Цена должна быть от ${route.priceMin} до ${route.priceMax} ₽`);
  }

  const seats = numberValue(flight, "seats");
  const scenarios = QUANTILES.map((quantile) => {
    const baseDemand = numberValue(flight, `${quantile.toFixed(1)}_base_demand`);
    const desiredDemand = demandAtPrice(baseDemand, price, route);
    return {
      quantile,
      label: scenarioLabel(quantile),
      baseDemand,
      desiredDemand,
      sales: salesAtPrice(baseDemand, price, seats, route),
      isCapacityLimited: desiredDemand > seats,
    };
  });
  const median = scenarios[4];
  const sales = median.sales;

  return {
    route,
    date,
    price,
    seats,
    desiredDemand: median.desiredDemand,
    sales,
    availableSeats: Math.max(0, seats - sales),
    loadFactor: seats > 0 ? (sales / seats) * 100 : 0,
    expectedRevenue: sales * price,
    expectedProfit: sales * (price - route.costPerPassenger),
    capacityLimitedScenarios: scenarios.filter((scenario) => scenario.isCapacityLimited).length,
    scenarios,
  };
}
