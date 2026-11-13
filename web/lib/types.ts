export interface Professional {
  id: string;
  name: string;
  specialty: string;
  workStart: string;
  workEnd: string;
  slotMinutes: number;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  birthDate: string;
}

export type AppointmentStatus = 'scheduled' | 'cancelled' | 'completed';

export interface Appointment {
  id: string;
  patientId: string;
  professionalId: string;
  startsAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
}

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: 'Agendada',
  cancelled: 'Cancelada',
  completed: 'Concluída',
};
