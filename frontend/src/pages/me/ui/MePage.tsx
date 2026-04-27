import { useEffect } from 'react'
import { Alert, Badge, Box, CircularProgress, Stack, Tab, Tabs, Typography } from '@mui/material'
import { useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@app/store'
import { loadProfile, selectProfile, selectProfileError, selectProfileStatus } from '@features/edit-profile/model/profileSlice'
import { GeneralSection } from './sections/GeneralSection'
import { SecuritySection } from './sections/SecuritySection'
import { DangerSection } from './sections/DangerSection'
import { SalonInvitesSection } from './sections/SalonInvitesSection'

type TabKey = 'general' | 'security' | 'danger' | 'invites'

function asTab(value: string | null): TabKey {
  if (value === 'security' || value === 'danger' || value === 'invites') return value
  return 'general'
}

export function MePage() {
  const dispatch = useAppDispatch()
  const profile = useAppSelector(selectProfile)
  const status = useAppSelector(selectProfileStatus)
  const error = useAppSelector(selectProfileError)
  const [params, setParams] = useSearchParams()

  const currentTab = asTab(params.get('tab'))
  const pendingInvites = profile?.effectiveRoles?.pendingInvites ?? 0

  useEffect(() => {
    if (!profile && status === 'idle') {
      void dispatch(loadProfile())
    }
  }, [dispatch, profile, status])

  return (
    <Box sx={{ maxWidth: 980, mx: 'auto', px: { xs: 2, md: 3 }, py: 3 }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 700 }}>Профиль</Typography>
      <Tabs
        value={currentTab}
        onChange={(_, v: TabKey) => setParams({ tab: v })}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ mb: 2 }}
      >
        <Tab value="general" label="Общее" />
        <Tab value="security" label="Безопасность" />
        <Tab
          value="invites"
          label={
            pendingInvites > 0 ? (
              <Badge color="error" badgeContent={pendingInvites} max={99}>
                Приглашения
              </Badge>
            ) : (
              'Приглашения'
            )
          }
        />
        <Tab value="danger" label="Опасная зона" />
      </Tabs>

      {status === 'loading' && (
        <Stack alignItems="center" sx={{ py: 8 }}>
          <CircularProgress />
        </Stack>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {status !== 'loading' && (
        <>
          {currentTab === 'general' && <GeneralSection key={profile?.updatedAt ?? 'empty'} />}
          {currentTab === 'security' && <SecuritySection />}
          {currentTab === 'invites' && <SalonInvitesSection />}
          {currentTab === 'danger' && <DangerSection />}
        </>
      )}
    </Box>
  )
}
