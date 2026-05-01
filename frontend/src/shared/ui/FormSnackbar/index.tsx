import { Box, Typography, useTheme } from '@mui/material'
import { enqueueSnackbar, type SnackbarKey } from 'notistack'
import { forwardRef, type CSSProperties } from 'react'

export type FormSnackbarVariant = 'Error' | 'Success' | 'Info'

type FormSnackbarProps = {
  message: string
  variant: FormSnackbarVariant
  style?: CSSProperties
}

export const FormSnackbar = forwardRef<HTMLDivElement, FormSnackbarProps>(function FormSnackbar(
  { message, variant, style },
  ref,
) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const getVariantConfig = () => {
    switch (variant) {
      case 'Error': return { bg: theme.palette.error[isDark ? 'dark' : 'main'], color: '#FFFFFF' }
      case 'Success': return { bg: theme.palette.success[isDark ? 'dark' : 'main'], color: '#FFFFFF' }
      case 'Info': return { bg: theme.palette.info[isDark ? 'dark' : 'main'], color: '#FFFFFF' }
    }
  }

  const cfg = getVariantConfig()

  return (
    <Box
      ref={ref}
      style={style}
      sx={{
        minWidth: 280,
        maxWidth: 560,
        px: 2,
        py: 1.25,
        borderRadius: '16px',
        bgcolor: cfg.bg,
        color: cfg.color,
        boxShadow: isDark ? '0 8px 24px rgba(255,255,255,0.08)' : '0 8px 24px rgba(0,0,0,0.22)',
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{message}</Typography>
    </Box>
  )
})

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
