import { Box } from '@mui/material'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import type { DashboardPalette } from '@shared/theme'

function statusBadgeCfg(
  pal: DashboardPalette,
): Record<string, { label: string; bg: string; color: string }> {
  return {
    pending: { label: 'Ожидает', bg: 'rgba(255,217,61,.15)', color: '#FFD93D' },
    confirmed: { label: 'Подтверждена', bg: 'rgba(107,203,119,.15)', color: '#6BCB77' },
    completed: { label: 'Завершена', bg: 'rgba(78,205,196,.15)', color: '#4ECDC4' },
    cancelled_by_salon: { label: 'Отмена', bg: 'rgba(224,96,96,.15)', color: pal.red },
    cancelled_by_client: { label: 'Отмена клиентом', bg: 'rgba(224,96,96,.12)', color: pal.red },
    no_show: { label: 'Не пришёл', bg: 'rgba(255,255,255,.07)', color: pal.mutedDark },
  }
}

export function MasterAppointmentStatusBadge({ status }: { status: string }) {
  const d = useDashboardPalette()
  const cfg = statusBadgeCfg(d)[status] ?? {
    label: status,
    bg: 'rgba(255,255,255,.07)',
    color: d.mutedDark,
  }
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1.25,
        py: 0.25,
        borderRadius: '20px',
        fontSize: 11,
        fontWeight: 600,
        bgcolor: cfg.bg,
        color: cfg.color,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </Box>
  )
}
