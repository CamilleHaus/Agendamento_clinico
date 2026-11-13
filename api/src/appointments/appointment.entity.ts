export type AppointmentStatus = 'scheduled' | 'cancelled' | 'completed';

export interface Appointment {
  id: string;
  patientId: string;
  professionalId: string;
  startsAt: string; // ISO 8601
  durationMinutes: number;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
}
