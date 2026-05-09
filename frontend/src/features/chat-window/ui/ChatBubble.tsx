import { Box, Typography, Button, Paper, alpha } from '@mui/material'
import type { ChatMessage } from '@entities/chat'
import { useTranslation } from 'react-i18next'

interface Props {
  msg: ChatMessage
  isOwn: boolean
  onAction?: (type: string, data?: any) => void
}

export function ChatBubble({ msg, isOwn, onAction }: Props) {
  const { t } = useTranslation()

  if (msg.isSystem) {
    return (
      <Box sx={{ alignSelf: 'center', my: 1, textAlign: 'center', width: '100%' }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontStyle: 'italic',
            bgcolor: 'grey.50',
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            display: 'inline-block',
          }}
        >
          {msg.body}
        </Typography>
      </Box>
    )
  }

  if (msg.type === 'appointment_request') {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          my: 1,
          alignSelf: isOwn ? 'flex-end' : 'flex-start',
          maxWidth: '85%',
          border: '1px solid',
          borderColor: 'primary.light',
          bgcolor: isOwn ? 'primary.50' : 'background.paper',
          borderRadius: 2,
        }}
      >
        <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 600 }}>
          {t('chat.appointmentRequest')}
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.primary' }}>
          {msg.body}
        </Typography>
        {!isOwn && onAction && (
          <Button
            variant="contained"
            size="small"
            fullWidth
            onClick={() => onAction('book', msg.data)}
            sx={{ borderRadius: 1.5 }}
          >
            {t('chat.bookNow')}
          </Button>
        )}
      </Paper>
    )
  }

  return (
    <Box
      sx={{
        alignSelf: isOwn ? 'flex-end' : 'flex-start',
        bgcolor: isOwn ? 'primary.main' : 'grey.100',
        color: isOwn ? 'primary.contrastText' : 'text.primary',
        px: 1.5,
        py: 1,
        borderRadius: isOwn ? '12px 12px 0 12px' : '12px 12px 12px 0',
        maxWidth: '78%',
        my: 0.5,
        position: 'relative',
        boxShadow: isOwn ? '0 2px 4px ' + alpha('#000', 0.1) : 'none',
      }}
    >
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {msg.body}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          opacity: 0.7,
          display: 'block',
          mt: 0.5,
          textAlign: isOwn ? 'right' : 'left',
          fontSize: '0.65rem',
        }}
      >
        {new Date(msg.createdAt).toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Typography>
    </Box>
  )
}
