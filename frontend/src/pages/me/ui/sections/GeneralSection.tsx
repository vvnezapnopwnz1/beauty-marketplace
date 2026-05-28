import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Box, Link, Stack, TextField, Typography, useTheme } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@app/store'
import {
  clearProfileError,
  saveProfile,
  selectProfile,
  selectProfileFieldErrors,
  selectProfileStatus,
} from '@features/edit-profile/model/profileSlice'
import { useDashboardFormStyles } from '@pages/dashboard/theme/formStyles'
import {
  ChipMultiSelect,
  FormField,
  FormSection,
  PanelBtn,
  PanelFooter,
} from '@pages/dashboard/ui/components/formComponents'
import { specializationLabel, type DashboardServiceCategoryGroup } from '@shared/api/dashboardApi'
import { fetchMasterServiceCategories } from '@shared/api/masterDashboardApi'
import { ROUTES } from '@shared/config/routes'
import { useTranslation } from 'react-i18next'

type FormState = {
  displayName: string
  username: string
  firstName: string
  lastName: string
  city: string
  bio: string
  avatarUrl: string
  specializations: string[]
  yearsExperience: string
}

function ProfileCardIcon() {
  const theme = useTheme()
  const d = theme.palette.dashboard
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={d.accent} strokeWidth="1.8">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export function GeneralSection() {
  const { t } = useTranslation()
  const theme = useTheme()
  const d = theme.palette.dashboard
  const { inputBaseSx, textareaSx } = useDashboardFormStyles()
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
    specializations: [...(profile?.master?.specializations ?? [])],
    yearsExperience:
      profile?.master?.yearsExperience != null ? String(profile.master.yearsExperience) : '',
  }))

  const [specializationGroups, setSpecializationGroups] = useState<DashboardServiceCategoryGroup[]>(
    [],
  )
  const [saveOk, setSaveOk] = useState(false)
  const saveOkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isMaster) return
    void (async () => {
      try {
        const res = await fetchMasterServiceCategories()
        setSpecializationGroups(res.groups)
      } catch {
        setSpecializationGroups([])
      }
    })()
  }, [isMaster])

  const bioLen = useMemo(() => form.bio.length, [form.bio])

  const onSave = async () => {
    dispatch(clearProfileError())
    setSaveOk(false)
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
      const years = form.yearsExperience.trim() === '' ? null : parseInt(form.yearsExperience, 10)
      payload.master = {
        specializations: form.specializations,
        yearsExperience: Number.isNaN(years as number) ? null : years,
      }
    }
    try {
      await dispatch(saveProfile(payload)).unwrap()
      if (saveOkTimer.current) clearTimeout(saveOkTimer.current)
      setSaveOk(true)
      saveOkTimer.current = setTimeout(() => {
        setSaveOk(false)
        saveOkTimer.current = null
      }, 4000)
    } catch {
      /* rejected handled via slice */
    }
  }

  useEffect(
    () => () => {
      if (saveOkTimer.current) clearTimeout(saveOkTimer.current)
    },
    [],
  )

  const masterSectionNum = 2
  const basicSectionLast = !isMaster

  return (
    <Box
      sx={{
        maxWidth: 600,
        bgcolor: d.dialog,
        border: `1px solid ${d.border}`,
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '90vh',
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          px: 3,
          py: 2.25,
          borderBottom: `1px solid ${d.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            bgcolor: 'rgba(176,136,249,.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ProfileCardIcon />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: d.text, lineHeight: 1.3 }}>
            {t('userMeProfile.cardTitle')}
          </Typography>
          <Typography sx={{ fontSize: 12, color: d.mutedDark, mt: '1px' }}>
            {t('userMeProfile.cardSubtitle')}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
        {saveOk && (
          <Box sx={{ px: 3, pt: 2 }}>
            <Alert severity="success" sx={{ fontSize: 12 }}>
              {t('userMeProfile.saveSuccess')}
            </Alert>
          </Box>
        )}

        <FormSection num={1} name={t('userMeProfile.sectionBasic')} last={basicSectionLast}>
          <Stack spacing={1.5}>
            <FormField label={t('userMeProfile.avatarUrl')} error={fieldErrors.avatarUrl}>
              <TextField
                value={form.avatarUrl}
                onChange={e => setForm(s => ({ ...s, avatarUrl: e.target.value }))}
                fullWidth
                placeholder="https://…"
                sx={inputBaseSx}
              />
            </FormField>
            {isMaster && (
              <Alert severity="info" sx={{ fontSize: 12, py: 0.5 }}>
                {t('userMeProfile.avatarFileHint')}{' '}
                <Link component={RouterLink} to={ROUTES.MASTER_DASHBOARD_PROFILE} underline="hover">
                  {t('userMeProfile.avatarFileLink')}
                </Link>
              </Alert>
            )}

            <FormField label={t('userMeProfile.displayName')} error={fieldErrors.displayName}>
              <TextField
                value={form.displayName}
                onChange={e => setForm(s => ({ ...s, displayName: e.target.value }))}
                fullWidth
                sx={inputBaseSx}
              />
            </FormField>

            <FormField label={t('userMeProfile.username')} error={fieldErrors.username}>
              <TextField
                value={form.username}
                onChange={e => setForm(s => ({ ...s, username: e.target.value }))}
                fullWidth
                sx={inputBaseSx}
              />
            </FormField>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <FormField label={t('userMeProfile.firstName')} error={fieldErrors.firstName}>
                <TextField
                  value={form.firstName}
                  onChange={e => setForm(s => ({ ...s, firstName: e.target.value }))}
                  fullWidth
                  sx={inputBaseSx}
                />
              </FormField>
              <FormField label={t('userMeProfile.lastName')} error={fieldErrors.lastName}>
                <TextField
                  value={form.lastName}
                  onChange={e => setForm(s => ({ ...s, lastName: e.target.value }))}
                  fullWidth
                  sx={inputBaseSx}
                />
              </FormField>
            </Stack>

            <FormField label={t('userMeProfile.city')} error={fieldErrors.city}>
              <TextField
                value={form.city}
                onChange={e => setForm(s => ({ ...s, city: e.target.value }))}
                fullWidth
                sx={inputBaseSx}
              />
            </FormField>

            <FormField
              label={t('userMeProfile.bio')}
              error={fieldErrors.bio}
              hint={`${bioLen} / 500`}
            >
              <TextField
                value={form.bio}
                onChange={e => setForm(s => ({ ...s, bio: e.target.value }))}
                fullWidth
                multiline
                minRows={4}
                sx={textareaSx}
              />
            </FormField>
          </Stack>
        </FormSection>

        {isMaster && (
          <FormSection num={masterSectionNum} name={t('userMeProfile.sectionMaster')} last>
            <Stack spacing={1.5}>
              <FormField
                label={t('userMeProfile.specializations')}
                hint={t('userMeProfile.specializationsHint')}
              >
                <ChipMultiSelect
                  items={specializationGroups.map(g => ({
                    id: g.parentSlug,
                    label: specializationLabel(g.parentSlug, specializationGroups),
                  }))}
                  selected={form.specializations}
                  onChange={ids => setForm(s => ({ ...s, specializations: ids }))}
                  getLabel={item => String((item as { label?: string }).label ?? item.id)}
                  getId={item => item.id}
                />
              </FormField>
              <FormField label={t('userMeProfile.yearsExperience')}>
                <TextField
                  type="number"
                  value={form.yearsExperience}
                  onChange={e => setForm(s => ({ ...s, yearsExperience: e.target.value }))}
                  fullWidth
                  inputProps={{ min: 0, max: 60 }}
                  sx={inputBaseSx}
                />
              </FormField>
            </Stack>
          </FormSection>
        )}

        {profile?.phone && (
          <Box sx={{ px: 3, py: 1.5, borderTop: `1px solid ${d.border}` }}>
            <Alert severity="info" sx={{ fontSize: 12 }}>
              {t('userMeProfile.phone')}: {profile.phone}
            </Alert>
          </Box>
        )}
      </Box>

      <PanelFooter
        note={t('userMeProfile.footerNote')}
        actions={
          <PanelBtn variant="primary" onClick={() => void onSave()} disabled={status === 'saving'}>
            {status === 'saving' ? t('userMeProfile.saving') : t('userMeProfile.save')}
          </PanelBtn>
        }
      />
    </Box>
  )
}
