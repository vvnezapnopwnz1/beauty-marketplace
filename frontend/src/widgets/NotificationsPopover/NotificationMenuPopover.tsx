import { Box, Button, IconButton, List, Popover, Typography } from '@mui/material'
import Scrollbar from '@shared/ui/scrollbar'
import { NotificationItem } from '@entities/notification'
import NotificationMenuItem from '../../features/user-menu/ui/NotificationMenuItem'
import { useAppSelector } from '@app/store'
import { selectUser } from '@features/auth-by-phone/model/authSlice'
import { useEffect, useMemo, useState } from 'react'
import { useNotificationCenter } from '@entities/notification'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'

interface Props {
  open: HTMLElement | null
  // eslint-disable-next-line no-undef
  handleClosePopover: VoidFunction
  setOpenPopover: (open: HTMLElement | null) => void
}

const NotificationMenuPopover = ({ open, handleClosePopover, setOpenPopover }: Props) => {
  const [visible, setVisible] = useState(4)
  const dashboard = useDashboardPalette()
  const user = useAppSelector(selectUser)
  const { unreadCount, unseenCount, notifications, markAllSeen } = useNotificationCenter({
      enabled: Boolean(user),
    })

  useEffect(() => {
    if (!open || !user || unseenCount === 0) return
    void markAllSeen()
  }, [open, user, unseenCount, markAllSeen])

  const sortedNotifications = useMemo(
    () =>
      [...notifications]
        .sort(
          (current: NotificationItem, next: NotificationItem) =>
            new Date(next.createdAt).getTime() - new Date(current?.createdAt).getTime(),
        )
        .sort((current: NotificationItem, next: NotificationItem) =>
          next.isRead === current.isRead ? 0 : next.isRead ? -1 : 1,
        ),
    [notifications],
  )

  return (
    <>
      {unreadCount > 0 ? (
        <Button
          size="small"
          variant="contained"
          sx={{
            backgroundColor: dashboard.accentDark,
            color: dashboard.onAccent,
            '&:hover': {
              backgroundColor: dashboard.accentDark,
              color: dashboard.text,
            },
            fontWeight: 600,
          }}
          onClick={e => setOpenPopover(e.currentTarget)}
          endIcon={<NotificationsActiveIcon sx={{ fontSize: 16 }} />}
        >
          {unreadCount}
        </Button>
      ) : (
        <IconButton onClick={e => setOpenPopover(e.currentTarget)}>
          <NotificationsNoneIcon />
        </IconButton>
      )}
      <Popover
        open={Boolean(open)}
        anchorEl={open}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        onClose={handleClosePopover}
      >
        <Scrollbar sx={{ maxHeight: { xs: 340, sm: 440 }, overflowY: 'auto', px: 0, py: 0, my: 0 }}>
          <List disablePadding>
            {sortedNotifications
              .map(notification => (
                <NotificationMenuItem key={notification.id} notification={notification} />
              ))
              .slice(0, visible)}
            {sortedNotifications.length === 0 && (
              <Typography variant="body1" textAlign="center" color="text.secondary">
                No notifications
              </Typography>
            )}
          </List>
        </Scrollbar>

        {/* <Divider sx={{ borderStyle: 'dashed' }} /> */}

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            px: 2.5,
            py: 0.5,
            borderTop: `1px solid ${dashboard.borderLight}`,
          }}
        >
          <Button
            fullWidth
            size="small"
            disableRipple
            onClick={() => setVisible(sortedNotifications.length)}
            sx={{
              color: dashboard.accentDark,
              fontWeight: 600,
              border: `1px solid ${dashboard.borderLight}`,
              borderRadius: 100,
              padding: 0.5,
              px: 2,
              fontSize: 14,
              textAlign: 'left',
            }}
          >
            View All
          </Button>
          {/* {unreadCount > 0 && (
            <Tooltip title="Mark all as read">
              <IconButton
                onClick={handleReadAllEvent}
                color="primary"
                sx={{
                  color: dashboard.accentDark,
                  fontWeight: 600,
                  border: `1px solid ${dashboard.borderLight}`,
                  borderRadius: 100,
                  padding: 0.5,
                  px: 2,
                  fontSize: 14,
                }}
              >
                <Iconify icon="eva:done-all-fill" />
              </IconButton>
            </Tooltip>
          )} */}
        </Box>
      </Popover>
    </>
  )
}

export default NotificationMenuPopover
