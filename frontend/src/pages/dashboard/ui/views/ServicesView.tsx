import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  Typography,
  useTheme,
  type SelectChangeEvent,
} from '@mui/material'
import { GridColDef } from '@mui/x-data-grid-premium'
import {
  fetchDashboardServiceCategories,
  fetchDashboardServices,
  type DashboardServiceCategoriesResponse,
  type DashboardServiceCategoryItem,
  type DashboardServiceRow,
} from '@shared/api/dashboardApi'
import RenderTable from '@shared/ui/DataGrid/RenderTable'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { getDataGridDashboardSx } from '@shared/ui/DataGrid/dataGridDashboardSx'
import { ServiceFormModal } from '../modals/ServiceFormModal'
import { useTranslation } from 'react-i18next'

export function ServicesView() {
  const theme = useTheme()
  const d = useDashboardPalette()
  const { t } = useTranslation()
  const [rows, setRows] = useState<DashboardServiceRow[]>([])
  const [catCatalog, setCatCatalog] = useState<DashboardServiceCategoriesResponse | null>(null)
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [edit, setEdit] = useState<DashboardServiceRow | null>(null)

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
      setLoading(true)
      const [list, cats] = await Promise.all([
        fetchDashboardServices(),
        fetchDashboardServiceCategories(false),
      ])
      setRows(list)
      setCatCatalog(cats)
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('dashboard.services.errorLoad'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const categories = useMemo(() => catCatalog?.groups ?? [], [catCatalog])

  const filteredRows = useMemo(() => {
    if (!selectedCategorySlug) return rows
    return rows.filter(r => {
      const slug = r.categorySlug?.trim()
      if (slug) return slug === selectedCategorySlug
      const fallbackName = slugToRu.get(selectedCategorySlug)
      return r.category?.trim() === fallbackName
    })
  }, [rows, selectedCategorySlug, slugToRu])

  const labelForServiceCategory = useCallback(
    (r: DashboardServiceRow): string | null => {
      const slug = r.categorySlug?.trim()
      if (slug) return slugToRu.get(slug) ?? r.category?.trim() ?? slug
      return r.category?.trim() ?? null
    },
    [slugToRu],
  )

  const columns = useMemo<GridColDef<DashboardServiceRow>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Название',
        flex: 1,
        minWidth: 220,
        sortable: true,
        renderCell: ({ value }) => (
          <Typography sx={{ fontSize: 13, color: d.text, fontWeight: 500 }}>
            {value as string}
          </Typography>
        ),
      },
      {
        field: 'category',
        headerName: 'Категория',
        width: 200,
        sortable: false,
        renderCell: ({ row }) => (
          <Typography sx={{ fontSize: 13, color: d.mutedDark }}>
            {labelForServiceCategory(row) ?? '—'}
          </Typography>
        ),
      },
      {
        field: 'durationMinutes',
        headerName: 'Длительность',
        width: 140,
        sortable: true,
        renderCell: ({ value }) => (
          <Typography sx={{ fontSize: 13, color: d.text }}>{value as number} мин</Typography>
        ),
      },
      {
        field: 'priceCents',
        headerName: 'Цена',
        width: 120,
        sortable: true,
        renderCell: ({ value }) => (
          <Typography sx={{ fontSize: 13, color: d.text }}>
            {value != null ? `${((value as number) / 100).toFixed(0)} ₽` : '—'}
          </Typography>
        ),
      },
      {
        field: 'staffNames',
        headerName: 'Мастера',
        width: 260,
        sortable: false,
        renderCell: ({ row }) => (
          <Stack direction="row" flexWrap="wrap" gap={0.5}>
            {(row.staffNames ?? []).slice(0, 3).map(name => (
              <Chip
                key={name}
                label={name}
                size="small"
                sx={{
                  bgcolor: 'rgba(216,149,107,0.12)',
                  color: d.accent,
                  border: '1px solid rgba(216,149,107,0.3)',
                }}
              />
            ))}
            {(row.staffNames ?? []).length > 3 && (
              <Chip
                label={`+${(row.staffNames ?? []).length - 3}`}
                size="small"
                sx={{ bgcolor: d.input, color: d.mutedDark, border: `1px solid ${d.inputBorder}` }}
              />
            )}
          </Stack>
        ),
      },
      {
        field: 'isActive',
        headerName: 'Статус',
        width: 120,
        sortable: false,
        renderCell: ({ value }) => (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              px: 1,
              height: 28,
              lineHeight: 1,
              py: 0.25,
              borderRadius: 1,
              border: `1px solid ${d.inputBorder}`,
              fontSize: 12,
              fontWeight: 600,
              bgcolor: value ? 'rgba(107,203,119,0.14)' : 'rgba(255,97,97,0.12)',
              color: value ? '#2F7A4A' : '#B02020',
            }}
          >
            {value ? 'Активный' : 'Неактивный'}
          </Box>
        ),
      },
    ],
    [d.accent, d.input, d.inputBorder, d.mutedDark, d.text, labelForServiceCategory],
  )

  return (
    <Box>
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      <Box
        sx={{
          mb: 2,
          display: 'flex',
          gap: 1,
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}
      >
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel id="services-category-filter-label">Категория</InputLabel>
          <Select
            labelId="services-category-filter-label"
            value={selectedCategorySlug}
            label="Категория"
            onChange={(event: SelectChangeEvent<string>) => {
              setSelectedCategorySlug(event.target.value)
            }}
          >
            <MenuItem value="">Все категории</MenuItem>
            {categories.flatMap(group => [
              <ListSubheader key={`h-${group.parentSlug}`}>{group.label}</ListSubheader>,
              ...group.items.map((item: DashboardServiceCategoryItem) => (
                <MenuItem key={item.slug} value={item.slug}>
                  {item.nameRu}
                </MenuItem>
              )),
            ])}
          </Select>
        </FormControl>
        <Button
          size="small"
          sx={{ bgcolor: d.accent, color: d.onAccent }}
          onClick={() => {
            setEdit(null)
            setModalOpen(true)
          }}
        >
          {t('dashboard.services.addService')}
        </Button>
      </Box>

      <RenderTable
        tableName="services"
        rows={filteredRows}
        loading={loading}
        error={err ? { status: 500 } : undefined}
        checkboxSelection={false}
        heightOffset={140}
        dashboardPalette={theme.palette.dashboard}
        sx={getDataGridDashboardSx}
        minHeight={600}
        columns={columns}
        getRowId={r => r.id}
        density="comfortable"
        sortingOrder={['asc', 'desc']}
        disableColumnMenu
        disableRowSelectionOnClick
        emptyStateTitle="Нет услуг"
        onRowClick={({ row }) => {
          setEdit(row)
          setModalOpen(true)
        }}
      />

      <ServiceFormModal
        open={modalOpen}
        service={edit}
        onClose={() => {
          setModalOpen(false)
          setEdit(null)
        }}
        onSaved={() => {
          setModalOpen(false)
          setEdit(null)
          void load()
        }}
      />
    </Box>
  )
}
