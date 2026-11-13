import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agenda Clínica',
  description: 'Agendamento de consultas',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="topbar">
          <strong>Agenda Clínica</strong>
          <nav>
            <Link href="/agenda">Agenda</Link>
            <Link href="/pacientes">Pacientes</Link>
            <Link href="/agendamentos/novo" className="button">
              Nova consulta
            </Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
