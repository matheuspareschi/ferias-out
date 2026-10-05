import { useCallback, useEffect, useState } from 'react'
import type { UseGoogleCalendarReturn } from '@/hooks/useGoogleCalendar'
import type { UsePlannerReturn } from '@/hooks/usePlanner'
import { DEFAULT_CONTEXT_ID } from '@/lib/contexts'
import { addDays, todayId } from '@/lib/dates'
import type { GoogleCalendarEvent } from '@/lib/googleCalendarClient'
import type { Item } from '@/lib/types'

// Janela de leitura (5.3): passado recente + alguns meses à frente — suficiente
// pra Dia/Mês sem puxar o calendário inteiro a cada reconexão.
const FETCH_WINDOW_PAST_DAYS = 30
const FETCH_WINDOW_FUTURE_DAYS = 180

/**
 * Envolve o planner uma única vez (ver App.tsx) pra propagar criar/editar/
 * apagar de EVENTOS pro Google Agenda (5.3), sem precisar espalhar essa
 * lógica em cada página — todo mundo continua só chamando addItem/
 * updateItem/deleteItem normalmente. Tarefas nunca vão pro Google. Falha
 * de rede/autenticação do Google nunca impede a escrita local.
 *
 * Também cuida da leitura (5.3): ao conectar, busca os eventos do Google
 * na janela acima. Os que já pertencem a um Item local (mesmo
 * `googleEventId`) só servem pra detectar edição feita direto no Google
 * (compara `updated` com o `googleUpdated` guardado e puxa a versão nova,
 * sem reescrever no Google). Os demais viram itens só-leitura, marcados
 * "Google" (ver ItemRow/MonthItemLine), mesclados em `items` só pra
 * exibição — nunca gravados no estado persistido.
 */
export function useGoogleSyncedPlanner(planner: UsePlannerReturn, google: UseGoogleCalendarReturn): UsePlannerReturn {
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([])

  useEffect(() => {
    if (!google.connected) {
      setGoogleEvents([])
      return
    }
    let cancelled = false
    const from = addDays(todayId(), -FETCH_WINDOW_PAST_DAYS)
    const to = addDays(todayId(), FETCH_WINDOW_FUTURE_DAYS)
    void google.fetchEvents(from, to).then((events) => {
      if (!cancelled) setGoogleEvents(events)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [google.connected])

  // Mudança feita direto no Google num item que o app também conhece: puxa a
  // versão nova (título/dia) sem reescrever no Google (senão nunca convergia).
  useEffect(() => {
    for (const event of googleEvents) {
      const local = planner.items.find((it) => it.googleEventId === event.id)
      if (local && local.googleUpdated !== event.updated) {
        planner.updateItem(local.id, { title: event.title, dayId: event.dayId, endDayId: event.endDayId, googleUpdated: event.updated })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleEvents])

  // Eventos do Google sem Item local correspondente — só-leitura (5.3), nunca persistidos.
  const knownGoogleIds = new Set(planner.items.filter((it) => it.googleEventId).map((it) => it.googleEventId))
  const googleOnlyItems: Item[] = googleEvents
    .filter((event) => !knownGoogleIds.has(event.id))
    .map((event) => ({
      id: `google-${event.id}`,
      type: 'event',
      title: event.title,
      context: DEFAULT_CONTEXT_ID,
      dayId: event.dayId,
      endDayId: event.endDayId,
      period: null,
      order: 0,
      done: false,
      fromGoogle: true,
    }))

  const addItem = useCallback<UsePlannerReturn['addItem']>(
    (data) => {
      const id = planner.addItem(data)
      if (data.type === 'event' && google.connected && data.dayId) {
        void google.createEvent(data.title, data.dayId, data.endDayId).then((result) => {
          if (result) planner.updateItem(id, { googleEventId: result.id, googleUpdated: result.updated })
        })
      }
      return id
    },
    [planner, google],
  )

  const updateItem = useCallback<UsePlannerReturn['updateItem']>(
    (id, patch) => {
      const existing = planner.items.find((it) => it.id === id)
      planner.updateItem(id, patch)
      if (!existing || existing.type !== 'event' || !google.connected) return
      const nextDayId = 'dayId' in patch ? patch.dayId : existing.dayId
      const nextTitle = patch.title ?? existing.title
      const nextEndDayId = 'endDayId' in patch ? patch.endDayId : existing.endDayId
      if (existing.googleEventId) {
        if (!nextDayId) {
          void google.deleteEvent(existing.googleEventId)
        } else {
          void google.updateEvent(existing.googleEventId, nextTitle, nextDayId, nextEndDayId)
        }
      } else if (nextDayId) {
        void google.createEvent(nextTitle, nextDayId, nextEndDayId).then((result) => {
          if (result) planner.updateItem(id, { googleEventId: result.id, googleUpdated: result.updated })
        })
      }
    },
    [planner, google],
  )

  const deleteItem = useCallback<UsePlannerReturn['deleteItem']>(
    (id) => {
      const existing = planner.items.find((it) => it.id === id)
      planner.deleteItem(id)
      if (existing?.type === 'event' && existing.googleEventId && google.connected) {
        void google.deleteEvent(existing.googleEventId)
      }
    },
    [planner, google],
  )

  return { ...planner, items: [...planner.items, ...googleOnlyItems], addItem, updateItem, deleteItem }
}
