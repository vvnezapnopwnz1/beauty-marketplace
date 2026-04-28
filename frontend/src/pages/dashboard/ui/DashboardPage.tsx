import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Typography, Drawer, IconButton, Switch, useMediaQuery, useTheme, Avatar, Menu, MenuItem } from '@mui/material'
import { Route, Routes, useMatch, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ROUTES, dashboardPath, dashboardSectionPath, salonRoleLabelRu } from '@shared/config/routes'
import { getStoredAccessToken } from '@shared/api/authApi'
import { useAppSelector, useAppDispatch } from '@app/store'
import { selectUser, logout } from '@features/auth-by-phone/model/authSlice'
import { useThemeMode } from '@shared/theme'
import { DashboardOverview } from './DashboardOverview'
import { DashboardCalendar } from './DashboardCalendar'
import { DashboardAppointments } from './DashboardAppointments'
import { ServicesView } from './views/ServicesView'
import { StaffTabsView } from './views/StaffTabsView'
import { ScheduleView } from './views/ScheduleView'
import { DashboardProfile } from './DashboardProfile'
import { ClientsListView } from './ClientsListView'
import { PersonnelView } from './views/PersonnelView'
import { fetchSalonProfile } from '@shared/api/dashboardApi'
import { setActiveSalonId } from '@shared/lib/activeSalon'
import { rtkApi } from '@shared/api/rtkApi'

type Section =
  | 'overview'
  | 'calendar'
  | 'appointments'
  | 'services'
  | 'staff'
  | 'schedule'
  | 'profile'
  | 'clients'
  | 'personnel'

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'overview', label: 'Обзор', icon: '◈' },
  { id: 'calendar', label: 'Календарь', icon: '📅' },
  { id: 'appointments', label: 'Записи', icon: '📋' },
  { id: 'clients', label: 'Клиенты', icon: '👥' },
  { id: 'services', label: 'Услуги', icon: '✦' },
  { id: 'staff', label: 'Мастера', icon: '👤' },
  { id: 'schedule', label: 'Расписание', icon: '🕐' },
  { id: 'personnel', label: 'Персонал', icon: '🔑' },
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
  personnel: 'Персонал',
  profile: 'Профиль салона',
}

function isSection(s: string | null): s is Section {
  return (
    s === 'overview' ||
    s === 'calendar' ||
    s === 'appointments' ||
    s === 'services' ||
    s === 'staff' ||
    s === 'schedule' ||
    s === 'profile' ||
    s === 'clients' ||
    s === 'personnel'
  )
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
    case 'personnel':
      return <PersonnelView />
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
  const staffDetailMatch = useMatch('/dashboard/:salonId/staff/:staffId')
  const narrow = useMediaQuery('(max-width:899px)')
  const [drawer, setDrawer] = useState(false)
  const [onboardingStatus, setOnboardingStatus] = useState<{
    salonId: string
    completed: boolean | undefined
  } | null>(null)
  const theme = useTheme()
  const dashboard = theme.palette.dashboard

  const { salonId } = useParams<{ salonId: string }>()

  const section = useMemo((): Section => {
    if (staffDetailMatch) return 'staff'
    const s = searchParams.get('section')
    if (isSection(s)) return s
    return 'overview'
  }, [staffDetailMatch, searchParams])

  useEffect(() => {
    if (!getStoredAccessToken()) {
      navigate(ROUTES.LOGIN, { replace: true, state: { from: ROUTES.DASHBOARD } })
    }
  }, [navigate])

  // Validate membership + set active salon
  useEffect(() => {
    if (!user || !salonId) return
    const memberships = user.effectiveRoles?.salonMemberships ?? []
    const membership = memberships.find(m => m.salonId === salonId)
    if (!membership) {
      if (memberships.length > 0) {
        navigate(dashboardPath(memberships[0].salonId), { replace: true })
      } else {
        navigate(`${ROUTES.ME}?tab=general`, { replace: true })
      }
      return
    }
    setActiveSalonId(salonId)
  }, [user, salonId, navigate])

  const role = useMemo(() => {
    const memberships = user?.effectiveRoles?.salonMemberships ?? []
    return memberships.find(m => m.salonId === salonId)?.role
  }, [user, salonId])

  const prevSalonRef = useRef<string | undefined>(salonId)
  useEffect(() => {
    if (prevSalonRef.current && prevSalonRef.current !== salonId) {
      dispatch(rtkApi.util.resetApiState())
    }
    prevSalonRef.current = salonId
  }, [salonId, dispatch])

  useEffect(() => {
    if (!salonId) return
    let cancelled = false
    setActiveSalonId(salonId)
    void (async () => {
      try {
        const profile = await fetchSalonProfile(salonId)
        if (!cancelled) {
          setOnboardingStatus({ salonId, completed: profile.onboardingCompleted })
        }
      } catch {
        // ignore profile preload failures here; page content handles its own errors
      }
    })()
    return () => {
      cancelled = true
    }
  }, [salonId])

  useEffect(() => {
    if (!user) return
    if (user.role !== 'salon_owner') return
    if (onboardingStatus?.salonId !== salonId) return
    if (onboardingStatus.completed === false) {
      navigate(salonId ? `/dashboard/${salonId}/onboarding` : ROUTES.ME, { replace: true })
    }
  }, [navigate, onboardingStatus, user, salonId])

  const headerTitle = useMemo(() => {
    if (staffDetailMatch) return 'Мастер'
    return TITLES[section]
  }, [staffDetailMatch, section])

  const salonRoleSubtitle = useMemo(() => salonRoleLabelRu(role), [role])

  const visibleNav = useMemo(() => {
    let items = NAV
    if (role !== 'owner') {
      items = items.filter(item => item.id !== 'personnel')
    }
    if (role === 'receptionist') {
      return items.filter(item => ['overview', 'calendar', 'appointments', 'clients'].includes(item.id))
    }
    if (role === 'admin') {
      return items.filter(item => item.id !== 'profile')
    }
    return items
  }, [role])

  function goSection(id: Section) {
    if (!salonId) return
    if (id === 'overview') {
      navigate(dashboardPath(salonId))
      return
    }
    navigate(dashboardSectionPath(salonId, id))
  }

  const content = (
    <Routes>
      <Route index element={<DashboardMainContent section={section} />} />
      <Route path="staff/:staffId" element={<StaffTabsView />} />
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
        {visibleNav.map(item => {
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
            <Typography sx={{ fontSize: 11, color: dashboard.muted }}>{salonRoleSubtitle}</Typography>
          </Box>
        </Box>
        <Menu anchorEl={userMenuAnchor} open={!!userMenuAnchor} onClose={() => setUserMenuAnchor(null)}>
          <MenuItem onClick={() => { setUserMenuAnchor(null); navigate(ROUTES.HOME) }}>Главная</MenuItem>
          <MenuItem onClick={() => { setUserMenuAnchor(null); navigate(ROUTES.ME) }}>Профиль</MenuItem>
          {salonId ? (
            <MenuItem onClick={() => { setUserMenuAnchor(null); navigate(dashboardPath(salonId)) }}>Обзор салона</MenuItem>
          ) : null}
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
