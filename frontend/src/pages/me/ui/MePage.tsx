import { useEffect, useState } from 'react'
import {
  Alert,
  Avatar,
  Badge,
  Box,
  CircularProgress,
  Drawer,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@app/store'
import {
  loadProfile,
  selectProfile,
  selectProfileError,
  selectProfileStatus,
} from '@features/edit-profile/model/profileSlice'
import { logout, selectUser } from '@features/auth-by-phone/model/authSlice'
import { ROUTES, dashboardPath } from '@shared/config/routes'
import { GeneralSection } from './sections/GeneralSection'
import { SecuritySection } from './sections/SecuritySection'
import { DangerSection } from './sections/DangerSection'
import { SalonInvitesSection } from './sections/SalonInvitesSection'

type TabKey = 'general' | 'security' | 'danger' | 'invites'

function asTab(value: string | null): TabKey {
  if (value === 'security' || value === 'danger' || value === 'invites') return value
  return 'general'
}

function initials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

const NAV: { id: TabKey; label: string; icon: string }[] = [
  { id: 'general', label: 'Общее', icon: '👤' },
  { id: 'security', label: 'Безопасность', icon: '🔐' },
  { id: 'invites', label: 'Приглашения', icon: '✉️' },
  { id: 'danger', label: 'Опасная зона', icon: '⚠️' },
]

const TITLES: Record<TabKey, string> = {
  general: 'Профиль',
  security: 'Безопасность',
  invites: 'Приглашения',
  danger: 'Опасная зона',
}

export function MePage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector(selectUser)
  const profile = useAppSelector(selectProfile)
  const status = useAppSelector(selectProfileStatus)
  const error = useAppSelector(selectProfileError)
  const [params, setParams] = useSearchParams()
  const [drawer, setDrawer] = useState(false)
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null)
  const theme = useTheme()
  const dashboard = theme.palette.dashboard
  const narrow = useMediaQuery('(max-width:899px)')

  const currentTab = asTab(params.get('tab'))
  const pendingInvites = profile?.effectiveRoles?.pendingInvites ?? 0
  const memberships =
    profile?.effectiveRoles?.salonMemberships ?? user?.effectiveRoles?.salonMemberships ?? []
  const canMaster = !!(
    profile?.effectiveRoles?.isMaster ||
    user?.effectiveRoles?.isMaster ||
    user?.masterProfileId
  )

  useEffect(() => {
    if (!profile && status === 'idle') {
      void dispatch(loadProfile())
    }
  }, [dispatch, profile, status])

  const nav = (
    <Box
      sx={{
        width: 220,
        height: '100vh',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: dashboard.sidebar,
        borderRight: `1px solid ${dashboard.borderSubtle}`,
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2,
          borderBottom: `1px solid ${dashboard.borderSubtle}`,
          cursor: 'pointer',
        }}
        onClick={() => navigate(ROUTES.HOME)}
      >
        <Typography
          sx={{
            fontFamily: "'Fraunces', serif",
            fontSize: 18,
            fontWeight: 600,
            color: dashboard.text,
          }}
        >
          beauti
          <Box component="span" sx={{ color: dashboard.accent }}>
            ca
          </Box>
        </Typography>
        <Typography sx={{ fontSize: 11, color: dashboard.muted, mt: 0.5 }}>
          Кабинет пользователя
        </Typography>
      </Box>

      <Box component="nav" sx={{ flex: 1, minHeight: 0, py: 1, overflow: 'auto' }}>
        {NAV.map(item => {
          const active = item.id === currentTab
          return (
            <Box
              key={item.id}
              onClick={() => {
                setParams({ tab: item.id })
                setDrawer(false)
              }}
              sx={{
                mx: 1,
                px: 1.5,
                py: 1,
                borderRadius: '10px',
                cursor: 'pointer',
                color: active ? dashboard.onAccent : dashboard.muted,
                bgcolor: active ? dashboard.accent : 'transparent',
                fontWeight: active ? 600 : 400,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                '&:hover': {
                  bgcolor: active ? dashboard.accent : dashboard.navHover,
                  color: active ? dashboard.onAccent : dashboard.text,
                },
              }}
            >
              <span>{item.icon}</span>
              {item.id === 'invites' && pendingInvites > 0 ? (
                <Badge color="error" badgeContent={pendingInvites} max={99}>
                  {item.label}
                </Badge>
              ) : (
                item.label
              )}
            </Box>
          )
        })}
      </Box>

      <Box sx={{ px: 1, py: 2, borderTop: `1px solid ${dashboard.borderSubtle}`, mt: 'auto' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            // justifyContent: 'flex-end',
            gap: 1,
            cursor: 'pointer',
            width: '100%',
            textAlign: 'right',
          }}
          onClick={e => setUserMenuAnchor(e.currentTarget as HTMLElement)}
        >
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: dashboard.accent,
              color: dashboard.onAccent,
              fontWeight: 700,
            }}
          >
            {initials(profile?.displayName ?? user?.displayName)}
          </Avatar>
          <Box>
            <Typography sx={{ fontSize: 13, color: dashboard.text, fontWeight: 600 }}>
              {(profile?.displayName ?? user?.displayName)?.split(' ')[0] || 'Пользователь'}
            </Typography>
            <Typography sx={{ fontSize: 11, color: dashboard.muted }}>Учетная запись</Typography>
          </Box>
        </Box>
        <Menu
          anchorEl={userMenuAnchor}
          open={!!userMenuAnchor}
          onClose={() => setUserMenuAnchor(null)}
        >
          <MenuItem
            onClick={() => {
              setUserMenuAnchor(null)
              navigate(ROUTES.HOME)
            }}
          >
            Главная
          </MenuItem>
          <MenuItem
            onClick={() => {
              setUserMenuAnchor(null)
              navigate(`${ROUTES.ME}?tab=general`)
            }}
          >
            Профиль
          </MenuItem>
          {memberships.length === 1 && (
            <MenuItem
              onClick={() => {
                setUserMenuAnchor(null)
                navigate(dashboardPath(memberships[0].salonId))
              }}
            >
              Кабинет салона
            </MenuItem>
          )}
          {memberships.length > 1 &&
            memberships.map(m => (
              <MenuItem
                key={m.salonId}
                onClick={() => {
                  setUserMenuAnchor(null)
                  navigate(dashboardPath(m.salonId))
                }}
              >
                {m.salonName || 'Салон'}
              </MenuItem>
            ))}
          {canMaster && (
            <MenuItem
              onClick={() => {
                setUserMenuAnchor(null)
                navigate(ROUTES.MASTER_DASHBOARD)
              }}
            >
              Кабинет мастера
            </MenuItem>
          )}
          <MenuItem
            onClick={() => {
              setUserMenuAnchor(null)
              void dispatch(logout())
            }}
          >
            Выйти
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: dashboard.page, display: 'flex' }}>
      {!narrow && nav}
      {narrow && (
        <Drawer
          anchor="left"
          open={drawer}
          onClose={() => setDrawer(false)}
          PaperProps={{ sx: { bgcolor: dashboard.sidebar, width: 220, height: '100vh' } }}
        >
          {nav}
        </Drawer>
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
          <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: dashboard.text }}>
            {TITLES[currentTab]}
          </Typography>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', px: { xs: 2, md: 3 }, py: 3 }}>
          {status === 'loading' && (
            <Stack alignItems="center" sx={{ py: 8 }}>
              <CircularProgress />
            </Stack>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {status !== 'loading' && (
            <>
              {currentTab === 'general' && <GeneralSection key={profile?.updatedAt ?? 'empty'} />}
              {currentTab === 'security' && <SecuritySection />}
              {currentTab === 'invites' && <SalonInvitesSection />}
              {currentTab === 'danger' && <DangerSection />}
            </>
          )}
        </Box>
      </Box>
    </Box>
  )
}
