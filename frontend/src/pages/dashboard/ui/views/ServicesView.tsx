import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Chip, Stack, Tab, Tabs, Typography } from '@mui/material'
import {
  deleteDashboardService,
  fetchDashboardServiceCategories,
  fetchDashboardServices,
  type DashboardServiceCategoriesResponse,
  type DashboardServiceRow,
} from '@shared/api/dashboardApi'
import { mocha } from '@pages/dashboard/theme/mocha'
import { ServiceFormModal } from '../modals/ServiceFormModal'
import { useTranslation } from 'react-i18next'

const ACCENT = mocha.accent
const TEXT = mocha.text
const MUTED = mocha.muted

/** Stable tab value: slug-based or legacy free-text category. */
function tabKeyForRow(r: DashboardServiceRow): string | null {
  const slug = r.categorySlug?.trim()
  if (slug) return `s:${slug}`
  const c = r.category?.trim()
  if (c) return `c:${c}`
  return null
}

export function ServicesView() {
  const { t } = useTranslation()
  const [rows, setRows] = useState<DashboardServiceRow[]>([])
  const [catCatalog, setCatCatalog] = useState<DashboardServiceCategoriesResponse | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [edit, setEdit] = useState<DashboardServiceRow | null>(null)
  const [catTab, setCatTab] = useState<string>('all')

  const slugToRu = useMemo(() => {
    const m = new Map<string, string>()
    if (!catCatalog) return m
    for (const g of catCatalog.groups) {
      for (const it of g.items) {
        m.set(it.slug, it.nameRu)
      }
    }
    return m
  }, [catCatalog])

  const load = useCallback(async () => {
    try {
      setErr(null)
      const [list, cats] = await Promise.all([
        fetchDashboardServices(),
        fetchDashboardServiceCategories(true),
      ])
      setRows(list)
      setCatCatalog(cats)
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('dashboard.services.errorLoad'))
    }
  }, [t])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const tabLabel = useCallback(
    (key: string) => {
      if (key === 'all') return t('dashboard.services.all')
      if (key.startsWith('s:')) {
        const slug = key.slice(2)
        return slugToRu.get(slug) ?? slug
      }
      if (key.startsWith('c:')) return key.slice(2)
      return key
    },
    [slugToRu, t],
  )

  const categories = useMemo(() => {
    const s = new Set<string>()
    rows.forEach(r => {
      const k = tabKeyForRow(r)
      if (k) s.add(k)
    })
    return ['all', ...Array.from(s).sort((a, b) => tabLabel(a).localeCompare(tabLabel(b), 'ru'))]
  }, [rows, tabLabel])

  const filtered = useMemo(() => {
    if (catTab === 'all') return rows
    return rows.filter(r => tabKeyForRow(r) === catTab)
  }, [rows, catTab])

  const labelForServiceCategory = useCallback(
    (r: DashboardServiceRow): string | null => {
      const slug = r.categorySlug?.trim()
      if (slug) return slugToRu.get(slug) ?? r.category?.trim() ?? slug
      return r.category?.trim() ?? null
    },
    [slugToRu],
  )

  return (
    <Box>
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography sx={{ color: MUTED, fontSize: 13 }}>
          {t('dashboard.services.countOf', { filtered: filtered.length, total: rows.length })}
        </Typography>
        <Button
          sx={{ bgcolor: ACCENT, color: mocha.onAccent }}
          onClick={() => {
            setEdit(null)
            setModalOpen(true)
          }}
        >
          {t('dashboard.services.addService')}
        </Button>
      </Stack>

      <Tabs
        value={catTab}
        onChange={(_, v) => setCatTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, minHeight: 40, '& .MuiTab-root': { color: MUTED, minHeight: 40 }, '& .Mui-selected': { color: ACCENT } }}
      >
        {categories.map(c => (
          <Tab key={c} value={c} label={tabLabel(c)} />
        ))}
      </Tabs>

      <Stack spacing={1}>
        {filtered.map(r => {
          const catLabel = labelForServiceCategory(r)
          return (
            <Box
              key={r.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                p: 2,
                bgcolor: mocha.card,
                borderRadius: 2,
                border: `1px solid ${mocha.borderSubtle}`,
                flexWrap: 'wrap',
              }}
            >
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography sx={{ color: TEXT, fontWeight: 600 }}>{r.name}</Typography>
                <Typography sx={{ color: MUTED, fontSize: 13 }}>
                  {r.durationMinutes} {t('dashboard.services.minutes')} ·{' '}
                  {r.priceCents != null
                    ? `${(r.priceCents / 100).toFixed(0)} ₽`
                    : t('dashboard.services.priceUnknown')}{' '}
                  · {r.isActive ? t('dashboard.services.active') : t('dashboard.services.inactive')}
                </Typography>
                {r.description && (
                  <Typography sx={{ color: MUTED, fontSize: 12, mt: 0.5 }} noWrap title={r.description}>
                    {r.description}
                  </Typography>
                )}
                <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                  {catLabel && (
                    <Chip
                      size="small"
                      label={catLabel}
                      sx={{ bgcolor: mocha.input, color: MUTED, border: `1px solid ${mocha.inputBorder}` }}
                    />
                  )}
                  {(r.staffNames ?? []).slice(0, 8).map(n => (
                    <Chip key={n} size="small" label={n} sx={{ bgcolor: 'rgba(216,149,107,0.12)', color: ACCENT, border: '1px solid rgba(216,149,107,0.3)' }} />
                  ))}
                </Stack>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={() => { setEdit(r); setModalOpen(true) }}>
                  {t('dashboard.services.edit')}
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={() => {
                    if (!confirm(t('dashboard.services.deactivateConfirm'))) return
                    void deleteDashboardService(r.id).then(load)
                  }}
                >
                  {t('dashboard.services.deactivate')}
                </Button>
              </Stack>
            </Box>
          )
        })}
      </Stack>

      <ServiceFormModal
        open={modalOpen}
        service={edit}
        onClose={() => { setModalOpen(false); setEdit(null) }}
        onSaved={() => {
          setModalOpen(false)
          setEdit(null)
          void load()
        }}
      />
    </Box>
  )
}
