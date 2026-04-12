import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Typography, Drawer, IconButton, useMediaQuery } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@shared/config/routes'
import { getStoredAccessToken } from '@shared/api/authApi'
import { isDashboardStub } from '@shared/api/dashboardApi'
import { DashboardOverview } from './DashboardOverview'
import { DashboardCalendar } from './DashboardCalendar'
import { DashboardAppointments } from './DashboardAppointments'
import { DashboardServices } from './DashboardServices'
import { DashboardStaff } from './DashboardStaff'
import { DashboardSchedule } from './DashboardSchedule'
import { DashboardProfile } from './DashboardProfile'

type Section = 'overview' | 'calendar' | 'appointments' | 'services' | 'staff' | 'schedule' | 'profile'

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'overview', label: 'Обзор', icon: '◈' },
  { id: 'calendar', label: 'Календарь', icon: '📅' },
  { id: 'appointments', label: 'Записи', icon: '📋' },
  { id: 'services', label: 'Услуги', icon: '✦' },
  { id: 'staff', label: 'Мастера', icon: '👤' },
  { id: 'schedule', label: 'Расписание', icon: '🕐' },
  { id: 'profile', label: 'Профиль', icon: '🏪' },
]

const TITLES: Record<Section, string> = {
  overview: 'Обзор',
  calendar: 'Календарь',
  appointments: 'Записи',
  services: 'Услуги',
  staff: 'Мастера',
  schedule: 'Расписание салона',
  profile: 'Профиль салона',
}

const BG = '#111'
const SIDEBAR = '#1a1a1a'
const BORDER = 'rgba(255,255,255,0.08)'
const TEXT = '#f0eae3'
const MUTED = '#a89e94'
const ACCENT = '#D8956B'

export function DashboardPage() {
  const navigate = useNavigate()
  const narrow = useMediaQuery('(max-width:899px)')
  const [drawer, setDrawer] = useState(false)
  const [section, setSection] = useState<Section>('overview')

  useEffect(() => {
    if (isDashboardStub()) return
    if (!getStoredAccessToken()) {
      navigate(ROUTES.LOGIN, { replace: true, state: { from: ROUTES.DASHBOARD } })
    }
  }, [navigate])

  const content = useMemo(() => {
    switch (section) {
      case 'overview':
        return <DashboardOverview />
      case 'calendar':
        return <DashboardCalendar />
      case 'appointments':
        return <DashboardAppointments />
      case 'services':
        return <DashboardServices />
      case 'staff':
        return <DashboardStaff />
      case 'schedule':
        return <DashboardSchedule />
      case 'profile':
        return <DashboardProfile />
      default:
        return null
    }
  }, [section])

  const sidebar = (
    <Box
      sx={{
        width: 220,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: SIDEBAR,
        borderRight: `1px solid ${BORDER}`,
      }}
    >
      <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${BORDER}`, cursor: 'pointer' }} onClick={() => navigate(ROUTES.HOME)}>
        <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, color: TEXT }}>
          beauti<Box component="span" sx={{ color: ACCENT }}>ca</Box>
        </Typography>
        <Typography sx={{ fontSize: 11, color: MUTED, mt: 0.5 }}>Панель салона</Typography>
      </Box>
      <Box component="nav" sx={{ flex: 1, py: 1, overflow: 'auto' }}>
        {NAV.map(item => {
          const on = item.id === section
          return (
            <Box
              key={item.id}
              onClick={() => {
                setSection(item.id)
                setDrawer(false)
              }}
              sx={{
                mx: 1,
                px: 1.5,
                py: 1,
                borderRadius: '10px',
                cursor: 'pointer',
                color: on ? '#1a0e09' : MUTED,
                bgcolor: on ? ACCENT : 'transparent',
                fontWeight: on ? 600 : 400,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                '&:hover': { bgcolor: on ? ACCENT : 'rgba(255,255,255,0.05)', color: on ? '#1a0e09' : TEXT },
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </Box>
          )
        })}
      </Box>
      <Box sx={{ p: 2, borderTop: `1px solid ${BORDER}` }}>
        <Typography onClick={() => navigate(ROUTES.HOME)} sx={{ fontSize: 13, color: MUTED, cursor: 'pointer' }}>
          ← На сайт
        </Typography>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: BG, display: 'flex' }}>
      {!narrow && sidebar}
      {narrow && (
        <>
          <Drawer anchor="left" open={drawer} onClose={() => setDrawer(false)} PaperProps={{ sx: { bgcolor: SIDEBAR } }}>
            {sidebar}
          </Drawer>
        </>
      )}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            height: 56,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            borderBottom: `1px solid ${BORDER}`,
            bgcolor: SIDEBAR,
          }}
        >
          {narrow && (
            <IconButton onClick={() => setDrawer(true)} sx={{ color: TEXT }}>
              ☰
            </IconButton>
          )}
          <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: TEXT }}>{TITLES[section]}</Typography>
        </Box>
        <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, overflow: 'auto' }}>
          {isDashboardStub() && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Режим заглушки дашборда: данные только в браузере, без входа и без бэкенда. Отключить:{' '}
              <code style={{ fontSize: 12 }}>VITE_DASHBOARD_STUB=0</code> в <code style={{ fontSize: 12 }}>.env</code>.
            </Alert>
          )}
          {content}
        </Box>
      </Box>
    </Box>
  )
}
