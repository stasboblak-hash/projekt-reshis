import { describe, expect, it } from "vitest";
import { demandAtPrice, salesAtPrice, type RouteInfo } from "@contracts/forecast";

const route: RouteInfo = {
  route: "MOW-AER",
  name: "Москва — Сочи",
  basePrice: 9000,
  costPerPassenger: 4200,
  priceSensitivity: 0.141,
  priceMin: 5400,
  priceMax: 18000,
};

describe("forecast formula", () => {
  it("keeps base demand unchanged at the base price", () => {
    expect(demandAtPrice(814, 9000, route)).toBe(814);
  });

  it("adjusts demand linearly when price changes", () => {
    expect(demandAtPrice(814, 10000, route)).toBeCloseTo(673);
  });

  it("caps sales at seat capacity", () => {
    expect(salesAtPrice(1000, 9000, 900, route)).toBe(900);
  });

  it("never returns negative sales", () => {
    expect(salesAtPrice(10, 18000, 900, route)).toBe(0);
  });
});
