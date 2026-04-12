import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@app/store'
import { setCategory, selectSearchCategory } from '../model/searchSlice'
import { CATEGORIES } from '@entities/salon'
import { useBrandColors } from '@shared/theme'

/** Стили как `.cat-chip` / `.cat-scroll-demo` в docs/beautica-v2-redesign.html (таб «Компоненты»). */
export function CategoryFilter() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const active = useAppSelector(selectSearchCategory)
  const COLORS = useBrandColors()

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderBottom: `1px solid ${COLORS.border}`,
        py: 1.75,
        px: { xs: 2, sm: 4 },
        width: '100%',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          flexWrap: 'nowrap',
          pb: '4px',
          scrollbarWidth: 'thin',
          scrollbarColor: `${COLORS.border} transparent`,
          '&::-webkit-scrollbar': { height: 3 },
          '&::-webkit-scrollbar-thumb': {
            background: COLORS.border,
            borderRadius: 3,
          },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
        }}
      >
        {CATEGORIES.map(cat => {
          const isActive = active === cat.id

          return (
            <Box
              key={cat.id}
              component="button"
              type="button"
              onClick={() => dispatch(setCategory(cat.id))}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                px: '18px',
                py: '10px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? COLORS.onAccent : COLORS.inkSoft,
                bgcolor: isActive ? COLORS.accent : 'transparent',
                border: `1.5px solid ${isActive ? COLORS.accent : COLORS.border}`,
                borderRadius: 100,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                '&:hover': {
                  borderColor: COLORS.accent,
                  ...(!isActive && { color: COLORS.ink }),
                },
              }}
            >
              <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>
                {cat.emoji}
              </Box>
              {t(cat.labelKey)}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
