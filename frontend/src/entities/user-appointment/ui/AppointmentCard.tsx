import { Box, Chip, Skeleton, Stack, Typography } from '@mui/material'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import ContentCutOutlinedIcon from '@mui/icons-material/ContentCutOutlined'
import type { AppointmentStatus, UserAppointment } from '../model/types'

// ─── status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; color: string; bg: string; accent: string }
> = {
  pending: {
    label: 'Ожидает',
    color: '#B45309',
    bg: 'rgba(251, 191, 36, 0.10)',
    accent: '#F59E0B',
  },
  confirmed: {
    label: 'Подтверждена',
    color: '#1D4ED8',
    bg: 'rgba(59, 130, 246, 0.10)',
    accent: '#3B82F6',
  },
  completed: {
    label: 'Завершена',
    color: '#065F46',
    bg: 'rgba(16, 185, 129, 0.10)',
    accent: '#10B981',
  },
  cancelled_by_salon: {
    label: 'Отменена',
    color: '#991B1B',
    bg: 'rgba(239, 68, 68, 0.10)',
    accent: '#EF4444',
  },
  cancelled_by_client: {
    label: 'Отменена вами',
    color: '#6B7280',
    bg: 'rgba(107, 114, 128, 0.08)',
    accent: '#9CA3AF',
  },
  no_show: {
    label: 'Неявка',
    color: '#6B7280',
    bg: 'rgba(107, 114, 128, 0.08)',
    accent: '#9CA3AF',
  },
}

const fallbackStatus = (s: string) =>
  STATUS_CONFIG[s as AppointmentStatus] ?? {
    label: s,
    color: '#6B7280',
    bg: 'rgba(107,114,128,0.08)',
    accent: '#9CA3AF',
  }

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return { date, time }
}

function formatPrice(cents: number | null): string | null {
  if (cents == null) return null
  return `${(cents / 100).toLocaleString('ru-RU')} ₽`
}

// ─── component ────────────────────────────────────────────────────────────────

interface Props {
  appt: UserAppointment
}

export function AppointmentCard({ appt }: Props) {
  const cfg = fallbackStatus(appt.status)
  const { date, time } = formatDateTime(appt.startsAt)
  const { time: timeEnd } = formatDateTime(appt.endsAt)
  const price = formatPrice(appt.priceCents)

  return (
    <Box
      sx={{
        display: 'flex',
        borderRadius: '14px',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        '&:hover': {
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          borderColor: cfg.accent,
        },
      }}
    >
      {/* accent stripe */}
      <Box sx={{ width: 4, flexShrink: 0, bgcolor: cfg.accent }} />

      {/* content */}
      <Box sx={{ flex: 1, p: { xs: 2, sm: 2.5 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
          {/* left: meta */}
          <Stack spacing={0.75} flex={1}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.3}>
                {appt.salonName}
              </Typography>
              <Chip
                label={cfg.label}
                size="small"
                sx={{
                  bgcolor: cfg.bg,
                  color: cfg.color,
                  fontWeight: 600,
                  fontSize: 11,
                  height: 22,
                  borderRadius: '6px',
                }}
              />
            </Stack>

            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <ContentCutOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {appt.serviceName}
                </Typography>
              </Stack>

              {appt.masterName && (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <PersonOutlineIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {appt.masterName}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Stack>

          {/* right: date + time + price */}
          <Stack
            alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
            spacing={0.5}
            flexShrink={0}
          >
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <CalendarMonthOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary" noWrap>
                {date}
              </Typography>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={0.5}>
              <AccessTimeOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary" noWrap>
                {time} – {timeEnd}
              </Typography>
            </Stack>

            {price && (
              <Typography variant="body2" fontWeight={700} color="text.primary">
                {price}
              </Typography>
            )}
          </Stack>
        </Stack>

        {appt.clientNote && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              mt: 1,
              fontStyle: 'italic',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            💬 {appt.clientNote}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

export function AppointmentCardSkeleton() {
  return (
    <Box
      sx={{
        display: 'flex',
        borderRadius: '14px',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box sx={{ width: 4, flexShrink: 0 }}>
        <Skeleton variant="rectangular" width={4} height="100%" />
      </Box>
      <Box sx={{ flex: 1, p: 2.5 }}>
        <Stack spacing={1}>
          <Skeleton variant="text" width="60%" height={24} />
          <Skeleton variant="text" width="40%" height={18} />
          <Skeleton variant="text" width="30%" height={18} />
        </Stack>
      </Box>
    </Box>
  )
}
