import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'

import { searchPlaces } from '@shared/api/placesApi'
import { claimSalonPath } from '@shared/config/routes'
import { NavBar } from '@shared/ui/NavBar'

interface PlaceResult {
  externalId: string
  name: string
  address: string
}

export function JoinPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await searchPlaces({ q: query.trim(), pageSize: 10 })
      setResults(
        res.items.map((p) => ({
          externalId: p.externalId,
          name: p.name,
          address: p.address ?? '',
        })),
      )
      setSearched(true)
    } catch {
      setError('Ошибка поиска. Попробуйте еще раз.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <NavBar />
      <Box sx={{ maxWidth: 640, mx: 'auto', px: 2, py: 6, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontFamily: "'Fraunces', serif", mb: 1 }}>
          Добавьте свой салон
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Найдите ваш бизнес в 2GIS и заявите права — получите дашборд с онлайн-записью.
        </Typography>

        <Stack direction="row" gap={1} sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Название или адрес вашего салона"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
          />
          <Button variant="contained" disabled={loading} onClick={handleSearch} sx={{ minWidth: 120 }}>
            {loading ? <CircularProgress size={20} /> : 'Найти'}
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack gap={1.5} textAlign="left">
          {results.map((p) => (
            <Box
              key={p.externalId}
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              onClick={() => navigate(claimSalonPath('2gis', p.externalId))}
            >
              <Typography fontWeight={600}>{p.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {p.address}
              </Typography>
            </Box>
          ))}
          {searched && results.length === 0 && (
            <Typography color="text.secondary">
              Ничего не найдено. Попробуйте другое название.
            </Typography>
          )}
        </Stack>
      </Box>
    </Box>
  )
}
