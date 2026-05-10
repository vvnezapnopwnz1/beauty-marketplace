import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, IconButton, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import {
  deleteMasterService,
  fetchMasterServiceCategories,
  getMasterServices,
  type MasterService,
} from '@shared/api/masterDashboardApi'
import type { DashboardServiceCategoriesResponse } from '@shared/api/dashboardApi'
import { advanceMasterOnboardingStep } from '@shared/api/masterOnboardingApi'
import { ServiceFormDialog } from './ServiceFormDialog'

type Props = {
  onNext: () => void
  onBack: () => void
}

export function StepServices({ onNext, onBack }: Props) {
  const { t } = useTranslation()
  const [services, setServices] = useState<MasterService[]>([])
  const [catPayload, setCatPayload] = useState<DashboardServiceCategoriesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editService, setEditService] = useState<MasterService | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      const [list, cats] = await Promise.all([getMasterServices(), fetchMasterServiceCategories()])
      setServices(list)
      setCatPayload(cats)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('masterOnboarding.errors.saveFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const slugToName = useMemo(() => {
    const m = new Map<string, string>()
    if (!catPayload) return m
    for (const g of catPayload.groups) {
      for (const it of g.items) {
        m.set(it.slug, it.nameRu)
      }
    }
    return m
  }, [catPayload])

  const handleDelete = async (svc: MasterService) => {
    if (!window.confirm(t('masterOnboarding.steps.services.deleteConfirm'))) return
    try {
      await deleteMasterService(svc.id)
      setServices(prev => prev.filter(s => s.id !== svc.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : t('masterOnboarding.errors.saveFailed'))
    }
  }

  const handleNext = async () => {
    if (services.length === 0) return
    setBusy(true)
    try {
      await advanceMasterOnboardingStep('schedule')
    } finally {
      setBusy(false)
      onNext()
    }
  }

  const openCreate = () => {
    setEditService(null)
    setDialogOpen(true)
  }

  const openEdit = (svc: MasterService) => {
    setEditService(svc)
    setDialogOpen(true)
  }

  return (
    <Stack gap={2}>
      <Typography variant="subtitle1">{t('masterOnboarding.steps.services.title')}</Typography>

      {error && <Alert severity="error">{error}</Alert>}

      {services.length === 0 && !loading && (
        <Typography color="text.secondary">
          {t('masterOnboarding.steps.services.emptyState')}
        </Typography>
      )}

      <Stack spacing={1.5}>
        {services.map(svc => (
          <Card
            key={svc.id}
            variant="outlined"
            sx={{ cursor: 'pointer' }}
            onClick={() => openEdit(svc)}
          >
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {svc.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {slugToName.get(svc.categorySlug ?? '') ?? svc.categorySlug ?? '—'} ·{' '}
                    {svc.durationMinutes} мин ·{' '}
                    {svc.priceCents != null
                      ? `${(svc.priceCents / 100).toFixed(0)} ₽`
                      : t('masterOnboarding.steps.services.priceOnRequest')}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.5}>
                  <IconButton
                    size="small"
                    onClick={e => {
                      e.stopPropagation()
                      openEdit(svc)
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={e => {
                      e.stopPropagation()
                      void handleDelete(svc)
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </IconButton>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Button variant="outlined" onClick={openCreate} disabled={loading}>
        {t('masterOnboarding.steps.services.addService')}
      </Button>

      <Stack direction="row" gap={1.5}>
        <Button variant="outlined" onClick={onBack} disabled={busy}>
          {t('masterOnboarding.actions.back')}
        </Button>
        <Button
          variant="contained"
          sx={{ flex: 1 }}
          disabled={busy || services.length === 0}
          onClick={handleNext}
        >
          {t('masterOnboarding.actions.next')}
        </Button>
      </Stack>

      <ServiceFormDialog
        open={dialogOpen}
        service={editService}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false)
          void load()
        }}
      />
    </Stack>
  )
}
