import { useState } from 'react'
import { Box, Button, Pagination, Stack, Typography } from '@mui/material'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AppointmentCard,
  AppointmentCardSkeleton,
  useGetMyAppointmentsQuery,
} from '@entities/user-appointment'
import { ROUTES } from '@shared/config/routes'

const PAGE_SIZE = 10

export function AppointmentsSection() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching } = useGetMyAppointmentsQuery(
    { page, pageSize: PAGE_SIZE },
    { refetchOnMountOrArgChange: true },
  )

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0
  const showSkeletons = isLoading || isFetching

  return (
    <Stack spacing={2}>
      <Typography variant="h6" fontWeight={700}>
        {t('myAppointments.title')}
      </Typography>

      {showSkeletons && (
        <Stack spacing={1.5}>
          {Array.from({ length: 4 }).map((_, i) => (
            <AppointmentCardSkeleton key={i} />
          ))}
        </Stack>
      )}

      {!showSkeletons && data && data.items.length === 0 && (
        <Box
          sx={{
            py: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            textAlign: 'center',
          }}
        >
          <CalendarTodayOutlinedIcon sx={{ fontSize: 56, color: 'text.disabled' }} />
          <Box>
            <Typography variant="subtitle1" fontWeight={600} color="text.secondary">
              {t('myAppointments.empty')}
            </Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
              {t('myAppointments.emptyHint')}
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            onClick={() => navigate(ROUTES.ROOT)}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
          >
            {t('myAppointments.findSalon')}
          </Button>
        </Box>
      )}

      {!showSkeletons && data && data.items.length > 0 && (
        <>
          <Stack spacing={1.5}>
            {data.items.map(appt => (
              <AppointmentCard key={appt.id} appt={appt} />
            ))}
          </Stack>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, p) => setPage(p)}
                shape="rounded"
                color="primary"
                size="small"
              />
            </Box>
          )}
        </>
      )}
    </Stack>
  )
}
