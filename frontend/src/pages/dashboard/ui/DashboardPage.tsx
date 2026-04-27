import { useEffect, useMemo, useState } from 'react'
import { Box, Typography, Drawer, IconButton, Switch, useMediaQuery, useTheme, Avatar, Menu, MenuItem } from '@mui/material'
import { Route, Routes, useMatch, useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@shared/config/routes'
import { getStoredAccessToken } from '@shared/api/authApi'
import { useAppSelector, useAppDispatch } from '@app/store'
import { selectUser, logout } from '@features/auth-by-phone/model/authSlice'
import { useThemeMode } from '@shared/theme'
import { UserMenu } from '@features/user-menu/ui/UserMenu'
import { DashboardOverview } from './DashboardOverview'
import { DashboardCalendar } from './DashboardCalendar'
import { DashboardAppointments } from './DashboardAppointments'
import { ServicesView } from './views/ServicesView'
import { StaffTabsView } from './views/StaffTabsView'
import { ScheduleView } from './views/ScheduleView'
import { DashboardProfile } from './DashboardProfile'
import { ClientsListView } from './ClientsListView'
import { fetchSalonProfile } from '@shared/api/dashboardApi'

type Section = 'overview' | 'calendar' | 'appointments' | 'services' | 'staff' | 'schedule' | 'profile' | 'clients'

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'overview', label: 'Обзор', icon: '◈' },
  { id: 'calendar', label: 'Календарь', icon: '📅' },
  { id: 'appointments', label: 'Записи', icon: '📋' },
  { id: 'clients', label: 'Клиенты', icon: '👥' },
  { id: 'services', label: 'Услуги', icon: '✦' },
  { id: 'staff', label: 'Мастера', icon: '👤' },
  { id: 'schedule', label: 'Расписание', icon: '🕐' },
  { id: 'profile', label: 'Профиль', icon: '🏪' },
]

const TITLES: Record<Section, string> = {
  overview: 'Обзор',
  calendar: 'Календарь',
  appointments: 'Записи',
  clients: 'Клиенты',
  services: 'Услуги',
  staff: 'Мастера',
  schedule: 'Расписание',
  profile: 'Профиль салона',
}

function isSection(s: string | null): s is Section {
  return s === 'overview' || s === 'calendar' || s === 'appointments' || s === 'services' || s === 'staff' || s === 'schedule' || s === 'profile' || s === 'clients'
}

function initials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function DashboardMainContent({ section }: { section: Section }) {
  switch (section) {
    case 'overview':
      return <DashboardOverview />
    case 'calendar':
      return <DashboardCalendar />
    case 'appointments':
      return <DashboardAppointments />
    case 'clients':
      return <ClientsListView />
    case 'services':
      return <ServicesView />
    case 'staff':
      return <StaffTabsView />
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
  const user = useAppSelector(selectUser)
  const dispatch = useAppDispatch()
  const { mode, setMode } = useThemeMode()
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null)
  const [searchParams] = useSearchParams()
  const staffMatch = useMatch('/dashboard/staff/:staffId')
  const narrow = useMediaQuery('(max-width:899px)')
  const [drawer, setDrawer] = useState(false)
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | undefined>(undefined)
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

  useEffect(() => {
    if (!user) return
    const roles = user.effectiveRoles
    const canSalon = ((roles?.ownerOfSalons.length ?? 0) + (roles?.adminOfSalons.length ?? 0)) > 0
    if (!canSalon) {
      navigate(`${ROUTES.ME}?tab=general`, { replace: true })
    }
  }, [navigate, user])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const profile = await fetchSalonProfile()
        if (!cancelled) {
          setOnboardingCompleted(profile.onboardingCompleted)
        }
      } catch {
        // ignore profile preload failures here; page content handles its own errors
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!user) return
    if (user.role !== 'salon_owner') return
    if (onboardingCompleted === false) {
      navigate(ROUTES.ONBOARDING, { replace: true })
    }
  }, [navigate, onboardingCompleted, user])

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
      <Route path="staff/*" element={<StaffTabsView />} />
    </Routes>
  )

  const sidebar = (
    <Box
      sx={{
        width: 220,
        height: '100vh',
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
      <Box component="nav" sx={{ flex: 1, minHeight: 0, py: 1, overflow: 'auto' }}>
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
      <Box sx={{ p: 2, borderTop: `1px solid ${dashboard.borderSubtle}`, mt: 'auto' }}>
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
          onClick={(e) => setUserMenuAnchor(e.currentTarget as HTMLElement)}
        >
          <Avatar sx={{ width: 40, height: 40, bgcolor: dashboard.accent, color: dashboard.onAccent, fontWeight: 700 }}>
            {initials(user?.displayName)}
          </Avatar>
          <Box>
            <Typography sx={{ fontSize: 13, color: dashboard.text, fontWeight: 600 }}>{user?.displayName ? user.displayName.split(' ')[0] : 'Пользователь'}</Typography>
            <Typography sx={{ fontSize: 11, color: dashboard.muted }}>Владелец</Typography>
          </Box>
        </Box>
        <Menu anchorEl={userMenuAnchor} open={!!userMenuAnchor} onClose={() => setUserMenuAnchor(null)}>
          <MenuItem onClick={() => { setUserMenuAnchor(null); navigate(ROUTES.HOME) }}>Главная</MenuItem>
          <MenuItem onClick={() => { setUserMenuAnchor(null); navigate(ROUTES.ME) }}>Профиль</MenuItem>
          <MenuItem onClick={() => { setUserMenuAnchor(null); navigate(ROUTES.DASHBOARD) }}>Кабинет салона</MenuItem>
          <MenuItem onClick={() => { setUserMenuAnchor(null); void dispatch(logout()) }}>Выйти</MenuItem>
        </Menu>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: dashboard.page, display: 'flex' }}>
      {!narrow && sidebar}
      {narrow && (
        <>
          <Drawer
        anchor="left"
        open={drawer}
        onClose={() => setDrawer(false)}
        PaperProps={{ sx: { bgcolor: dashboard.sidebar, height: '100vh', width: 220 } }}
      >
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
