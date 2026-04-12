import { Box, keyframes, alpha } from '@mui/material'
import { useMemo } from 'react'
import { useBrandColors } from '@shared/theme'
import { bentoGradientAt } from '../lib/bentoGradients'
import type { SearchResultCardVariant } from './SearchResultCard'

const shimmer = keyframes`
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`

function ShimmerLine({
  widthPct,
  height = 10,
  delay = 0,
}: {
  widthPct: number
  height?: number
  delay?: number
}) {
  const COLORS = useBrandColors()
  const bg = useMemo(
    () =>
      `linear-gradient(90deg, ${COLORS.white} 0%, ${alpha(COLORS.borderLight, 0.95)} 35%, ${alpha(COLORS.ink, 0.14)} 50%, ${alpha(COLORS.borderLight, 0.95)} 65%, ${COLORS.white} 100%)`,
    [COLORS.white, COLORS.borderLight, COLORS.ink],
  )
  return (
    <Box
      sx={{
        width: `${widthPct}%`,
        height,
        borderRadius: '5px',
        background: bg,
        backgroundSize: '200% 100%',
        animation: `${shimmer} 1.8s infinite`,
        animationDelay: `${delay}s`,
      }}
    />
  )
}

function ShimmerImage({
  height,
  delay = 0,
  paletteIndex,
}: {
  height: number
  delay?: number
  /** Bento grad-1…5; иначе светлый шиммер как раньше */
  paletteIndex?: number
}) {
  const COLORS = useBrandColors()
  const bg = useMemo(
    () =>
      `linear-gradient(90deg, ${COLORS.white} 0%, ${alpha(COLORS.borderLight, 0.95)} 35%, ${alpha(COLORS.ink, 0.12)} 50%, ${alpha(COLORS.borderLight, 0.95)} 65%, ${COLORS.white} 100%)`,
    [COLORS.white, COLORS.borderLight, COLORS.ink],
  )
  const bentoBase = paletteIndex != null ? bentoGradientAt(paletteIndex) : null
  const overlay = useMemo(
    () =>
      `linear-gradient(90deg, transparent 0%, ${alpha('#fff', 0.14)} 40%, ${alpha('#fff', 0.22)} 50%, ${alpha('#fff', 0.14)} 60%, transparent 100%)`,
    [],
  )
  return (
    <Box
      sx={{
        height,
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: bentoBase ?? bg,
        ...(bentoBase
          ? {
              backgroundSize: '200% 100%',
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: 0,
                background: overlay,
                backgroundSize: '200% 100%',
                animation: `${shimmer} 1.8s infinite`,
                animationDelay: `${delay}s`,
              },
            }
          : {
              backgroundSize: '200% 100%',
              animation: `${shimmer} 1.8s infinite`,
              animationDelay: `${delay}s`,
            }),
      }}
    />
  )
}

export interface SearchResultCardSkeletonProps {
  variant?: SearchResultCardVariant
  /** Stagger index for shimmer delay (0, 0.2, 0.4, …) */
  staggerIndex?: number
  /** Градиент медиа как у bento-карточек (0–4). */
  paletteIndex?: number
}

export function SearchResultCardSkeleton({
  variant = 'normal',
  staggerIndex = 0,
  paletteIndex,
}: SearchResultCardSkeletonProps) {
  const COLORS = useBrandColors()
  const delay = staggerIndex * 0.2

  const shellSx = useMemo(
    () => ({
      bgcolor: 'background.paper',
      borderRadius: '14px',
      overflow: 'hidden' as const,
      border: `1px solid ${COLORS.border}`,
      height: '100%',
    }),
    [COLORS.border],
  )

  const bodyLines = (lineDelays: number[]) => (
    <Box sx={{ p: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <ShimmerLine widthPct={80} delay={lineDelays[0]} />
      <ShimmerLine widthPct={60} delay={lineDelays[1]} />
      {variant !== 'normal' && <ShimmerLine widthPct={40} delay={lineDelays[2] ?? lineDelays[1]} />}
    </Box>
  )

  if (variant === 'featured-horizontal') {
    return (
      <Box sx={{ ...shellSx, minHeight: 280, display: 'grid', gridTemplateColumns: '200px 1fr' }}>
        <Box sx={{ minHeight: 0 }}>
          <ShimmerImage height={280} delay={delay} paletteIndex={paletteIndex} />
        </Box>
        <Box sx={{ p: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' }}>
          <ShimmerLine widthPct={85} delay={delay} />
          <ShimmerLine widthPct={70} delay={delay + 0.05} />
          <ShimmerLine widthPct={45} delay={delay + 0.1} />
        </Box>
      </Box>
    )
  }

  if (variant === 'featured-vertical') {
    return (
      <Box sx={{ ...shellSx, minHeight: 440, display: 'flex', flexDirection: 'column' }}>
        <ShimmerImage height={200} delay={delay} paletteIndex={paletteIndex} />
        {bodyLines([delay, delay + 0.05, delay + 0.1])}
      </Box>
    )
  }

  return (
    <Box sx={{ ...shellSx, minHeight: 280, display: 'flex', flexDirection: 'column' }}>
      <ShimmerImage height={140} delay={delay} paletteIndex={paletteIndex} />
      {bodyLines([delay, delay + 0.05, delay + 0.1])}
    </Box>
  )
}
