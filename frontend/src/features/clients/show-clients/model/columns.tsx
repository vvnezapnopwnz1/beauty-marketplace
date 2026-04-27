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
      <Box sx={{ fontSize: 13, color: V.textMuted }}>{row.phoneE164 ?? row.userPhone ?? '—'}</Box>
    ),
  },
  {
    field: 'tags',
    headerName: 'Теги',
    width: 220,
    sortable: false,
    renderCell: ({ row }) => (
      <Stack direction="row" flexWrap="wrap" gap={0.5}>
        {row.tags.slice(0, 3).map(tag => (
          <Chip
            key={tag.id}
            label={tag.name}
            size="small"
            sx={{ bgcolor: tag.color, color: '#fff', fontSize: 11, height: 20 }}
          />
        ))}
        {row.tags.length > 3 && (
          <Chip
            label={`+${row.tags.length - 3}`}
            size="small"
            sx={{ bgcolor: V.border, color: V.textMuted, fontSize: 11, height: 20 }}
          />
        )}
      </Stack>
    ),
  },
  {
    field: 'visitCount',
    headerName: 'Визиты',
    width: 100,
    sortable: true,
    renderCell: ({ value }) => <Box sx={{ fontSize: 13, color: V.text }}>{value as number}</Box>,
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
  {
    field: 'deletedAt',
    headerName: 'Статус',
    width: 130,
    sortable: false,
    renderCell: ({ row }) => (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          px: 1,
          py: 0.25,
          height: 28,
          lineHeight: 1,
          borderRadius: 1,
          border: `1px solid ${V.border}`,
          fontSize: 11,
          fontWeight: 600,
          bgcolor: row.deletedAt ? 'rgba(255,255,255,.07)' : 'rgba(107,203,119,.15)',
          color: row.deletedAt ? V.textMuted : '#6BCB77',
        }}
      >
        {row.deletedAt ? 'Неактивный' : 'Активный'}
      </Box>
    ),
  },
]
