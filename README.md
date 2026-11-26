# Agenda Clínica

Sistema de agendamento de consultas para uma clínica pequena.

- **api/**: NestJS, porta 3001. Dados em memória com seed fictício (`api/src/data/seed.ts`), sem banco.
- **web/**: Next.js (App Router), porta 3000.

## Como rodar

```bash
# terminal 1
cd api && npm install && npm run start:dev

# terminal 2
cd web && npm install && npm run dev
```

Abra http://localhost:3000. A agenda abre no dia de hoje; o seed tem consultas entre 10/11/2026 e 20/11/2026 (ex.: http://localhost:3000/agenda?date=2026-11-16).

Os dados voltam ao seed sempre que a API reinicia.

## Fuso horário

A clínica funciona no horário de Brasília (`America/Sao_Paulo`) e o sistema inteiro segue esse fuso, qualquer que seja o fuso do servidor ou do navegador. A API guarda os horários das consultas em UTC (ISO 8601); o horário de atendimento dos profissionais (`workStart`/`workEnd`) é em horário de Brasília.

- **Agenda**: mostra os horários em Brasília, e "hoje" é o dia atual em Brasília.
- **Formulário**: a data e a hora digitadas são sempre interpretadas como horário de Brasília e enviadas à API em UTC.
- **`GET /appointments?date=`**: `date` é um dia do calendário de Brasília (uma consulta às 22:30 de 19/11 aparece em `date=2026-11-19`, embora já seja 20/11 em UTC).

As conversões usam a API nativa `Intl`, sem bibliotecas, em `api/src/appointments/clinic-time.ts` e `web/lib/clinic-time.ts`.

## Testes

```bash
cd api
npm test          # unitários (Vitest)
npm run test:e2e  # e2e (Vitest + supertest)

cd ../web
npm test          # unitários (Vitest + Testing Library), rodam em vários fusos horários
```

## Endpoints

| Método | Rota | Comportamento |
|---|---|---|
| GET | `/professionals` | lista todos |
| GET | `/professionals/:id` | 404 se não existir |
| GET | `/patients?q=` | lista; `q` filtra por nome (case-insensitive) |
| GET | `/patients/:id` | 404 se não existir |
| POST | `/patients` | valida com `class-validator` |
| GET | `/appointments?professionalId=&date=YYYY-MM-DD` | lista e filtra (`date` = dia no horário de Brasília) |
| GET | `/appointments/:id` | 404 se não existir |
| POST | `/appointments` | cria com status `scheduled` |
| PATCH | `/appointments/:id/cancel` | muda status para `cancelled` |

## Variáveis de ambiente (web)

- `API_URL`: URL da API usada no servidor (padrão `http://localhost:3001`)
- `NEXT_PUBLIC_API_URL`: URL da API usada no navegador (padrão `http://localhost:3001`)
