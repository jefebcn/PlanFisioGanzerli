export { checkConflict } from './checkConflict';
export {
  bookAppointment,
  moveAppointment,
} from './bookAppointment';
export {
  ConflictError,
  OverrideNotAllowedError,
  StaleVersionError,
} from './errors';
export type {
  BookAppointmentInput,
  BookingContext,
  MoveAppointmentInput,
} from './bookAppointment';
export type {
  BookingActor,
  CheckConflictInput,
  ConflictItem,
  ConflictKind,
  ConflictReport,
  OverrideInput,
  Severity,
} from './types';
export { OVERRIDE_ROLES } from './types';
