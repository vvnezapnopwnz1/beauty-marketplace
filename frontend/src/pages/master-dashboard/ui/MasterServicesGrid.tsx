import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  FormControl,
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
  fetchMasterServiceCategories,
  getMasterServices,
  type MasterService,
} from '@shared/api/masterDashboardApi'
import type { DashboardServiceCategoriesResponse, DashboardServiceCategoryItem } from '@shared/api/dashboardApi'
import RenderTable from '@shared/ui/DataGrid/RenderTable'
import { useDashboardFilterSelectSx } from '@pages/dashboard/theme/dashboardFilterSelectSx'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { getDataGridDashboardSx } from '@shared/ui/DataGrid/dataGridDashboardSx'
import { MasterServiceFormModal } from './modals/MasterServiceFormModal'
import { useTranslation } from 'react-i18next'
import { V } from '@shared/theme/palettes'

export function MasterServicesGrid() {
  const theme = useTheme()
  const d = useDashboardPalette()
  const { filterSelectSx, menuPaperSx, menuItemSx } = useDashboardFilterSelectSx()
  const { t } = useTranslation()
  const [rows, setRows] = useState<MasterService[]>([])
  const [catCatalog, setCatCatalog] = useState<DashboardServiceCategoriesResponse | null>(null)
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [edit, setEdit] = useState<MasterService | null>(null)

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
      const [list, cats] = await Promise.all([getMasterServices(), fetchMasterServiceCategories()])
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
      return slug === selectedCategorySlug
    })
  }, [rows, selectedCategorySlug])

  const labelForServiceCategory = useCallback(
    (r: MasterService): string | null => {
      const slug = r.categorySlug?.trim()
      if (slug) return slugToRu.get(slug) ?? slug
      return null
    },
    [slugToRu],
  )

  const columns = useMemo<GridColDef<MasterService>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Название',
        flex: 1,
        minWidth: 220,
        sortable: true,
        renderCell: ({ value }) => (
          <Typography sx={{ fontSize: 13, color: d.text, fontWeight: 500 }}>{value as string}</Typography>
        ),
      },
      {
        field: 'category',
        headerName: 'Категория',
        width: 200,
        sortable: false,
        renderCell: ({ row }) => (
          <Typography sx={{ fontSize: 13, color: d.mutedDark }}>{labelForServiceCategory(row) ?? '—'}</Typography>
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
            {value ? 'Активная' : 'Неактивная'}
          </Box>
        ),
      },
    ],
    [d.inputBorder, d.mutedDark, d.text, labelForServiceCategory],
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
        <Typography sx={{ color: d.muted, fontSize: 13, flex: '1 1 200px' }}>
          Ваши услуги для личных записей вне салона
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <Select
              data-testid="master-services-category-filter"
              sx={filterSelectSx}
              value={selectedCategorySlug}
              displayEmpty
              MenuProps={{ PaperProps: { sx: menuPaperSx } }}
              onChange={(event: SelectChangeEvent<string>) => {
                setSelectedCategorySlug(event.target.value)
              }}
            >
              <MenuItem value="" sx={menuItemSx}>
                Все категории
              </MenuItem>
              {categories.flatMap(group => [
                <ListSubheader
                  key={`h-${group.parentSlug}`}
                  sx={{
                    bgcolor: V.surface,
                    color: V.textMuted,
                    fontSize: 12,
                    lineHeight: '32px',
                    fontWeight: 600,
                  }}
                >
                  {group.label}
                </ListSubheader>,
                ...group.items.map((item: DashboardServiceCategoryItem) => (
                  <MenuItem key={item.slug} value={item.slug} sx={menuItemSx}>
                    {item.nameRu}
                  </MenuItem>
                )),
              ])}
            </Select>
          </FormControl>
          <Button
            size="small"
            variant="contained"
            sx={{ bgcolor: d.accent, color: d.onAccent, borderRadius: '8px', px: 2 }}
            onClick={() => {
              setEdit(null)
              setModalOpen(true)
            }}
          >
            {t('dashboard.services.addService')}
          </Button>
        </Stack>
      </Box>

      <RenderTable
        tableName="master-services"
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

      <MasterServiceFormModal
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
