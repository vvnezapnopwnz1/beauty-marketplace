import { Box, Button, Chip, IconButton, List, Popover, Tooltip, Typography } from '@mui/material'
import NotificationMenuItem from './NotificationMenuItem'
import { useAppSelector } from '@app/store'
import { selectUser } from '@features/auth-by-phone/model/authSlice'
import { useEffect, useMemo, useRef } from 'react'
import { useNotificationCenter, NotificationItem } from '@entities/notification'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@shared/config/routes'

interface Props {
  open: HTMLElement | null
  // eslint-disable-next-line no-undef
  handleClosePopover: VoidFunction
  setOpenPopover: (open: HTMLElement | null) => void
}

const POPOVER_LIMIT = 5

const NotificationMenuPopover = ({ open, handleClosePopover, setOpenPopover }: Props) => {
  const anchorRef = useRef<HTMLDivElement>(null)
  const d = useDashboardPalette()
  const user = useAppSelector(selectUser)
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { unreadCount, unseenCount, notifications, markAllSeen, markAllRead } = useNotificationCenter({
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
          (a: NotificationItem, b: NotificationItem) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .sort((a: NotificationItem, b: NotificationItem) =>
          b.isRead === a.isRead ? 0 : b.isRead ? -1 : 1,
        ),
    [notifications],
  )

  const handleViewAll = () => {
    handleClosePopover()
    navigate(ROUTES.NOTIFICATIONS)
  }

  return (
    <>
      <Box ref={anchorRef} sx={{ display: 'inline-flex' }}>
        {unreadCount > 0 ? (
          <Button
            data-testid="notification-bell"
            size="small"
            variant="contained"
            sx={{
              minWidth: 0,
              bgcolor: d.accent,
              color: d.onAccent,
              borderRadius: '20px',
              px: 1.5,
              py: 0.5,
              fontWeight: 700,
              fontSize: 13,
              boxShadow: 'none',
              '&:hover': { bgcolor: d.accentDark, boxShadow: 'none' },
            }}
            onClick={e => setOpenPopover(e.currentTarget)}
            endIcon={<NotificationsActiveIcon sx={{ fontSize: '16px !important' }} />}
          >
            {unreadCount}
          </Button>
        ) : (
          <IconButton
            data-testid="notification-bell"
            size="small"
            onClick={e => setOpenPopover(e.currentTarget)}
            sx={{ color: d.muted, '&:hover': { color: d.text, bgcolor: d.navHover } }}
          >
            <NotificationsNoneIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Popover
        open={Boolean(open)}
        // eslint-disable-next-line react-hooks/refs
        anchorEl={anchorRef.current}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        onClose={handleClosePopover}
        PaperProps={{
          sx: {
            width: 348,
            borderRadius: '14px',
            bgcolor: d.card,
            border: `1px solid ${d.borderSubtle}`,
            boxShadow: d.shadowDeep,
            overflow: 'hidden',
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2.5,
            py: 1.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${d.borderSubtle}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 14, color: d.text }}>
              {t('notifications.title')}
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={unreadCount}
                size="small"
                sx={{
                  height: 18,
                  fontSize: 11,
                  fontWeight: 700,
                  bgcolor: d.accent,
                  color: d.onAccent,
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            )}
          </Box>

          {unreadCount > 0 && (
            <Tooltip title={t('notifications.markAllRead')}>
              <IconButton
                size="small"
                onClick={() => markAllRead()}
                sx={{ color: d.muted, '&:hover': { color: d.accent, bgcolor: `${d.accent}14` } }}
              >
                <DoneAllIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* List */}
        <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
          <List disablePadding>
            {sortedNotifications.slice(0, POPOVER_LIMIT).map(n => (
              <NotificationMenuItem key={n.id} notification={n} />
            ))}
            {sortedNotifications.length === 0 && (
              <Box sx={{ py: 5, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: d.muted }}>
                  {t('notifications.noNotifications')}
                </Typography>
              </Box>
            )}
          </List>
        </Box>

        {/* Footer */}
        <Box sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${d.borderSubtle}` }}>
          <Button
            fullWidth
            size="small"
            onClick={handleViewAll}
            sx={{
              color: d.accent,
              fontWeight: 600,
              fontSize: 13,
              borderRadius: '8px',
              py: 0.75,
              textTransform: 'none',
              '&:hover': { bgcolor: `${d.accent}14` },
            }}
          >
            {t('notifications.viewAll')}
          </Button>
        </Box>
      </Popover>
    </>
  )
}

export default NotificationMenuPopover
