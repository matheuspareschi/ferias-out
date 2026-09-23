export const GRID_START_HOUR = 6
export const GRID_END_HOUR = 24
export const HOUR_HEIGHT = 48 // px por hora
export const SNAP_MINUTES = 15
export const DEFAULT_DURATION = 30 // min
export const MIN_DURATION = 15
export const MAX_DURATION = 12 * 60

export const GRID_TOTAL_HEIGHT = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function snapMinutes(minutes: number, snap: number = SNAP_MINUTES): number {
  return Math.round(minutes / snap) * snap
}

export function clampStartMinutes(minutes: number, duration: number): number {
  const min = GRID_START_HOUR * 60
  const max = GRID_END_HOUR * 60 - duration
  return Math.min(Math.max(minutes, min), Math.max(min, max))
}

export function clampDuration(duration: number): number {
  return Math.min(Math.max(duration, MIN_DURATION), MAX_DURATION)
}

export function topForStart(start: string): number {
  const minutes = timeToMinutes(start) - GRID_START_HOUR * 60
  return (minutes / 60) * HOUR_HEIGHT
}

export function heightForDuration(duration: number): number {
  return (duration / 60) * HOUR_HEIGHT
}
