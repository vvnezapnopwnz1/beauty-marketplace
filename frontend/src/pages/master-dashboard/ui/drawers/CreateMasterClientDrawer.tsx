import { useState } from 'react'
import {
  Box,
  Button,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { useDashboardFormStyles } from '@pages/dashboard/theme/formStyles'
import { useCreateMasterClientMutation } from '@entities/master'
import { enqueueFormSnackbar } from '@shared/ui/FormSnackbar'

export type CreateMasterClientDrawerProps = {
  open: boolean
  onClose: () => void
}

export function CreateMasterClientDrawer({ open, onClose }: CreateMasterClientDrawerProps) {
  const d = useDashboardPalette()
  const { inputBaseSx } = useDashboardFormStyles()
  const [createClient, { isLoading }] = useCreateMasterClientMutation()
  const [form, setForm] = useState({ displayName: '', phone: '', notes: '', extraContact: '' })

  const handleClose = () => {
    setForm({ displayName: '', phone: '', notes: '', extraContact: '' })
    onClose()
  }

  const handleSubmit = async () => {
    if (!form.displayName.trim()) {
      enqueueFormSnackbar('Введите имя клиента', 'Error')
      return
    }
    try {
      await createClient({
        displayName: form.displayName.trim(),
        phone: form.phone.trim() || undefined,
        notes: form.notes.trim() || undefined,
        extraContact: form.extraContact.trim() || undefined,
      }).unwrap()
      handleClose()
    } catch {
      enqueueFormSnackbar('Ошибка при создании клиента', 'Error')
    }
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      slotProps={{ backdrop: { sx: { bgcolor: d.backdrop, backdropFilter: 'blur(4px)' } } }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: '440px' },
          maxWidth: '100%',
          bgcolor: d.page,
          borderLeft: `1px solid ${d.border}`,
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            py: 2,
            borderBottom: `1px solid ${d.borderSubtle}`,
            bgcolor: d.card,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: d.text, lineHeight: 1.2 }}>
              Новый клиент
            </Typography>
            <Typography sx={{ fontSize: 12, color: d.mutedDark }}>Личная база мастера</Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{ color: d.mutedDark, bgcolor: d.control, '&:hover': { bgcolor: d.controlHover } }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 3 }}>
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>Имя *</Typography>
              <TextField
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                fullWidth
                autoFocus
                placeholder="Иванова Мария"
                onKeyDown={e => {
                  if (e.key === 'Enter') void handleSubmit()
                }}
                InputProps={{
                  startAdornment: (
                    <PersonOutlineIcon sx={{ color: d.mutedDark, fontSize: 18, mr: 1.5 }} />
                  ),
                }}
                sx={inputBaseSx}
              />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>Телефон</Typography>
              <TextField
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                fullWidth
                placeholder="+7…"
                InputProps={{
                  startAdornment: (
                    <PhoneOutlinedIcon sx={{ color: d.mutedDark, fontSize: 18, mr: 1.5 }} />
                  ),
                }}
                sx={inputBaseSx}
              />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>Доп. контакт</Typography>
              <TextField
                value={form.extraContact}
                onChange={e => setForm(f => ({ ...f, extraContact: e.target.value }))}
                fullWidth
                sx={inputBaseSx}
              />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>Заметки</Typography>
              <TextField
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                fullWidth
                multiline
                minRows={3}
                sx={inputBaseSx}
              />
            </Box>
          </Stack>
        </Box>

        <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${d.borderSubtle}`, bgcolor: d.card }}>
          <Button
            variant="contained"
            fullWidth
            disabled={isLoading}
            onClick={() => void handleSubmit()}
            sx={{
              bgcolor: d.accent,
              color: d.onAccent,
              py: 1.25,
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: 15,
              textTransform: 'none',
            }}
          >
            {isLoading ? 'Создание...' : 'Создать клиента'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  )
}
