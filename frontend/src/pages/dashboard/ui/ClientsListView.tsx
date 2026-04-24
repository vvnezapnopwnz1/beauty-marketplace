import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Chip,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { fetchClients, fetchTags, type ClientTag, type SalonClient } from '@shared/api/clientsApi'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'

// const STATUS_LABELS: Record<string, string> = {
//   pending: 'Ожидает',
//   confirmed: 'Подтверждена',
//   completed: 'Завершена',
//   cancelled_by_salon: 'Отмена',
//   no_show: 'Не пришёл',
// }

function formatDate(s: string | null | undefined): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function ClientsListView() {
  const d = useDashboardPalette()
  const navigate = useNavigate()

  const [clients, setClients] = useState<SalonClient[]>([])
  const [total, setTotal] = useState(0)
  const [tags, setTags] = useState<ClientTag[]>([])
  const [search, setSearch] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [page] = useState(1)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchClients({ search, tagIds: selectedTagIds, page, pageSize: 50 })
      setClients(res.items)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }, [search, selectedTagIds, page])

  useEffect(() => {
    fetchTags()
      .then(setTags)
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function toggleTag(id: string) {
    setSelectedTagIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  return (
    <Box>
      <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: d.text, mb: 2 }}>
        Клиенты
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} alignItems="flex-start">
        <TextField
          size="small"
          placeholder="Поиск по имени или телефону"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{
            width: { xs: '100%', sm: 300 },
            '& .MuiInputBase-root': { bgcolor: d.card, color: d.text, borderColor: d.border },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <span style={{ color: d.muted }}>🔍</span>
              </InputAdornment>
            ),
          }}
        />
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {tags.map(tag => {
            const on = selectedTagIds.includes(tag.id)
            return (
              <Chip
                key={tag.id}
                label={tag.name}
                size="small"
                onClick={() => toggleTag(tag.id)}
                sx={{
                  bgcolor: on ? tag.color : 'transparent',
                  color: on ? '#fff' : d.text,
                  border: `1px solid ${tag.color}`,
                  fontWeight: on ? 600 : 400,
                  cursor: 'pointer',
                }}
              />
            )
          })}
        </Stack>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} sx={{ color: d.accent }} />
        </Box>
      ) : (
        <>
          <Box sx={{ overflowX: 'auto' }}>
            <Box
              component="table"
              sx={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 14,
                color: d.text,
              }}
            >
              <Box component="thead">
                <Box component="tr" sx={{ borderBottom: `1px solid ${d.border}` }}>
                  {['Имя', 'Телефон', 'Теги', 'Визиты', 'Последний визит'].map(h => (
                    <Box
                      key={h}
                      component="th"
                      sx={{
                        textAlign: 'left',
                        py: 1,
                        px: 1.5,
                        color: d.muted,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {clients.length === 0 && (
                  <Box component="tr">
                    <Box
                      component="td"
                      colSpan={5}
                      sx={{ py: 4, textAlign: 'center', color: d.muted }}
                    >
                      Клиенты не найдены
                    </Box>
                  </Box>
                )}
                {clients.map(client => (
                  <Box
                    key={client.id}
                    component="tr"
                    onClick={() => navigate(`/dashboard/clients/${client.id}`)}
                    sx={{
                      cursor: 'pointer',
                      borderBottom: `1px solid ${d.borderSubtle}`,
                      '&:hover': { bgcolor: d.navHover },
                    }}
                  >
                    <Box component="td" sx={{ py: 1.25, px: 1.5, fontWeight: 500 }}>
                      {client.displayName}
                    </Box>
                    <Box component="td" sx={{ py: 1.25, px: 1.5, color: d.muted }}>
                      {client.phoneE164 ?? client.userPhone ?? '—'}
                    </Box>
                    <Box component="td" sx={{ py: 1.25, px: 1.5 }}>
                      <Stack direction="row" flexWrap="wrap" gap={0.5}>
                        {client.tags.map(tag => (
                          <Chip
                            key={tag.id}
                            label={tag.name}
                            size="small"
                            sx={{ bgcolor: tag.color, color: '#fff', fontSize: 11, height: 20 }}
                          />
                        ))}
                      </Stack>
                    </Box>
                    <Box component="td" sx={{ py: 1.25, px: 1.5 }}>
                      {client.visitCount}
                    </Box>
                    <Box component="td" sx={{ py: 1.25, px: 1.5, color: d.muted }}>
                      {formatDate(client.lastVisitAt)}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
          <Typography sx={{ fontSize: 12, color: d.muted, mt: 1 }}>Всего: {total}</Typography>
        </>
      )}
    </Box>
  )
}
