import { useCallback } from 'react'
import type { UseGoogleCalendarReturn } from '@/hooks/useGoogleCalendar'
import type { UsePlannerReturn } from '@/hooks/usePlanner'

/**
 * Envolve o planner uma única vez (ver App.tsx) pra propagar criar/editar/
 * apagar de EVENTOS pro Google Agenda (5.3), sem precisar espalhar essa
 * lógica em cada página — todo mundo continua só chamando addItem/
 * updateItem/deleteItem normalmente. Tarefas nunca vão pro Google. Falha
 * de rede/autenticação do Google nunca impede a escrita local.
 */
export function useGoogleSyncedPlanner(planner: UsePlannerReturn, google: UseGoogleCalendarReturn): UsePlannerReturn {
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

  return { ...planner, addItem, updateItem, deleteItem }
}
