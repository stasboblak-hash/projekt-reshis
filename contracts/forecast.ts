export const QUANTILES = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9] as const;

export type Quantile = (typeof QUANTILES)[number];

export type RouteInfo = {
  route: string;
  name: string;
  basePrice: number;
  costPerPassenger: number;
  priceSensitivity: number;
  priceMin: number;
  priceMax: number;
};

export type ForecastMeta = {
  routes: RouteInfo[];
  dates: string[];
  minDate: string;
  maxDate: string;
  flightCount: number;
};

export type ForecastInput = {
  route: string;
  date: string;
  price: number;
};

export type DemandScenario = {
  quantile: Quantile;
  label: string;
  baseDemand: number;
  desiredDemand: number;
  sales: number;
  isCapacityLimited: boolean;
};

export type ForecastResult = {
  route: RouteInfo;
  date: string;
  price: number;
  seats: number;
  desiredDemand: number;
  sales: number;
  availableSeats: number;
  loadFactor: number;
  expectedRevenue: number;
  expectedProfit: number;
  capacityLimitedScenarios: number;
  scenarios: DemandScenario[];
};

export function demandAtPrice(baseDemand: number, price: number, route: RouteInfo) {
  return baseDemand - route.priceSensitivity * (price - route.basePrice);
}

export function salesAtPrice(baseDemand: number, price: number, seats: number, route: RouteInfo) {
  return Math.min(seats, Math.max(0, demandAtPrice(baseDemand, price, route)));
}

export function scenarioLabel(quantile: Quantile) {
  if (quantile === 0.1) return "Пессимистичный";
  if (quantile === 0.5) return "Медиана";
  if (quantile === 0.9) return "Оптимистичный";
  return `Сценарий ${quantile.toFixed(1)}`;
}
