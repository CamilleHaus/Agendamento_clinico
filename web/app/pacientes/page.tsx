import { Suspense } from 'react';
import { apiGet } from '@/lib/api';
import type { Patient } from '@/lib/types';

async function PatientsTable({ searchParams }: { searchParams: PageProps<'/pacientes'>['searchParams'] }) {
  const { q: raw } = await searchParams;
  const q = typeof raw === 'string' ? raw : '';
  const patients = await apiGet<Patient[]>(`/patients${q ? `?q=${encodeURIComponent(q)}` : ''}`);

  return (
    <>
      <form className="toolbar">
        <input type="search" name="q" placeholder="Buscar por nome" defaultValue={q} />
        <button type="submit">Buscar</button>
      </form>
      {patients.length === 0 ? (
        <p className="muted">Nenhum paciente encontrado.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Nascimento</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.phone}</td>
                <td>{p.birthDate.split('-').reverse().join('/')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export default function PacientesPage(props: PageProps<'/pacientes'>) {
  return (
    <>
      <h1>Pacientes</h1>
      <Suspense fallback={<p className="muted">Carregando…</p>}>
        <PatientsTable searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
