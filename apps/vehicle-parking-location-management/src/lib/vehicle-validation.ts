import type { Vehicle } from '@/lib/parking-data';
import type { VehicleFormData } from '@/components/vehicle-form-fields';

const PLATE_PATTERN = /^[A-Z0-9](?:[A-Z0-9 -]{0,13}[A-Z0-9])?$/;
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

export type VehicleValidationResult = { valid: true; value: VehicleFormData } | { valid: false; error: string };

export function validateVehicle(input: VehicleFormData, vehicles: Vehicle[], editingId?: string): VehicleValidationResult {
  const value: VehicleFormData = {
    ...input,
    plateNumber: input.plateNumber.trim().replace(/\s+/g, ' ').toUpperCase(),
    vin: input.vin.trim().toUpperCase(),
    brand: input.brand.trim(),
    model: input.model.trim(),
    customerName: input.customerName.trim(),
    driverOwner: input.driverOwner.trim(),
    department: input.department.trim(),
  };
  if (!value.plateNumber) return { valid: false, error: 'Registration number is required.' };
  if (value.plateNumber.length < 2 || value.plateNumber.length > 15 || !PLATE_PATTERN.test(value.plateNumber)) return { valid: false, error: 'Registration number must be 2–15 letters, numbers, spaces, or hyphens.' };
  if (value.vin && !VIN_PATTERN.test(value.vin)) return { valid: false, error: 'VIN must contain exactly 17 valid letters and numbers.' };
  if (!value.brand || !value.model) return { valid: false, error: 'Vehicle make and model are required.' };
  const duplicatePlate = vehicles.find((vehicle: Vehicle) => vehicle.id !== editingId && vehicle.status !== 'Released' && vehicle.plateNumber.trim().toUpperCase() === value.plateNumber);
  if (duplicatePlate) return { valid: false, error: `Registration number is already active on ${duplicatePlate.vehicleId}.` };
  const duplicateVin = value.vin && vehicles.find((vehicle: Vehicle) => vehicle.id !== editingId && vehicle.vin.trim().toUpperCase() === value.vin);
  if (duplicateVin) return { valid: false, error: `VIN is already registered to ${duplicateVin.plateNumber}.` };
  return { valid: true, value };
}
