import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { TextField, Button, Typography, Stack, Alert } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@app/store'
import {
  backToPhone,
  confirmOtp,
  sendOtp,
  selectAuthPhone,
  selectAuthChannel,
  selectAuthLoading,
  selectAuthError,
} from '../model/authSlice'
import { ROUTES } from '@shared/config/routes'

const schema = yup.object({
  code: yup
    .string()
    .length(4, 'Код из 4 цифр')
    .matches(/^\d{4}$/, 'Только цифры')
    .required(),
})

type FormValues = { code: string }

export function OtpStep({ returnTo }: { returnTo?: string | null }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const phone = useAppSelector(selectAuthPhone)
  const channel = useAppSelector(selectAuthChannel)
  const loading = useAppSelector(selectAuthLoading)
  const error = useAppSelector(selectAuthError)

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { code: '' },
  })

  const onSubmit = async ({ code }: FormValues) => {
    const result = await dispatch(confirmOtp({ phone, code }))
    if (confirmOtp.fulfilled.match(result)) {
      navigate(returnTo || ROUTES.HOME)
    }
  }

  const handleResend = () => {
    dispatch(sendOtp({ phone, channel }))
  }

  return (
    <Stack component="form" onSubmit={handleSubmit(onSubmit)} gap={2.5}>
      <div>
        <Typography variant="h5" fontWeight={700}>{t('login.otpTitle')}</Typography>
        <Typography color="text.secondary" mt={0.5}>
          {t('login.otpSubtitle')} <strong>{phone}</strong>
        </Typography>
      </div>

      {error && <Alert severity="error">{error}</Alert>}

      <Controller
        name="code"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label={t('login.otpLabel')}
            inputMode="numeric"
            error={!!errors.code}
            helperText={errors.code?.message}
            onChange={e => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
            autoFocus
            fullWidth
            slotProps={{
              htmlInput: {
                style: { fontSize: 28, textAlign: 'center', letterSpacing: 12, fontWeight: 700 },
                maxLength: 4,
              },
            }}
          />
        )}
      />

      <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
        {loading ? t('login.verifying') : t('login.verify')}
      </Button>

      <Button variant="outlined" size="large" fullWidth onClick={() => dispatch(backToPhone())}>
        {t('login.changePhone')}
      </Button>

      <Typography variant="caption" color="text.secondary" textAlign="center">
        {t('login.resendHint')}{' '}
        <Typography
          component="span"
          variant="caption"
          color="primary"
          sx={{ cursor: 'pointer', textDecoration: 'underline' }}
          onClick={handleResend}
        >
          {t('login.resend')}
        </Typography>
      </Typography>
    </Stack>
  )
}
