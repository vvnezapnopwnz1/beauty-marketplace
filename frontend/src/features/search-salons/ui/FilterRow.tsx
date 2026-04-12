import React from 'react'
import { Box, Select, MenuItem } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@app/store'
import {
  toggleAvailableToday,
  toggleOnlineOnly,
  toggleOpenNow,
  toggleHighRating,
  setSortBy,
  selectOnlyAvailableToday,
  selectOnlineOnly,
  selectOpenNow,
  selectHighRating,
  selectSortBy,
} from '../model/searchSlice'
import { useBrandColors } from '@shared/theme'

interface FilterChipProps {
  label: string
  active?: boolean
  onClick?: () => void
  icon?: React.ReactNode
}

function FilterChip({ label, active = false, onClick, icon }: FilterChipProps) {
  const COLORS = useBrandColors()
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        fontWeight: 500,
        color: active ? COLORS.white : COLORS.ink,
        bgcolor: active ? COLORS.ink : COLORS.white,
        border: `1px solid ${active ? COLORS.ink : COLORS.borderLight}`,
        borderRadius: 100,
        px: '14px',
        py: '7px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        '&:hover': {
          borderColor: active ? COLORS.ink : COLORS.inkSoft,
        },
      }}
    >
      {icon}
      {label}
    </Box>
  )
}

const ClockIcon = () => (
  <Box component="svg" width={12} height={12} viewBox="0 0 12 12" fill="none" sx={{ flexShrink: 0 }}>
    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </Box>
)

const DownloadIcon = () => (
  <Box component="svg" width={12} height={12} viewBox="0 0 12 12" fill="none" sx={{ flexShrink: 0 }}>
    <path d="M6 1v5m0 0l2-2m-2 2L4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M2 9h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </Box>
)

const StarIcon = () => (
  <Box component="svg" width={12} height={12} viewBox="0 0 12 12" fill="none" sx={{ flexShrink: 0 }}>
    <path d="M6 1l1.3 3.9h4.1L8 7.2l1.3 3.9L6 9l-3.3 2.1L4 7.2.6 4.9h4.1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </Box>
)

const OnlineIcon = () => (
  <Box component="svg" width={12} height={12} viewBox="0 0 12 12" fill="none" sx={{ flexShrink: 0 }}>
    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M6 3v3l2 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </Box>
)

export function FilterRow() {
  const { t } = useTranslation()
  const COLORS = useBrandColors()
  const dispatch = useAppDispatch()
  const onlyAvailableToday = useAppSelector(selectOnlyAvailableToday)
  const onlineOnly = useAppSelector(selectOnlineOnly)
  const openNow = useAppSelector(selectOpenNow)
  const highRating = useAppSelector(selectHighRating)
  const sortBy = useAppSelector(selectSortBy)

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', mb: 3, flexWrap: 'wrap' }}>
      <Box component="span" sx={{ fontSize: 13, color: COLORS.inkSoft, mr: '4px' }}>
        {t('search.sortLabel')}
      </Box>

      <FilterChip
        label={t('search.onlineBooking')}
        active={onlineOnly}
        onClick={() => dispatch(toggleOnlineOnly())}
        icon={<OnlineIcon />}
      />
      <FilterChip
        label={t('search.availableToday')}
        active={onlyAvailableToday}
        onClick={() => dispatch(toggleAvailableToday())}
        icon={<DownloadIcon />}
      />
      <FilterChip
        label={t('search.openNow')}
        active={openNow}
        onClick={() => dispatch(toggleOpenNow())}
        icon={<ClockIcon />}
      />
      <FilterChip
        label={t('search.topRated')}
        active={highRating}
        onClick={() => dispatch(toggleHighRating())}
        icon={<StarIcon />}
      />

      <Box sx={{ ml: 'auto' }}>
        <Select
          size="small"
          value={sortBy}
          onChange={e => dispatch(setSortBy(e.target.value as 'popular' | 'nearby' | 'rating'))}
          sx={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: COLORS.ink,
            bgcolor: COLORS.white,
            borderRadius: 100,
            minWidth: 180,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.borderLight },
            '& .MuiSelect-select': { py: '7px', px: '14px' },
          }}
        >
          <MenuItem value="popular">{t('search.sortByPopular')}</MenuItem>
          <MenuItem value="nearby">{t('search.sortByDistance')}</MenuItem>
          <MenuItem value="rating">{t('search.sortByRating')}</MenuItem>
        </Select>
      </Box>
    </Box>
  )
}
