import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useAppDispatch } from '@app/store'
import { loadProfile } from '@features/edit-profile/model/profileSlice'
import {
  acceptMySalonInvite,
  declineMySalonInvite,
  fetchMySalonInvites,
  type MySalonInviteRow,
} from '@shared/api/meApi'
import { salonRoleLabelRu } from '@shared/config/routes'

export function SalonInvitesSection() {
  const dispatch = useAppDispatch()
  const [items, setItems] = useState<MySalonInviteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setErr(null)
    setLoading(true)
    try {
      const list = await fetchMySalonInvites()
      setItems(list)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function onAccept(id: string) {
    setErr(null)
    try {
      await acceptMySalonInvite(id)
      await reload()
      void dispatch(loadProfile())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  async function onDecline(id: string) {
    setErr(null)
    try {
      await declineMySalonInvite(id)
      await reload()
      void dispatch(loadProfile())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress />
      </Stack>
    )
  }

  return (
    <Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Приглашения в команду салона. После принятия вы получите доступ в кабинет согласно роли.
      </Typography>
      {err && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}
      {items.length === 0 ? (
        <Typography color="text.secondary">Нет ожидающих приглашений</Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Салон</TableCell>
                <TableCell>Роль</TableCell>
                <TableCell>Телефон</TableCell>
                <TableCell align="right">Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map(row => (
                <TableRow key={row.id}>
                  <TableCell>{row.salonName || 'Салон'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={salonRoleLabelRu(row.role)} />
                  </TableCell>
                  <TableCell>{row.phoneE164}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" variant="outlined" onClick={() => void onDecline(row.id)}>
                        Отклонить
                      </Button>
                      <Button size="small" variant="contained" onClick={() => void onAccept(row.id)}>
                        Принять
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
