import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Drawer,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '@shared/config/routes'
import { getStoredAccessToken } from '@shared/api/authApi'
import { useAppSelector } from '@app/store'
import { selectUser } from '@features/auth-by-phone/model/authSlice'
import { useThemeMode } from '@shared/theme'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { ChipMultiSelect } from '@pages/dashboard/ui/components/formComponents'
import { STAFF_COLOR_SWATCHES, SPECIALIZATION_PRESETS } from '@shared/api/dashboardApi'
import {
  acceptMasterInvite,
  declineMasterInvite,
  getMyMasterAppointments,
  getMyMasterInvites,
  getMyMasterProfile,
  getMyMasterSalons,
  updateMyMasterProfile,
  type MasterCabinetProfile,
  type MasterDashboardAppointment,
  type MasterInviteDTO,
  type MasterSalonMembershipDTO,
} from '@shared/api/masterDashboardApi'
import { salonPath } from '@shared/config/routes'

type Section = 'profile' | 'invites' | 'salons' | 'appointments'

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'profile', label: 'Профиль', icon: '👤' },
  { id: 'invites', label: 'Приглашения', icon: '✉️' },
  { id: 'salons', label: 'Салоны', icon: '🏪' },
  { id: 'appointments', label: 'Записи', icon: '📋' },
]

const TITLES: Record<Section, string> = {
  profile: 'Профиль',
  invites: 'Приглашения',
  salons: 'Мои салоны',
  appointments: 'Записи',
}

function isSection(s: string | null): s is Section {
  return s === 'profile' || s === 'invites' || s === 'salons' || s === 'appointments'
}

function pickColorFromSalonId(salonId: string): string {
  let h = 0
  for (let i = 0; i < salonId.length; i++) h = (h * 31 + salonId.charCodeAt(i)) >>> 0
  return STAFF_COLOR_SWATCHES[h % STAFF_COLOR_SWATCHES.length] ?? '#C4A484'
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '?'
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase()
  return (p[0]![0] + p[1]![0]).toUpperCase()
}

function formatApptRange(startsAt: string, endsAt: string): string {
  const s = new Date(startsAt)
  const e = new Date(endsAt)
  const d = s.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
  const ts = s.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const te = e.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return `${d}, ${ts}–${te}`
}

function ProfileSection({
  profile,
  salons,
  onSaved,
}: {
  profile: MasterCabinetProfile
  salons: MasterSalonMembershipDTO[]
  onSaved: (p: MasterCabinetProfile) => void
}) {
  const d = useDashboardPalette()
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [specs, setSpecs] = useState<string[]>(profile.specializations ?? [])
  const [years, setYears] = useState(
    profile.yearsExperience != null ? String(profile.yearsExperience) : '',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDisplayName(profile.displayName)
    setBio(profile.bio ?? '')
    setSpecs(profile.specializations ?? [])
    setYears(profile.yearsExperience != null ? String(profile.yearsExperience) : '')
  }, [profile])

  const accent = salons[0] ? pickColorFromSalonId(salons[0].salonId) : d.accent

  async function onSave() {
    setSaving(true)
    setError(null)
    try {
      const y = years.trim() === '' ? undefined : Number(years)
      const out = await updateMyMasterProfile({
        displayName: displayName.trim(),
        bio: bio.trim() === '' ? null : bio,
        specializations: specs,
        yearsExperience: Number.isFinite(y as number) ? (y as number) : undefined,
        avatarUrl: profile.avatarUrl ?? null,
      })
      onSaved(out)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            bgcolor: accent,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials(displayName || profile.displayName)}
        </Box>
        <Box>
          <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 26, color: d.text }}>
            {displayName || profile.displayName}
          </Typography>
          <Typography sx={{ fontSize: 13, color: d.muted }}>Публичный профиль мастера</Typography>
        </Box>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        label="Отображаемое имя"
        value={displayName}
        onChange={e => setDisplayName(e.target.value)}
        fullWidth
        sx={{ '& .MuiOutlinedInput-root': { bgcolor: d.card } }}
      />
      <TextField
        label="О себе"
        value={bio}
        onChange={e => setBio(e.target.value)}
        fullWidth
        multiline
        minRows={3}
        inputProps={{ maxLength: 300 }}
        helperText={`${bio.length}/300`}
        sx={{ '& .MuiOutlinedInput-root': { bgcolor: d.card } }}
      />
      <Box>
        <Typography sx={{ fontSize: 12, color: d.muted, mb: 0.5 }}>Специализации</Typography>
        <ChipMultiSelect
          items={SPECIALIZATION_PRESETS.map(p => ({ id: p.value, label: p.label }))}
          selected={specs}
          onChange={setSpecs}
          getLabel={item => String((item as unknown as { label: string }).label)}
          getId={item => item.id}
        />
        ``
      </Box>
      <TextField
        label="Стаж (лет)"
        type="number"
        value={years}
        onChange={e => setYears(e.target.value)}
        fullWidth
        inputProps={{ min: 0, max: 60 }}
        sx={{ '& .MuiOutlinedInput-root': { bgcolor: d.card } }}
      />
      <TextField
        label="Телефон"
        value={profile.phoneE164}
        fullWidth
        disabled
        helperText="Используется для входа"
        sx={{ '& .MuiOutlinedInput-root': { bgcolor: d.cardAlt } }}
      />
      <Button
        variant="contained"
        onClick={() => void onSave()}
        disabled={saving}
        sx={{ alignSelf: 'flex-start', bgcolor: d.accent }}
      >
        {saving ? 'Сохранение…' : 'Сохранить'}
      </Button>
    </Stack>
  )
}

function InvitesSection({ onChanged }: { onChanged: () => void }) {
  const d = useDashboardPalette()
  const [rows, setRows] = useState<MasterInviteDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await getMyMasterInvites())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function accept(id: string) {
    setBusy(id)
    try {
      await acceptMasterInvite(id)
      await load()
      onChanged()
    } finally {
      setBusy(null)
    }
  }

  async function decline(id: string) {
    if (!window.confirm('Отклонить приглашение?')) return
    setBusy(id)
    try {
      await declineMasterInvite(id)
      await load()
      onChanged()
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return <Typography sx={{ color: d.muted }}>Загрузка…</Typography>
  }
  if (rows.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 4, bgcolor: d.card, border: `1px solid ${d.borderSubtle}` }}>
        <Typography sx={{ color: d.muted }}>Нет входящих приглашений</Typography>
      </Paper>
    )
  }

  return (
    <Stack spacing={2}>
      {rows.map(r => (
        <Paper
          key={r.salonMasterId}
          elevation={0}
          sx={{ p: 2.5, bgcolor: d.card, border: `1px solid ${d.borderSubtle}` }}
        >
          <Typography sx={{ fontWeight: 600, color: d.text }}>{r.salonName}</Typography>
          {r.salonAddress && (
            <Typography sx={{ fontSize: 14, color: d.muted, mt: 0.5 }}>{r.salonAddress}</Typography>
          )}
          <Typography sx={{ fontSize: 12, color: d.muted, mt: 1 }}>
            {new Date(r.createdAt).toLocaleString('ru-RU')}
          </Typography>
          <Stack direction="row" spacing={1} mt={2}>
            <Button
              variant="contained"
              size="small"
              disabled={busy === r.salonMasterId}
              onClick={() => void accept(r.salonMasterId)}
            >
              Принять
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={busy === r.salonMasterId}
              onClick={() => void decline(r.salonMasterId)}
            >
              Отклонить
            </Button>
          </Stack>
        </Paper>
      ))}
    </Stack>
  )
}

function SalonsSection() {
  const d = useDashboardPalette()
  const [rows, setRows] = useState<MasterSalonMembershipDTO[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      try {
        setRows(await getMyMasterSalons())
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <Typography sx={{ color: d.muted }}>Загрузка…</Typography>
  if (rows.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 4, bgcolor: d.card, border: `1px solid ${d.borderSubtle}` }}>
        <Typography sx={{ color: d.muted }}>Нет активных салонов</Typography>
      </Paper>
    )
  }

  return (
    <Stack spacing={2}>
      {rows.map(r => (
        <Paper
          key={r.salonMasterId}
          elevation={0}
          sx={{ p: 2.5, bgcolor: d.card, border: `1px solid ${d.borderSubtle}` }}
        >
          <Typography sx={{ fontWeight: 600, color: d.text }}>{r.salonName}</Typography>
          {r.salonAddress && (
            <Typography sx={{ fontSize: 14, color: d.muted, mt: 0.5 }}>{r.salonAddress}</Typography>
          )}
          {r.joinedAt && (
            <Typography sx={{ fontSize: 12, color: d.muted, mt: 1 }}>
              С {new Date(r.joinedAt).toLocaleDateString('ru-RU')}
            </Typography>
          )}
          <Button
            component={RouterLink}
            to={salonPath(r.salonId)}
            variant="text"
            size="small"
            sx={{ mt: 1, p: 0, minWidth: 0, textTransform: 'none', fontSize: 14 }}
          >
            Открыть страницу
          </Button>
        </Paper>
      ))}
    </Stack>
  )
}

const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  { value: 'pending', label: 'Ожидает' },
  { value: 'confirmed', label: 'Подтверждена' },
  { value: 'completed', label: 'Завершена' },
  { value: 'cancelled_by_client', label: 'Отмена клиентом' },
  { value: 'cancelled_by_salon', label: 'Отмена салоном' },
  { value: 'no_show', label: 'Неявка' },
]

function AppointmentsSection() {
  const d = useDashboardPalette()
  const [items, setItems] = useState<MasterDashboardAppointment[]>([])
  const [total, setTotal] = useState(0)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getMyMasterAppointments({
        from: from || undefined,
        to: to || undefined,
        status: status || undefined,
      })
      setItems(res.items)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }, [from, to, status])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="С даты"
          type="date"
          size="small"
          value={from}
          onChange={e => setFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ flex: 1, '& .MuiOutlinedInput-root': { bgcolor: d.card } }}
        />
        <TextField
          label="По дату"
          type="date"
          size="small"
          value={to}
          onChange={e => setTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ flex: 1, '& .MuiOutlinedInput-root': { bgcolor: d.card } }}
        />
        <TextField
          select
          label="Статус"
          size="small"
          value={status}
          onChange={e => setStatus(e.target.value)}
          sx={{ minWidth: 180, '& .MuiOutlinedInput-root': { bgcolor: d.card } }}
        >
          {STATUS_OPTIONS.map(o => (
            <MenuItem key={o.value || 'all'} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="outlined" onClick={() => void load()} sx={{ alignSelf: { sm: 'center' } }}>
          Обновить
        </Button>
      </Stack>
      <Typography sx={{ fontSize: 13, color: d.muted }}>Всего в выборке: {total}</Typography>
      {loading ? (
        <Typography sx={{ color: d.muted }}>Загрузка…</Typography>
      ) : items.length === 0 ? (
        <Typography sx={{ color: d.muted }}>Нет записей</Typography>
      ) : (
        <Table
          size="small"
          sx={{
            bgcolor: d.card,
            border: `1px solid ${d.borderSubtle}`,
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell>Дата и время</TableCell>
              <TableCell>Салон</TableCell>
              <TableCell>Услуга</TableCell>
              <TableCell>Клиент</TableCell>
              <TableCell>Статус</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map(a => (
              <TableRow key={a.id}>
                <TableCell>{formatApptRange(a.startsAt, a.endsAt)}</TableCell>
                <TableCell>{a.salonName}</TableCell>
                <TableCell>{a.serviceName}</TableCell>
                <TableCell>{a.clientLabel}</TableCell>
                <TableCell>{a.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  )
}

export function MasterDashboardPage() {
  const navigate = useNavigate()
  const user = useAppSelector(selectUser)
  const { mode, setMode } = useThemeMode()
  const [searchParams, setSearchParams] = useSearchParams()
  const narrow = useMediaQuery('(max-width:899px)')
  const [drawer, setDrawer] = useState(false)
  const theme = useTheme()
  const dashboard = theme.palette.dashboard
  const d = useDashboardPalette()

  const section = useMemo((): Section => {
    const s = searchParams.get('section')
    if (isSection(s)) return s
    return 'profile'
  }, [searchParams])

  const [profile, setProfile] = useState<MasterCabinetProfile | null>(null)
  const [salons, setSalons] = useState<MasterSalonMembershipDTO[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refreshSalons = useCallback(async () => {
    try {
      setSalons(await getMyMasterSalons())
    } catch {
      /* ignore for header color */
    }
  }, [])

  useEffect(() => {
    if (!getStoredAccessToken()) {
      navigate(ROUTES.LOGIN, { replace: true, state: { from: ROUTES.MASTER_DASHBOARD } })
    }
  }, [navigate])

  useEffect(() => {
    if (!getStoredAccessToken()) return
    if (user === null) return
    const canMaster = !!user.effectiveRoles?.isMaster || !!user.masterProfileId
    if (!canMaster) {
      navigate(`${ROUTES.ME}?tab=general`, { replace: true })
    }
  }, [user, navigate])

  useEffect(() => {
    if (!user?.masterProfileId) return
    void (async () => {
      setLoadError(null)
      try {
        const [p, s] = await Promise.all([getMyMasterProfile(), getMyMasterSalons()])
        setProfile(p)
        setSalons(s)
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Ошибка загрузки')
      }
    })()
  }, [user?.masterProfileId, tick])

  function goSection(id: Section) {
    if (id === 'profile') {
      navigate(ROUTES.MASTER_DASHBOARD)
      return
    }
    navigate(`${ROUTES.MASTER_DASHBOARD}?section=${id}`)
  }

  const showOnboardingBanner = useMemo(() => {
    if (!profile) return false
    const bioOk = profile.bio != null && profile.bio.trim().length > 0
    const specOk = (profile.specializations?.length ?? 0) > 0
    return !(bioOk && specOk)
  }, [profile])

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
          Кабинет мастера
        </Typography>
      </Box>
      <Stack sx={{ flex: 1, py: 1 }}>
        {NAV.map(item => {
          const active = section === item.id
          return (
            <Box
              key={item.id}
              onClick={() => {
                goSection(item.id)
                setDrawer(false)
              }}
              sx={{
                px: 2.5,
                py: 1.25,
                cursor: 'pointer',
                bgcolor: active ? dashboard.card : 'transparent',
                borderLeft: active ? `3px solid ${dashboard.accent}` : '3px solid transparent',
              }}
            >
              <Typography sx={{ fontSize: 14, color: active ? dashboard.text : dashboard.muted }}>
                <Box component="span" sx={{ mr: 1 }}>
                  {item.icon}
                </Box>
                {item.label}
              </Typography>
            </Box>
          )
        })}
      </Stack>
      <Box sx={{ p: 2, borderTop: `1px solid ${dashboard.borderSubtle}` }}>
        <Typography
          onClick={() => navigate(ROUTES.HOME)}
          sx={{ fontSize: 13, color: dashboard.muted, cursor: 'pointer' }}
        >
          ← На сайт
        </Typography>
      </Box>
    </Box>
  )

  const main = (() => {
    if (loadError) {
      return <Alert severity="error">{loadError}</Alert>
    }
    if (!profile) {
      return <Typography sx={{ color: d.muted }}>Загрузка…</Typography>
    }
    switch (section) {
      case 'profile':
        return (
          <ProfileSection
            profile={profile}
            salons={salons}
            onSaved={p => {
              setProfile(p)
              void refreshSalons()
            }}
          />
        )
      case 'invites':
        return (
          <InvitesSection
            onChanged={() => {
              setTick(x => x + 1)
              void refreshSalons()
            }}
          />
        )
      case 'salons':
        return <SalonsSection />
      case 'appointments':
        return <AppointmentsSection />
      default:
        return null
    }
  })()

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: dashboard.page, display: 'flex' }}>
      {!narrow && sidebar}
      {narrow && (
        <Drawer
          anchor="left"
          open={drawer}
          onClose={() => setDrawer(false)}
          PaperProps={{ sx: { bgcolor: dashboard.sidebar } }}
        >
          {sidebar}
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
            {TITLES[section]}
          </Typography>
          <Switch
            size="small"
            checked={mode === 'dark'}
            onChange={(_, checked) => setMode(checked ? 'dark' : 'light')}
            inputProps={{ 'aria-label': 'Toggle dashboard theme' }}
            sx={{
              ml: 'auto',
              '& .MuiSwitch-track': { bgcolor: dashboard.border },
              '& .MuiSwitch-thumb': {
                bgcolor: mode === 'dark' ? dashboard.accent : dashboard.mutedDark,
              },
            }}
          />
        </Box>
        <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, overflow: 'auto' }}>
          {showOnboardingBanner && section !== 'profile' && (
            <Alert
              severity="info"
              sx={{ mb: 2, cursor: 'pointer' }}
              onClick={() => {
                setSearchParams({ section: 'profile' })
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              Заполните профиль, чтобы салоны могли вас найти — перейти к форме
            </Alert>
          )}
          {showOnboardingBanner && section === 'profile' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Заполните профиль, чтобы салоны могли вас найти
            </Alert>
          )}
          {main}
        </Box>
      </Box>
    </Box>
  )
}
