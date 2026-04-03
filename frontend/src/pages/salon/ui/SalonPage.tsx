import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Container, Typography, Stack, Chip, Button,
  Grid, Paper, Divider,
} from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { NavBar } from '@shared/ui/NavBar'
import { mockSalons, formatPrice } from '@entities/salon'
import { ROUTES } from '@shared/config/routes'
import type { Service } from '@entities/salon'

function ServiceRow({ service }: { service: Service }) {
  const { t } = useTranslation()
  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" py={1.5} px={2.5}>
        <Box>
          <Typography fontWeight={500}>{service.name}</Typography>
          <Typography fontSize={13} color="text.secondary">{service.durationMinutes} {t('salon.minutes')}</Typography>
        </Box>
        <Stack direction="row" alignItems="center" gap={2}>
          <Typography fontWeight={600}>{formatPrice(service.priceCents)} ₽</Typography>
          <Button variant="contained" size="small">{t('salon.bookOnline')}</Button>
        </Stack>
      </Stack>
      <Divider />
    </>
  )
}

export function SalonPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const salon = mockSalons.find(s => s.id === id)

  if (!salon) {
    return (
      <Box>
        <NavBar />
        <Box textAlign="center" py={10}>
          <Typography variant="h5" mb={3}>{t('salon.notFound')}</Typography>
          <Button variant="contained" onClick={() => navigate(ROUTES.HOME)}>{t('salon.backToSearch')}</Button>
        </Box>
      </Box>
    )
  }

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <NavBar />
      <Box sx={{ height: { xs: 200, md: 300 }, background: 'linear-gradient(135deg, #f8e8f0, #ede0f5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h1" sx={{ opacity: 0.15, color: 'primary.main', fontSize: { xs: 80, md: 120 } }}>{salon.name[0]}</Typography>
      </Box>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={4} alignItems="flex-start">
          <Grid size={{ xs: 12, md: 8 }}>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <Box mb={4}>
                <Chip label={salon.businessType === 'individual' ? t('salon.typeIndividual') : t('salon.typeVenue')} color="primary" size="small" sx={{ mb: 1.5 }} />
                <Typography variant="h4" fontWeight={700} mb={1}>{salon.name}</Typography>
                <Stack direction="row" alignItems="center" gap={0.5} mb={1}>
                  <StarIcon sx={{ color: '#f59e0b', fontSize: 18 }} />
                  <Typography fontWeight={600}>{salon.rating.toFixed(1)}</Typography>
                  <Typography color="text.secondary" fontSize={14}>· {salon.reviewCount} {t('salon.verifiedReviews')}</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" gap={0.5}>
                  <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography fontSize={14} color="text.secondary">{salon.address} · {salon.distanceKm} {t('salon.km')}</Typography>
                </Stack>
                {salon.availableToday && (
                  <Stack direction="row" alignItems="center" gap={0.7} mt={1.5}
                    sx={{ display: 'inline-flex', bgcolor: '#f0fdf4', color: '#16a34a', px: 1.5, py: 0.7, borderRadius: 2 }}
                  >
                    <FiberManualRecordIcon sx={{ fontSize: 10 }} />
                    <Typography fontSize={13} fontWeight={600}>{t('salon.availableToday')}</Typography>
                  </Stack>
                )}
              </Box>

              <Typography variant="h6" fontWeight={700} mb={2}>{t('salon.services')}</Typography>
              <Paper variant="outlined" sx={{ mb: 4, overflow: 'hidden' }}>
                {salon.services.map((s, i) => <ServiceRow key={i} service={s} />)}
              </Paper>

              <Typography variant="h6" fontWeight={700} mb={2}>{t('salon.schedule')}</Typography>
              <Paper variant="outlined" sx={{ p: 2.5, mb: 4 }}>
                {[{ days: 'Пн–Пт', hours: '10:00 – 21:00' }, { days: 'Сб–Вс', hours: '11:00 – 19:00' }].map(row => (
                  <Stack key={row.days} direction="row" justifyContent="space-between" py={0.75}>
                    <Typography color="text.secondary">{row.days}</Typography>
                    <Typography fontWeight={500}>{row.hours}</Typography>
                  </Stack>
                ))}
              </Paper>

              <Typography variant="h6" fontWeight={700} mb={2}>{t('salon.reviews')}</Typography>
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}>
                <Typography color="text.secondary" mb={0.5}>{t('salon.reviewsEmpty')}</Typography>
                <Typography fontSize={13} color="primary.main">{t('salon.reviewsNote')}</Typography>
              </Paper>
            </motion.div>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 3, position: { md: 'sticky' }, top: { md: 80 }, borderRadius: 3 }}>
              <Stack direction="row" alignItems="center" gap={0.5} mb={2}>
                <StarIcon sx={{ color: '#f59e0b', fontSize: 18 }} />
                <Typography fontWeight={700}>{salon.rating.toFixed(1)}</Typography>
                <Typography color="text.secondary" fontSize={14}>· {salon.reviewCount} отзывов</Typography>
              </Stack>
              {salon.onlineBooking ? (
                <>
                  <Typography color="text.secondary" fontSize={14} mb={2}>{t('salon.bookingHint')}</Typography>
                  <Button variant="contained" size="large" fullWidth onClick={() => navigate(ROUTES.LOGIN)}>{t('salon.bookOnline')}</Button>
                  <Typography fontSize={12} color="text.secondary" textAlign="center" mt={1}>{t('salon.bookingFree')}</Typography>
                </>
              ) : (
                <>
                  <Typography color="text.secondary" fontSize={14} mb={2}>{t('salon.bookByPhone')}</Typography>
                  <Button variant="outlined" size="large" fullWidth>{t('salon.call')}</Button>
                </>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}
