import { useCallback, useRef, useState } from 'react'
import {
  createGoogleEvent,
  deleteGoogleEvent,
  listGoogleEvents,
  requestGoogleToken,
  updateGoogleEvent,
  type GoogleCalendarEvent,
  type GoogleEventResult,
  type GoogleToken,
} from '@/lib/googleCalendarClient'

const TOKEN_STORAGE_KEY = 'ferias-planner:google-token'

export type GoogleCalendarStatus = 'unconfigured' | 'disconnected' | 'connecting' | 'connected' | 'error'

function loadStoredToken(): GoogleToken | null {
  try {
    const raw = window.sessionStorage.getItem(TOKEN_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GoogleToken
    return parsed.expiresAt > Date.now() ? parsed : null
  } catch {
    return null
  }
}

/**
 * Integração com o Google Agenda (5.3) — Google Identity Services (modelo
 * "token"), direto no navegador, sem backend. O client ID é configurável
 * (VITE_GOOGLE_CLIENT_ID); sem ele, a integração fica "não configurada" e o
 * app segue funcionando normalmente (nunca bloqueia o uso). O token dura
 * ~1h, sem refresh em segundo plano — ao expirar, volta a pedir o botão
 * "Conectar ao Google". Token só em sessionStorage, nunca no banco.
 */
export function useGoogleCalendar() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  const calendarId = (import.meta.env.VITE_GOOGLE_CALENDAR_ID as string | undefined) || 'primary'
  // Inicializa direto de sessionStorage (sem efeito) — um token válido sobrevive a um F5 na mesma aba.
  // `useRef` reavalia o argumento a cada render mas só usa o da primeira vez, então não é leitura em render.
  const tokenRef = useRef<GoogleToken | null>(clientId ? loadStoredToken() : null)
  const [status, setStatus] = useState<GoogleCalendarStatus>(() => {
    if (!clientId) return 'unconfigured'
    return loadStoredToken() ? 'connected' : 'disconnected'
  })

  const connect = useCallback(async () => {
    if (!clientId) return
    setStatus('connecting')
    try {
      const token = await requestGoogleToken(clientId)
      tokenRef.current = token
      try {
        window.sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token))
      } catch {
        // sessionStorage indisponível — token continua válido só em memória nesta sessão
      }
      setStatus('connected')
    } catch {
      setStatus('error')
    }
  }, [clientId])

  /** Token atual, ou null se expirado/ausente — nesse caso já reflete o status pra "desconectado". */
  const currentToken = useCallback((): string | null => {
    const t = tokenRef.current
    if (!t || t.expiresAt <= Date.now()) {
      tokenRef.current = null
      setStatus((s) => (s === 'connected' ? (clientId ? 'disconnected' : 'unconfigured') : s))
      return null
    }
    return t.accessToken
  }, [clientId])

  const createEvent = useCallback(
    async (title: string, dayId: string, endDayId?: string): Promise<GoogleEventResult | null> => {
      const token = currentToken()
      if (!token) return null
      try {
        return await createGoogleEvent(token, calendarId, title, dayId, endDayId)
      } catch {
        return null
      }
    },
    [calendarId, currentToken],
  )

  const updateEvent = useCallback(
    async (eventId: string, title: string, dayId: string, endDayId?: string): Promise<GoogleEventResult | null> => {
      const token = currentToken()
      if (!token) return null
      try {
        return await updateGoogleEvent(token, calendarId, eventId, title, dayId, endDayId)
      } catch {
        return null
      }
    },
    [calendarId, currentToken],
  )

  const deleteEvent = useCallback(
    async (eventId: string): Promise<void> => {
      const token = currentToken()
      if (!token) return
      try {
        await deleteGoogleEvent(token, calendarId, eventId)
      } catch {
        // falha silenciosa — nunca impede o uso do app (5.3)
      }
    },
    [calendarId, currentToken],
  )

  const fetchEvents = useCallback(
    async (fromDayId: string, toDayId: string): Promise<GoogleCalendarEvent[]> => {
      const token = currentToken()
      if (!token) return []
      try {
        return await listGoogleEvents(token, calendarId, fromDayId, toDayId)
      } catch {
        return []
      }
    },
    [calendarId, currentToken],
  )

  return { status, connected: status === 'connected', connect, createEvent, updateEvent, deleteEvent, fetchEvents }
}

export type UseGoogleCalendarReturn = ReturnType<typeof useGoogleCalendar>
