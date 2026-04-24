import { Box, Paper, Typography, IconButton } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppSelector } from '@app/store'
import { selectAuthStep } from '@features/auth-by-phone/model/authSlice'
import { PhoneStep } from '@features/auth-by-phone/ui/PhoneStep'
import { OtpStep } from '@features/auth-by-phone/ui/OtpStep'

export function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const step = useAppSelector(selectAuthStep)
  const returnTo = searchParams.get('returnTo') || null

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{ background: 'linear-gradient(135deg, #fdf4f8 0%, #f3eeff 100%)', p: 3 }}
    >
      <IconButton
        onClick={() => navigate(returnTo || -1)}
        sx={{ position: 'fixed', top: 20, left: 20 }}
      >
        <ArrowBackIcon />
      </IconButton>

      <Paper elevation={0} sx={{ width: '100%', maxWidth: 420, p: { xs: 4, sm: 5 }, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h5" fontWeight={700} color="primary" mb={4} letterSpacing="-0.5px">
          beautymap
        </Typography>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: step === 'otp' ? 24 : -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: step === 'otp' ? -24 : 24 }}
            transition={{ duration: 0.2 }}
          >
            {step === 'phone' ? <PhoneStep /> : <OtpStep returnTo={returnTo} />}
          </motion.div>
        </AnimatePresence>
      </Paper>
    </Box>
  )
}
