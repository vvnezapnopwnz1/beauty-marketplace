import { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { clearTokens } from '@shared/api/authApi'
import { deleteMyAccount, type DeleteMeConflictError } from '@shared/api/meApi'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@shared/config/routes'

interface Props {
  open: boolean
  phone: string
  onClose: () => void
}

export function DeleteAccountDialog({ open, phone, onClose }: Props) {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ownedSalons, setOwnedSalons] = useState<string[]>([])

  const canDelete = useMemo(() => input.trim() === phone.trim() && !loading, [input, phone, loading])

  const onDelete = async () => {
    if (!canDelete) return
    setError(null)
    setOwnedSalons([])
    setLoading(true)
    try {
      await deleteMyAccount()
      clearTokens()
      onClose()
      navigate(ROUTES.HOME, { replace: true })
    } catch (e) {
      const err = e as Error & Partial<DeleteMeConflictError>
      if (err.message === 'has_owned_salons' && Array.isArray(err.salonIds)) {
        setError('Нельзя удалить аккаунт, пока вы владеете салонами.')
        setOwnedSalons(err.salonIds)
      } else {
        setError(err.message || 'Не удалось удалить аккаунт')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Удалить аккаунт</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Это действие выполнит soft-delete профиля. Вход станет недоступен, восстановление — через поддержку.
          </Typography>
          <Alert severity="warning">
            Для подтверждения введите ваш номер телефона: <strong>{phone}</strong>
          </Alert>
          <TextField
            label="Подтверждение телефона"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            fullWidth
          />
          {error && <Alert severity="error">{error}</Alert>}
          {ownedSalons.length > 0 && (
            <List dense sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              {ownedSalons.map((id) => (
                <ListItem key={id}>
                  <ListItemText primary={id} />
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Отмена</Button>
        <Button color="error" variant="contained" onClick={() => void onDelete()} disabled={!canDelete}>
          {loading ? 'Удаляем...' : 'Удалить аккаунт'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
