import { ChangeEvent, JSX, useRef, useState } from 'react'
import { Box, Button } from '@mui/material'
import { V } from '@shared/theme/palettes'

export interface MasterClientFilterState {
  search: string
}

interface Props {
  filters: MasterClientFilterState
  setFilters: (f: MasterClientFilterState) => void
  onNewClient?: () => void
}

export function MasterFilterClientsBar({ filters, setFilters, onNewClient }: Props): JSX.Element {
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [localSearch, setLocalSearch] = useState(filters.search)

  function onSearchChange(e: ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setLocalSearch(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setFilters({ ...filters, search: v }), 300)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2.5 }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        {onNewClient && (
          <Button variant="contained" size="small" onClick={onNewClient} sx={{ flexShrink: 0 }}>
            Новый клиент
          </Button>
        )}
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
      </Box>
    </Box>
  )
}
