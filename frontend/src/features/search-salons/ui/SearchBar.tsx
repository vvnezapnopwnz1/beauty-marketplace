import { Box, InputBase, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@app/store'
import { setQuery, selectSearchQuery } from '../model/searchSlice'
import { COLORS } from '@shared/theme'

export function SearchBar() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const query = useAppSelector(selectSearchQuery)

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        maxWidth: 660,
        mx: 'auto',
        bgcolor: COLORS.cream,
        border: `1.5px solid ${COLORS.borderLight}`,
        borderRadius: 100,
        px: 2.5,
        py: '6px',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:focus-within': {
          borderColor: COLORS.accent,
          boxShadow: '0 0 0 4px rgba(196,112,63,0.1)',
        },
      }}
    >
      <Box component="svg" width={16} height={16} viewBox="0 0 16 16" fill="none" sx={{ flexShrink: 0, mr: 1 }}>
        <circle cx="7" cy="7" r="5" stroke={COLORS.inkFaint} strokeWidth="1.5" />
        <path d="M11 11l3 3" stroke={COLORS.inkFaint} strokeWidth="1.5" strokeLinecap="round" />
      </Box>

      <InputBase
        value={query}
        onChange={e => dispatch(setQuery(e.target.value))}
        placeholder={t('search.placeholder')}
        sx={{
          flex: 1,
          fontSize: 15,
          color: COLORS.ink,
          '& input::placeholder': { color: COLORS.inkFaint },
          minWidth: 0,
        }}
      />

      <Box sx={{ width: 1, height: 20, bgcolor: '#DDD7D0', mx: 2, flexShrink: 0 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 14, color: COLORS.inkSoft, whiteSpace: 'nowrap' }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: COLORS.sage, flexShrink: 0 }} />
        {t('search.location')}
      </Box>

      <Button
        variant="contained"
        sx={{
          ml: 1.5,
          bgcolor: COLORS.accent,
          color: COLORS.white,
          borderRadius: 100,
          px: 3,
          py: 1.25,
          fontSize: 14,
          fontWeight: 500,
          flexShrink: 0,
          '&:hover': { bgcolor: '#b0622f' },
        }}
      >
        {t('search.searchBtn')}
      </Button>
    </Box>
  )
}
