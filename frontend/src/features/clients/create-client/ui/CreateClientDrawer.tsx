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
import { closeClientDrawer, useCreateClientMutation } from '@entities/client'
import { useAppDispatch } from '@app/store'
import { enqueueFormSnackbar } from '@shared/ui/FormSnackbar'
import { formatPhone, parseOptionalRuPhone } from '@shared/lib/formatPhone'

export type CreateClientDrawerProps = {
  open: boolean
  onClose: () => void
}

export function CreateClientDrawer({ open, onClose }: CreateClientDrawerProps) {
  const d = useDashboardPalette()
  const { inputBaseSx } = useDashboardFormStyles()
  const dispatch = useAppDispatch()
  const [createClient, { isLoading }] = useCreateClientMutation()
  const [form, setForm] = useState({ displayName: '', phoneE164: '' })

  const handleClose = () => {
    setForm({ displayName: '', phoneE164: '' })
    onClose()
  }

  const handleSubmit = async () => {
    if (!form.displayName.trim()) {
      enqueueFormSnackbar('Введите имя клиента', 'Error')
      return
    }
    const phoneParsed = parseOptionalRuPhone(form.phoneE164)
    if (phoneParsed.kind === 'invalid') {
      enqueueFormSnackbar('Некорректный телефон', 'Error')
      return
    }
    try {
      await createClient({
        displayName: form.displayName.trim(),
        phoneE164: phoneParsed.kind === 'valid' ? phoneParsed.e164 : undefined,
      }).unwrap()
      dispatch(closeClientDrawer())
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
            <Typography sx={{ fontSize: 12, color: d.mutedDark }}>Добавление в базу салона</Typography>
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
              <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>Имя клиента *</Typography>
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
              <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>
                Телефон (необязательно)
              </Typography>
              <TextField
                value={form.phoneE164}
                onChange={e => setForm(f => ({ ...f, phoneE164: formatPhone(e.target.value) }))}
                inputMode="numeric"
                fullWidth
                placeholder="+7 (___) ___ - __ - __"
                InputProps={{
                  startAdornment: (
                    <PhoneOutlinedIcon sx={{ color: d.mutedDark, fontSize: 18, mr: 1.5 }} />
                  ),
                }}
                sx={inputBaseSx}
              />
            </Box>

            <Typography sx={{ fontSize: 12, color: d.mutedDark }}>
              После создания вы сможете добавить заметки, теги и историю визитов в карточке клиента.
            </Typography>
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
              boxShadow: `0 4px 14px ${d.accent}40`,
              '&:hover': {
                bgcolor: d.accent,
                boxShadow: `0 6px 20px ${d.accent}60`,
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s',
            }}
          >
            {isLoading ? 'Создание...' : 'Создать клиента'}
          </Button>
          <Typography sx={{ textAlign: 'center', mt: 1.5, fontSize: 11, color: d.mutedDark }}>
            Клиент будет добавлен в базу салона
          </Typography>
        </Box>
      </Box>
    </Drawer>
  )
}
