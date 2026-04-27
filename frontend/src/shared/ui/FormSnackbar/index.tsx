import { Box, Typography } from '@mui/material'
import { enqueueSnackbar, type SnackbarKey } from 'notistack'

export type FormSnackbarVariant = 'Error' | 'Success' | 'Info'

type FormSnackbarProps = {
  message: string
  variant: FormSnackbarVariant
}

const variantStyles: Record<FormSnackbarVariant, { bg: string; color: string }> = {
  Error: { bg: '#C04156', color: '#FFFFFF' },
  Success: { bg: '#2E7D5A', color: '#FFFFFF' },
  Info: { bg: '#2C5E97', color: '#FFFFFF' },
}

export function FormSnackbar({ message, variant }: FormSnackbarProps) {
  const cfg = variantStyles[variant]
  return (
    <Box
      sx={{
        minWidth: 280,
        maxWidth: 560,
        px: 2,
        py: 1.25,
        borderRadius: '10px',
        bgcolor: cfg.bg,
        color: cfg.color,
        boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{message}</Typography>
    </Box>
  )
}

const notistackVariantMap: Record<FormSnackbarVariant, 'error' | 'success' | 'info'> = {
  Error: 'error',
  Success: 'success',
  Info: 'info',
}

export function enqueueFormSnackbar(message: string, variant: FormSnackbarVariant): SnackbarKey {
  return enqueueSnackbar(message, {
    variant: notistackVariantMap[variant],
    anchorOrigin: { vertical: 'top', horizontal: 'center' },
    autoHideDuration: 4000,
    content: () => <FormSnackbar message={message} variant={variant} />,
  })
}
