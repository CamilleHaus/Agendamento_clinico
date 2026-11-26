// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AppointmentForm from './AppointmentForm';
import type { Patient, Professional } from '@/lib/types';
import { describeInEachTimeZone } from '@/test/time-zones';

// Only the network (fetch) and Next's router are replaced: the form, apiPost and the
// error parsing in lib/api.ts are the real ones.
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const fetchMock = vi.fn<typeof fetch>();

const patients: Patient[] = [
  { id: 'pat-11', name: 'Paciente Teste 11', phone: '(00) 00000-0011', birthDate: '1995-01-01' },
];
const professionals: Professional[] = [
  { id: 'pro-1', name: 'Profissional Teste A', specialty: 'Clínica geral', workStart: '08:00', workEnd: '17:00', slotMinutes: 30 },
];

function replyWith(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
}

/** Fills the form as a user would (Paciente Teste 11 with Profissional Teste A) and clicks "Agendar". */
function fillAndSubmit(date: string, time: string) {
  render(<AppointmentForm patients={patients} professionals={professionals} />);
  fireEvent.change(screen.getByLabelText('Paciente'), { target: { value: 'pat-11' } });
  fireEvent.change(screen.getByLabelText('Profissional'), { target: { value: 'pro-1' } });
  fireEvent.change(screen.getByLabelText('Data'), { target: { value: date } });
  fireEvent.change(screen.getByLabelText('Hora'), { target: { value: time } });
  fireEvent.click(screen.getByRole('button', { name: 'Agendar' }));
}

/** The single request the form sent to the API, with its JSON body parsed. */
function sentRequest() {
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  return { url: String(url), method: init?.method, body: JSON.parse(String(init?.body)) };
}

beforeEach(() => {
  fetchMock.mockReset();
  push.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describeInEachTimeZone('AppointmentForm sends the typed time as Brasília time', () => {
  it('sends 09:40 on 19/11 as 12:40Z and opens that day in the agenda', async () => {
    replyWith(201, {});
    fillAndSubmit('2026-11-19', '09:40');

    await waitFor(() => expect(push).toHaveBeenCalledWith('/agenda?date=2026-11-19'));
    const request = sentRequest();
    expect(request.url).toMatch(/\/appointments$/);
    expect(request.method).toBe('POST');
    expect(request.body).toEqual({
      patientId: 'pat-11',
      professionalId: 'pro-1',
      startsAt: '2026-11-19T12:40:00.000Z',
      durationMinutes: 30, // Profissional Teste A's slot, filled in when she is selected
    });
  });

  it('keeps a late-night time on the typed Brasília day, even though it is the next day in UTC', async () => {
    replyWith(201, {});
    fillAndSubmit('2026-11-19', '22:30');

    await waitFor(() => expect(push).toHaveBeenCalledWith('/agenda?date=2026-11-19'));
    expect(sentRequest().body.startsAt).toBe('2026-11-20T01:30:00.000Z');
  });
});

describe('AppointmentForm shows the error the API sends back', () => {
  it('shows a business-rule message (409) and lets the user try again', async () => {
    // Real response of the API for this booking (Paciente Teste 11 already has 09:30-10:00 with Profissional Teste A).
    const message =
      'Profissional Teste A já tem uma consulta das 09:30 às 10:00 (horário de Brasília) nesse dia. Escolha outro horário.';
    replyWith(409, { message, error: 'Conflict', statusCode: 409 });
    fillAndSubmit('2026-11-19', '09:40');

    expect((await screen.findByRole('alert')).textContent).toBe(message);
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Agendar' })).toHaveProperty('disabled', false);
  });

  it('lists every message when the API rejects the payload with several (400)', async () => {
    // Real response shape of the API's ValidationPipe: `message` is an array.
    const messages = [
      'A data e hora da consulta (startsAt) deve incluir data, hora e fuso horário (ex.: 2026-11-16T11:00:00.000Z).',
      'A duração (durationMinutes) deve ser de no mínimo 5 minutos.',
    ];
    replyWith(400, { message: messages, error: 'Bad Request', statusCode: 400 });
    fillAndSubmit('2026-11-19', '09:40');

    const alert = await screen.findByRole('alert');
    expect(within(alert).getAllByRole('listitem').map((li) => li.textContent)).toEqual(messages);
    expect(push).not.toHaveBeenCalled();
  });
});
