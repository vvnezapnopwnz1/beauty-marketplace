import { useMemo, type ReactNode } from 'react'
import { Box, Typography, Stack, Button, keyframes, alpha } from '@mui/material'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useBrandColors } from '@shared/theme'
import { CARD_GRADIENTS } from '@entities/salon'
import { bentoGradientAt } from '../lib/bentoGradients'
import { salonPath, placePath } from '@shared/config/routes'
import { formatPrice } from '@entities/salon'
import type { SearchResultItem } from '@shared/api/searchApi'
import type { CardGradient } from '@entities/salon'

export type SearchResultCardVariant = 'normal' | 'featured-vertical' | 'featured-horizontal'

interface Props {
  item: SearchResultItem
  variant?: SearchResultCardVariant
  /** Слот 0–4 в bento-батче: градиент как в beautica-v2-redesign (grad-1 … grad-5). */
  bentoPaletteIndex?: number
  /** When filter «свободно сегодня» is on — show glass badge on featured cards (proxy until API field exists). */
  showAvailableNowBadge?: boolean
}

const GRADIENT_KEYS = Object.keys(CARD_GRADIENTS) as CardGradient[]

const pulseDot = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.92); }
`

function pickGradientKey(name: string): CardGradient {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return GRADIENT_KEYS[Math.abs(hash) % GRADIENT_KEYS.length]
}

const EMOJIS = ['✂', '💅', '✦', '🪒', '✻', '💆']

function pickEmoji(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 37 + name.charCodeAt(i)) | 0
  return EMOJIS[Math.abs(hash) % EMOJIS.length]
}

function formatDistance(km: number): string | null {
  if (!km) return null
  if (km < 1) return `${Math.round(km * 1000)} м`
  return `${km.toFixed(1)} км`
}

function AvailableNowBadge({ label }: { label: string }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 10,
        right: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        px: '8px',
        py: '4px',
        borderRadius: 100,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        background: 'rgba(42,58,49,0.7)',
        border: '1px solid rgba(168,213,184,0.3)',
        fontSize: 10,
        fontWeight: 600,
        color: '#A8D5B8',
        zIndex: 1,
      }}
    >
      <Box
        sx={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          bgcolor: '#A8D5B8',
          flexShrink: 0,
          animation: `${pulseDot} 2s ease-in-out infinite`,
        }}
      />
      {label}
    </Box>
  )
}

function cardMediaBlock(props: {
  height: number | string
  flexBasis?: string
  photo: string | undefined
  gradient: string
  emoji: string
  emojiSize: number
  showAvailableBadge: boolean
  availableBadgeLabel: string
  twoGisBadge: ReactNode
}): ReactNode {
  const {
    height,
    flexBasis,
    photo,
    gradient,
    emoji,
    emojiSize,
    showAvailableBadge,
    availableBadgeLabel,
    twoGisBadge,
  } = props
  return (
    <Box
      sx={{
        width: flexBasis ? undefined : '100%',
        flex: flexBasis ? `0 0 ${flexBasis}` : undefined,
        height,
        minHeight: typeof height === 'number' ? height : undefined,
        background: photo ? undefined : gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {photo ? (
        <Box component="img" src={photo} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <Typography sx={{ fontSize: emojiSize, lineHeight: 1, opacity: 0.5 }}>{emoji}</Typography>
      )}
      {showAvailableBadge && <AvailableNowBadge label={availableBadgeLabel} />}
      {twoGisBadge}
    </Box>
  )
}

export function SearchResultCard({
  item,
  variant = 'normal',
  bentoPaletteIndex,
  showAvailableNowBadge = false,
}: Props) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const COLORS = useBrandColors()
  const cardBaseSx = useMemo(
    () => ({
      bgcolor: 'background.paper' as const,
      borderRadius: '14px',
      overflow: 'hidden' as const,
      border: `1px solid ${COLORS.border}`,
      cursor: 'pointer' as const,
      transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      '&:hover': {
        boxShadow: `0 16px 40px ${alpha(COLORS.accent, 0.18)}`,
        transform: 'translateY(-6px)',
      },
    }),
    [COLORS.border, COLORS.accent],
  )
  const enriched = Boolean(item.salonId)
  const gradientKey = pickGradientKey(item.name)
  const gradient =
    bentoPaletteIndex != null
      ? bentoGradientAt(bentoPaletteIndex)
      : (CARD_GRADIENTS[gradientKey] ?? CARD_GRADIENTS.bg1)
  const emoji = pickEmoji(item.name)
  const photo = item.photoUrl?.trim()
  const rating = item.rating ?? 0
  const reviewCount = item.reviewCount ?? 0
  const services = item.services ?? []
  const prices = services.map(s => s.priceCents).filter(p => p > 0)
  const price = prices.length > 0 ? Math.min(...prices) : null

  const isFeatured = variant !== 'normal'
  const titleFontSize =
    variant === 'featured-horizontal' ? 18 : variant === 'featured-vertical' ? 16 : 13
  const showBadge =
    isFeatured && showAvailableNowBadge && (variant === 'featured-vertical' || variant === 'featured-horizontal')

  const go = () => {
    if (enriched && item.salonId) navigate(salonPath(item.salonId))
    else navigate(placePath(item.externalId))
  }

  const bookButtonEl =
    enriched && item.onlineBooking ? (
      <Button
        variant="contained"
        size={isFeatured ? 'medium' : 'small'}
        onClick={e => {
          e.stopPropagation()
          if (item.salonId) navigate(salonPath(item.salonId))
        }}
        sx={{
          fontSize: 12,
          fontWeight: 700,
          bgcolor: COLORS.accent,
          color: COLORS.onAccent,
          borderRadius: 100,
          px: isFeatured ? 2 : 2,
          py: isFeatured ? 1.125 : 1,
          width: isFeatured ? '100%' : 'auto',
          maxWidth: variant === 'featured-horizontal' ? 180 : undefined,
          boxShadow: 'none',
          '&:hover': {
            bgcolor: COLORS.accent,
            boxShadow: `0 0 18px ${alpha(COLORS.accent, 0.35)}`,
            transform: 'scale(1.02)',
          },
        }}
      >
        {t('salon.bookOnline')}
      </Button>
    ) : null

  const twoGisBadge = !enriched && (
    <Box
      sx={{
        position: 'absolute',
        top: 10,
        left: 10,
        fontSize: 10,
        fontWeight: 700,
        px: '8px',
        py: '3px',
        borderRadius: '6px',
        bgcolor: 'rgba(26,14,9,0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: COLORS.accent,
        zIndex: 1,
      }}
    >
      {t('search.twoGisBadge')}
    </Box>
  )

  const ratingRow = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        fontSize: 12,
        fontWeight: 500,
        color: COLORS.accent,
        mt: 0.5,
        mb: isFeatured ? '12px' : '10px',
      }}
    >
      <Box component="span" sx={{ color: '#E8A020', fontSize: 12 }}>
        ★
      </Box>
      <Box component="span">{rating.toFixed(1)}</Box>
      <Typography component="span" sx={{ fontWeight: 400, color: COLORS.inkSoft, fontSize: 12 }}>
        {' '}
        ({reviewCount})
      </Typography>
      {formatDistance(item.distanceKm) && (
        <Box component="span" sx={{ color: COLORS.inkSoft, fontSize: 11, ml: 0.5 }}>
          · {formatDistance(item.distanceKm)}
        </Box>
      )}
    </Box>
  )

  const servicesFeatured =
    enriched &&
    services.length > 0 &&
    isFeatured && (
      <Stack sx={{ mt: '10px', gap: 0 }}>
        {services.slice(0, 3).map(s => (
          <Box
            key={s.id}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 1,
              fontSize: 12,
              color: COLORS.inkSoft,
              borderBottom: `1px solid ${COLORS.border}`,
              pb: '4px',
              '&:last-of-type': { borderBottom: 'none', pb: 0 },
            }}
          >
            <Box component="span" sx={{ minWidth: 0 }}>
              {s.name}
            </Box>
            <Box component="span" sx={{ flexShrink: 0, fontWeight: 500, color: COLORS.ink }}>
              {s.priceCents > 0 ? `${formatPrice(s.priceCents)} ₽` : '—'}
            </Box>
          </Box>
        ))}
      </Stack>
    )

  const servicesChips =
    enriched &&
    services.length > 0 &&
    !isFeatured && (
      <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: '12px' }}>
        {services.slice(0, 3).map(s => (
          <Box
            key={s.id}
            sx={{
              fontSize: 11,
              color: COLORS.accent,
              bgcolor: COLORS.accentLight,
              px: '9px',
              py: '3px',
              borderRadius: 100,
              fontWeight: 500,
            }}
          >
            {s.name}
          </Box>
        ))}
      </Stack>
    )

  const titleBlock = (
    <Typography
      sx={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: titleFontSize,
        fontWeight: 600,
        color: COLORS.ink,
        mb: '3px',
        whiteSpace: variant === 'featured-horizontal' ? 'normal' : 'nowrap',
        overflow: variant === 'featured-horizontal' ? 'visible' : 'hidden',
        textOverflow: variant === 'featured-horizontal' ? 'clip' : 'ellipsis',
        lineHeight: 1.25,
      }}
    >
      {item.name}
    </Typography>
  )

  const addressBlock =
    item.address &&
    (variant === 'featured-horizontal' ? (
      <Typography sx={{ fontSize: 11, color: COLORS.inkSoft, mb: '8px', lineHeight: 1.45 }}>
        📍 {item.address}
      </Typography>
    ) : (
      <Typography sx={{ fontSize: 11, color: COLORS.inkSoft, mb: '8px', lineHeight: 1.45 }}>
        📍 {item.address}
      </Typography>
    ))

  const priceTypography =
    enriched && price != null ? (
      <Typography sx={{ fontSize: isFeatured ? 14 : 13, color: COLORS.inkSoft }}>
        от{' '}
        <Box component="strong" sx={{ fontSize: isFeatured ? 17 : 15, fontWeight: 500, color: COLORS.ink }}>
          {formatPrice(price)} ₽
        </Box>
      </Typography>
    ) : (
      <Box />
    )

  const bookingSlot =
    bookButtonEl ??
    (enriched ? (
      <Typography sx={{ fontSize: 12, color: COLORS.inkSoft }}>{t('salon.bookByPhone')}</Typography>
    ) : (
      <Typography sx={{ fontSize: 12, color: COLORS.inkSoft }} />
    ))

  const footerRow = (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ mt: 'auto', pt: variant === 'featured-vertical' ? 1 : 0 }}
    >
      {priceTypography}
      {bookingSlot}
    </Stack>
  )

  const footerFeatured = (
    <Stack spacing={1.25} sx={{ mt: 'auto', pt: 1, width: '100%', alignItems: variant === 'featured-horizontal' ? 'flex-start' : 'stretch' }}>
      {price != null && enriched && (
        <Typography sx={{ fontSize: 14, color: COLORS.inkSoft }}>
          от{' '}
          <Box component="strong" sx={{ fontSize: 15, fontWeight: 500, color: COLORS.ink }}>
            {formatPrice(price)} ₽
          </Box>
        </Typography>
      )}
      {bookButtonEl}
      {enriched && !item.onlineBooking && (
        <Typography sx={{ fontSize: 12, color: COLORS.inkSoft }}>{t('salon.bookByPhone')}</Typography>
      )}
    </Stack>
  )

  const media = (height: number | string, flexBasis: string | undefined, emojiSize: number) =>
    cardMediaBlock({
      height,
      flexBasis,
      photo,
      gradient,
      emoji,
      emojiSize,
      showAvailableBadge: Boolean(showBadge),
      availableBadgeLabel: t('search.availableNowBadge'),
      twoGisBadge,
    })

  if (variant === 'featured-horizontal') {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} style={{ height: '100%' }}>
        <Box
          onClick={go}
          sx={{
            ...cardBaseSx,
            height: 280,
            minHeight: 280,
            display: 'grid',
            gridTemplateColumns: '200px 1fr',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ minHeight: 0, overflow: 'hidden', position: 'relative' }}>
            {media('100%', undefined, 48)}
          </Box>
          <Box
            sx={{
              minWidth: 0,
              p: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {titleBlock}
            {addressBlock}
            {ratingRow}
            {servicesFeatured}
            {servicesChips}
            {footerFeatured}
          </Box>
        </Box>
      </motion.div>
    )
  }

  if (variant === 'featured-vertical') {
    const mediaH = 200
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} style={{ height: '100%' }}>
        <Box
          onClick={go}
          sx={{
            ...cardBaseSx,
            minHeight: 440,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {media(mediaH, undefined, 52)}
          <Box sx={{ p: '14px 16px 16px', display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
            {titleBlock}
            {addressBlock}
            {ratingRow}
            {servicesFeatured}
            {servicesChips}
            {footerFeatured}
          </Box>
        </Box>
      </motion.div>
    )
  }

  // normal
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} style={{ height: '100%' }}>
      <Box
        onClick={go}
        sx={{
          ...cardBaseSx,
          height: '100%',
          minHeight: 280,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {media(140, undefined, 36)}
        <Box sx={{ p: '12px 14px 14px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          {titleBlock}
          {addressBlock}
          {ratingRow}
          {servicesChips}
          {footerRow}
        </Box>
      </Box>
    </motion.div>
  )
}
