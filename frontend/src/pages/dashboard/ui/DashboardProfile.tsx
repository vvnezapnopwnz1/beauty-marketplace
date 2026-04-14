import { useCallback, useEffect, useState } from 'react'
import { Box, Typography, Button, Stack, TextField, Switch, FormControlLabel, Alert, FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import { fetchSalonProfile, putSalonProfile, type SalonProfile } from '@shared/api/dashboardApi'
import { SALON_TYPE_OPTIONS } from '@pages/dashboard/lib/salonTypeOptions'
import { mocha } from '@pages/dashboard/theme/mocha'

export function DashboardProfile() {
  const [p, setP] = useState<SalonProfile | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setP(await fetchSalonProfile())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(t)
  }, [load])

  async function save() {
    if (!p) return
    setOk(null)
    try {
      const next = await putSalonProfile({
        nameOverride: p.nameOverride,
        description: p.description,
        phonePublic: p.phonePublic,
        categoryId: p.categoryId,
        salonType: p.salonType,
        businessType: p.businessType,
        onlineBookingEnabled: p.onlineBookingEnabled,
        addressOverride: p.addressOverride,
        address: p.address,
        district: p.district,
        timezone: p.timezone,
      })
      setP(next)
      setOk('Сохранено')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  if (!p) return <Typography sx={{ color: mocha.muted }}>Загрузка…</Typography>

  return (
    <Box sx={{ maxWidth: 520 }}>
      {err && <Alert sx={{ mb: 2 }} severity="error">{err}</Alert>}
      {ok && <Alert sx={{ mb: 2 }} severity="success">{ok}</Alert>}
      <Stack spacing={2}>
        <TextField label="Название (override)" value={p.nameOverride ?? ''} onChange={e => setP({ ...p, nameOverride: e.target.value || null })} fullWidth />
        <TextField label="Описание" value={p.description ?? ''} onChange={e => setP({ ...p, description: e.target.value || null })} fullWidth multiline minRows={2} />
        <TextField label="Телефон" value={p.phonePublic ?? ''} onChange={e => setP({ ...p, phonePublic: e.target.value || null })} fullWidth />
        <TextField label="Категория маркетплейса (legacy)" value={p.categoryId ?? ''} onChange={e => setP({ ...p, categoryId: e.target.value || null })} fullWidth />
        <FormControl fullWidth>
          <InputLabel id="salon-type-label">Тип салона</InputLabel>
          <Select
            labelId="salon-type-label"
            label="Тип салона"
            value={p.salonType ?? ''}
            onChange={e => setP({ ...p, salonType: e.target.value === '' ? null : String(e.target.value) })}
          >
            <MenuItem value="">
              <em>Не выбран</em>
            </MenuItem>
            {SALON_TYPE_OPTIONS.map(o => (
              <MenuItem key={o.slug} value={o.slug}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField label="Тип (venue / individual)" value={p.businessType ?? ''} onChange={e => setP({ ...p, businessType: e.target.value || null })} fullWidth />
        <TextField label="Адрес" value={p.address ?? ''} onChange={e => setP({ ...p, address: e.target.value || null })} fullWidth />
        <TextField label="Таймзона" value={p.timezone} onChange={e => setP({ ...p, timezone: e.target.value })} fullWidth />
        <FormControlLabel
          control={<Switch checked={p.onlineBookingEnabled} onChange={e => setP({ ...p, onlineBookingEnabled: e.target.checked })} />}
          label="Онлайн-запись"
          sx={{ color: mocha.text }}
        />
        <Button sx={{ alignSelf: 'flex-start', bgcolor: mocha.accent, color: mocha.onAccent }} onClick={() => void save()}>
          Сохранить
        </Button>
      </Stack>
    </Box>
  )
}
