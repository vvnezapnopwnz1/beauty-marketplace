import { ChangeEvent, JSX, useRef, useState } from 'react'
import { Box, Chip, Stack } from '@mui/material'
import { V } from '@shared/theme/palettes'
import type { ClientTag, ClientFilterState } from '@entities/client'

interface Props {
  filters: ClientFilterState
  tags: ClientTag[]
  setFilters: (f: ClientFilterState) => void
}

export function FilterClientsBar({ filters, tags, setFilters }: Props): JSX.Element {
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [localSearch, setLocalSearch] = useState(filters.search)

  function onSearchChange(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setLocalSearch(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setFilters({ ...filters, search: v }), 300)
  }

  function toggleTag(id: string) {
    const next = filters.tagIds.includes(id)
      ? filters.tagIds.filter(x => x !== id)
      : [...filters.tagIds, id]
    setFilters({ ...filters, tagIds: next })
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

        {hasActive && (
          <Box
            component="button"
            onClick={() => setFilters({ ...filters, tagIds: [] })}
            sx={{
              px: '10px',
              py: '5px',
              border: `1px solid ${V.error}55`,
              borderRadius: V.rMd,
              bgcolor: V.errorSoft,
              color: V.error,
              fontSize: 11,
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'all 0.15s',
              '&:hover': { bgcolor: `${V.error}18` },
            }}
          >
            Сбросить теги ×
          </Box>
        )}
      </Box>

      {tags.length > 0 && (
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {tags.map(tag => {
            const on = filters.tagIds.includes(tag.id)
            return (
              <Chip
                key={tag.id}
                label={tag.name}
                size="small"
                onClick={() => toggleTag(tag.id)}
                sx={{
                  bgcolor: on ? tag.color : 'transparent',
                  color: on ? '#fff' : V.text,
                  border: `1px solid ${tag.color}`,
                  fontWeight: on ? 600 : 400,
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              />
            )
          })}
        </Stack>
      )}
    </Box>
  )
}
