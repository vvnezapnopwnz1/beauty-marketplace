import { useState } from 'react'
import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { useAppSelector } from '@app/store'
import { selectProfile } from '@features/edit-profile/model/profileSlice'
import { DeleteAccountDialog } from '@features/delete-account/ui/DeleteAccountDialog'

export function DangerSection() {
  const profile = useAppSelector(selectProfile)
  const [open, setOpen] = useState(false)

  if (!profile) return null

  return (
    <Stack spacing={2} sx={{ maxWidth: 760 }}>
      <Alert severity="warning">
        После удаления аккаунта вход будет недоступен, восстановление возможно только через поддержку.
      </Alert>
      <Typography variant="body2" color="text.secondary">
        История записей останется у салонов, но ваш аккаунт будет деактивирован.
      </Typography>
      <Box>
        <Button color="error" variant="contained" onClick={() => setOpen(true)}>
          Удалить аккаунт
        </Button>
      </Box>

      <DeleteAccountDialog
        open={open}
        phone={profile.phone}
        onClose={() => setOpen(false)}
      />
    </Stack>
  )
}
