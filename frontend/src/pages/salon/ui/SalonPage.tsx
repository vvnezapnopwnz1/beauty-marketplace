import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Typography, Stack, Button,
  CircularProgress, Alert, Snackbar, LinearProgress,
} from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { NavBar } from '@shared/ui/NavBar'
import { mockSalons, formatPrice, CARD_GRADIENTS } from '@entities/salon'
import type { Salon, Service } from '@entities/salon'
import type { CategoryId } from '@entities/salon'
import { ROUTES } from '@shared/config/routes'
import { fetchSalonById, type ApiSalon } from '@shared/api/salonApi'
import { fetchPlaceByExternalId } from '@shared/api/placesApi'
import { placeDetailToSalon } from '@entities/place'
import { GuestBookingDialog } from '@features/guest-booking/ui/GuestBookingDialog'
import { useBrandColors } from '@shared/theme'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function apiToSalon(a: ApiSalon): Salon {
  return {
    id: a.id, name: a.name,
    category: (a.category as CategoryId) || 'hair',
    businessType: a.businessType === 'individual' ? 'individual' : 'venue',
    rating: a.rating, reviewCount: a.reviewCount, distanceKm: a.distanceKm,
    address: a.address, district: a.district,
    services: a.services.map(s => ({ id: s.id, name: s.name, durationMinutes: s.durationMinutes, priceCents: s.priceCents })),
    availableToday: a.availableToday, onlineBooking: a.onlineBooking,
    photoUrl: a.photoUrl, badge: a.badge as Salon['badge'],
    cardGradient: a.cardGradient as Salon['cardGradient'], emoji: a.emoji,
  }
}

// ─── Static mock content ────────────────────────────────────────────────────────

const MASTERS = [
  { initials: 'ИА', name: 'Ирина Александрова', role: 'Старший стилист', rating: 4.9, experience: '8 лет', specialties: ['Окрашивание', 'Кератин', 'Стрижки'] },
  { initials: 'МК', name: 'Мария Козлова',       role: 'Колорист',        rating: 4.8, experience: '5 лет', specialties: ['Балаяж', 'Осветление', 'Тонирование'] },
  { initials: 'ДЛ', name: 'Дарья Лебедева',      role: 'Стилист',         rating: 4.7, experience: '3 года', specialties: ['Стрижки', 'Укладки', 'Брашинг'] },
]

const REVIEWS = [
  { initials: 'АК', name: 'Анна К.', date: '15 марта 2024', rating: 5, service: 'Стрижка и укладка', master: 'Ирина А.', text: 'Потрясающий сервис! Мастер Ирина — настоящий профессионал. Уже третий раз прихожу и всегда довольна результатом. Атмосфера уютная, кофе вкусный 😊' },
  { initials: 'МС', name: 'Мария С.', date: '10 марта 2024', rating: 5, service: 'Окрашивание', master: 'Мария К.', text: 'Очень уютная атмосфера и приятный персонал. Цвет получился именно такой, как я хотела — Мария-колорист настоящий художник!' },
  { initials: 'ЕВ', name: 'Елена В.', date: '5 марта 2024', rating: 4, service: 'Кератиновое выпрямление', master: 'Ирина А.', text: 'Хороший салон, пришлось подождать 10 минут, но результатом довольна. Волосы стали шёлковыми, рекомендую.' },
  { initials: 'ОП', name: 'Ольга П.', date: '28 февраля 2024', rating: 5, service: 'Уход за волосами', master: 'Дарья Л.', text: 'Всё понравилось! Дарья очень внимательно отнеслась к моим пожеланиям. Буду возвращаться.' },
]

const RATING_BREAKDOWN = [
  { stars: 5, count: 241 },
  { stars: 4, count: 48  },
  { stars: 3, count: 15  },
  { stars: 2, count: 6   },
  { stars: 1, count: 2   },
]

const PROMOS: { emoji: string; title: string; desc: string; code: string; until: string; color: string; accent?: string }[] = [
  { emoji: '🎁', title: 'Первый визит —\u00A020%', desc: 'Скидка на любую услугу для новых клиентов. Без ограничений по сумме.', code: 'FIRST20', until: 'до 30 апреля', color: '#FDF6F2' },
  { emoji: '💇', title: 'Стрижка + уход', desc: 'Стрижка и экспресс-уход за волосами по специальной цене. Экономия 800 ₽.', code: 'HAIRCARE', until: 'до 15 мая', color: '#F2F6FD', accent: '#1565C0' },
  { emoji: '✨', title: 'Приведи подругу', desc: 'Ты и подруга получаете по 15% скидки на следующий визит.', code: 'FRIEND15', until: 'бессрочно', color: '#F5F2FD', accent: '#7B1FA2' },
]

const AMENITIES = [
  { icon: '📶', label: 'Wi-Fi' },
  { icon: '💳', label: 'Оплата картой' },
  { icon: '🅿️', label: 'Парковка рядом' },
  { icon: '♿', label: 'Доступная среда' },
  { icon: '☕', label: 'Кофе и чай' },
  { icon: '🧴', label: 'Проф. косметика' },
]

const PHOTO_GRADIENTS = [
  'linear-gradient(135deg, #f8e8f0 0%, #e8c4d8 100%)',
  'linear-gradient(135deg, #e8f4f0 0%, #a8d8cc 100%)',
  'linear-gradient(135deg, #fff3e0 0%, #ffcc80 100%)',
  'linear-gradient(135deg, #f3e5f5 0%, #ce93d8 100%)',
  'linear-gradient(135deg, #e3f2fd 0%, #90caf9 100%)',
  'linear-gradient(135deg, #fce4ec 0%, #f48fb1 100%)',
]

const PHOTO_LABELS = ['Работы · Стрижки', 'Работы · Окрашивание', 'Интерьер', 'Команда', 'Работы · Уход', 'Интерьер · Зона ожидания']

// ─── Tabs ───────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'services' | 'masters' | 'reviews' | 'promos' | 'photos'

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'overview',  label: 'Обзор',    emoji: '◈'  },
  { id: 'services',  label: 'Услуги',   emoji: '✂'  },
  { id: 'masters',   label: 'Мастера',  emoji: '👤' },
  { id: 'reviews',   label: 'Отзывы',   emoji: '★'  },
  { id: 'promos',    label: 'Акции',    emoji: '🎁' },
  { id: 'photos',    label: 'Фото',     emoji: '📷' },
]

// ─── Small shared components ────────────────────────────────────────────────────

function Card({ children, sx = {} }: { children: React.ReactNode; sx?: object }) {
  const COLORS = useBrandColors()
  return (
    <Box sx={{ bgcolor: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: '16px', overflow: 'hidden', ...sx }}>
      {children}
    </Box>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  const COLORS = useBrandColors()
  return (
    <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 500, color: COLORS.ink, mb: 2 }}>
      {children}
    </Typography>
  )
}

function StarRow({ rating }: { rating: number }) {
  const COLORS = useBrandColors()
  return (
    <Stack direction="row" gap={0.3}>
      {[1,2,3,4,5].map(i => (
        <Box key={i} component="span" sx={{ color: i <= rating ? '#E8A020' : COLORS.borderLight, fontSize: 14 }}>★</Box>
      ))}
    </Stack>
  )
}

// ─── Tab contents ───────────────────────────────────────────────────────────────

function OverviewTab({ salon }: { salon: Salon }) {
  const COLORS = useBrandColors()
  const schedule = [
    { days: 'Понедельник — Пятница', hours: '10:00 – 21:00' },
    { days: 'Суббота',               hours: '11:00 – 20:00' },
    { days: 'Воскресенье',           hours: '12:00 – 19:00' },
  ]
  const now = new Date()
  const hour = now.getHours()
  const isOpen = hour >= 10 && hour < 21

  return (
    <Stack gap={3}>
      {/* About */}
      <Card sx={{ p: 3 }}>
        <SectionTitle>О салоне</SectionTitle>
        <Typography sx={{ fontSize: 15, color: COLORS.inkSoft, lineHeight: 1.7 }}>
          {salon.name} — это современный бьюти-пространство в сердце Москвы, где каждый клиент получает
          индивидуальный подход. Мы работаем только с профессиональной косметикой премиум-класса и
          следим за последними трендами индустрии красоты. Наша команда регулярно проходит обучение
          в ведущих школах России и Европы.
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1} mt={2.5}>
          {AMENITIES.map(a => (
            <Box key={a.label} sx={{ display: 'flex', alignItems: 'center', gap: '6px', bgcolor: COLORS.cream, border: `1px solid ${COLORS.border}`, borderRadius: 100, px: 2, py: 0.75, fontSize: 13, color: COLORS.inkSoft, fontWeight: 500 }}>
              <span>{a.icon}</span>{a.label}
            </Box>
          ))}
        </Stack>
      </Card>

      {/* Hours + contacts */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <Card sx={{ p: 3 }}>
          <SectionTitle>Режим работы</SectionTitle>
          <Stack gap={1.5}>
            {schedule.map(row => (
              <Box key={row.days} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontSize: 14, color: COLORS.inkSoft }}>{row.days}</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{row.hours}</Typography>
              </Box>
            ))}
          </Stack>
          <Box sx={{ mt: 2.5, display: 'inline-flex', alignItems: 'center', gap: 1, px: 2, py: 0.75, borderRadius: 100, bgcolor: isOpen ? '#ECFDF5' : '#FEE2E2', fontSize: 13, fontWeight: 600, color: isOpen ? '#059669' : '#DC2626' }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor' }} />
            {isOpen ? 'Открыто сейчас' : 'Закрыто'}
          </Box>
        </Card>

        <Card sx={{ p: 3 }}>
          <SectionTitle>Контакты</SectionTitle>
          <Stack gap={2}>
            {(salon.contactRows ?? [
              { icon: '📍', label: 'Адрес', value: salon.address },
              { icon: '📞', label: 'Телефон', value: '+7 (495) 123-45-67' },
              { icon: '🌐', label: 'Сайт', value: 'studio-blanc.ru' },
              { icon: '📸', label: 'Instagram', value: '@studio_blanc_msk' },
            ]).map(c => (
              <Box key={c.label} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Box sx={{ fontSize: 16, mt: 0.1, flexShrink: 0 }}>{c.icon}</Box>
                <Box>
                  <Typography sx={{ fontSize: 11, color: COLORS.inkFaint, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 0.25 }}>{c.label}</Typography>
                  <Typography sx={{ fontSize: 14, color: COLORS.ink, fontWeight: 500 }}>{c.value}</Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Card>
      </Box>

      {/* Map placeholder */}
      <Card>
        <Box sx={{ height: 180, background: 'linear-gradient(135deg, #EAF0E9 0%, #D4E6D2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ fontSize: 32 }}>🗺</Box>
          <Typography sx={{ fontSize: 13, color: COLORS.inkSoft }}>Карта — {salon.address}</Typography>
        </Box>
        <Box sx={{ px: 3, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 14, color: COLORS.inkSoft }}>
            {salon.distanceKm > 0
              ? `${salon.distanceKm} км от вас · м. Тверская`
              : salon.address}
          </Typography>
          <Box sx={{ fontSize: 13, fontWeight: 600, color: COLORS.accent, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
            Построить маршрут →
          </Box>
        </Box>
      </Card>
    </Stack>
  )
}

function ServicesTab({ salon, onBook, canBook }: { salon: Salon; onBook: (s: Service) => void; canBook: boolean }) {
  const { t } = useTranslation()
  const COLORS = useBrandColors()

  // Group services by rough category
  const groups: Record<string, Service[]> = {}
  salon.services.forEach(s => {
    const key = s.name.toLowerCase().includes('стриж') || s.name.toLowerCase().includes('укладк') ? 'Стрижки и укладки'
      : s.name.toLowerCase().includes('окрас') || s.name.toLowerCase().includes('кератин') || s.name.toLowerCase().includes('тонир') ? 'Окрашивание и уход'
      : 'Другие услуги'
    if (!groups[key]) groups[key] = []
    groups[key].push(s)
  })

  return (
    <Stack gap={3}>
      {Object.entries(groups).map(([groupName, services]) => (
        <Card key={groupName}>
          <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${COLORS.border}`, bgcolor: COLORS.cream }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{groupName}</Typography>
          </Box>
          {services.map((s, i) => {
            const bookable = salon.onlineBooking && canBook && !!s.id
            return (
              <Box key={s.id ?? i} sx={{ borderBottom: i < services.length - 1 ? `1px solid ${COLORS.border}` : 'none' }}>
                <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 2, '&:hover': { bgcolor: COLORS.cream }, transition: 'bgcolor 0.15s' }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 500, color: COLORS.ink, mb: 0.5 }}>{s.name}</Typography>
                    <Stack direction="row" gap={1.5} alignItems="center">
                      <Typography sx={{ fontSize: 13, color: COLORS.inkSoft }}>⏱ {s.durationMinutes} {t('salon.minutes')}</Typography>
                    </Stack>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    <Box>
                      <Typography sx={{ fontSize: 16, fontWeight: 700, color: COLORS.ink }}>{formatPrice(s.priceCents)} ₽</Typography>
                    </Box>
                    {salon.onlineBooking && (
                      <Button
                        variant="contained"
                        size="small"
                        disabled={!bookable}
                        onClick={() => bookable && onBook(s)}
                        sx={{ bgcolor: '#6B0606', color: '#DFBFA8', borderRadius: 100, px: 2, fontSize: 13, '&:hover': { bgcolor: '#8a0707' }, '&.Mui-disabled': { bgcolor: COLORS.cream, color: COLORS.inkFaint } }}
                      >
                        {t('salon.bookOnline')}
                      </Button>
                    )}
                  </Box>
                </Box>
              </Box>
            )
          })}
        </Card>
      ))}

      <Box sx={{ p: 3, bgcolor: COLORS.accentLight, borderRadius: '16px', display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ fontSize: 24 }}>💡</Box>
        <Typography sx={{ fontSize: 14, color: COLORS.ink }}>
          <Box component="strong">Запись онлайн</Box> — бесплатно и без предоплаты. Салон свяжется для подтверждения в течение 30 минут.
        </Typography>
      </Box>
    </Stack>
  )
}

function MastersTab() {
  const COLORS = useBrandColors()
  return (
    <Stack gap={3}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
        {MASTERS.map(m => (
          <Card key={m.name} sx={{ p: 3, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 20px rgba(26,22,18,0.08)', transform: 'translateY(-2px)' } }}>
            <Stack alignItems="center" gap={2} textAlign="center">
              <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: COLORS.accentLight, color: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, border: `2px solid ${COLORS.border}` }}>
                {m.initials}
              </Box>
              <Box>
                <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 500, color: COLORS.ink }}>{m.name}</Typography>
                <Typography sx={{ fontSize: 13, color: COLORS.accent, fontWeight: 500, mt: 0.25 }}>{m.role}</Typography>
              </Box>
              <Stack direction="row" alignItems="center" gap={0.5}>
                <Box component="span" sx={{ color: '#E8A020', fontSize: 14 }}>★</Box>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{m.rating}</Typography>
                <Typography sx={{ fontSize: 13, color: COLORS.inkSoft }}>· {m.experience}</Typography>
              </Stack>
              <Stack direction="row" flexWrap="wrap" gap={0.75} justifyContent="center">
                {m.specialties.map(sp => (
                  <Box key={sp} sx={{ fontSize: 12, color: COLORS.inkSoft, bgcolor: COLORS.cream, border: `1px solid ${COLORS.border}`, borderRadius: 100, px: 1.5, py: 0.4, fontWeight: 500 }}>
                    {sp}
                  </Box>
                ))}
              </Stack>
              <Button variant="outlined" size="small" sx={{ borderRadius: 100, borderColor: COLORS.border, color: COLORS.ink, fontSize: 13, '&:hover': { borderColor: COLORS.accent, color: COLORS.accent, bgcolor: COLORS.accentLight } }}>
                Записаться к мастеру
              </Button>
            </Stack>
          </Card>
        ))}
      </Box>

      <Card sx={{ p: 3, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Box sx={{ fontSize: 24, flexShrink: 0 }}>🏆</Box>
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: COLORS.ink, mb: 0.5 }}>Все мастера сертифицированы</Typography>
          <Typography sx={{ fontSize: 14, color: COLORS.inkSoft, lineHeight: 1.6 }}>
            Наша команда проходит регулярное обучение и аттестацию. Используем только сертифицированную профессиональную косметику L'Oréal Professional, Wella и Kerastase.
          </Typography>
        </Box>
      </Card>
    </Stack>
  )
}

function ReviewsTab({ salon }: { salon: Salon }) {
  const COLORS = useBrandColors()
  const total = RATING_BREAKDOWN.reduce((a, b) => a + b.count, 0)

  return (
    <Stack gap={3}>
      {/* Rating summary */}
      <Card sx={{ p: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '160px 1fr' }, gap: 3, alignItems: 'center' }}>
          <Box textAlign="center">
            <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 64, fontWeight: 500, color: COLORS.ink, lineHeight: 1 }}>
              {salon.rating.toFixed(1)}
            </Typography>
            <StarRow rating={Math.round(salon.rating)} />
            <Typography sx={{ fontSize: 13, color: COLORS.inkSoft, mt: 1 }}>{salon.reviewCount} отзывов</Typography>
          </Box>
          <Stack gap={1}>
            {RATING_BREAKDOWN.map(row => (
              <Box key={row.stars} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontSize: 13, color: COLORS.inkSoft, width: 12, textAlign: 'right', flexShrink: 0 }}>{row.stars}</Typography>
                <Box component="span" sx={{ color: '#E8A020', fontSize: 12, flexShrink: 0 }}>★</Box>
                <LinearProgress
                  variant="determinate"
                  value={(row.count / total) * 100}
                  sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: COLORS.cream, '& .MuiLinearProgress-bar': { bgcolor: '#E8A020', borderRadius: 3 } }}
                />
                <Typography sx={{ fontSize: 12, color: COLORS.inkSoft, width: 28, flexShrink: 0 }}>{row.count}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </Card>

      {/* Review cards */}
      <Stack gap={2}>
        {REVIEWS.map((r, i) => (
          <Card key={i} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Box sx={{ width: 42, height: 42, borderRadius: '50%', bgcolor: COLORS.accentLight, color: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                {r.initials}
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{r.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.inkSoft }}>{r.date}</Typography>
                  </Box>
                  <StarRow rating={r.rating} />
                </Box>
              </Box>
            </Box>
            <Typography sx={{ fontSize: 14, color: COLORS.inkSoft, lineHeight: 1.7, mb: 2 }}>{r.text}</Typography>
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Box sx={{ fontSize: 12, color: COLORS.inkSoft, bgcolor: COLORS.cream, border: `1px solid ${COLORS.border}`, borderRadius: 100, px: 1.5, py: 0.4 }}>
                ✂ {r.service}
              </Box>
              <Box sx={{ fontSize: 12, color: COLORS.inkSoft, bgcolor: COLORS.cream, border: `1px solid ${COLORS.border}`, borderRadius: 100, px: 1.5, py: 0.4 }}>
                👤 {r.master}
              </Box>
              <Box sx={{ fontSize: 12, color: '#059669', bgcolor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 100, px: 1.5, py: 0.4 }}>
                ✓ Верифицировано
              </Box>
            </Stack>
          </Card>
        ))}
      </Stack>

      <Box sx={{ textAlign: 'center', py: 3, bgcolor: COLORS.cream, borderRadius: '16px', border: `1px dashed ${COLORS.border}` }}>
        <Typography sx={{ fontSize: 14, color: COLORS.inkSoft, mb: 1.5 }}>Отзывы доступны только после подтверждённой записи</Typography>
        <Button variant="outlined" sx={{ borderRadius: 100, borderColor: COLORS.border, color: COLORS.ink, fontSize: 13, '&:hover': { borderColor: COLORS.accent, color: COLORS.accent, bgcolor: COLORS.accentLight } }}>
          Оставить отзыв
        </Button>
      </Box>
    </Stack>
  )
}

function PromosTab() {
  const COLORS = useBrandColors()
  const [copied, setCopied] = useState<string | null>(null)

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <Stack gap={2.5}>
      {PROMOS.map((p, i) => {
        const accent = p.accent ?? COLORS.accent
        return (
        <Box key={i} sx={{ borderRadius: '16px', overflow: 'hidden', border: `1px solid ${COLORS.border}`, bgcolor: p.color }}>
          <Box sx={{ p: 3 }}>
            <Stack direction="row" gap={2} alignItems="flex-start">
              <Box sx={{ width: 52, height: 52, borderRadius: '14px', bgcolor: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0, border: `1px solid ${COLORS.border}` }}>
                {p.emoji}
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 500, color: COLORS.ink, mb: 0.5 }}>{p.title}</Typography>
                <Typography sx={{ fontSize: 14, color: COLORS.inkSoft, lineHeight: 1.6 }}>{p.desc}</Typography>
                <Typography sx={{ fontSize: 12, color: COLORS.inkFaint, mt: 0.75 }}>Действует {p.until}</Typography>
              </Box>
            </Stack>
          </Box>
          <Box sx={{ px: 3, pb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box
              onClick={() => copyCode(p.code)}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, borderRadius: '10px', border: `1.5px dashed ${accent}`, bgcolor: 'rgba(255,255,255,0.7)', cursor: 'pointer', transition: 'all 0.15s', '&:hover': { bgcolor: 'rgba(255,255,255,0.95)' } }}
            >
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: accent, letterSpacing: '1px', fontFamily: 'monospace' }}>
                {p.code}
              </Typography>
              <Typography sx={{ fontSize: 12, color: copied === p.code ? '#059669' : COLORS.inkSoft }}>
                {copied === p.code ? '✓ Скопировано' : 'Нажмите, чтобы скопировать'}
              </Typography>
            </Box>
          </Box>
        </Box>
        )
      })}

      <Card sx={{ p: 3, display: 'flex', gap: 2 }}>
        <Box sx={{ fontSize: 20, flexShrink: 0 }}>📲</Box>
        <Typography sx={{ fontSize: 14, color: COLORS.inkSoft, lineHeight: 1.6 }}>
          Применяйте промокод при онлайн-записи на этапе подтверждения. Один промокод за визит. Не суммируются.
        </Typography>
      </Card>
    </Stack>
  )
}

function PhotosTab() {
  const COLORS = useBrandColors()
  const [active, setActive] = useState<string | null>(null)

  return (
    <Stack gap={3}>
      <Stack direction="row" gap={1} flexWrap="wrap">
        {['Все', 'Работы', 'Интерьер', 'Команда'].map(cat => (
          <Box key={cat} onClick={() => setActive(cat === 'Все' ? null : cat)}
            sx={{ px: 2, py: 0.875, borderRadius: 100, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1.5px solid', borderColor: (active === cat || (!active && cat === 'Все')) ? COLORS.accent : COLORS.border, bgcolor: (active === cat || (!active && cat === 'Все')) ? COLORS.accentLight : COLORS.white, color: (active === cat || (!active && cat === 'Все')) ? COLORS.accent : COLORS.inkSoft, transition: 'all 0.15s' }}>
            {cat}
          </Box>
        ))}
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
        {PHOTO_GRADIENTS.map((grad, i) => {
          const label = PHOTO_LABELS[i]
          const isFiltered = active && !label.includes(active)
          if (isFiltered) return null
          return (
            <Box key={i} sx={{ borderRadius: '12px', overflow: 'hidden', aspectRatio: '4/3', background: grad, display: 'flex', alignItems: 'flex-end', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.02)' }, position: 'relative' }}>
              <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 60%)' }} />
              <Typography sx={{ position: 'relative', p: 1.5, fontSize: 12, fontWeight: 500, color: 'white' }}>{label}</Typography>
            </Box>
          )
        })}
      </Box>

      <Box sx={{ textAlign: 'center', py: 2.5, bgcolor: COLORS.cream, borderRadius: '16px', border: `1px dashed ${COLORS.border}` }}>
        <Typography sx={{ fontSize: 14, color: COLORS.inkSoft }}>
          Портфолио обновляется ежемесячно · {PHOTO_GRADIENTS.length} фото
        </Typography>
      </Box>
    </Stack>
  )
}

// ─── Booking sidebar ────────────────────────────────────────────────────────────

function BookingSidebar({ salon, canBookOnline, onBook }: { salon: Salon; canBookOnline: boolean; onBook: () => void }) {
  const { t } = useTranslation()
  const COLORS = useBrandColors()
  const [selectedService, setSelectedService] = useState<Service | null>(salon.services[0] ?? null)

  return (
    <Box sx={{ bgcolor: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: '20px', p: 3, position: { md: 'sticky' }, top: { md: 84 } }}>
      <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 500, color: COLORS.ink, mb: 0.5 }}>
        Запись онлайн
      </Typography>
      <Stack direction="row" alignItems="center" gap={0.75} mb={2.5}>
        <Box component="span" sx={{ color: '#E8A020', fontSize: 14 }}>★</Box>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: COLORS.ink }}>{salon.rating.toFixed(1)}</Typography>
        <Typography sx={{ fontSize: 13, color: COLORS.inkSoft }}>· {salon.reviewCount} отзывов</Typography>
      </Stack>

      {salon.onlineBooking ? (
        <>
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1.5 }}>
            Выберите услугу
          </Typography>
          <Stack gap={1} mb={2.5}>
            {salon.services.slice(0, 4).map(s => (
              <Box key={s.name} onClick={() => setSelectedService(s)}
                sx={{ p: 1.5, borderRadius: '10px', border: `1.5px solid`, borderColor: selectedService?.name === s.name ? COLORS.accent : COLORS.border, bgcolor: selectedService?.name === s.name ? COLORS.accentLight : 'transparent', cursor: 'pointer', transition: 'all 0.15s' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 500, color: COLORS.ink }}>{s.name}</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: COLORS.ink }}>{formatPrice(s.priceCents)} ₽</Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: COLORS.inkSoft, mt: 0.25 }}>⏱ {s.durationMinutes} мин</Typography>
              </Box>
            ))}
          </Stack>

          <Button
            variant="contained"
            fullWidth
            disabled={!canBookOnline || !selectedService}
            onClick={onBook}
            sx={{ bgcolor: '#6B0606', color: '#DFBFA8', borderRadius: 100, py: 1.5, fontSize: 15, fontWeight: 600, '&:hover': { bgcolor: '#8a0707' }, '&.Mui-disabled': { bgcolor: COLORS.cream, color: COLORS.inkFaint }, mb: 1.5 }}
          >
            Записаться
          </Button>
          <Typography sx={{ fontSize: 12, color: COLORS.inkSoft, textAlign: 'center' }}>
            {t('salon.bookingFree')}
          </Typography>
        </>
      ) : (
        <>
          <Typography sx={{ fontSize: 14, color: COLORS.inkSoft, mb: 2 }}>{t('salon.bookByPhone')}</Typography>
          <Button variant="outlined" fullWidth sx={{ borderRadius: 100, py: 1.25, borderColor: COLORS.border, color: COLORS.ink, '&:hover': { borderColor: COLORS.ink } }}>
            {t('salon.call')}
          </Button>
        </>
      )}
    </Box>
  )
}

// ─── Main SalonPage ─────────────────────────────────────────────────────────────

export function SalonPage() {
  const COLORS = useBrandColors()
  const { id, externalId: externalIdParam } = useParams<{ id?: string; externalId?: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const placeExternalId = externalIdParam ? decodeURIComponent(externalIdParam) : ''

  const [salon, setSalon] = useState<Salon | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [bookingService, setBookingService] = useState<Service | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setLoadError(null)
    if (placeExternalId) {
      try {
        const d = await fetchPlaceByExternalId(placeExternalId)
        setSalon(placeDetailToSalon(d))
      } catch (e) {
        if (e instanceof Error && e.message === 'not_found') setSalon(null)
        else {
          setLoadError(t('place.loadError'))
          setSalon(null)
        }
      }
      setLoading(false)
      return
    }
    if (!id) {
      setSalon(null)
      setLoading(false)
      return
    }
    if (UUID_RE.test(id)) {
      try {
        const raw = await fetchSalonById(id)
        setSalon(apiToSalon(raw))
      } catch (e) {
        if (e instanceof Error && e.message === 'not_found') setSalon(null)
        else { setLoadError(t('salon.loadError')); setSalon(null) }
      }
    } else {
      const m = mockSalons.find(s => s.id === id)
      setSalon(m ?? null)
    }
    setLoading(false)
  }, [id, placeExternalId, t])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const canBookOnline = !!salon?.onlineBooking && salon.services.some(s => !!s.id)

  if (loading) return (
    <Box minHeight="100vh"><NavBar />
      <Box display="flex" alignItems="center" justifyContent="center" height="60vh"><CircularProgress sx={{ color: COLORS.accent }} /></Box>
    </Box>
  )

  if (!salon) return (
    <Box><NavBar />
      <Box textAlign="center" py={10}>
        {loadError && <Alert severity="warning" sx={{ maxWidth: 420, mx: 'auto', mb: 2 }}>{loadError}</Alert>}
        <Typography variant="h5" mb={3}>
          {placeExternalId ? t('place.notFound') : t('salon.notFound')}
        </Typography>
        <Button variant="contained" onClick={() => navigate(ROUTES.HOME)}>{t('salon.backToSearch')}</Button>
      </Box>
    </Box>
  )

  const gradient = CARD_GRADIENTS[salon.cardGradient] ?? CARD_GRADIENTS.bg1

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <NavBar />

      {/* Hero */}
      <Box sx={{ position: 'relative', height: { xs: 220, sm: 300 }, background: gradient, overflow: 'hidden' }}>
        {salon.photoUrl
          ? <Box component="img" src={salon.photoUrl} alt={salon.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ fontSize: { xs: 100, sm: 150 }, opacity: 0.15, lineHeight: 1 }}>{salon.emoji}</Typography>
            </Box>
        }
        {/* Gradient overlay */}
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(26,22,18,0.65) 0%, rgba(26,22,18,0.1) 60%, transparent 100%)' }} />

        {/* Back button */}
        <Box onClick={() => navigate(-1)} sx={{ position: 'absolute', top: 16, left: { xs: 16, sm: 32 }, display: 'flex', alignItems: 'center', gap: 0.75, px: 2, py: 0.875, borderRadius: 100, bgcolor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: COLORS.ink, '&:hover': { bgcolor: 'rgba(255,255,255,1)' }, transition: 'all 0.15s' }}>
          ← {t('salon.backToSearch')}
        </Box>

        {/* Hero info */}
        <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, px: { xs: 2, sm: 4 }, pb: 2.5 }}>
          <Stack direction="row" alignItems="flex-end" justifyContent="space-between" gap={2}>
            <Box>
              {salon.badge && (
                <Box sx={{ display: 'inline-flex', mb: 1, px: 1.5, py: 0.4, borderRadius: 100, bgcolor: COLORS.accent, color: COLORS.onAccent, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {salon.badge === 'popular' ? 'Популярный' : salon.badge === 'top' ? 'Лучший' : 'Новый'}
                </Box>
              )}
              <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: { xs: 26, sm: 34 }, fontWeight: 500, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.5px' }}>
                {salon.name}
              </Typography>
              <Stack direction="row" alignItems="center" gap={1.5} mt={0.75} flexWrap="wrap">
                <Stack direction="row" alignItems="center" gap={0.5}>
                  <Box component="span" sx={{ color: '#E8A020', fontSize: 14 }}>★</Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{salon.rating.toFixed(1)}</Typography>
                  <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>({salon.reviewCount} отзывов)</Typography>
                </Stack>
                <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.4)' }} />
                <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>📍 {salon.address}</Typography>
                {salon.distanceKm > 0 && (
                  <>
                    <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.4)' }} />
                    <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{salon.distanceKm} км</Typography>
                  </>
                )}
                {salon.availableToday && (
                  <>
                    <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.4)' }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1.5, py: 0.25, borderRadius: 100, bgcolor: 'rgba(5,150,105,0.9)', fontSize: 12, fontWeight: 600, color: 'white' }}>
                      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#6EE7B7' }} />
                      Свободно сегодня
                    </Box>
                  </>
                )}
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* Sticky tabs */}
      <Box sx={{ bgcolor: COLORS.white, borderBottom: `1px solid ${COLORS.border}`, position: 'sticky', top: 64, zIndex: 9 }}>
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 4 }, display: 'flex', gap: 0, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <Box key={tab.id} onClick={() => setActiveTab(tab.id)}
                sx={{ display: 'flex', alignItems: 'center', gap: '6px', px: 2.5, py: 2, fontSize: 14, fontWeight: isActive ? 600 : 500, color: isActive ? COLORS.accent : COLORS.inkSoft, borderBottom: `2px solid ${isActive ? COLORS.accent : 'transparent'}`, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.15s', '&:hover': { color: isActive ? COLORS.accent : COLORS.ink } }}>
                <Box component="span" sx={{ fontSize: 15 }}>{tab.emoji}</Box>
                {tab.label}
              </Box>
            )
          })}
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 4 }, py: 4 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 360px' }, gap: 4, alignItems: 'flex-start' }}>
          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              {activeTab === 'overview'  && <OverviewTab salon={salon} />}
              {activeTab === 'services'  && <ServicesTab salon={salon} onBook={setBookingService} canBook={canBookOnline} />}
              {activeTab === 'masters'   && <MastersTab />}
              {activeTab === 'reviews'   && <ReviewsTab salon={salon} />}
              {activeTab === 'promos'    && <PromosTab />}
              {activeTab === 'photos'    && <PhotosTab />}
            </motion.div>
          </AnimatePresence>

          {/* Sticky booking sidebar */}
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <BookingSidebar
              salon={salon}
              canBookOnline={canBookOnline}
              onBook={() => {
                const first = salon.services.find(s => s.id)
                if (first) setBookingService(first)
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Mobile booking button */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, position: 'fixed', bottom: 0, left: 0, right: 0, p: 2, bgcolor: COLORS.white, borderTop: `1px solid ${COLORS.border}`, zIndex: 10 }}>
        <Button fullWidth variant="contained"
          sx={{ bgcolor: '#6B0606', color: '#DFBFA8', borderRadius: 100, py: 1.5, fontSize: 15, fontWeight: 600, '&:hover': { bgcolor: '#8a0707' } }}
          onClick={() => {
            if (canBookOnline) {
              const first = salon.services.find(s => s.id)
              if (first) setBookingService(first)
            }
            setActiveTab('services')
          }}
        >
          {salon.onlineBooking ? 'Записаться онлайн' : 'Позвонить'}
        </Button>
      </Box>

      {bookingService?.id && (
        <GuestBookingDialog
          open={!!bookingService}
          onClose={() => setBookingService(null)}
          salonId={salon.id}
          serviceId={bookingService.id}
          serviceName={bookingService.name}
          onSuccess={() => setSuccessOpen(true)}
        />
      )}

      <Snackbar open={successOpen} autoHideDuration={5000} onClose={() => setSuccessOpen(false)}
        message={t('guestBooking.success')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  )
}
