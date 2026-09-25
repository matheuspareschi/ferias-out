import type { AgendaItem, BacklogItem, HabitId, PeriodId } from './types'

let seq = 0
function nextId(prefix: string): string {
  seq += 1
  return `${prefix}-${seq}`
}

const orderCounters = new Map<string, number>()
function nextOrder(dayId: string, period: PeriodId | null): number {
  const key = `${dayId}:${period ?? 'none'}`
  const n = orderCounters.get(key) ?? 0
  orderCounters.set(key, n + 1)
  return n
}

function agenda(
  dayId: string,
  title: string,
  period: PeriodId | null = null,
  timeNote?: string,
  habit?: HabitId,
): AgendaItem {
  return {
    id: nextId('agenda'),
    dayId,
    title,
    period,
    order: nextOrder(dayId, period),
    timeNote,
    done: false,
    habit,
  }
}

/** Rotina-base completa: dias de semana comuns e Retiro. Sem período até o usuário arrastar. */
function rotinaCompleta(dayId: string): AgendaItem[] {
  return [
    agenda(dayId, 'Devocional', null, undefined, 'devocional'),
    agenda(dayId, 'Alongamento', null, undefined, 'alongamento'),
    agenda(dayId, 'Leitura', null, undefined, 'leitura'),
    agenda(dayId, 'Exercício', null, undefined, 'exercicio'),
    agenda(dayId, 'Revisão da faculdade', null, undefined, 'revisao'),
  ]
}

/** Rotina de sábado comum: igual à completa, sem revisão da faculdade. */
function rotinaSabado(dayId: string): AgendaItem[] {
  return [
    agenda(dayId, 'Devocional', null, undefined, 'devocional'),
    agenda(dayId, 'Alongamento', null, undefined, 'alongamento'),
    agenda(dayId, 'Leitura', null, undefined, 'leitura'),
    agenda(dayId, 'Exercício', null, undefined, 'exercicio'),
  ]
}

/** Rotina reduzida de dia de viagem: só devocional + alongamento (+ leitura, opcional). */
function rotinaViagem(dayId: string, comLeitura = false): AgendaItem[] {
  const base = [
    agenda(dayId, 'Devocional', null, undefined, 'devocional'),
    agenda(dayId, 'Alongamento', null, undefined, 'alongamento'),
  ]
  if (comLeitura) base.push(agenda(dayId, 'Leitura', null, undefined, 'leitura'))
  return base
}

export function buildSeedAgendaItems(): AgendaItem[] {
  return [
    // 24/09 (qui) — dia de semana normal
    ...rotinaCompleta('2026-09-24'),
    agenda('2026-09-24', 'Jejum, oração, silêncio e estudo bíblico', 'manha'),
    agenda('2026-09-24', 'Comprar flores para a irmã Zilda', 'tarde'),
    agenda('2026-09-24', 'Visita à irmã Zilda com o Gui', 'tarde', '17:00'),
    agenda('2026-09-24', 'Encerrar o jejum', 'noite'),
    agenda('2026-09-24', 'ABU — estudo bíblico', 'noite'),

    // 25/09 (sex) — dia de semana normal
    ...rotinaCompleta('2026-09-25'),
    agenda('2026-09-25', 'Organização financeira (salário)', 'manha'),
    agenda('2026-09-25', 'Conectados — culto, som + ensaio do louvor', 'noite'),

    // 26/09 (sáb) — sábado comum
    ...rotinaSabado('2026-09-26'),
    agenda('2026-09-26', 'Exames de sangue', 'manha'),
    agenda('2026-09-26', 'Ultrassom', 'manha', '11:20'),
    agenda('2026-09-26', 'Ensaio com a banda (tarde)', 'tarde'),
    agenda('2026-09-26', 'EB — estudo bíblico em casa', 'noite'),

    // 27/09 (dom) — sem rotina
    agenda('2026-09-27', 'Culto', 'manha'),
    agenda('2026-09-27', 'JVJ', 'noite'),

    // 28/09 (seg) — Bauru Day, viagem
    ...rotinaViagem('2026-09-28'),
    agenda('2026-09-28', 'Viagem com amigos', 'manha'),

    // 29/09 (ter) — dia de semana normal
    ...rotinaCompleta('2026-09-29'),
    agenda('2026-09-29', 'JVJ (noite)', 'noite'),
    agenda('2026-09-29', 'Tarde livre, de propósito, sem agenda', 'tarde'),

    // 30/09 (qua) — dia de semana normal
    ...rotinaCompleta('2026-09-30'),
    agenda('2026-09-30', 'JVJ', 'noite'),

    // 01/10 (qui) — dia de semana normal, só rotina
    ...rotinaCompleta('2026-10-01'),

    // 02/10 (sex) — dia de semana normal
    ...rotinaCompleta('2026-10-02'),
    agenda('2026-10-02', 'Área 51 — tarde/noite de jogos', 'tarde'),

    // 03/10 (sáb) — dia-buffer, sábado comum
    ...rotinaSabado('2026-10-03'),
    agenda('2026-10-03', 'EB — estudo bíblico', 'noite'),

    // 04/10 (dom) — sem rotina
    agenda('2026-10-04', 'Culto', 'manha'),
    agenda('2026-10-04', 'Eleição', 'manha'),
    agenda('2026-10-04', 'JVJ', 'noite'),

    // 05/10 (seg) — dia de semana normal
    ...rotinaCompleta('2026-10-05'),
    agenda('2026-10-05', 'Role com o Vitor', 'tarde'),

    // 06/10 (ter) — Retiro, rotina completa
    ...rotinaCompleta('2026-10-06'),
    agenda('2026-10-06', 'Retiro', 'manha', 'dia todo'),

    // 07/10 (qua) — Retiro, rotina completa
    ...rotinaCompleta('2026-10-07'),
    agenda('2026-10-07', 'Retiro', 'manha', 'dia todo'),

    // 08/10 (qui) — dia de semana normal
    ...rotinaCompleta('2026-10-08'),
    agenda('2026-10-08', 'GAEB', 'noite'),

    // 09/10 (sex) — viagem a Paraty, com leitura
    ...rotinaViagem('2026-10-09', true),
    agenda('2026-10-09', 'Saída de Tatuí', 'tarde', '16:30'),
    agenda('2026-10-09', 'Chegada em Paraty (check-in)', 'noite', '23:00'),

    // 10/10 (sáb) — Paraty, sem rotina-base
    agenda('2026-10-10', 'Saída da pousada', 'manha', '08:30'),
    agenda('2026-10-10', 'Poço da Jamaica', 'manha', '09:00–11:00'),
    agenda('2026-10-10', 'Almoço', 'tarde', '11:30'),
    agenda('2026-10-10', 'Ida ao Cachadaço via Trindade', 'tarde', '13:00'),
    agenda('2026-10-10', 'Praia do Cachadaço', 'tarde', '14:00–18:00'),
    agenda('2026-10-10', 'Volta à pousada', 'noite', '19:00'),

    // 11/10 (dom) — Paraty, sem rotina-base
    agenda('2026-10-11', 'Saída rumo a Paraty-Mirim', 'manha', '08:00'),
    agenda('2026-10-11', 'Praia do Sono + Poço do Jacaré', 'manha', '09:40–14:00'),
    agenda('2026-10-11', 'Volta pela trilha', 'tarde', '14:00'),
    agenda('2026-10-11', 'Pousada, banho', 'tarde', '16:10'),
    agenda('2026-10-11', 'Centrinho + jantar', 'noite', '17:00–19:00'),

    // 12/10 (seg) — volta, sem rotina-base
    agenda('2026-10-12', 'Café da manhã no Café Café', 'manha', '08:00'),
    agenda('2026-10-12', 'Última volta pelo Centro Histórico', 'manha', '09:00'),
    agenda('2026-10-12', 'Saída de Paraty', 'manha', '10:00–11:00'),
    agenda('2026-10-12', 'Carregar o carro', 'manha'),
    agenda('2026-10-12', 'Reorganizar casa e backlog', 'noite', 'ao chegar'),
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
