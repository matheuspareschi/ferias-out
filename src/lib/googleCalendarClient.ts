import { addDays } from './dates'

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'

export interface GoogleToken {
  accessToken: string
  expiresAt: number
}

interface GoogleTokenClient {
  requestAccessToken: () => void
}

interface GoogleTokenResponse {
  access_token?: string
  expires_in?: string | number
  error?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (resp: GoogleTokenResponse) => void
          }) => GoogleTokenClient
        }
      }
    }
  }
}

let scriptPromise: Promise<void> | null = null

/** Carrega o script do Google Identity Services uma única vez (site estático, sem backend — 5.3). */
function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Falha ao carregar o script do Google'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

/** Abre o popup de login/consentimento do Google e devolve um token de acesso (modelo "token", sem backend). */
export async function requestGoogleToken(clientId: string): Promise<GoogleToken> {
  await loadGisScript()
  return new Promise((resolve, reject) => {
    if (!window.google) {
      reject(new Error('Google Identity Services não carregou'))
      return
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error ?? 'Sem access_token'))
          return
        }
        const expiresIn = Number(resp.expires_in) || 3600
        resolve({ accessToken: resp.access_token, expiresAt: Date.now() + expiresIn * 1000 })
      },
    })
    client.requestAccessToken()
  })
}

export interface GoogleEventResult {
  id: string
  updated: string
}

interface GoogleEventPayload {
  summary: string
  start: { date: string }
  end: { date: string }
}

/**
 * Evento dia-inteiro (o app não guarda horário estruturado, só `timeNote`
 * livre — não há como converter isso num horário confiável do Google). O
 * `end.date` do Google é exclusivo, por isso soma 1 dia ao fim do intervalo.
 */
function toGooglePayload(title: string, dayId: string, endDayId: string | undefined): GoogleEventPayload {
  const endExclusive = addDays(endDayId ?? dayId, 1)
  return { summary: title, start: { date: dayId }, end: { date: endExclusive } }
}

async function callCalendarApi(path: string, token: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${CALENDAR_API}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`Google Calendar API: ${res.status}`)
  return res
}

export async function createGoogleEvent(
  token: string,
  calendarId: string,
  title: string,
  dayId: string,
  endDayId?: string,
): Promise<GoogleEventResult> {
  const res = await callCalendarApi(`/calendars/${encodeURIComponent(calendarId)}/events`, token, {
    method: 'POST',
    body: JSON.stringify(toGooglePayload(title, dayId, endDayId)),
  })
  const json = (await res.json()) as { id: string; updated: string }
  return { id: json.id, updated: json.updated }
}

export async function updateGoogleEvent(
  token: string,
  calendarId: string,
  eventId: string,
  title: string,
  dayId: string,
  endDayId?: string,
): Promise<GoogleEventResult> {
  const res = await callCalendarApi(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, token, {
    method: 'PATCH',
    body: JSON.stringify(toGooglePayload(title, dayId, endDayId)),
  })
  const json = (await res.json()) as { id: string; updated: string }
  return { id: json.id, updated: json.updated }
}

export async function deleteGoogleEvent(token: string, calendarId: string, eventId: string): Promise<void> {
  await fetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export interface GoogleCalendarEvent {
  id: string
  title: string
  dayId: string
  endDayId?: string
  updated: string
}

/** Eventos do calendário no intervalo — usados só pra exibição somente-leitura (5.3). */
export async function listGoogleEvents(
  token: string,
  calendarId: string,
  timeMinDayId: string,
  timeMaxDayId: string,
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: `${timeMinDayId}T00:00:00Z`,
    timeMax: `${timeMaxDayId}T23:59:59Z`,
    singleEvents: 'true',
    orderBy: 'startTime',
  })
  const res = await callCalendarApi(`/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`, token)
  const json = (await res.json()) as {
    items?: { id: string; summary?: string; updated: string; start?: { date?: string; dateTime?: string }; end?: { date?: string; dateTime?: string } }[]
  }
  return (json.items ?? [])
    .filter((it) => it.start?.date || it.start?.dateTime)
    .map((it) => {
      const dayId = (it.start!.date ?? it.start!.dateTime!.slice(0, 10)) as string
      const endRaw = it.end?.date ?? it.end?.dateTime?.slice(0, 10)
      // end.date do Google é exclusivo pra dia-inteiro — volta 1 dia pra virar inclusivo.
      const endDayId = endRaw && it.end?.date ? addDays(endRaw, -1) : endRaw
      return { id: it.id, title: it.summary ?? '(sem título)', dayId, endDayId: endDayId !== dayId ? endDayId : undefined, updated: it.updated }
    })
}
