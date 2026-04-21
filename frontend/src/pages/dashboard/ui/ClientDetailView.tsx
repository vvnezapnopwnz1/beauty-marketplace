import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  assignTag,
  createTag,
  fetchClient,
  fetchClientAppointments,
  fetchTags,
  mergeClientToUser,
  removeTag,
  updateClient,
  type ClientAppointmentRow,
  type ClientTag,
  type SalonClient,
} from '@shared/api/clientsApi'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждена',
  completed: 'Завершена',
  cancelled_by_salon: 'Отмена',
  no_show: 'Не пришёл',
}

function formatDt(s: string): string {
  return new Date(s).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function ClientDetailView() {
  const d = useDashboardPalette()
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()

  const [client, setClient] = useState<SalonClient | null>(null)
  const [allTags, setAllTags] = useState<ClientTag[]>([])
  const [appointments, setAppointments] = useState<ClientAppointmentRow[]>([])
  const [apptTotal, setApptTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState('')
  const [notesVal, setNotesVal] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)

  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeUserID, setMergeUserID] = useState('')
  const [mergeSaving, setMergeSaving] = useState(false)

  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#6366F1')
  const [tagCreating, setTagCreating] = useState(false)

  const notesRef = useRef<HTMLTextAreaElement | null>(null)

  const reload = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const [c, tags, appts] = await Promise.all([
        fetchClient(clientId),
        fetchTags(),
        fetchClientAppointments(clientId, 1, 25),
      ])
      setClient(c)
      setNameVal(c.displayName)
      setNotesVal(c.notes ?? '')
      setAllTags(tags)
      setAppointments(appts.items)
      setApptTotal(appts.total)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => { reload() }, [reload])

  async function saveName() {
    if (!clientId || !nameVal.trim()) return
    const updated = await updateClient(clientId, { displayName: nameVal.trim() })
    setClient(updated)
    setEditingName(false)
  }

  async function saveNotes() {
    if (!clientId || !client) return
    setNotesSaving(true)
    try {
      const updated = await updateClient(clientId, { notes: notesVal })
      setClient(updated)
    } finally {
      setNotesSaving(false)
    }
  }

  async function handleAssignTag(tagId: string) {
    if (!clientId) return
    const has = client?.tags.some(t => t.id === tagId)
    if (has) {
      await removeTag(clientId, tagId)
    } else {
      await assignTag(clientId, tagId)
    }
    reload()
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return
    setTagCreating(true)
    try {
      const t = await createTag({ name: newTagName.trim(), color: newTagColor })
      setAllTags(prev => [...prev, t])
      setNewTagName('')
      if (clientId) {
        await assignTag(clientId, t.id)
        reload()
      }
    } finally {
      setTagCreating(false)
    }
  }

  async function handleMerge() {
    if (!clientId || !mergeUserID.trim()) return
    setMergeSaving(true)
    try {
      await mergeClientToUser(clientId, mergeUserID.trim())
      setMergeOpen(false)
      reload()
    } finally {
      setMergeSaving(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={28} sx={{ color: d.accent }} />
      </Box>
    )
  }

  if (!client) {
    return <Typography sx={{ color: d.muted }}>Клиент не найден</Typography>
  }

  const recentAppts = appointments.filter(a => {
    const days = (Date.now() - new Date(a.startsAt).getTime()) / 86400000
    return days <= 30
  }).length
  const recentAppts90 = appointments.filter(a => {
    const days = (Date.now() - new Date(a.startsAt).getTime()) / 86400000
    return days <= 90
  }).length

  return (
    <Box sx={{ maxWidth: 800 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Button
          size="small"
          onClick={() => navigate('/dashboard?section=clients')}
          sx={{ color: d.muted, minWidth: 0 }}
        >
          ← Клиенты
        </Button>
      </Box>

      {/* Name */}
      <Box sx={{ mb: 3 }}>
        {editingName ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              size="small"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
              sx={{ '& .MuiInputBase-root': { color: d.text, bgcolor: d.card } }}
            />
            <Button size="small" variant="contained" onClick={saveName} sx={{ bgcolor: d.accent }}>Сохранить</Button>
            <Button size="small" onClick={() => { setEditingName(false); setNameVal(client.displayName) }}>Отмена</Button>
          </Stack>
        ) : (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 24, color: d.text }}>
              {client.displayName}
            </Typography>
            <Button size="small" onClick={() => setEditingName(true)} sx={{ color: d.muted, fontSize: 12 }}>
              ✏️
            </Button>
          </Stack>
        )}
      </Box>

      {/* Contact / account info */}
      <Box sx={{ bgcolor: d.card, border: `1px solid ${d.border}`, borderRadius: 2, p: 2.5, mb: 3 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: d.muted, mb: 1.5, textTransform: 'uppercase', letterSpacing: 1 }}>
          Контакт
        </Typography>
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography sx={{ color: d.muted, fontSize: 13, width: 120 }}>Телефон</Typography>
            <Typography sx={{ color: d.text, fontSize: 13 }}>
              {client.phoneE164 ?? client.userPhone ?? '—'}
            </Typography>
          </Box>
          {client.userId && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography sx={{ color: d.muted, fontSize: 13, width: 120 }}>Аккаунт</Typography>
              <Typography sx={{ color: d.green ?? d.accent, fontSize: 13 }}>
                {client.userDisplayName ?? 'Зарегистрирован'}
              </Typography>
            </Box>
          )}
          {!client.userId && (
            <Box>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setMergeOpen(true)}
                sx={{ mt: 0.5, borderColor: d.border, color: d.text, fontSize: 12 }}
              >
                Привязать к аккаунту
              </Button>
            </Box>
          )}
        </Stack>
      </Box>

      {/* Stats */}
      <Stack direction="row" spacing={2} mb={3}>
        {[
          { label: 'Всего визитов', value: client.visitCount },
          { label: 'За 30 дней', value: recentAppts },
          { label: 'За 90 дней', value: recentAppts90 },
        ].map(s => (
          <Box
            key={s.label}
            sx={{ bgcolor: d.card, border: `1px solid ${d.border}`, borderRadius: 2, p: 2, flex: 1, textAlign: 'center' }}
          >
            <Typography sx={{ fontSize: 22, fontWeight: 700, color: d.accent }}>{s.value}</Typography>
            <Typography sx={{ fontSize: 12, color: d.muted }}>{s.label}</Typography>
          </Box>
        ))}
      </Stack>

      {/* Tags */}
      <Box sx={{ bgcolor: d.card, border: `1px solid ${d.border}`, borderRadius: 2, p: 2.5, mb: 3 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: d.muted, mb: 1.5, textTransform: 'uppercase', letterSpacing: 1 }}>
          Теги
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
          {allTags.map(tag => {
            const active = client.tags.some(t => t.id === tag.id)
            return (
              <Chip
                key={tag.id}
                label={tag.name}
                size="small"
                onClick={() => handleAssignTag(tag.id)}
                sx={{
                  bgcolor: active ? tag.color : 'transparent',
                  color: active ? '#fff' : d.text,
                  border: `1px solid ${tag.color}`,
                  cursor: 'pointer',
                  fontWeight: active ? 600 : 400,
                }}
              />
            )
          })}
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            placeholder="Новый тег"
            size="small"
            sx={{ width: 160, '& .MuiInputBase-root': { color: d.text, bgcolor: d.sidebar } }}
          />
          <input
            type="color"
            value={newTagColor}
            onChange={e => setNewTagColor(e.target.value)}
            style={{ width: 36, height: 36, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 4 }}
          />
          <Button
            size="small"
            variant="contained"
            disabled={!newTagName.trim() || tagCreating}
            onClick={handleCreateTag}
            sx={{ bgcolor: d.accent }}
          >
            Добавить
          </Button>
        </Stack>
      </Box>

      {/* Notes */}
      <Box sx={{ bgcolor: d.card, border: `1px solid ${d.border}`, borderRadius: 2, p: 2.5, mb: 3 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: d.muted, mb: 1.5, textTransform: 'uppercase', letterSpacing: 1 }}>
          Заметки
        </Typography>
        <TextField
          inputRef={notesRef}
          multiline
          minRows={3}
          fullWidth
          value={notesVal}
          onChange={e => setNotesVal(e.target.value)}
          onBlur={saveNotes}
          placeholder="Заметки о клиенте..."
          sx={{ '& .MuiInputBase-root': { color: d.text, bgcolor: d.sidebar, fontSize: 14 } }}
        />
        {notesSaving && (
          <Typography sx={{ fontSize: 12, color: d.muted, mt: 0.5 }}>Сохранение...</Typography>
        )}
      </Box>

      {/* Appointment history */}
      <Box sx={{ bgcolor: d.card, border: `1px solid ${d.border}`, borderRadius: 2, p: 2.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: d.muted, mb: 1.5, textTransform: 'uppercase', letterSpacing: 1 }}>
          История визитов ({apptTotal})
        </Typography>
        {appointments.length === 0 ? (
          <Typography sx={{ color: d.muted, fontSize: 14 }}>Визиты не найдены</Typography>
        ) : (
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: d.text }}>
            <Box component="thead">
              <Box component="tr" sx={{ borderBottom: `1px solid ${d.border}` }}>
                {['Дата', 'Услуга', 'Мастер', 'Статус'].map(h => (
                  <Box key={h} component="th" sx={{ textAlign: 'left', py: 1, px: 1, color: d.muted, fontWeight: 500 }}>
                    {h}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {appointments.map(a => (
                <Box key={a.id} component="tr" sx={{ borderBottom: `1px solid ${d.borderSubtle}` }}>
                  <Box component="td" sx={{ py: 1, px: 1, whiteSpace: 'nowrap' }}>{formatDt(a.startsAt)}</Box>
                  <Box component="td" sx={{ py: 1, px: 1 }}>{a.serviceName}</Box>
                  <Box component="td" sx={{ py: 1, px: 1, color: d.muted }}>{a.staffName ?? '—'}</Box>
                  <Box component="td" sx={{ py: 1, px: 1 }}>
                    <Typography
                      component="span"
                      sx={{
                        fontSize: 12,
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: a.status === 'completed' ? 'rgba(78,205,196,.15)' : a.status === 'pending' ? 'rgba(255,217,61,.15)' : 'rgba(255,255,255,.07)',
                        color: a.status === 'completed' ? d.blue ?? d.accent : a.status === 'pending' ? d.yellow ?? d.accent : d.muted,
                      }}
                    >
                      {STATUS_LABELS[a.status] ?? a.status}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {/* Merge dialog */}
      <Dialog open={mergeOpen} onClose={() => setMergeOpen(false)}>
        <DialogTitle>Привязать к аккаунту</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 14, mb: 2 }}>Введите UUID пользователя:</Typography>
          <TextField
            fullWidth
            size="small"
            value={mergeUserID}
            onChange={e => setMergeUserID(e.target.value)}
            placeholder="user-uuid"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMergeOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            disabled={!mergeUserID.trim() || mergeSaving}
            onClick={handleMerge}
          >
            Привязать
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
