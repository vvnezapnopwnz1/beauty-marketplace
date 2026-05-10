import { useMemo, useState } from 'react'
import { Alert, Box, Button, Stack, TextField } from '@mui/material'
import { useAppDispatch, useAppSelector } from '@app/store'
import {
  clearProfileError,
  saveProfile,
  selectProfile,
  selectProfileFieldErrors,
  selectProfileStatus,
} from '@features/edit-profile/model/profileSlice'

type FormState = {
  displayName: string
  username: string
  firstName: string
  lastName: string
  city: string
  bio: string
  avatarUrl: string
  specializations: string
  yearsExperience: string
}

export function GeneralSection() {
  const dispatch = useAppDispatch()
  const profile = useAppSelector(selectProfile)
  const status = useAppSelector(selectProfileStatus)
  const fieldErrors = useAppSelector(selectProfileFieldErrors)
  const isMaster = profile?.effectiveRoles?.isMaster ?? false
  const [form, setForm] = useState<FormState>(() => ({
    displayName: profile?.displayName ?? '',
    username: profile?.username ?? '',
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    city: profile?.city ?? '',
    bio: profile?.bio ?? '',
    avatarUrl: profile?.avatarUrl ?? '',
    specializations: (profile?.master?.specializations ?? []).join(', '),
    yearsExperience:
      profile?.master?.yearsExperience != null ? String(profile.master.yearsExperience) : '',
  }))

  const bioLen = useMemo(() => form.bio.length, [form.bio])

  const onSave = async () => {
    dispatch(clearProfileError())
    const payload: Parameters<typeof saveProfile>[0] = {
      displayName: form.displayName || null,
      username: form.username || null,
      firstName: form.firstName || null,
      lastName: form.lastName || null,
      city: form.city || null,
      bio: form.bio || null,
      avatarUrl: form.avatarUrl || null,
    }
    if (isMaster) {
      const specs = form.specializations
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)
      const years = form.yearsExperience.trim() === '' ? null : parseInt(form.yearsExperience, 10)
      payload.master = {
        specializations: specs,
        yearsExperience: Number.isNaN(years as number) ? null : years,
      }
    }
    await dispatch(saveProfile(payload))
  }

  return (
    <Stack spacing={2} sx={{ maxWidth: 680 }}>
      <TextField
        label="URL аватара"
        value={form.avatarUrl}
        onChange={e => setForm(s => ({ ...s, avatarUrl: e.target.value }))}
        error={!!fieldErrors.avatarUrl}
        helperText={fieldErrors.avatarUrl}
      />
      <TextField
        label="Отображаемое имя"
        value={form.displayName}
        onChange={e => setForm(s => ({ ...s, displayName: e.target.value }))}
        error={!!fieldErrors.displayName}
        helperText={fieldErrors.displayName}
      />
      <TextField
        label="Username"
        value={form.username}
        onChange={e => setForm(s => ({ ...s, username: e.target.value }))}
        error={!!fieldErrors.username}
        helperText={fieldErrors.username}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          fullWidth
          label="Имя"
          value={form.firstName}
          onChange={e => setForm(s => ({ ...s, firstName: e.target.value }))}
          error={!!fieldErrors.firstName}
          helperText={fieldErrors.firstName}
        />
        <TextField
          fullWidth
          label="Фамилия"
          value={form.lastName}
          onChange={e => setForm(s => ({ ...s, lastName: e.target.value }))}
          error={!!fieldErrors.lastName}
          helperText={fieldErrors.lastName}
        />
      </Stack>
      <TextField
        label="Город"
        value={form.city}
        onChange={e => setForm(s => ({ ...s, city: e.target.value }))}
        error={!!fieldErrors.city}
        helperText={fieldErrors.city}
      />
      <TextField
        label="О себе"
        value={form.bio}
        multiline
        minRows={4}
        onChange={e => setForm(s => ({ ...s, bio: e.target.value }))}
        error={!!fieldErrors.bio}
        helperText={fieldErrors.bio || `${bioLen} / 500`}
      />
      {isMaster && (
        <>
          <TextField
            label="Специализации (через запятую)"
            value={form.specializations}
            onChange={e => setForm(s => ({ ...s, specializations: e.target.value }))}
          />
          <TextField
            label="Опыт работы (лет)"
            type="number"
            value={form.yearsExperience}
            onChange={e => setForm(s => ({ ...s, yearsExperience: e.target.value }))}
          />
        </>
      )}
      {profile?.phone && <Alert severity="info">Телефон: {profile.phone}</Alert>}
      <Box>
        <Button variant="contained" onClick={onSave} disabled={status === 'saving'}>
          {status === 'saving' ? 'Сохраняем...' : 'Сохранить'}
        </Button>
      </Box>
    </Stack>
  )
}
