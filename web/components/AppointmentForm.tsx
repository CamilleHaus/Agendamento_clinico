'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import type { Appointment, Patient, Professional } from '@/lib/types';

interface Props {
  patients: Patient[];
  professionals: Professional[];
}

export default function AppointmentForm({ patients, professionals }: Props) {
  const router = useRouter();
  const [patientId, setPatientId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function onProfessionalChange(id: string) {
    setProfessionalId(id);
    const pro = professionals.find((p) => p.id === id);
    if (pro) setDurationMinutes(pro.slotMinutes);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiPost<Appointment>('/appointments', {
        patientId,
        professionalId,
        startsAt: new Date(`${date}T${time}`).toISOString(),
        durationMinutes,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      router.push(`/agenda?date=${date}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <label>
        Paciente
        <select required value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          <option value="">Selecione…</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Profissional
        <select required value={professionalId} onChange={(e) => onProfessionalChange(e.target.value)}>
          <option value="">Selecione…</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.specialty}
            </option>
          ))}
        </select>
      </label>

      <div className="row">
        <label>
          Data
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Hora
          <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label>
          Duração (min)
          <input
            type="number"
            min={5}
            step={5}
            required
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
          />
        </label>
      </div>

      <label>
        Observações
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={saving}>
        {saving ? 'Salvando…' : 'Agendar'}
      </button>
    </form>
  );
}
