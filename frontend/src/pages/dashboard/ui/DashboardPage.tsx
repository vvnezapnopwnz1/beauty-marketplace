import { useEffect, useMemo, useState } from 'react'
import { Box, Typography, Drawer, IconButton, Switch, useMediaQuery, useTheme } from '@mui/material'
import { Route, Routes, useMatch, useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@shared/config/routes'
import { getStoredAccessToken } from '@shared/api/authApi'
import { useThemeMode } from '@shared/theme'
import { DashboardOverview } from './DashboardOverview'
import { DashboardCalendar } from './DashboardCalendar'
import { DashboardAppointments } from './DashboardAppointments'
import { ServicesView } from './views/ServicesView'
import { StaffListView } from './views/StaffListView'
import { ScheduleView } from './views/ScheduleView'
import { StaffDetailView } from './views/StaffDetailView'
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
  schedule: 'Расписание',
  profile: 'Профиль салона',
}

function isSection(s: string | null): s is Section {
  return s === 'overview' || s === 'calendar' || s === 'appointments' || s === 'services' || s === 'staff' || s === 'schedule' || s === 'profile'
}

function DashboardMainContent({ section }: { section: Section }) {
  switch (section) {
    case 'overview':
      return <DashboardOverview />
    case 'calendar':
      return <DashboardCalendar />
    case 'appointments':
      return <DashboardAppointments />
    case 'services':
      return <ServicesView />
    case 'staff':
      return <StaffListView />
    case 'schedule':
      return <ScheduleView />
    case 'profile':
      return <DashboardProfile />
    default:
      return null
  }
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { mode, setMode } = useThemeMode()
  const [searchParams] = useSearchParams()
  const staffMatch = useMatch('/dashboard/staff/:staffId')
  const narrow = useMediaQuery('(max-width:899px)')
  const [drawer, setDrawer] = useState(false)
  const theme = useTheme()
  const dashboard = theme.palette.dashboard

  const section = useMemo((): Section => {
    if (staffMatch) return 'staff'
    const s = searchParams.get('section')
    if (isSection(s)) return s
    return 'overview'
  }, [staffMatch, searchParams])

  useEffect(() => {
    if (!getStoredAccessToken()) {
      navigate(ROUTES.LOGIN, { replace: true, state: { from: ROUTES.DASHBOARD } })
    }
  }, [navigate])

  const headerTitle = useMemo(() => {
    if (staffMatch) return 'Мастер'
    return TITLES[section]
  }, [staffMatch, section])

  function goSection(id: Section) {
    if (id === 'overview') {
      navigate('/dashboard')
      return
    }
    navigate(`/dashboard?section=${id}`)
  }

  const content = (
    <Routes>
      <Route index element={<DashboardMainContent section={section} />} />
      <Route path="staff/:staffId" element={<StaffDetailView />} />
    </Routes>
  )

  const sidebar = (
    <Box
      sx={{
        width: 220,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: dashboard.sidebar,
        borderRight: `1px solid ${dashboard.borderSubtle}`,
      }}
    >
      <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${dashboard.borderSubtle}`, cursor: 'pointer' }} onClick={() => navigate(ROUTES.HOME)}>
        <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, color: dashboard.text }}>
          beauti<Box component="span" sx={{ color: dashboard.accent }}>ca</Box>
        </Typography>
        <Typography sx={{ fontSize: 11, color: dashboard.muted, mt: 0.5 }}>Панель салона</Typography>
      </Box>
      <Box component="nav" sx={{ flex: 1, py: 1, overflow: 'auto' }}>
        {NAV.map(item => {
          const on = item.id === section
          return (
            <Box
              key={item.id}
              onClick={() => {
                goSection(item.id)
                setDrawer(false)
              }}
              sx={{
                mx: 1,
                px: 1.5,
                py: 1,
                borderRadius: '10px',
                cursor: 'pointer',
                color: on ? dashboard.onAccent : dashboard.muted,
                bgcolor: on ? dashboard.accent : 'transparent',
                fontWeight: on ? 600 : 400,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                '&:hover': { bgcolor: on ? dashboard.accent : dashboard.navHover, color: on ? dashboard.onAccent : dashboard.text },
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </Box>
          )
        })}
      </Box>
      <Box sx={{ p: 2, borderTop: `1px solid ${dashboard.borderSubtle}` }}>
        <Typography onClick={() => navigate(ROUTES.HOME)} sx={{ fontSize: 13, color: dashboard.muted, cursor: 'pointer' }}>
          ← На сайт
        </Typography>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: dashboard.page, display: 'flex' }}>
      {!narrow && sidebar}
      {narrow && (
        <>
          <Drawer anchor="left" open={drawer} onClose={() => setDrawer(false)} PaperProps={{ sx: { bgcolor: dashboard.sidebar } }}>
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
            borderBottom: `1px solid ${dashboard.borderSubtle}`,
            bgcolor: dashboard.sidebar,
          }}
        >
          {narrow && (
            <IconButton onClick={() => setDrawer(true)} sx={{ color: dashboard.text }}>
              ☰
            </IconButton>
          )}
          <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: dashboard.text }}>{headerTitle}</Typography>
          <Switch
            size="small"
            checked={mode === 'dark'}
            onChange={(_, checked) => setMode(checked ? 'dark' : 'light')}
            inputProps={{ 'aria-label': 'Toggle dashboard theme' }}
            sx={{
              ml: 'auto',
              '& .MuiSwitch-track': { bgcolor: dashboard.border },
              '& .MuiSwitch-thumb': { bgcolor: mode === 'dark' ? dashboard.accent : dashboard.mutedDark },
            }}
          />
        </Box>
        <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, overflow: 'auto' }}>{content}</Box>
      </Box>
    </Box>
  )
}
