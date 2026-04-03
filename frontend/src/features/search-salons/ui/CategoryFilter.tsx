import { Box } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@app/store'
import { setCategory, selectSearchCategory } from '../model/searchSlice'
import { CATEGORIES } from '@entities/salon'
import { COLORS } from '@shared/theme'

export function CategoryFilter() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const active = useAppSelector(selectSearchCategory)

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderBottom: `1px solid ${COLORS.border}`,
        px: 5,
        display: 'flex',
        gap: '4px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {CATEGORIES.map(cat => {
        const isActive = active === cat.id
        return (
          <Box
            key={cat.id}
            component="button"
            onClick={() => dispatch(setCategory(cat.id))}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2.25,
              py: '14px',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: isActive ? COLORS.accent : COLORS.inkSoft,
              bgcolor: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${isActive ? COLORS.accent : 'transparent'}`,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s, border-color 0.15s',
              '&:hover': { color: isActive ? COLORS.accent : COLORS.ink },
            }}
          >
            <Box component="span" sx={{ fontSize: 16, lineHeight: 1 }}>{cat.emoji}</Box>
            {t(cat.labelKey)}
          </Box>
        )
      })}
    </Box>
  )
}
