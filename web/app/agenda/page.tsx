import { Suspense } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { STATUS_LABEL, type Appointment, type Patient, type Professional } from '@/lib/types';

function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

async function Agenda({ searchParams }: { searchParams: PageProps<'/agenda'>['searchParams'] }) {
  const { date: raw } = await searchParams;
  const date = typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : today();

  const [professionals, appointments, patients] = await Promise.all([
    apiGet<Professional[]>('/professionals'),
    apiGet<Appointment[]>(`/appointments?date=${date}`),
    apiGet<Patient[]>('/patients'),
  ]);
  const patientName = new Map(patients.map((p) => [p.id, p.name]));

  return (
    <>
      <div className="toolbar">
        <Link href={`/agenda?date=${shiftDate(date, -1)}`}>← Dia anterior</Link>
        <form>
          <input type="date" name="date" defaultValue={date} />
          <button type="submit">Ir</button>
        </form>
        <Link href={`/agenda?date=${shiftDate(date, 1)}`}>Próximo dia →</Link>
      </div>

      <div className="columns">
        {professionals.map((pro) => {
          const items = appointments.filter((a) => a.professionalId === pro.id);
          return (
            <section key={pro.id} className="column">
              <h2>{pro.name}</h2>
              <p className="muted">
                {pro.specialty} · {pro.workStart}–{pro.workEnd}
              </p>
              {items.length === 0 ? (
                <p className="muted">Nenhuma consulta.</p>
              ) : (
                <ul className="appointments">
                  {items.map((a) => (
                    <li key={a.id} className={`status-${a.status}`}>
                      <span className="time">{formatTime(a.startsAt)}</span>
                      <span>{patientName.get(a.patientId) ?? a.patientId}</span>
                      <span className="badge">{STATUS_LABEL[a.status]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

export default function AgendaPage(props: PageProps<'/agenda'>) {
  return (
    <>
      <h1>Agenda do dia</h1>
      <Suspense fallback={<p className="muted">Carregando…</p>}>
        <Agenda searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
