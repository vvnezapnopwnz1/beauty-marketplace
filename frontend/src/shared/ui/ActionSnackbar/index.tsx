import { Box, Button, Stack, Typography } from '@mui/material'
import { closeSnackbar, enqueueSnackbar, type SnackbarKey } from 'notistack'
import { forwardRef, type CSSProperties, type ReactNode } from 'react'

export type ActionSnackbarVariant = 'error' | 'success' | 'info' | 'warning'

export type ActionSnackbarButton = {
  label: string
  onClick?: () => void
  closeOnClick?: boolean
}

type ActionSnackbarCardProps = {
  message: string
  title?: string
  variant: ActionSnackbarVariant
  actions?: ActionSnackbarButton[]
  customContent?: ReactNode
  snackbarKey?: SnackbarKey
  style?: CSSProperties
}

type EnqueueActionSnackbarInput = {
  message: string
  title?: string
  variant?: ActionSnackbarVariant
  autoHideDuration?: number | null
  anchorOrigin?: { vertical: 'top' | 'bottom'; horizontal: 'left' | 'center' | 'right' }
  actions?: ActionSnackbarButton[]
  customContent?: ReactNode
}

const variantStyles: Record<ActionSnackbarVariant, { bg: string; color: string; buttonColor: 'inherit' | 'warning' }> = {
  error: { bg: '#C04156', color: '#FFFFFF', buttonColor: 'inherit' },
  success: { bg: '#2E7D5A', color: '#FFFFFF', buttonColor: 'inherit' },
  info: { bg: '#2C5E97', color: '#FFFFFF', buttonColor: 'inherit' },
  warning: { bg: '#946200', color: '#FFFFFF', buttonColor: 'warning' },
}

const ActionSnackbarCard = forwardRef<HTMLDivElement, ActionSnackbarCardProps>(function ActionSnackbarCard(
  { message, title, variant, actions, customContent, snackbarKey, style },
  ref,
) {
  const cfg = variantStyles[variant]
  return (
    <Box
      ref={ref}
      style={style}
      sx={{
        minWidth: 320,
        maxWidth: 620,
        px: 2,
        py: 1.5,
        borderRadius: '10px',
        bgcolor: cfg.bg,
        color: cfg.color,
        boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
      }}
    >
      {title && (
        <Typography sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, mb: 0.5 }}>
          {title}
        </Typography>
      )}
      <Typography sx={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{message}</Typography>
      {customContent}
      {!!actions?.length && (
        <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
          {actions.map((action) => (
            <Button
              key={action.label}
              size="small"
              variant="outlined"
              color={cfg.buttonColor}
              sx={{
                borderColor: 'rgba(255,255,255,0.35)',
                color: '#FFFFFF',
                '&:hover': { borderColor: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.08)' },
              }}
              onClick={() => {
                action.onClick?.()
                if (action.closeOnClick !== false && snackbarKey !== undefined) {
                  closeSnackbar(snackbarKey)
                }
              }}
            >
              {action.label}
            </Button>
          ))}
        </Stack>
      )}
    </Box>
  )
})

export function enqueueActionSnackbar(input: EnqueueActionSnackbarInput): SnackbarKey {
  const {
    message,
    title,
    variant = 'info',
    autoHideDuration = 5000,
    anchorOrigin = { vertical: 'top', horizontal: 'center' },
    actions = [],
    customContent,
  } = input

  const key = enqueueSnackbar(message, {
    variant,
    autoHideDuration: autoHideDuration ?? undefined,
    persist: autoHideDuration === null,
    anchorOrigin,
    content: (snackbarKey) => (
      <ActionSnackbarCard
        snackbarKey={snackbarKey}
        title={title}
        message={message}
        variant={variant}
        actions={actions}
        customContent={customContent}
      />
    ),
  })
  return key
}
