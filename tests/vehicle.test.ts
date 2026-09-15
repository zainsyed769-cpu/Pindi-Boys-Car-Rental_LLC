import { describe, it, expect } from "vitest";
import {
  Vehicle,
  canTransition,
  transitionStatus,
  InvalidTransitionError,
  isBookable,
  recordReturn,
} from "../src/domain/vehicle.js";

function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "v1",
    plate: "ABC-1234",
    make: "Toyota",
    model: "Corolla",
    dailyRateFils: 12000,
    status: "available",
    odometerKm: 10_000,
    ...overrides,
  };
}

describe("canTransition", () => {
  it("allows available -> rented/maintenance/retired", () => {
    expect(canTransition("available", "rented")).toBe(true);
    expect(canTransition("available", "maintenance")).toBe(true);
    expect(canTransition("available", "retired")).toBe(true);
  });

  it("allows rented -> available and rented -> maintenance", () => {
    expect(canTransition("rented", "available")).toBe(true);
    expect(canTransition("rented", "maintenance")).toBe(true);
  });

  it("forbids renting a vehicle in maintenance", () => {
    expect(canTransition("maintenance", "rented")).toBe(false);
  });

  it("treats retired as a terminal state", () => {
    expect(canTransition("retired", "available")).toBe(false);
    expect(canTransition("retired", "rented")).toBe(false);
  });
});

describe("transitionStatus", () => {
  it("returns a new vehicle with the updated status without mutating input", () => {
    const v = makeVehicle();
    const next = transitionStatus(v, "rented");
    expect(next.status).toBe("rented");
    expect(v.status).toBe("available");
    expect(next).not.toBe(v);
  });

  it("throws InvalidTransitionError on an illegal transition", () => {
    const v = makeVehicle({ status: "retired" });
    expect(() => transitionStatus(v, "available")).toThrow(InvalidTransitionError);
  });
});

describe("isBookable", () => {
  it("is true only when available", () => {
    expect(isBookable(makeVehicle({ status: "available" }))).toBe(true);
    expect(isBookable(makeVehicle({ status: "rented" }))).toBe(false);
    expect(isBookable(makeVehicle({ status: "maintenance" }))).toBe(false);
  });
});

describe("recordReturn", () => {
  it("advances the odometer and marks the vehicle available", () => {
    const v = makeVehicle({ status: "rented", odometerKm: 10_000 });
    const returned = recordReturn(v, 10_350);
    expect(returned.status).toBe("available");
    expect(returned.odometerKm).toBe(10_350);
  });

  it("accepts an unchanged odometer reading", () => {
    const v = makeVehicle({ status: "rented", odometerKm: 10_000 });
    expect(recordReturn(v, 10_000).odometerKm).toBe(10_000);
  });

  it("rejects an odometer that goes backwards", () => {
    const v = makeVehicle({ status: "rented", odometerKm: 10_000 });
    expect(() => recordReturn(v, 9_999)).toThrow(RangeError);
  });
});
