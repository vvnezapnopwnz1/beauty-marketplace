import { useState, type SyntheticEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Chip, IconButton, Skeleton, Tabs, Tab, Tooltip, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import { formatDistanceToNow } from 'date-fns'
import Iconify from '@shared/ui/iconify'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import {
  useGetNotificationsQuery,
  useGetNotificationUnreadCountQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '@entities/notification/model/notificationApi'
import type { NotificationItem } from '@entities/notification'
import { useTranslation } from 'react-i18next'

const PAGE_SIZE = 20

type Filter = 'all' | 'unread'

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

function getTypeColor(
  type: string,
  d: ReturnType<typeof useDashboardPalette>,
): string {
  switch (type) {
    case 'appointment.created': return d.green
    case 'appointment.status_changed': return d.blue
    case 'claim.approved': return d.green
    case 'claim.rejected': return d.red
    default: return d.accent
  }
}

function NotificationCard({ notification }: { notification: NotificationItem }) {
  const d = useDashboardPalette()
  const [markRead] = useMarkNotificationReadMutation()
  const color = getTypeColor(notification.type, d)
  const icon = getTypeIcon(notification.type)

  return (
    <Box
      onClick={() => !notification.isRead && markRead(notification.id)}
      sx={{
        display: 'flex',
        gap: 2,
        px: 2.5,
        py: 2,
        borderRadius: '12px',
        bgcolor: notification.isRead ? d.card : d.control,
        border: `1px solid ${notification.isRead ? d.borderHairline : d.borderLight}`,
        borderLeft: `3px solid ${notification.isRead ? 'transparent' : d.accent}`,
        cursor: notification.isRead ? 'default' : 'pointer',
        transition: 'all 0.15s ease',
        '&:hover': {
          bgcolor: notification.isRead ? d.cardAlt : d.controlHover,
          ...(notification.isRead ? {} : { transform: 'translateX(2px)' }),
        },
      }}
    >
      {/* Icon circle */}
      <Box
        sx={{
          flexShrink: 0,
          width: 44,
          height: 44,
          borderRadius: '50%',
          bgcolor: `${color}1a`,
          border: `1px solid ${color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mt: 0.25,
        }}
      >
        <Iconify icon={icon} width={22} sx={{ color }} />
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 1,
            mb: 0.5,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              color: d.text,
              fontWeight: notification.isRead ? 400 : 600,
              lineHeight: 1.4,
            }}
          >
            {notification.title}
          </Typography>
          {!notification.isRead && (
            <Box
              sx={{
                flexShrink: 0,
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: d.accent,
                mt: 0.6,
                boxShadow: `0 0 0 3px ${d.accent}30`,
              }}
            />
          )}
        </Box>

        <Typography variant="body2" sx={{ color: d.muted, lineHeight: 1.55, mb: 1 }}>
          {notification.body}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Iconify icon="eva:clock-outline" width={13} sx={{ color: d.mutedDark }} />
          <Typography variant="caption" sx={{ color: d.mutedDark }}>
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

function CardSkeleton({ d }: { d: ReturnType<typeof useDashboardPalette> }) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        px: 2.5,
        py: 2,
        borderRadius: '12px',
        bgcolor: d.card,
        border: `1px solid ${d.borderHairline}`,
      }}
    >
      <Skeleton variant="circular" width={44} height={44} sx={{ flexShrink: 0, bgcolor: d.control }} />
      <Box sx={{ flex: 1 }}>
        <Skeleton width="55%" height={18} sx={{ bgcolor: d.control, mb: 0.75 }} />
        <Skeleton width="88%" height={15} sx={{ bgcolor: d.control, mb: 0.5 }} />
        <Skeleton width="40%" height={15} sx={{ bgcolor: d.control, mb: 1 }} />
        <Skeleton width="25%" height={13} sx={{ bgcolor: d.control }} />
      </Box>
    </Box>
  )
}

function EmptyState({
  filter,
  d,
  t,
}: {
  filter: Filter
  d: ReturnType<typeof useDashboardPalette>
  t: (key: string) => string
}) {
  return (
    <Box sx={{ py: 10, textAlign: 'center' }}>
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          bgcolor: d.control,
          border: `1px solid ${d.borderLight}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2,
        }}
      >
        <Iconify
          icon={filter === 'unread' ? 'eva:done-all-fill' : 'eva:bell-outline'}
          width={28}
          sx={{ color: d.muted }}
        />
      </Box>
      <Typography variant="body2" sx={{ color: d.muted, fontWeight: 500 }}>
        {filter === 'unread'
          ? t('notifications.page.emptyUnread')
          : t('notifications.page.emptyAll')}
      </Typography>
    </Box>
  )
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const d = useDashboardPalette()
  const { t } = useTranslation()
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(0)

  const handleFilterChange = (_: SyntheticEvent, v: Filter | null) => {
    if (v == null) return
    setFilter(v)
    setPage(0)
  }

  const { data, isFetching } = useGetNotificationsQuery({
    unread: filter === 'unread' ? true : undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })
  const { data: countData } = useGetNotificationUnreadCountQuery()
  const [markAllRead] = useMarkAllNotificationsReadMutation()

  const items = data?.items ?? []
  const unreadCount = countData?.unread ?? 0
  const hasMore = items.length >= PAGE_SIZE
  const hasPrev = page > 0

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: d.page }}>
      {/* Sticky top bar */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          height: 60,
          px: { xs: 2, sm: 3 },
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          bgcolor: d.sidebar,
          borderBottom: `1px solid ${d.borderSubtle}`,
        }}
      >
        <IconButton
          size="small"
          onClick={() => navigate(-1)}
          sx={{
            color: d.muted,
            '&:hover': { color: d.text, bgcolor: d.navHover },
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <Typography
            sx={{
              fontFamily: "'Fraunces', serif",
              fontSize: 20,
              fontWeight: 600,
              color: d.text,
              lineHeight: 1,
            }}
          >
            {t('notifications.page.title')}
          </Typography>
          {unreadCount > 0 && (
            <Chip
              label={unreadCount}
              size="small"
              sx={{
                height: 20,
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
              sx={{
                color: d.muted,
                '&:hover': { color: d.accent, bgcolor: `${d.accent}14` },
              }}
            >
              <DoneAllIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Content */}
      <Box sx={{ maxWidth: 680, mx: 'auto', px: { xs: 2, sm: 3 }, py: 3 }}>
        {/* Filter tabs */}
        <Tabs
          value={filter}
          onChange={handleFilterChange}
          sx={{
            mb: 2.5,
            minHeight: 36,
            '& .MuiTabs-flexContainer': { gap: 0.5 },
            '& .MuiTab-root': {
              minHeight: 36,
              py: 0,
              px: 2,
              fontSize: 13,
              fontWeight: 500,
              color: d.muted,
              textTransform: 'none',
              borderRadius: '8px',
            },
            '& .Mui-selected': { color: d.text, fontWeight: 600 },
            '& .MuiTabs-indicator': { bgcolor: d.accent, height: 2, borderRadius: '2px' },
          }}
        >
          <Tab label={t('notifications.page.tabs.all')} value="all" />
          <Tab
            value="unread"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {t('notifications.page.tabs.unread')}
                {unreadCount > 0 && (
                  <Chip
                    label={unreadCount}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: 10,
                      fontWeight: 700,
                      bgcolor: d.accent,
                      color: d.onAccent,
                      '& .MuiChip-label': { px: 0.5 },
                    }}
                  />
                )}
              </Box>
            }
          />
        </Tabs>

        {/* List */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {isFetching
            ? Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} d={d} />)
            : items.length > 0
              ? items.map(n => <NotificationCard key={n.id} notification={n} />)
              : <EmptyState filter={filter} d={d} t={t} />}
        </Box>

        {/* Pagination */}
        {!isFetching && items.length > 0 && (hasPrev || hasMore) && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              mt: 4,
              pt: 3,
              borderTop: `1px solid ${d.borderHairline}`,
            }}
          >
            <Button
              size="small"
              disabled={!hasPrev}
              onClick={() => setPage(p => p - 1)}
              startIcon={<ArrowBackIosNewIcon sx={{ fontSize: '11px !important' }} />}
              sx={{
                color: d.text,
                fontWeight: 500,
                fontSize: 13,
                px: 2,
                py: 0.75,
                borderRadius: '8px',
                border: `1px solid ${d.borderLight}`,
                bgcolor: d.card,
                textTransform: 'none',
                '&:hover': { bgcolor: d.cardAlt },
                '&.Mui-disabled': { opacity: 0.35, bgcolor: 'transparent', borderColor: d.borderHairline },
              }}
            >
              {t('notifications.page.prev')}
            </Button>

            <Typography
              variant="body2"
              sx={{ color: d.muted, fontSize: 13, minWidth: 90, textAlign: 'center' }}
            >
              {t('notifications.page.pageOf', { page: page + 1 })}
            </Typography>

            <Button
              size="small"
              disabled={!hasMore}
              onClick={() => setPage(p => p + 1)}
              endIcon={<ArrowForwardIosIcon sx={{ fontSize: '11px !important' }} />}
              sx={{
                color: d.text,
                fontWeight: 500,
                fontSize: 13,
                px: 2,
                py: 0.75,
                borderRadius: '8px',
                border: `1px solid ${d.borderLight}`,
                bgcolor: d.card,
                textTransform: 'none',
                '&:hover': { bgcolor: d.cardAlt },
                '&.Mui-disabled': { opacity: 0.35, bgcolor: 'transparent', borderColor: d.borderHairline },
              }}
            >
              {t('notifications.page.next')}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  )
}
