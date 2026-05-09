import { Box, CircularProgress, Typography, IconButton, Tooltip, Divider } from '@mui/material'
import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useChatStream,
  useGetRoomForAppointmentQuery,
  useListMessagesQuery,
  useMarkRoomReadMutation,
  useSendMessageMutation,
  useRequestAppointmentMutation,
  useGetRoomByTokenQuery,
} from '@entities/chat'
import { CalendarToday as CalendarIcon } from '@mui/icons-material'
import { ChatBubble } from './ChatBubble'
import { ChatComposer } from './ChatComposer'
import { useNavigate } from 'react-router-dom'

export interface ChatWindowProps {
  appointmentId?: string
  currentUserId?: string | null
  /** Anonymous mode: when provided, room is fetched by token (caller must
   * pass roomId via getRoomByToken upstream and forward it via room prop). */
  accessToken?: string
  /** Pre-resolved room id (used by GuestChatPage which fetches by token). */
  roomIdOverride?: string
  /** Pre-resolved room status (used in anon mode). */
  roomStatusOverride?: 'active' | 'readonly' | 'archived'
  /** Pre-resolved lock state (anon mode). */
  lockedOverride?: boolean
  /** Pre-resolved room type (anon mode). */
  roomTypeOverride?: 'external' | 'internal' | 'inquiry'
}

export function ChatWindow({
  appointmentId,
  currentUserId,
  accessToken,
  roomIdOverride,
  roomStatusOverride,
  lockedOverride,
  roomTypeOverride,
}: ChatWindowProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const skipRoomQuery = !appointmentId || Boolean(roomIdOverride)
  const room = useGetRoomForAppointmentQuery(appointmentId ?? '', {
    skip: skipRoomQuery,
  })

  const roomId = roomIdOverride ?? room.data?.id
  const roomStatus = roomStatusOverride ?? room.data?.status
  const roomType = roomTypeOverride ?? room.data?.type
  const locked = lockedOverride ?? room.data?.lockedUntilFirstReply ?? false

  const messages = useListMessagesQuery({ roomId: roomId ?? '', accessToken }, { skip: !roomId })

  const [send] = useSendMessageMutation()
  const [markRead] = useMarkRoomReadMutation()
  const [requestAppointment, { isLoading: isRequesting }] = useRequestAppointmentMutation()

  useChatStream({ roomId, accessToken })

  const listRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages.data?.messages.length])

  useEffect(() => {
    if (roomId && currentUserId) void markRead(roomId)
  }, [roomId, currentUserId, markRead])

  const isReadonly = roomStatus === 'readonly' || roomStatus === 'archived'
  const isAnonGuest = !currentUserId && Boolean(accessToken)
  const guestLocked = useMemo(() => {
    if (!isAnonGuest || !locked) return false
    return (messages.data?.messages ?? []).some(m => m.senderRole === 'guest')
  }, [isAnonGuest, locked, messages.data])

  const composerDisabled = isReadonly || guestLocked

  // Show request appointment button only for staff in inquiry rooms
  const showRequestAppointment = !isAnonGuest && roomType === 'inquiry' && !isReadonly

  const handleAction = (type: string, data?: any) => {
    if (type === 'book') {
      // Redirect to booking page for the salon
      const salonId = room.data?.salonId || data?.salonId
      if (salonId) {
        navigate(`/salons/${salonId}/book`)
      }
    }
  }

  if (!roomId || (messages.isLoading && !messages.data)) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          p: 3,
          height: '100%',
          alignItems: 'center',
        }}
      >
        <CircularProgress size={24} />
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.default',
      }}
    >
      {showRequestAppointment && (
        <>
          <Box
            sx={{
              px: 2,
              py: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t('chat.inquiryChat')}
            </Typography>
            <Tooltip title={t('chat.requestAppointment')}>
              <IconButton
                size="small"
                color="primary"
                onClick={() => requestAppointment(roomId)}
                disabled={isRequesting}
              >
                <CalendarIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Divider />
        </>
      )}

      <Box
        ref={listRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          p: 2,
        }}
      >
        {(messages.data?.messages ?? []).map(m => (
          <ChatBubble
            key={m.id}
            msg={m}
            isOwn={Boolean(currentUserId) && m.senderUserId === currentUserId}
            onAction={handleAction}
          />
        ))}
      </Box>

      <Box
        sx={{ p: 1, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}
      >
        {isReadonly && (
          <Typography
            variant="caption"
            sx={{ display: 'block', mb: 1, color: 'text.secondary', textAlign: 'center' }}
          >
            {t('chat.readonly')}
          </Typography>
        )}
        {guestLocked && !isReadonly && (
          <Typography
            variant="caption"
            sx={{ display: 'block', mb: 1, color: 'text.secondary', textAlign: 'center' }}
          >
            {t('chat.lockedAfterFirst')}
          </Typography>
        )}
        <ChatComposer
          disabled={composerDisabled}
          placeholder={isAnonGuest && locked ? t('chat.lockHint') : t('chat.placeholder')}
          onSubmit={async body => {
            await send({ roomId, body, accessToken }).unwrap()
          }}
        />
      </Box>
    </Box>
  )
}
