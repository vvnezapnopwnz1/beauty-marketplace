import { Box, InputBase, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@app/store'
import { setQuery, selectSearchQuery } from '../model/searchSlice'

// Dark pill palette — matches the Warm Mocha hero
const S = {
  bg:          '#3A3028',
  border:      '#4A423A',
  focusBorder: '#D8956B',
  focusShadow: 'rgba(216,149,107,0.12)',
  text:        '#F0EAE3',
  placeholder: '#8C8076',
  iconColor:   '#8C8076',
  btnBg:       '#D8956B',
  btnText:     '#1a0e09',
}

interface SearchBarProps {
  onSearch?: () => void
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const query = useAppSelector(selectSearchQuery)

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        maxWidth: 520,
        mx: 'auto',
        bgcolor: S.bg,
        border: `1.5px solid ${S.border}`,
        borderRadius: 100,
        px: 2.5,
        py: '6px',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:focus-within': {
          borderColor: S.focusBorder,
          boxShadow: `0 0 0 3px ${S.focusShadow}`,
        },
      }}
    >
      <Box component="svg" width={16} height={16} viewBox="0 0 16 16" fill="none" sx={{ flexShrink: 0, mr: 1.5, opacity: 0.5 }}>
        <circle cx="7" cy="7" r="5" stroke={S.iconColor} strokeWidth="1.5" />
        <path d="M11 11l3 3" stroke={S.iconColor} strokeWidth="1.5" strokeLinecap="round" />
      </Box>

      <InputBase
        value={query}
        onChange={e => dispatch(setQuery(e.target.value))}
        onKeyDown={e => { if (e.key === 'Enter') onSearch?.() }}
        placeholder={t('search.placeholder')}
        sx={{
          flex: 1,
          fontSize: 14,
          color: S.text,
          '& input::placeholder': { color: S.placeholder },
          minWidth: 0,
        }}
      />

      <Button
        variant="contained"
        onClick={onSearch}
        sx={{
          ml: 2,
          bgcolor: S.btnBg,
          color: S.btnText,
          borderRadius: 100,
          px: '20px',
          py: '8px',
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': { bgcolor: S.btnBg, filter: 'brightness(1.08)', boxShadow: 'none' },
        }}
      >
        {t('search.searchBtn')}
      </Button>
    </Box>
  )
}
