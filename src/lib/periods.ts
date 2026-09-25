import type { PeriodId } from './types'

export const PERIOD_ORDER: PeriodId[] = ['manha', 'tarde', 'noite']

export const PERIOD_LABEL: Record<PeriodId, string> = {
  manha: 'manhã',
  tarde: 'tarde',
  noite: 'noite',
}
