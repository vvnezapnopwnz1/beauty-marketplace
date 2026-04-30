/**
 * Общие структурные компоненты форм дашборда.
 *
 * Экспортирует:
 *   FormField       — лейбл над полем + hint/error
 *   PanelHeader     — иконка + заголовок + subtitle + close
 *   FormSection     — пронумерованная секция
 *   PanelFooter     — нижняя панель с кнопками
 *   LevelSelector   — визуальный выбор уровня мастера
 *   StaffPickGrid   — карточки мастеров
 *   DurationStepper — −/value/+ для длительности
 *   TimeSlotGrid    — сетка временных слотов
 *   ToggleRow       — переключатель с заголовком и описанием
 *   ToggleSwitch    — standalone переключатель (для ScheduleView)
 *   ColorSwatchPicker — выбор цвета аватара
 *   ChipMultiSelect — мультивыбор услуг/тегами
 */
import * as React from 'react'
import { Box, IconButton, Typography, useTheme } from '@mui/material'

function useDashboardMocha() {
  const theme = useTheme()
  return theme.palette.dashboard
}

// ─────────────────────────────────────────────────────────────────────────────
// FormField — лейбл над полем
// ─────────────────────────────────────────────────────────────────────────────

export function FormField({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  const mocha = useDashboardMocha()
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <Typography
        component="label"
        sx={{ fontSize: 11, fontWeight: 500, color: mocha.mutedDark, letterSpacing: '.04em' }}
      >
        {label}
        {required && <Box component="span" sx={{ color: mocha.accent, ml: '2px' }}>*</Box>}
      </Typography>
      {children}
      {error && (
        <Typography sx={{ fontSize: 11, color: mocha.red, lineHeight: 1.4 }}>{error}</Typography>
      )}
      {!error && hint && (
        <Typography sx={{ fontSize: 11, color: mocha.mutedDark, lineHeight: 1.4 }}>{hint}</Typography>
      )}
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PanelHeader
// ─────────────────────────────────────────────────────────────────────────────

export function PanelHeader({
  icon,
  iconColor,
  title,
  subtitle,
  badge,
  onClose,
}: {
  icon: React.ReactNode
  iconColor?: string
  title: string
  subtitle?: string
  badge?: React.ReactNode
  onClose?: () => void
}) {
  const mocha = useDashboardMocha()
  return (
    <Box
      sx={{
        flexShrink: 0,
        px: 3,
        py: 2.25,
        borderBottom: `1px solid ${mocha.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        bgcolor: mocha.dialog,
        zIndex: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            bgcolor: iconColor ?? `rgba(200,133,90,.12)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: mocha.accent,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: mocha.text, lineHeight: 1.3 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ fontSize: 12, color: mocha.mutedDark, mt: '1px' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {badge}
      </Box>
      {onClose && (
        <IconButton
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          sx={{
            width: 30,
            height: 30,
            borderRadius: '8px',
            bgcolor: mocha.card2,
            color: mocha.muted,
            fontSize: 14,
            '&:hover': { bgcolor: mocha.control, color: mocha.text },
          }}
        >
          ✕
        </IconButton>
      )}
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FormSection — пронумерованная секция
// ─────────────────────────────────────────────────────────────────────────────

export function FormSection({
  num,
  name,
  last,
  children,
}: {
  num: number
  name: string
  last?: boolean
  children: React.ReactNode
}) {
  const mocha = useDashboardMocha()
  return (
    <Box
      sx={{
        px: 3,
        py: 2.25,
        borderBottom: last ? 'none' : `1px solid ${mocha.border}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.75 }}>
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: '6px',
            bgcolor: mocha.card2,
            border: `1px solid ${mocha.border}`,
            fontSize: 11,
            fontWeight: 600,
            color: mocha.mutedDark,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {num}
        </Box>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            color: mocha.muted,
          }}
        >
          {name}
        </Typography>
      </Box>
      {children}
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PanelFooter
// ─────────────────────────────────────────────────────────────────────────────

export function PanelFooter({
  note,
  actions,
  dangerAction,
}: {
  note?: string
  actions: React.ReactNode
  dangerAction?: React.ReactNode
}) {
  const mocha = useDashboardMocha()
  return (
    <Box
      sx={{
        flexShrink: 0,
        px: 3,
        py: 2,
        borderTop: `1px solid ${mocha.border}`,
        bgcolor: 'rgba(0,0,0,.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {dangerAction}
        {!dangerAction && note && (
          <Typography sx={{ fontSize: 11, color: mocha.mutedDark }}>{note}</Typography>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {dangerAction && note && (
          <Typography sx={{ fontSize: 11, color: mocha.mutedDark, mr: 1 }}>{note}</Typography>
        )}
        {actions}
      </Box>
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PanelBtn — унифицированные кнопки для PanelFooter
// ─────────────────────────────────────────────────────────────────────────────

export function PanelBtn({
  children,
  variant = 'ghost',
  type = 'button',
  onClick,
  disabled,
}: {
  children: React.ReactNode
  variant?: 'primary' | 'ghost' | 'danger' | 'success'
  type?: 'button' | 'submit'
  onClick?: () => void
  disabled?: boolean
}) {
  const mocha = useDashboardMocha()
  const styles: Record<string, object> = {
    primary: {
      bgcolor: mocha.accent,
      color: mocha.onAccent,
      border: 'none',
      '&:hover': { bgcolor: mocha.accentDark },
    },
    ghost: {
      bgcolor: 'transparent',
      color: mocha.muted,
      border: `1px solid ${mocha.border}`,
      '&:hover': { bgcolor: mocha.card2, color: mocha.text, borderColor: mocha.borderLight },
    },
    danger: {
      bgcolor: 'transparent',
      color: mocha.red,
      border: `1px solid rgba(224,96,96,.3)`,
      '&:hover': { bgcolor: 'rgba(224,96,96,.08)' },
    },
    success: {
      bgcolor: '#4a8c52',
      color: '#fff',
      border: 'none',
      '&:hover': { bgcolor: '#3d7644' },
    },
  }

  return (
    <Box
      component="button"
      type={type}
      onClick={onClick}
      disabled={disabled}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        px: 2.25,
        py: 0.875,
        borderRadius: '9px',
        fontSize: 13,
        fontWeight: 500,
        fontFamily: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all .15s',
        ...styles[variant],
      }}
    >
      {children}
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LevelSelector
// ─────────────────────────────────────────────────────────────────────────────

export function LevelSelector({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; hint?: string }[]
}) {
  const mocha = useDashboardMocha()
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: '6px' }}>
      {options.map(opt => {
        const active = value === opt.value
        return (
          <Box
            key={opt.value}
            component="button"
            type="button"
            onClick={() => onChange(opt.value)}
            sx={{
              px: 1,
              py: 1,
              borderRadius: '9px',
              border: `1px solid ${active ? mocha.accent : mocha.border}`,
              bgcolor: active ? `rgba(200,133,90,.12)` : mocha.card,
              color: active ? mocha.accent : mocha.muted,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all .12s',
              fontFamily: 'inherit',
              '&:hover': {
                borderColor: active ? mocha.accent : mocha.borderLight,
                color: active ? mocha.accent : mocha.text,
              },
            }}
          >
            <Box component="span" sx={{ display: 'block', fontSize: 12, fontWeight: 500 }}>
              {opt.label}
            </Box>
            {opt.hint && (
              <Box component="span" sx={{ display: 'block', fontSize: 10, opacity: .7, mt: '1px' }}>
                {opt.hint}
              </Box>
            )}
          </Box>
        )
      })}
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// StaffPickGrid — карточки мастеров
// ─────────────────────────────────────────────────────────────────────────────

export type StaffPickItem = {
  id: string
  displayName: string
  role?: string | null
  color?: string | null
}

function staffInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase() || '?'
}

export function StaffPickGrid({
  items,
  selected,
  onChange,
  allowNone,
}: {
  items: StaffPickItem[]
  selected: string[]
  onChange: (ids: string[]) => void
  /** Показывать "Любой" карточку */
  allowNone?: boolean
}) {
  const mocha = useDashboardMocha()
  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter(x => x !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {allowNone && (
        <Box
          component="button"
          type="button"
          onClick={() => onChange([])}
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 1.5,
            py: '7px',
            borderRadius: '10px',
            border: `1px solid ${selected.length === 0 ? mocha.accent : mocha.border}`,
            bgcolor: selected.length === 0 ? `rgba(200,133,90,.1)` : mocha.card,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all .12s',
          }}
        >
          <Typography sx={{ fontSize: 11, color: mocha.mutedDark, fontStyle: 'italic' }}>
            Любой свободный
          </Typography>
        </Box>
      )}
      {items.map(item => {
        const on = selected.includes(item.id)
        return (
          <Box
            key={item.id}
            component="button"
            type="button"
            onClick={() => toggle(item.id)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: '7px',
              borderRadius: '10px',
              border: `1px solid ${on ? mocha.accent : mocha.border}`,
              bgcolor: on ? `rgba(200,133,90,.1)` : mocha.card,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all .12s',
              '&:hover': {
                borderColor: on ? mocha.accent : mocha.borderLight,
              },
            }}
          >
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '8px',
                bgcolor: item.color ?? mocha.accent,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {staffInitials(item.displayName)}
            </Box>
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 500, color: mocha.text, lineHeight: 1.2 }}>
                {item.displayName.split(' ')[0]}
              </Typography>
              {item.role && (
                <Typography sx={{ fontSize: 10, color: mocha.mutedDark, lineHeight: 1.2 }}>
                  {item.role}
                </Typography>
              )}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DurationStepper
// ─────────────────────────────────────────────────────────────────────────────

export function DurationStepper({
  value,
  onChange,
  min = 5,
  max = 480,
  step = 5,
  rootTestId,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  /** E2E: stable handle for the stepper root */
  rootTestId?: string
}) {
  const mocha = useDashboardMocha()
  const dec = () => onChange(Math.max(min, value - step))
  const inc = () => onChange(Math.min(max, value + step))

  const btnSx = {
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor: mocha.card2,
    border: `1px solid ${mocha.border}`,
    color: mocha.muted,
    fontSize: 18,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all .12s',
    '&:hover': { bgcolor: mocha.card, color: mocha.text },
    '&:disabled': { opacity: .4, cursor: 'not-allowed' },
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }} data-testid={rootTestId}>
      <Box
        component="button"
        type="button"
        onClick={dec}
        disabled={value <= min}
        sx={{ ...btnSx, borderRadius: '10px 0 0 10px', borderRight: 'none' }}
      >
        −
      </Box>
      <Box
        sx={{
          flex: 1,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: mocha.card,
          border: `1px solid ${mocha.border}`,
          fontSize: 13,
          fontWeight: 600,
          color: mocha.text,
          minWidth: 80,
        }}
      >
        {value} мин
      </Box>
      <Box
        component="button"
        type="button"
        onClick={inc}
        disabled={value >= max}
        sx={{ ...btnSx, borderRadius: '0 10px 10px 0', borderLeft: 'none' }}
      >
        +
      </Box>
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TimeSlotGrid
// ─────────────────────────────────────────────────────────────────────────────

export type TimeSlot = {
  time: string   // "10:30"
  taken?: boolean
}

export function TimeSlotGrid({
  slots,
  selected,
  onChange,
}: {
  slots: TimeSlot[]
  selected: string | null
  onChange: (t: string) => void
}) {
  const mocha = useDashboardMocha()
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '6px',
      }}
    >
      {slots.map(s => {
        const isSelected = selected === s.time
        return (
          <Box
            key={s.time}
            component="button"
            type="button"
            disabled={s.taken}
            onClick={() => !s.taken && onChange(s.time)}
            sx={{
              py: '9px',
              borderRadius: '10px',
              border: `1px solid ${isSelected ? mocha.accent : mocha.border}`,
              bgcolor: isSelected ? `rgba(200,133,90,.12)` : mocha.card,
              fontSize: 12,
              fontWeight: isSelected ? 600 : 500,
              color: isSelected ? mocha.accent : s.taken ? mocha.mutedDark : mocha.muted,
              textAlign: 'center',
              cursor: s.taken ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              textDecoration: s.taken ? 'line-through' : 'none',
              opacity: s.taken ? 0.4 : 1,
              transition: 'all .12s',
              '&:not(:disabled):hover': {
                borderColor: mocha.borderLight,
                color: mocha.text,
              },
            }}
          >
            {s.time}
          </Box>
        )
      })}
    </Box>
  )
}

/** Генерирует слоты от startH до endH с шагом stepMin */
export function generateTimeSlots(startH = 9, endH = 18, stepMin = 30): TimeSlot[] {
  const slots: TimeSlot[] = []
  let cur = startH * 60
  const end = endH * 60
  while (cur < end) {
    const h = Math.floor(cur / 60)
    const m = cur % 60
    slots.push({ time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` })
    cur += stepMin
  }
  return slots
}

// ─────────────────────────────────────────────────────────────────────────────
// ToggleSwitch — standalone (используется в ScheduleView)
// ─────────────────────────────────────────────────────────────────────────────

export function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const mocha = useDashboardMocha()
  return (
    <Box
      component="label"
      sx={{
        position: 'relative',
        width: 38,
        height: 22,
        display: 'inline-block',
        flexShrink: 0,
        cursor: 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ display: 'none' }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '11px',
          bgcolor: checked ? mocha.accent : mocha.border,
          border: `1px solid ${checked ? mocha.accent : mocha.border}`,
          transition: '.2s',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 14,
          height: 14,
          borderRadius: '50%',
          bgcolor: '#fff',
          top: 3,
          left: checked ? 21 : 3,
          transition: '.2s',
          pointerEvents: 'none',
        }}
      />
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ToggleRow — переключатель с заголовком + описанием
// ─────────────────────────────────────────────────────────────────────────────

export function ToggleRow({
  title,
  description,
  checked,
  onChange,
  first,
  last,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  first?: boolean
  last?: boolean
}) {
  const mocha = useDashboardMocha()
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        py: 1.25,
        borderBottom: last ? 'none' : `1px solid ${mocha.border}`,
        borderTop: first ? `1px solid ${mocha.border}` : 'none',
      }}
    >
      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 500, color: mocha.text }}>{title}</Typography>
        <Typography sx={{ fontSize: 11, color: mocha.mutedDark, mt: '2px' }}>{description}</Typography>
      </Box>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ColorSwatchPicker
// ─────────────────────────────────────────────────────────────────────────────

export function ColorSwatchPicker({
  colors,
  value,
  onChange,
}: {
  colors: readonly string[]
  value: string
  onChange: (c: string) => void
}) {
  return (
    <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {colors.map(c => (
        <Box
          key={c}
          component="button"
          type="button"
          onClick={() => onChange(c)}
          sx={{
            width: 24,
            height: 24,
            borderRadius: '7px',
            bgcolor: c,
            border: `2px solid ${value === c ? 'rgba(255,255,255,.5)' : 'transparent'}`,
            transform: value === c ? 'scale(1.1)' : 'none',
            cursor: 'pointer',
            transition: '.12s',
            '&:hover': { transform: 'scale(1.15)' },
          }}
        />
      ))}
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ChipMultiSelect — чипы для выбора услуг
// ─────────────────────────────────────────────────────────────────────────────

export function ChipMultiSelect({
  items,
  selected,
  onChange,
  getLabel,
  getId,
}: {
  items: { id: string; [k: string]: unknown }[]
  selected: string[]
  onChange: (ids: string[]) => void
  getLabel: (item: { id: string; [k: string]: unknown }) => string
  getId: (item: { id: string; [k: string]: unknown }) => string
}) {
  const mocha = useDashboardMocha()
  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter(x => x !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {items.map(item => {
        const id = getId(item)
        const on = selected.includes(id)
        return (
          <Box
            key={id}
            component="button"
            type="button"
            onClick={() => toggle(id)}
            sx={{
              px: 1.5,
              py: '5px',
              borderRadius: '8px',
              fontSize: 12,
              fontWeight: 500,
              border: `1px solid ${on ? mocha.accent : mocha.border}`,
              bgcolor: on ? `rgba(200,133,90,.12)` : mocha.card,
              color: on ? mocha.accent : mocha.muted,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all .12s',
              '&:hover': {
                borderColor: on ? mocha.accent : mocha.borderLight,
                color: on ? mocha.accent : mocha.text,
              },
            }}
          >
            {getLabel(item)}
          </Box>
        )
      })}
    </Box>
  )
}
