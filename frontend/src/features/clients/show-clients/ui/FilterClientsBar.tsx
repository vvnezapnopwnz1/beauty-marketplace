import { ChangeEvent, JSX, useRef, useState } from 'react'
import { Box, Button, FormControlLabel, Switch } from '@mui/material'
import { V } from '@shared/theme/palettes'
import { TagsAutocomplete, type ClientTag, type ClientFilterState } from '@entities/client'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'

interface Props {
  filters: ClientFilterState
  tags: ClientTag[]
  setFilters: (f: ClientFilterState) => void
  onAddTag: () => void
  onAddClient: () => void
}

export function FilterClientsBar({
  filters,
  tags,
  setFilters,
  onAddTag,
  onAddClient,
}: Props): JSX.Element {
  const d = useDashboardPalette()
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [localSearch, setLocalSearch] = useState(filters.search)

  function onSearchChange(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setLocalSearch(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setFilters({ ...filters, search: v }), 300)
  }

  const hasActive = filters.tagIds.length > 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2.5 }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box
          component="input"
          type="text"
          placeholder="Поиск по имени или телефону..."
          value={localSearch}
          onChange={onSearchChange}
          sx={{
            px: '10px',
            py: '6px',
            borderRadius: V.rSm,
            border: `1px solid ${V.border}`,
            bgcolor: V.surface,
            color: V.text,
            fontSize: 12,
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s',
            width: 240,
            '&::placeholder': { color: V.textMuted },
            '&:focus': { borderColor: V.accent },
          }}
        />

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={filters.includeDead}
              onChange={(_, checked) => setFilters({ ...filters, includeDead: checked })}
            />
          }
          label={
            <Box component="span" sx={{ fontSize: 12, color: V.textMuted }}>
              Показать неактивные
            </Box>
          }
          sx={{ ml: 0.5, mr: 0 }}
        />

        <TagsAutocomplete
          tags={tags}
          selectedTagIds={filters.tagIds}
          onChange={nextTagIds => setFilters({ ...filters, tagIds: nextTagIds })}
        />

        <Button
          size="small"
          variant="outlined"
          onClick={onAddTag}
          sx={{
            borderColor: d.border,
            color: d.text,
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: '8px',
            px: 1.25,
            py: 0.5,
            whiteSpace: 'nowrap',
          }}
        >
          Добавить тег
        </Button>

        {hasActive && (
          <Box
            component="button"
            onClick={() => setFilters({ ...filters, tagIds: [] })}
            sx={{
              px: '10px',
              py: '5px',
              border: `1px solid ${d.warningBg}55`,
              borderRadius: V.rMd,
              bgcolor: d.warningBg,
              color: d.text,
              fontSize: 11,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'all 0.15s',
              '&:hover': { bgcolor: `${d.warningBg}18` },
            }}
          >
            Сбросить теги ×
          </Box>
        )}

        <Button
          size="small"
          variant="contained"
          onClick={onAddClient}
          sx={{
            ml: 'auto',
            bgcolor: d.accent,
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: '8px',
            px: 1.5,
            py: 0.5,
          }}
        >
          + Добавить клиента
        </Button>
      </Box>
    </Box>
  )
}
