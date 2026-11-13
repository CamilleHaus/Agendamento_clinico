import { Suspense } from 'react';
import { connection } from 'next/server';
import { apiGet } from '@/lib/api';
import type { Patient, Professional } from '@/lib/types';
import AppointmentForm from '@/components/AppointmentForm';

async function FormLoader() {
  await connection();
  const [patients, professionals] = await Promise.all([
    apiGet<Patient[]>('/patients'),
    apiGet<Professional[]>('/professionals'),
  ]);
  return <AppointmentForm patients={patients} professionals={professionals} />;
}

export default function NovoAgendamentoPage() {
  return (
    <>
      <h1>Nova consulta</h1>
      <Suspense fallback={<p className="muted">Carregando…</p>}>
        <FormLoader />
      </Suspense>
    </>
  );
}
