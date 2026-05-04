import { useEffect, useMemo, useRef } from 'react'
import { AppBar, Toolbar, Typography, Button, Box, Stack, Switch } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ROUTES, dashboardPath } from '@shared/config/routes'
import { getActiveSalonId } from '@shared/lib/activeSalon'
import { useBrandColors, useThemeMode } from '@shared/theme'
import { useAppDispatch, useAppSelector } from '@app/store'
import { selectIsAuthenticated, selectUser } from '@features/auth-by-phone/model/authSlice'
import {
  openCityPicker,
  selectActiveCity,
  selectAddressLevel,
  selectAddressLine,
  selectDeviceLocation,
  setAddressLevel,
  setAddressLine,
} from '@features/location/model/locationSlice'
import { reverseGeocode } from '@shared/api/geoApi'
import { UserMenu } from '@widgets/user-menu/ui/UserMenu'

export function NavBar() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { mode, setMode } = useThemeMode()
  const colors = useBrandColors()
  const dispatch = useAppDispatch()
  const city = useAppSelector(selectActiveCity)
  const authed = useAppSelector(selectIsAuthenticated)
  const user = useAppSelector(selectUser)
  const isAdmin = user?.role === 'admin'
  const device = useAppSelector(selectDeviceLocation)
  const addressLine = useAppSelector(selectAddressLine)
  const addressLevel = useAppSelector(selectAddressLevel)

  const cacheRef = useRef<
    Map<string, { formatted: string; level: 'address' | 'district' | 'city' }>
  >(new Map())

  useEffect(() => {
    if (!device.ready || device.source !== 'gps') {
      dispatch(setAddressLine(null))
      dispatch(setAddressLevel(null))
      return
    }
    const key = `${device.lat.toFixed(4)}_${device.lon.toFixed(4)}`
    const cached = cacheRef.current.get(key)
    if (cached?.level === 'address') {
      dispatch(setAddressLine(cached.formatted || null))
      dispatch(setAddressLevel(cached.level))
      return
    }

    const fetchAddress = () => {
      void (async () => {
        try {
          const r = await reverseGeocode(device.lat, device.lon)
          const line = (r.formatted ?? '').trim()
          if (line && r.level === 'address') {
            cacheRef.current.set(key, { formatted: line, level: r.level })
          }
          dispatch(setAddressLine(line ? line : null))
          dispatch(setAddressLevel(r.level))
        } catch {
          dispatch(setAddressLine(null))
          dispatch(setAddressLevel(null))
        }
      })()
    }

    const delayed = window.setTimeout(fetchAddress, 450)
    const periodic = window.setInterval(fetchAddress, 45_000)
    return () => {
      window.clearTimeout(delayed)
      window.clearInterval(periodic)
    }
  }, [dispatch, device.ready, device.source, device.lat, device.lon])

  const salonDashboardTarget = useMemo(() => {
    const fromLs = getActiveSalonId()
    const first = user?.effectiveRoles?.salonMemberships?.[0]?.salonId
    return fromLs ?? first ?? null
  }, [user?.effectiveRoles?.salonMemberships])

  const locationText = useMemo(() => {
    if (device.ready && device.source === 'gps' && addressLine && addressLevel === 'address') {
      return addressLine
    }
    if (device.ready && device.source === 'gps') {
      return t('nav.addressRefining')
    }
    return city?.cityName ?? t('nav.pickCity')
  }, [device.ready, device.source, addressLine, addressLevel, city?.cityName, t])

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: colors.white,
        borderBottom: `1px solid ${colors.border}`,
        height: 58,
        justifyContent: 'center',
      }}
    >
      <Toolbar
        sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 }, minHeight: '58px !important' }}
      >
        {/* Logo */}
        <Typography
          sx={{
            fontFamily: "'Fraunces', serif",
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: '-0.5px',
            color: colors.ink,
            cursor: 'pointer',
            flexShrink: 0,
            mr: 4,
          }}
          onClick={() => navigate(ROUTES.HOME)}
        >
          beauti
          <Box component="span" sx={{ color: colors.accent }}>
            ca
          </Box>
        </Typography>

        {/* Nav links */}
        <Stack
          component="ul"
          direction="row"
          gap={3}
          sx={{ listStyle: 'none', m: 0, p: 0, display: { xs: 'none', md: 'flex' } }}
        >
          {[
            { label: t('nav.services'), onClick: undefined },
            {
              label: t('nav.forBusinesses'),
              onClick: () =>
                salonDashboardTarget ? navigate(dashboardPath(salonDashboardTarget)) : navigate(ROUTES.JOIN),
            },
            { label: t('nav.forMasters'), onClick: () => navigate(ROUTES.FOR_MASTERS) },
            { label: t('nav.giftCards'), onClick: undefined },
          ].map(({ label, onClick }) => (
            <Box
              key={label}
              component="li"
              onClick={onClick}
              sx={{
                fontSize: 13,
                color: colors.inkSoft,
                cursor: onClick ? 'pointer' : 'default',
                fontWeight: 400,
                transition: 'color 0.15s',
                '&:hover': { color: colors.ink },
              }}
            >
              {label}
            </Box>
          ))}
        </Stack>

        {/* Right side */}
        <Stack direction="row" gap={1} alignItems="center" sx={{ ml: 'auto' }}>
          {/* Dark mode toggle — compact, no label */}
          <Switch
            size="small"
            checked={mode === 'dark'}
            onChange={(_, checked) => setMode(checked ? 'dark' : 'light')}
            inputProps={{ 'aria-label': t('theme.darkMode') }}
            sx={{
              '& .MuiSwitch-track': { bgcolor: colors.border },
              '& .MuiSwitch-thumb': { bgcolor: mode === 'dark' ? colors.accent : colors.inkSoft },
            }}
          />

          {/* Location pill — click opens city picker */}
          <Button
            onClick={() => dispatch(openCityPicker())}
            sx={{
              fontSize: 12,
              fontWeight: 400,
              color: colors.inkSoft,
              bgcolor: colors.border,
              borderRadius: 100,
              px: '14px',
              py: '7px',
              minWidth: 0,
              textTransform: 'none',
              whiteSpace: 'nowrap',
              maxWidth: { xs: 140, sm: 220 },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: 'block',
              lineHeight: 1.4,
              '&:hover': { bgcolor: colors.borderLight, color: colors.ink },
            }}
          >
            📍 {locationText}
          </Button>

          {authed && user ? (
            <>
              {isAdmin && (
                <Button
                  variant="text"
                  onClick={() => navigate(ROUTES.ADMIN_CLAIMS)}
                  sx={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: colors.ink,
                    px: 1.5,
                    py: 1,
                    borderRadius: 100,
                    textTransform: 'none',
                    '&:hover': { bgcolor: colors.hoverOverlay },
                  }}
                >
                  Заявки
                </Button>
              )}
              <UserMenu />
            </>
          ) : (
            <>
              <Button
                variant="text"
                onClick={() => navigate(ROUTES.LOGIN)}
                sx={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: colors.ink,
                  px: 1.5,
                  py: 1,
                  borderRadius: 100,
                  textTransform: 'none',
                  '&:hover': { bgcolor: colors.hoverOverlay },
                }}
              >
                {t('nav.login')}
              </Button>

              {/* <Button
                variant="contained"
                onClick={() => navigate(ROUTES.DASHBOARD)}
                sx={{
                  fontSize: 13,
                  fontWeight: 600,
                  bgcolor: colors.accent,
                  color: colors.onAccent,
                  px: '20px',
                  py: '8px',
                  borderRadius: 100,
                  textTransform: 'none',
                  boxShadow: 'none',
                  display: { xs: 'none', sm: 'flex' },
                  '&:hover': { bgcolor: colors.accent, filter: 'brightness(1.08)', boxShadow: 'none' },
                }}
              >
                {t('nav.signUp')}
              </Button> */}
            </>
          )}
        </Stack>
      </Toolbar>
    </AppBar>
  )
}
