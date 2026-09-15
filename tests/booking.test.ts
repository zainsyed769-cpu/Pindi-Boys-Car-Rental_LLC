import { describe, it, expect } from "vitest";
import {
  Booking,
  DateRange,
  isValidRange,
  assertValidRange,
  InvalidDateRangeError,
  rangesOverlap,
  rentalDays,
  isVehicleAvailable,
  createBooking,
  DoubleBookingError,
} from "../src/domain/booking.js";

const d = (iso: string) => new Date(iso);

function range(startIso: string, endIso: string): DateRange {
  return { start: d(startIso), end: d(endIso) };
}

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "b1",
    vehicleId: "v1",
    customerId: "c1",
    period: range("2025-01-01", "2025-01-05"),
    ...overrides,
  };
}

describe("isValidRange / assertValidRange", () => {
  it("accepts start before end", () => {
    expect(isValidRange(range("2025-01-01", "2025-01-02"))).toBe(true);
  });

  it("rejects start equal to or after end", () => {
    expect(isValidRange(range("2025-01-02", "2025-01-02"))).toBe(false);
    expect(isValidRange(range("2025-01-03", "2025-01-02"))).toBe(false);
  });

  it("throws on a reversed range", () => {
    expect(() => assertValidRange(range("2025-01-03", "2025-01-02"))).toThrow(
      InvalidDateRangeError,
    );
  });

  it("throws on an invalid (NaN) date", () => {
    expect(() => assertValidRange({ start: d("not-a-date"), end: d("2025-01-02") })).toThrow(
      InvalidDateRangeError,
    );
  });
});

describe("rangesOverlap", () => {
  it("detects an overlapping range", () => {
    expect(
      rangesOverlap(range("2025-01-01", "2025-01-05"), range("2025-01-04", "2025-01-08")),
    ).toBe(true);
  });

  it("treats back-to-back rentals as non-overlapping", () => {
    expect(
      rangesOverlap(range("2025-01-01", "2025-01-05"), range("2025-01-05", "2025-01-09")),
    ).toBe(false);
  });

  it("detects full containment", () => {
    expect(
      rangesOverlap(range("2025-01-01", "2025-01-10"), range("2025-01-03", "2025-01-04")),
    ).toBe(true);
  });
});

describe("rentalDays", () => {
  it("counts whole days", () => {
    expect(rentalDays(range("2025-01-01", "2025-01-05"))).toBe(4);
  });

  it("rounds a partial day up", () => {
    expect(rentalDays(range("2025-01-01T08:00:00Z", "2025-01-02T20:00:00Z"))).toBe(2);
  });

  it("bills a minimum of one day for a same-day rental", () => {
    expect(rentalDays(range("2025-01-01T08:00:00Z", "2025-01-01T12:00:00Z"))).toBe(1);
  });
});

describe("isVehicleAvailable", () => {
  const existing = [booking({ id: "b1", period: range("2025-01-01", "2025-01-05") })];

  it("is available when there is no conflict", () => {
    expect(isVehicleAvailable("v1", range("2025-01-05", "2025-01-09"), existing)).toBe(true);
  });

  it("is unavailable when an overlapping booking exists", () => {
    expect(isVehicleAvailable("v1", range("2025-01-04", "2025-01-06"), existing)).toBe(false);
  });

  it("ignores bookings for other vehicles", () => {
    expect(isVehicleAvailable("v2", range("2025-01-02", "2025-01-04"), existing)).toBe(true);
  });
});

describe("createBooking", () => {
  it("creates a booking when the slot is free", () => {
    const result = createBooking(booking({ id: "b2", period: range("2025-02-01", "2025-02-03") }), []);
    expect(result.id).toBe("b2");
  });

  it("throws DoubleBookingError on a conflict", () => {
    const existing = [booking()];
    expect(() =>
      createBooking(booking({ id: "b2", period: range("2025-01-02", "2025-01-04") }), existing),
    ).toThrow(DoubleBookingError);
  });

  it("throws on an invalid range before checking conflicts", () => {
    expect(() =>
      createBooking(booking({ period: range("2025-01-05", "2025-01-01") }), []),
    ).toThrow(InvalidDateRangeError);
  });
});
