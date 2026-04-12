import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Dialog, DialogContent, DialogTitle, TextField, Stack } from '@mui/material'
import type { CityOption } from '@shared/api/geoApi'
import { searchCities } from '@shared/api/geoApi'

const DEFAULT_CITIES: CityOption[] = [
  { cityName: 'Москва', regionId: 32 },
  { cityName: 'Санкт-Петербург', regionId: 2 },
  { cityName: 'Казань', regionId: 44 },
  { cityName: 'Екатеринбург', regionId: 54 },
  { cityName: 'Новосибирск', regionId: 4 },
  { cityName: 'Краснодар', regionId: 16 },
  { cityName: 'Нижний Новгород', regionId: 18 },
  { cityName: 'Самара', regionId: 51 },
]

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (city: CityOption) => void
}

export function CityPickerModal({ open, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [remote, setRemote] = useState<CityOption[]>([])

  useEffect(() => {
    if (!open) return
    if (query.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRemote([])
      return
    }
    const t = setTimeout(async () => {
      try {
        setRemote(await searchCities(query.trim()))
      } catch {
        setRemote([])
      }
    }, 250)
    return () => clearTimeout(t)
  }, [query, open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const local = DEFAULT_CITIES.filter(c => c.cityName.toLowerCase().includes(q))
    const seen = new Set(local.map(c => c.regionId))
    const merged = [...local]
    for (const c of remote) {
      if (!seen.has(c.regionId)) merged.push(c)
    }
    return merged
  }, [query, remote])

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Выберите ваш город</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Введите город"
          sx={{ mb: 2 }}
        />
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {filtered.map(city => (
            <Button
              key={city.regionId}
              variant="outlined"
              onClick={() => {
                onSelect(city)
                onClose()
              }}
              sx={{ borderRadius: 99 }}
            >
              {city.cityName}
            </Button>
          ))}
          {filtered.length === 0 && <Box color="text.secondary">Ничего не найдено</Box>}
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
