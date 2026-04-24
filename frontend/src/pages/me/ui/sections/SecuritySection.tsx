import { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, Divider, List, ListItem, ListItemText, Stack, Typography } from '@mui/material'
import { fetchMySessions, revokeAllSessions, revokeSession, type UserSession } from '@shared/api/meApi'
import { useAppSelector } from '@app/store'
import { selectProfile } from '@features/edit-profile/model/profileSlice'

function formatDt(value: string): string {
  const d = new Date(value)
  return d.toLocaleString('ru-RU')
}

export function SecuritySection() {
  const profile = useAppSelector(selectProfile)
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setSessions(await fetchMySessions())
    } catch (e) {
      setError((e as Error).message || 'Не удалось загрузить сессии')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleRevoke = async (sessionId: string) => {
    const ok = window.confirm('Отозвать эту сессию?')
    if (!ok) return
    try {
      await revokeSession(sessionId)
      setInfo('Сессия отозвана')
      await load()
    } catch (e) {
      const msg = (e as Error).message || 'Ошибка отзыва сессии'
      setError(msg === 'cannot_revoke_current' ? 'Текущую сессию отозвать нельзя' : msg)
    }
  }

  const handleRevokeAll = async () => {
    const ok = window.confirm('Выйти на всех устройствах кроме текущего?')
    if (!ok) return
    try {
      const result = await revokeAllSessions()
      setInfo(`Отозвано сессий: ${result.revoked}`)
      await load()
    } catch (e) {
      setError((e as Error).message || 'Ошибка массового выхода')
    }
  }

  return (
    <Stack spacing={2} sx={{ maxWidth: 760 }}>
      <Alert severity="info">
        Телефон: <strong>{profile?.phone ?? '—'}</strong><br />
        Чтобы сменить номер, напишите в поддержку.
      </Alert>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {info && <Alert severity="success" onClose={() => setInfo(null)}>{info}</Alert>}

      <Box>
        <Typography variant="h6" sx={{ mb: 1 }}>Активные сессии</Typography>
        <List sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 0 }}>
          {sessions.map((s, idx) => (
            <Box key={s.id}>
              <ListItem
                secondaryAction={
                  s.isCurrent ? null : (
                    <Button size="small" color="warning" onClick={() => void handleRevoke(s.id)}>
                      Отозвать
                    </Button>
                  )
                }
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2">Создана: {formatDt(s.createdAt)}</Typography>
                      {s.isCurrent && <Chip size="small" color="primary" label="Текущая" />}
                    </Stack>
                  }
                  secondary={`Действует до: ${formatDt(s.expiresAt)}`}
                />
              </ListItem>
              {idx < sessions.length - 1 && <Divider />}
            </Box>
          ))}
          {!loading && sessions.length === 0 && (
            <ListItem>
              <ListItemText primary="Активные сессии не найдены" />
            </ListItem>
          )}
        </List>
      </Box>

      <Box>
        <Button variant="outlined" color="warning" onClick={() => void handleRevokeAll()} disabled={loading}>
          Выйти везде, кроме этого устройства
        </Button>
      </Box>
    </Stack>
  )
}
