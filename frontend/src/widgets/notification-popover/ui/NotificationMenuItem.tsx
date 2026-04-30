import { Box, ListItem, Typography } from '@mui/material'
import Iconify from '@shared/ui/iconify'
import { formatDistanceToNow } from 'date-fns'
import { useMarkNotificationReadMutation } from '@entities/notification/model/notificationApi'
import { NotificationItem } from '@entities/notification'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'

function getTypeIcon(type: string): string {
  switch (type) {
    case 'appointment.created': return 'eva:calendar-fill'
    case 'appointment.status_changed': return 'eva:edit-fill'
    case 'claim.approved': return 'eva:checkmark-circle-2-fill'
    case 'claim.rejected': return 'eva:close-circle-fill'
    case 'claim.submitted': return 'eva:paper-plane-fill'
    default: return 'eva:bell-fill'
  }
}

export default function NotificationMenuItem({
  notification,
}: Readonly<{ notification: NotificationItem }>) {
  const d = useDashboardPalette()
  const [markRead] = useMarkNotificationReadMutation()

  return (
    <ListItem
      sx={{
        px: 2,
        py: 1.25,
        gap: 1.5,
        alignItems: 'flex-start',
        cursor: notification.isRead ? 'default' : 'pointer',
        borderLeft: `2px solid ${notification.isRead ? 'transparent' : d.accent}`,
        bgcolor: notification.isRead ? 'transparent' : `${d.accent}12`,
        transition: 'background-color 0.15s',
        '&:hover': {
          bgcolor: notification.isRead ? d.navHover : `${d.accent}1e`,
        },
        '& + &': {
          borderTop: `1px solid ${d.borderHairline}`,
        },
      }}
      onClick={() => !notification.isRead && markRead(notification.id)}
      disablePadding={false}
    >
      <Box
        sx={{
          flexShrink: 0,
          width: 32,
          height: 32,
          borderRadius: '50%',
          bgcolor: notification.isRead ? d.control : `${d.accent}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mt: 0.25,
        }}
      >
        <Iconify
          icon={getTypeIcon(notification.type)}
          width={15}
          sx={{ color: notification.isRead ? d.muted : d.accent }}
        />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 0.5 }}>
          <Typography
            variant="body2"
            noWrap
            sx={{ color: d.text, fontWeight: notification.isRead ? 400 : 600, flex: 1, lineHeight: 1.4 }}
          >
            {notification.title}
          </Typography>
          {!notification.isRead && (
            <Box
              sx={{
                flexShrink: 0,
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: d.accent,
                mt: 0.6,
              }}
            />
          )}
        </Box>

        <Typography variant="caption" noWrap sx={{ color: d.muted, display: 'block', mt: 0.25 }}>
          {notification.body}
        </Typography>

        <Typography variant="caption" sx={{ color: d.mutedDark, display: 'block', mt: 0.25 }}>
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </Typography>
      </Box>
    </ListItem>
  )
}
