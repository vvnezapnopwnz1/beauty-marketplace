import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { TextField, Button, Typography, Stack, Link } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useAppDispatch, useAppSelector } from '@app/store'
import {
  setPhone,
  requestOtpStart,
  requestOtpSuccess,
  selectAuthLoading,
} from '../model/authSlice'
import { formatPhone } from '@shared/lib/formatPhone'

const schema = yup.object({
  phone: yup
    .string()
    .matches(/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/, 'Введите корректный номер')
    .required('Обязательное поле'),
})

type FormValues = { phone: string }

export function PhoneStep() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const loading = useAppSelector(selectAuthLoading)

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { phone: '' },
  })

  const onSubmit = ({ phone }: FormValues) => {
    dispatch(setPhone(phone))
    dispatch(requestOtpStart())
    // TODO: POST /api/auth/otp/request
    setTimeout(() => dispatch(requestOtpSuccess()), 800)
  }

  return (
    <Stack component="form" onSubmit={handleSubmit(onSubmit)} gap={2.5}>
      <div>
        <Typography variant="h5" fontWeight={700}>{t('login.title')}</Typography>
        <Typography color="text.secondary" mt={0.5}>{t('login.subtitle')}</Typography>
      </div>

      <Controller
        name="phone"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label={t('login.phoneLabel')}
            placeholder={t('login.phonePlaceholder')}
            inputMode="numeric"
            error={!!errors.phone}
            helperText={errors.phone?.message}
            onChange={e => field.onChange(formatPhone(e.target.value))}
            autoFocus
            fullWidth
            slotProps={{ htmlInput: { style: { fontSize: 18 } } }}
          />
        )}
      />

      <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
        {loading ? t('login.submitting') : t('login.submit')}
      </Button>

      <Typography variant="caption" color="text.secondary" textAlign="center">
        Продолжая, вы соглашаетесь с{' '}
        <Link href="/terms" underline="hover">условиями использования</Link>
      </Typography>
    </Stack>
  )
}
