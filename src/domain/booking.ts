/**
 * Booking / reservation domain logic.
 *
 * The two things that bite car-rental systems hardest are (1) invalid date
 * ranges and (2) double-booking the same vehicle. Both are handled here with
 * pure, side-effect-free functions.
 */

export interface DateRange {
  /** Inclusive start of the rental (pickup). */
  start: Date;
  /** Exclusive end of the rental (return). */
  end: Date;
}

export interface Booking {
  id: string;
  vehicleId: string;
  customerId: string;
  period: DateRange;
}

export class InvalidDateRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidDateRangeError";
  }
}

/** A range is valid when start is strictly before end. */
export function isValidRange(period: DateRange): boolean {
  return period.start.getTime() < period.end.getTime();
}

export function assertValidRange(period: DateRange): void {
  if (Number.isNaN(period.start.getTime()) || Number.isNaN(period.end.getTime())) {
    throw new InvalidDateRangeError("Date range contains an invalid date");
  }
  if (!isValidRange(period)) {
    throw new InvalidDateRangeError("Rental end must be after rental start");
  }
}

/**
 * Two half-open intervals [aStart, aEnd) and [bStart, bEnd) overlap when each
 * starts before the other ends. Back-to-back bookings (one ends exactly when
 * the next begins) do NOT overlap.
 */
export function rangesOverlap(a: DateRange, b: DateRange): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

/**
 * Whole-day count, rounded up so any partial day is billed as a full day.
 * A same-calendar-day pickup/return still counts as a minimum of one day.
 */
export function rentalDays(period: DateRange): number {
  assertValidRange(period);
  const ms = period.end.getTime() - period.start.getTime();
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.ceil(ms / msPerDay));
}

/**
 * Determines whether a vehicle can be booked for `period` given the bookings
 * that already exist. Only bookings for the same vehicle are considered.
 */
export function isVehicleAvailable(
  vehicleId: string,
  period: DateRange,
  existingBookings: readonly Booking[],
): boolean {
  assertValidRange(period);
  return !existingBookings.some(
    (b) => b.vehicleId === vehicleId && rangesOverlap(b.period, period),
  );
}

export class DoubleBookingError extends Error {
  constructor(vehicleId: string) {
    super(`Vehicle ${vehicleId} is already booked for the requested period`);
    this.name = "DoubleBookingError";
  }
}

/**
 * Creates a booking after validating the range and checking for conflicts.
 * Returns the new booking; throws on invalid input or a conflict.
 */
export function createBooking(
  booking: Booking,
  existingBookings: readonly Booking[],
): Booking {
  assertValidRange(booking.period);
  if (!isVehicleAvailable(booking.vehicleId, booking.period, existingBookings)) {
    throw new DoubleBookingError(booking.vehicleId);
  }
  return booking;
}
