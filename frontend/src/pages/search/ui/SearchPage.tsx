import { Box, Typography, Grid, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { NavBar } from '@shared/ui/NavBar'
import { SalonCard } from '@entities/salon'
import { SearchBar } from '@features/search-salons/ui/SearchBar'
import { CategoryFilter } from '@features/search-salons/ui/CategoryFilter'
import { FilterRow } from '@features/search-salons/ui/FilterRow'
import { useAppDispatch, useAppSelector } from '@app/store'
import {
  resetFilters,
  selectFilteredSalons,
} from '@features/search-salons/model/searchSlice'
import { MapSidebar } from './MapSidebar'
import { PromoBanner } from './PromoBanner'
import { COLORS } from '@shared/theme'

export function SearchPage() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const salons = useAppSelector(selectFilteredSalons)

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <NavBar />

      {/* Hero */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: `1px solid ${COLORS.border}`,
          py: { xs: 5, sm: 8 },
          px: 3,
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: 12,
            fontWeight: 500,
            color: COLORS.accent,
            bgcolor: COLORS.accentLight,
            px: '12px',
            py: '4px',
            borderRadius: 100,
            mb: '20px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          ✦ {t('hero.tag')}
        </Box>

        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: 36, sm: 52 },
            fontWeight: 500,
            lineHeight: 1.15,
            letterSpacing: '-1.5px',
            color: COLORS.ink,
            mb: '12px',
            maxWidth: 640,
            mx: 'auto',
          }}
        >
          {t('hero.h1')} <Box component="em" sx={{ fontStyle: 'italic', color: COLORS.accent }}>{t('hero.h1accent')}</Box>
        </Typography>

        <Typography sx={{ fontSize: 16, color: COLORS.inkSoft, mb: '36px', fontWeight: 300 }}>
          {t('hero.subtitle')}
        </Typography>

        <SearchBar />
      </Box>

      {/* Category tabs */}
      <CategoryFilter />

      {/* Main content */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 380px' },
          gap: 4,
          maxWidth: 1280,
          mx: 'auto',
          px: { xs: 2, sm: 5 },
          py: 4,
        }}
      >
        {/* Left: results */}
        <Box>
          <FilterRow />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: '20px' }}>
            <Typography sx={{ fontSize: 14, color: COLORS.inkSoft }}>
              <Box component="strong" sx={{ color: COLORS.ink }}>{salons.length} мастеров</Box> найдено в Москве
            </Typography>
          </Box>

          {salons.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Typography color="text.secondary" mb={2}>{t('search.noResultsHint')}</Typography>
              <Button
                variant="outlined"
                onClick={() => dispatch(resetFilters())}
                sx={{ borderRadius: 100 }}
              >
                {t('search.resetFilters')}
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2.5}>
              {salons.map(salon => (
                <Grid key={salon.id} size={{ xs: 12, sm: 6 }}>
                  <SalonCard salon={salon} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        {/* Right: sidebar */}
        <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
          <PromoBanner />
          <MapSidebar salons={salons} />
        </Box>
      </Box>
    </Box>
  )
}
