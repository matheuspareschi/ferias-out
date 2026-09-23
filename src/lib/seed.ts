import type { AgendaItem, BacklogItem } from './types'

let seq = 0
function nextId(prefix: string): string {
  seq += 1
  return `${prefix}-${seq}`
}

function agenda(
  dayId: string,
  title: string,
  start: string | null = null,
  duration: number | null = null,
): AgendaItem {
  return { id: nextId('agenda'), dayId, title, start, duration, done: false }
}

/** Rotina-base completa: dias de semana comuns e Retiro. */
function rotinaCompleta(dayId: string): AgendaItem[] {
  return [
    agenda(dayId, 'Devocional'),
    agenda(dayId, 'Alongamento'),
    agenda(dayId, 'Leitura', null, 30),
    agenda(dayId, 'Exercício'),
    agenda(dayId, 'Revisão da faculdade'),
  ]
}

/** Rotina de sábado comum: igual à completa, sem revisão da faculdade. */
function rotinaSabado(dayId: string): AgendaItem[] {
  return [
    agenda(dayId, 'Devocional'),
    agenda(dayId, 'Alongamento'),
    agenda(dayId, 'Leitura', null, 30),
    agenda(dayId, 'Exercício'),
  ]
}

/** Rotina reduzida de dia de viagem: só devocional + alongamento (+ leitura, opcional). */
function rotinaViagem(dayId: string, comLeitura = false): AgendaItem[] {
  const base = [agenda(dayId, 'Devocional'), agenda(dayId, 'Alongamento')]
  if (comLeitura) base.push(agenda(dayId, 'Leitura', null, 30))
  return base
}

export function buildSeedAgendaItems(): AgendaItem[] {
  return [
    // 24/09 (qui) — dia de semana normal
    ...rotinaCompleta('2026-09-24'),
    agenda('2026-09-24', 'Jejum, oração, silêncio e estudo bíblico'),
    agenda('2026-09-24', 'Comprar flores para a irmã Zilda', null, 30),
    agenda('2026-09-24', 'Visita à irmã Zilda com o Gui', '17:00', 60),
    agenda('2026-09-24', 'Encerrar o jejum'),
    agenda('2026-09-24', 'ABU — estudo bíblico'),

    // 25/09 (sex) — dia de semana normal
    ...rotinaCompleta('2026-09-25'),
    agenda('2026-09-25', 'Organização financeira (salário)', null, 30),
    agenda('2026-09-25', 'Conectados — culto, som + ensaio do louvor'),

    // 26/09 (sáb) — sábado comum
    ...rotinaSabado('2026-09-26'),
    agenda('2026-09-26', 'Exames de sangue', null, 30),
    agenda('2026-09-26', 'Ultrassom', '11:20', 30),
    agenda('2026-09-26', 'Ensaio com a banda (tarde)'),
    agenda('2026-09-26', 'EB — estudo bíblico em casa'),

    // 27/09 (dom) — sem rotina
    agenda('2026-09-27', 'Culto'),
    agenda('2026-09-27', 'JVJ'),

    // 28/09 (seg) — Bauru Day, viagem
    ...rotinaViagem('2026-09-28'),
    agenda('2026-09-28', 'Viagem com amigos'),

    // 29/09 (ter) — dia de semana normal
    ...rotinaCompleta('2026-09-29'),
    agenda('2026-09-29', 'JVJ (noite)'),
    agenda('2026-09-29', 'Tarde livre, de propósito, sem agenda'),

    // 30/09 (qua) — dia de semana normal
    ...rotinaCompleta('2026-09-30'),
    agenda('2026-09-30', 'JVJ'),

    // 01/10 (qui) — dia de semana normal, só rotina
    ...rotinaCompleta('2026-10-01'),

    // 02/10 (sex) — dia de semana normal
    ...rotinaCompleta('2026-10-02'),
    agenda('2026-10-02', 'Área 51 — tarde/noite de jogos'),

    // 03/10 (sáb) — dia-buffer, sábado comum
    ...rotinaSabado('2026-10-03'),
    agenda('2026-10-03', 'EB — estudo bíblico'),

    // 04/10 (dom) — sem rotina
    agenda('2026-10-04', 'Culto'),
    agenda('2026-10-04', 'JVJ'),
    agenda('2026-10-04', 'Eleição'),

    // 05/10 (seg) — dia de semana normal
    ...rotinaCompleta('2026-10-05'),
    agenda('2026-10-05', 'Role com o Vitor'),

    // 06/10 (ter) — Retiro, rotina completa
    ...rotinaCompleta('2026-10-06'),
    agenda('2026-10-06', 'Retiro'),

    // 07/10 (qua) — Retiro, rotina completa
    ...rotinaCompleta('2026-10-07'),
    agenda('2026-10-07', 'Retiro'),

    // 08/10 (qui) — dia de semana normal
    ...rotinaCompleta('2026-10-08'),
    agenda('2026-10-08', 'GAEB'),

    // 09/10 (sex) — viagem a Paraty, com leitura
    ...rotinaViagem('2026-10-09', true),
    agenda('2026-10-09', 'Saída de Tatuí', '16:30', 30),
    agenda('2026-10-09', 'Chegada em Paraty (check-in)', '23:00', 30),

    // 10/10 (sáb) — Paraty, sem rotina-base
    agenda('2026-10-10', 'Saída da pousada', '08:30', 30),
    agenda('2026-10-10', 'Poço da Jamaica', '09:00', 120),
    agenda('2026-10-10', 'Almoço', '11:30', 60),
    agenda('2026-10-10', 'Ida ao Cachadaço via Trindade', '13:00', 60),
    agenda('2026-10-10', 'Praia do Cachadaço', '14:00', 240),
    agenda('2026-10-10', 'Volta à pousada', '19:00', 30),

    // 11/10 (dom) — Paraty, sem rotina-base
    agenda('2026-10-11', 'Saída rumo a Paraty-Mirim', '08:00', 30),
    agenda('2026-10-11', 'Praia do Sono + Poço do Jacaré', '09:40', 260),
    agenda('2026-10-11', 'Volta pela trilha', '14:00', 60),
    agenda('2026-10-11', 'Pousada, banho', '16:10', 30),
    agenda('2026-10-11', 'Centrinho + jantar', '17:00', 120),

    // 12/10 (seg) — volta, sem rotina-base
    agenda('2026-10-12', 'Carregar o carro', null, 30),
    agenda('2026-10-12', 'Café da manhã no Café Café', '08:00', 60),
    agenda('2026-10-12', 'Última volta pelo Centro Histórico', '09:00', 60),
    agenda('2026-10-12', 'Saída de Paraty', '10:00', 60),
    agenda('2026-10-12', 'Reorganizar casa e backlog (ao chegar)', null, 60),
  ]
}

function backlog(
  title: string,
  category: BacklogItem['category'],
  size: BacklogItem['size'],
): BacklogItem {
  return { id: nextId('backlog'), title, category, size, done: false }
}

export function buildSeedBacklogItems(): BacklogItem[] {
  return [
    backlog('Aula — a definir 1', 'aula', 'M'),
    backlog('Aula — a definir 2', 'aula', 'M'),
    backlog('Aula — a definir 3', 'aula', 'M'),
    backlog('Preparo de aula do JVJ', 'preparo', 'M'),
    backlog('Preparo de Estudo Bíblico', 'preparo', 'M'),
    backlog('Preparo de Estudo Bíblico', 'preparo', 'M'),
    backlog('Preparo de aula para o GAEB', 'preparo', 'M'),
    backlog('Lavar o carro', 'tarefa', 'P'),
  ]
}
