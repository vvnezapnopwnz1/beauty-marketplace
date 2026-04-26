import { V } from '@shared/theme/palettes'

export const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
    pending: { color: V.warning, bg: V.warnSoft },
    confirmed: { color: V.success, bg: V.successSoft },
    completed: { color: V.textMuted, bg: 'rgba(160,120,144,0.09)' },
    cancelled_by_salon: { color: V.error, bg: V.errorSoft },
    no_show: { color: V.textMuted, bg: 'rgba(160,120,144,0.09)' },
}

export const STATUS_LABELS: Record<string, string> = {
    pending: 'Ожидает',
    confirmed: 'Подтверждена',
    completed: 'Завершена',
    cancelled_by_salon: 'Отмена',
    no_show: 'Не пришёл',
}
