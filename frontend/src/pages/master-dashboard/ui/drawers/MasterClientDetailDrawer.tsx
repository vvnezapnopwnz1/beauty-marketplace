import { useMemo, useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { useDashboardFormStyles } from '@pages/dashboard/theme/formStyles'
import {
  useDeleteMasterClientMutation,
  useUpdateMasterClientMutation,
  type MasterClientDTO,
} from '@entities/master'
import { enqueueFormSnackbar } from '@shared/ui/FormSnackbar'
import { formatPhone, parseOptionalRuPhone, toRuE164 } from '@shared/lib/formatPhone'

export type MasterClientDetailDrawerProps = {
  open: boolean
  client: MasterClientDTO | null
  onClose: () => void
}

function MasterClientDetailBody({
  client,
  onClose,
}: {
  client: MasterClientDTO
  onClose: () => void
}) {
  const d = useDashboardPalette()
  const { inputBaseSx, textareaSx } = useDashboardFormStyles()
  const [updateClient, { isLoading: updateBusy }] = useUpdateMasterClientMutation()
  const [deleteClient, { isLoading: deleteBusy }] = useDeleteMasterClientMutation()

  const [nameVal, setNameVal] = useState(client.displayName)
  const [phoneVal, setPhoneVal] = useState(formatPhone(client.phone ?? ''))
  const [extraVal, setExtraVal] = useState(client.extraContact ?? '')
  const [notesVal, setNotesVal] = useState(client.notes ?? '')
  const [deleteOpen, setDeleteOpen] = useState(false)

  const phoneLocked = Boolean(client.userId)

  const dirty = useMemo(
    () =>
      nameVal.trim() !== client.displayName ||
      (!phoneLocked &&
        (toRuE164(phoneVal) ?? '') !== (toRuE164(client.phone ?? '') ?? '')) ||
      extraVal.trim() !== (client.extraContact ?? '') ||
      notesVal !== (client.notes ?? ''),
    [client, nameVal, phoneVal, extraVal, notesVal, phoneLocked],
  )

  const handleClose = () => {
    setDeleteOpen(false)
    onClose()
  }

  async function saveChanges() {
    if (!nameVal.trim()) {
      enqueueFormSnackbar('Введите имя', 'Error')
      return
    }
    const parsedPhone = parseOptionalRuPhone(phoneVal)
    if (!phoneLocked && parsedPhone.kind === 'invalid') {
      enqueueFormSnackbar('Некорректный телефон', 'Error')
      return
    }
    try {
      const phoneBody = phoneLocked
        ? (client.phone ?? null)
        : parsedPhone.kind === 'valid'
          ? parsedPhone.e164
          : null
      await updateClient({
        id: client.id,
        body: {
          displayName: nameVal.trim(),
          phone: phoneBody,
          notes: notesVal.trim() || null,
          extraContact: extraVal.trim() || null,
          ...(client.userId ? { userId: client.userId } : {}),
        },
      }).unwrap()
      enqueueFormSnackbar('Сохранено', 'Success')
      handleClose()
    } catch (e) {
      enqueueFormSnackbar(e instanceof Error ? e.message : 'Ошибка сохранения', 'Error')
    }
  }

  async function confirmDelete() {
    try {
      await deleteClient(client.id).unwrap()
      setDeleteOpen(false)
      handleClose()
    } catch {
      enqueueFormSnackbar('Не удалось удалить', 'Error')
    }
  }

  return (
    <>
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
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: d.text }}>Клиент</Typography>
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
            <Box
              sx={{
                bgcolor: d.card,
                border: `1px solid ${d.borderSubtle}`,
                borderRadius: '14px',
                p: 2,
              }}
            >
              <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5 }}>Имя</Typography>
              <TextField value={nameVal} onChange={e => setNameVal(e.target.value)} fullWidth sx={inputBaseSx} />
              <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5, mt: 1.5 }}>Телефон</Typography>
              <TextField
                value={phoneVal}
                onChange={e => setPhoneVal(formatPhone(e.target.value))}
                inputMode="numeric"
                fullWidth
                disabled={phoneLocked}
                helperText={phoneLocked ? 'Телефон привязан к аккаунту пользователя' : undefined}
                InputProps={{
                  startAdornment: (
                    <PhoneOutlinedIcon sx={{ color: d.mutedDark, fontSize: 18, mr: 1.5 }} />
                  ),
                }}
                sx={inputBaseSx}
              />
              <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5, mt: 1 }}>Доп. контакт</Typography>
              <TextField value={extraVal} onChange={e => setExtraVal(e.target.value)} fullWidth sx={inputBaseSx} />
              <Typography sx={{ fontSize: 12, color: d.mutedDark, mb: 0.5, mt: 1.5 }}>Заметки</Typography>
              <TextField
                value={notesVal}
                onChange={e => setNotesVal(e.target.value)}
                fullWidth
                multiline
                minRows={4}
                sx={{ ...inputBaseSx, ...textareaSx }}
              />
            </Box>
          </Stack>
        </Box>

        <Box sx={{ p: 3, borderTop: `1px solid ${d.borderSubtle}`, bgcolor: d.card }}>
          <Stack spacing={1}>
            <Button
              variant="contained"
              fullWidth
              disabled={!dirty || updateBusy}
              onClick={() => void saveChanges()}
              sx={{ bgcolor: d.accent, color: d.onAccent, textTransform: 'none', fontWeight: 700 }}
            >
              {updateBusy ? 'Сохранение…' : 'Сохранить'}
            </Button>
            <Button
              variant="outlined"
              color="error"
              fullWidth
              disabled={deleteBusy}
              onClick={() => setDeleteOpen(true)}
              sx={{ textTransform: 'none' }}
            >
              Удалить клиента
            </Button>
          </Stack>
        </Box>
      </Box>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Удалить клиента?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 14 }}>Действие необратимо для этой карточки в вашей базе.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Отмена</Button>
          <Button color="error" variant="contained" disabled={deleteBusy} onClick={() => void confirmDelete()}>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export function MasterClientDetailDrawer({ open, client, onClose }: MasterClientDetailDrawerProps) {
  const d = useDashboardPalette()

  return (
    <Drawer
      anchor="right"
      open={open && !!client}
      onClose={onClose}
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
      {client ? <MasterClientDetailBody key={client.id} client={client} onClose={onClose} /> : null}
    </Drawer>
  )
}
