import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Drawer,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useCreateStaffInviteMutation } from '@entities/salon-invite'

type Props = {
  open: boolean
  onClose: () => void
}

export function InviteStaffDrawer({ open, onClose }: Props) {
  const [phone, setPhone] = useState('+7')
  const [role, setRole] = useState<'admin' | 'receptionist'>('receptionist')
  const [err, setErr] = useState<string | null>(null)
  const [createInvite, { isLoading }] = useCreateStaffInviteMutation()

  async function submit() {
    setErr(null)
    try {
      await createInvite({ phoneE164: phone.trim(), role }).unwrap()
      setPhone('+7')
      setRole('receptionist')
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не удалось отправить приглашение')
    }
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 400 }, p: 2 } }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Пригласить сотрудника
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Укажите телефон в формате +7XXXXXXXXXX. После регистрации по этому номеру приглашение появится в разделе «Профиль → Приглашения».
      </Typography>
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      <Stack spacing={2}>
        <TextField
          label="Телефон (E.164)"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          fullWidth
          placeholder="+79001234567"
        />
        <FormControl fullWidth>
          <InputLabel id="invite-role-label">Роль</InputLabel>
          <Select
            labelId="invite-role-label"
            label="Роль"
            value={role}
            onChange={e => setRole(e.target.value as 'admin' | 'receptionist')}
          >
            <MenuItem value="admin">Администратор</MenuItem>
            <MenuItem value="receptionist">Ресепшн</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', pt: 1 }}>
          <Button onClick={onClose}>Отмена</Button>
          <Button variant="contained" onClick={() => void submit()} disabled={isLoading}>
            Пригласить
          </Button>
        </Box>
      </Stack>
    </Drawer>
  )
}
