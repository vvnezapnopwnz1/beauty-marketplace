/**
 * Общие sx-объекты для форм дашборда.
 * Импортируй в StaffFormModal, ServiceFormModal, DashboardProfile, DashboardAppointments.
 */
import { useMemo } from 'react'
import { useTheme, type SxProps, type Theme } from '@mui/material'

export function useDashboardFormStyles() {
  const theme = useTheme()
  const dashboard = theme.palette.dashboard
  const isLight = theme.palette.mode === 'light'

  return useMemo(() => {
    /** Базовый стиль input-поля без floating-label (лейбл живёт в FormField над полем). */
    const inputBaseSx: SxProps<Theme> = {
      '& .MuiOutlinedInput-root': {
        bgcolor: dashboard.input,
        borderRadius: '10px',
        '& fieldset': {
          borderColor: dashboard.inputBorder,
          top: 0,
        },
        '& fieldset legend': { display: 'none' },
        '&:hover fieldset': { borderColor: dashboard.borderLight },
        '&.Mui-focused fieldset': { borderColor: dashboard.borderFocus },
        '&.Mui-focused': {
          boxShadow: isLight
            ? 'inset 0 0 0 0 transparent, 0 0 0 3px rgba(196,112,63,0.16)'
            : 'inset 0 0 0 0 transparent, 0 0 0 3px rgba(200,133,90,0.08)',
        },
        '&.Mui-disabled': { opacity: 0.5 },
      },
      '& .MuiInputBase-input': {
        color: dashboard.text,
        fontSize: 13,
        padding: '9px 12px',
        '&::placeholder': { color: dashboard.mutedDark, opacity: 0.35 },
      },
      '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: dashboard.mutedDark },
      '& .MuiFormHelperText-root': { fontSize: 11, color: dashboard.mutedDark, ml: 0 },
      '& .MuiFormHelperText-root.Mui-error': { color: dashboard.red },
    }

    /** Вариант для multiline textarea */
    const textareaSx: SxProps<Theme> = {
      ...inputBaseSx,
      '& .MuiInputBase-input': {
        ...(inputBaseSx as Record<string, unknown>)['& .MuiInputBase-input'] as object,
        fontFamily: 'inherit',
        resize: 'none',
      },
    }

    /** PaperProps.sx для Dialog-панелей */
    const panelPaperSx: SxProps<Theme> = {
      bgcolor: dashboard.dialog,
      color: dashboard.text,
      maxWidth: 680,
      width: '100%',
      borderRadius: '16px',
      border: `1px solid ${dashboard.border}`,
      boxShadow: `0 20px 60px ${dashboard.shadowDeep}`,
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }

    /** Узкая панель (для ServiceFormModal, записи) */
    const panelPaperSmSx: SxProps<Theme> = {
      ...panelPaperSx,
      maxWidth: 520,
    }

    /** Стиль для Select/MenuItem dropdown-меню */
    const selectMenuSx = {
      PaperProps: {
        sx: { bgcolor: dashboard.card2, border: `1px solid ${dashboard.border}`, borderRadius: '10px' },
      },
    }

    /** Alert-ошибка в формах */
    const errorAlertSx: SxProps<Theme> = {
      bgcolor: dashboard.errorBg,
      color: dashboard.text,
      fontSize: 13,
      '& .MuiAlert-icon': { color: dashboard.red },
    }

    return { inputBaseSx, textareaSx, panelPaperSx, panelPaperSmSx, selectMenuSx, errorAlertSx }
  }, [dashboard, isLight])
}
