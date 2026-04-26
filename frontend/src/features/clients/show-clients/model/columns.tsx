import { Box, Chip, Stack } from '@mui/material'
import { GridColDef } from '@mui/x-data-grid-premium'
import type { SalonClient } from '@entities/client'
import { V } from '@shared/theme/palettes'

function formatDate(s: string | null | undefined): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export const clientColumns: GridColDef<SalonClient>[] = [
  {
    field: 'displayName',
    headerName: 'Имя',
    flex: 1,
    minWidth: 180,
    sortable: true,
    renderCell: ({ value }) => (
      <Box sx={{ fontWeight: 500, fontSize: 13, color: V.text }}>{value as string}</Box>
    ),
  },
  {
    field: 'phoneE164',
    headerName: 'Телефон',
    width: 160,
    sortable: false,
    renderCell: ({ row }) => (
      <Box sx={{ fontSize: 13, color: V.textMuted }}>
        {row.phoneE164 ?? row.userPhone ?? '—'}
      </Box>
    ),
  },
  {
    field: 'tags',
    headerName: 'Теги',
    width: 220,
    sortable: false,
    renderCell: ({ row }) => (
      <Stack direction="row" flexWrap="wrap" gap={0.5}>
        {row.tags.map(tag => (
          <Chip
            key={tag.id}
            label={tag.name}
            size="small"
            sx={{ bgcolor: tag.color, color: '#fff', fontSize: 11, height: 20 }}
          />
        ))}
      </Stack>
    ),
  },
  {
    field: 'visitCount',
    headerName: 'Визиты',
    width: 100,
    sortable: true,
    renderCell: ({ value }) => (
      <Box sx={{ fontSize: 13, color: V.text }}>{value as number}</Box>
    ),
  },
  {
    field: 'lastVisitAt',
    headerName: 'Последний визит',
    width: 160,
    sortable: true,
    renderCell: ({ value }) => (
      <Box sx={{ fontSize: 13, color: V.textMuted }}>{formatDate(value as string)}</Box>
    ),
  },
  {
    field: 'createdAt',
    headerName: 'Добавлен',
    width: 140,
    sortable: true,
    renderCell: ({ value }) => (
      <Box sx={{ fontSize: 13, color: V.textMuted }}>{formatDate(value as string)}</Box>
    ),
  },
]
