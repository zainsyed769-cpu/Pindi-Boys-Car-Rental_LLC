/**
 * Fleet / vehicle domain logic.
 *
 * A vehicle moves through a small set of states. Only certain transitions are
 * legal (e.g. you cannot rent out a vehicle that is in maintenance). Keeping
 * the rules here as pure functions makes them trivial to unit test.
 */

export type VehicleStatus = "available" | "rented" | "maintenance" | "retired";

export interface Vehicle {
  id: string;
  /** Manufacturer plate / registration, e.g. "ABC-1234". */
  plate: string;
  make: string;
  model: string;
  /** Daily rental rate in fils (1 AED = 100 fils) to avoid float rounding. */
  dailyRateFils: number;
  status: VehicleStatus;
  /** Odometer reading in kilometres. */
  odometerKm: number;
}

/** Legal status transitions. */
const ALLOWED_TRANSITIONS: Record<VehicleStatus, readonly VehicleStatus[]> = {
  available: ["rented", "maintenance", "retired"],
  rented: ["available", "maintenance"],
  maintenance: ["available", "retired"],
  retired: [],
};

export function canTransition(from: VehicleStatus, to: VehicleStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(from: VehicleStatus, to: VehicleStatus) {
    super(`Illegal vehicle status transition: ${from} -> ${to}`);
    this.name = "InvalidTransitionError";
  }
}

/**
 * Returns a new vehicle with the updated status, or throws when the transition
 * is not allowed. The input vehicle is never mutated.
 */
export function transitionStatus(vehicle: Vehicle, to: VehicleStatus): Vehicle {
  if (!canTransition(vehicle.status, to)) {
    throw new InvalidTransitionError(vehicle.status, to);
  }
  return { ...vehicle, status: to };
}

/** A vehicle is bookable only when it is currently available. */
export function isBookable(vehicle: Vehicle): boolean {
  return vehicle.status === "available";
}

/**
 * Records the return of a rented vehicle, advancing the odometer.
 * Throws if the new reading is lower than the current one.
 */
export function recordReturn(vehicle: Vehicle, newOdometerKm: number): Vehicle {
  if (newOdometerKm < vehicle.odometerKm) {
    throw new RangeError(
      `Odometer cannot decrease: ${vehicle.odometerKm} -> ${newOdometerKm}`,
    );
  }
  return transitionStatus({ ...vehicle, odometerKm: newOdometerKm }, "available");
}
