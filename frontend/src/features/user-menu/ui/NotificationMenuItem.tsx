import { ListItem, ListItemText, Stack, Typography } from '@mui/material'
import Iconify from '@shared/ui/iconify'
import { formatDistanceToNow } from 'date-fns'
import { useMarkNotificationReadMutation } from '@entities/notification/model/notificationApi'
import { NotificationItem } from '@entities/notification'

export default function NotificationMenuItem({
  notification,
}: Readonly<{
  notification: NotificationItem
}>) {
  const { message } = renderContent(notification)
  const [markNotificationRead] = useMarkNotificationReadMutation()
  const handleRead = () => {
    markNotificationRead(notification.id)
  }

  return (
    <ListItem
      sx={{
        px: 2.5,
        mt: '1px',
        cursor: 'pointer',
        ...(!notification.isRead && {
          bgcolor: 'action.selected',
        }),
      }}
      onClick={handleRead}
    >
      <ListItemText
        disableTypography
        primary={message}
        secondary={
          <Stack direction="row" display="flex" justifyContent="space-between" overflow="hidden">
            <Stack direction="row" sx={{ my: 0.5, typography: 'caption', color: 'text.disabled' }}>
              <Iconify icon="eva:clock-fill" width={16} sx={{ mr: 0.5 }} />
              <Typography variant="caption">
                {formatDistanceToNow(new Date(notification.createdAt))}
              </Typography>
            </Stack>
          </Stack>
        }
      />
    </ListItem>
  )
}

function renderContent(notification: NotificationItem) {
  const message = (
    <Stack direction="column" overflow="hidden">
      <Typography variant="subtitle1">{notification.title}</Typography>
      <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
        {notification.body}
      </Typography>
    </Stack>
  )

  return {
    message,
  }
}
