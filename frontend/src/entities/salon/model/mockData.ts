import type { Salon, CategoryId } from './types'

export interface Category {
  id: CategoryId
  labelKey: string
  emoji: string
}

export const CATEGORIES: Category[] = [
  { id: 'hair',         labelKey: 'categories.hair',        emoji: '✂' },
  { id: 'nails',        labelKey: 'categories.nails',       emoji: '💅' },
  { id: 'spa',          labelKey: 'categories.spa',         emoji: '✦' },
  { id: 'barber',       labelKey: 'categories.barber',      emoji: '🪒' },
  { id: 'brows',        labelKey: 'categories.brows',       emoji: '✦' },
  { id: 'makeup',       labelKey: 'categories.makeup',      emoji: '✦' },
  { id: 'massage',      labelKey: 'categories.massage',     emoji: '✻' },
  { id: 'skin',         labelKey: 'categories.skin',        emoji: '✦' },
  { id: 'hair_removal', labelKey: 'categories.hairRemoval', emoji: '♽' },
]

export const mockSalons: Salon[] = [
  {
    id: '1',
    name: 'Студия Nastya Nails',
    category: 'nails',
    businessType: 'individual',
    rating: 4.9,
    reviewCount: 312,
    distanceKm: 0.4,
    address: 'ул. Арбат, 12',
    district: 'Арбат',
    badge: 'popular',
    cardGradient: 'bg1',
    emoji: '💅',
    services: [
      { name: 'Маникюр с покрытием', durationMinutes: 90,  priceCents: 220000 },
      { name: 'Педикюр',             durationMinutes: 75,  priceCents: 280000 },
      { name: 'Наращивание',         durationMinutes: 150, priceCents: 450000 },
    ],
    availableToday: true,
    onlineBooking: true,
    photoUrl: null,
  },
  {
    id: '2',
    name: 'Serenity Spa & Wellness',
    category: 'spa',
    businessType: 'venue',
    rating: 5.0,
    reviewCount: 89,
    distanceKm: 0.7,
    address: 'Новый Арбат, 8',
    district: 'Арбат',
    badge: 'top',
    cardGradient: 'bg2',
    emoji: '✦',
    services: [
      { name: 'Классический массаж',  durationMinutes: 60, priceCents: 350000 },
      { name: 'Уход за лицом',        durationMinutes: 60, priceCents: 450000 },
    ],
    availableToday: true,
    onlineBooking: true,
    photoUrl: null,
  },
  {
    id: '3',
    name: 'Nail Atelier Nord',
    category: 'nails',
    businessType: 'venue',
    rating: 4.7,
    reviewCount: 43,
    distanceKm: 1.1,
    address: 'Смоленская пл., 3',
    district: 'Смоленская',
    badge: 'new',
    cardGradient: 'bg3',
    emoji: '💅',
    services: [
      { name: 'Гель-лак',            durationMinutes: 90,  priceCents: 180000 },
      { name: 'Педикюр с покрытием', durationMinutes: 90,  priceCents: 240000 },
      { name: 'Маникюр + дизайн',    durationMinutes: 120, priceCents: 280000 },
    ],
    availableToday: false,
    onlineBooking: true,
    photoUrl: null,
  },
  {
    id: '4',
    name: 'The Gentleman\'s Quarter',
    category: 'barber',
    businessType: 'venue',
    rating: 4.8,
    reviewCount: 201,
    distanceKm: 0.9,
    address: 'Кутузовский пр., 26',
    district: 'Кутузовская',
    cardGradient: 'bg4',
    emoji: '🪒',
    services: [
      { name: 'Стрижка',       durationMinutes: 45, priceCents: 200000 },
      { name: 'Борода',        durationMinutes: 30, priceCents: 120000 },
      { name: 'Стрижка+борода',durationMinutes: 60, priceCents: 300000 },
    ],
    availableToday: true,
    onlineBooking: false,
    photoUrl: null,
  },
  {
    id: '5',
    name: 'Brow & Lash Studio M',
    category: 'brows',
    businessType: 'individual',
    rating: 4.9,
    reviewCount: 156,
    distanceKm: 0.6,
    address: 'Плющиха, 9',
    district: 'Хамовники',
    badge: 'popular',
    cardGradient: 'bg5',
    emoji: '✦',
    services: [
      { name: 'Ламинирование ресниц',  durationMinutes: 60,  priceCents: 280000 },
      { name: 'Оформление бровей',     durationMinutes: 30,  priceCents: 120000 },
      { name: 'Окрашивание бровей',    durationMinutes: 40,  priceCents: 150000 },
    ],
    availableToday: true,
    onlineBooking: true,
    photoUrl: null,
  },
  {
    id: '6',
    name: 'Glow Skin Clinic',
    category: 'skin',
    businessType: 'venue',
    rating: 4.6,
    reviewCount: 78,
    distanceKm: 1.4,
    address: 'Садовая-Кудринская, 6',
    district: 'Баррикадная',
    cardGradient: 'bg6',
    emoji: '✦',
    services: [
      { name: 'HydraFacial',  durationMinutes: 60, priceCents: 450000 },
      { name: 'Химический пилинг', durationMinutes: 45, priceCents: 350000 },
    ],
    availableToday: true,
    onlineBooking: true,
    photoUrl: null,
  },
]

export const CARD_GRADIENTS: Record<string, string> = {
  bg1: 'linear-gradient(135deg, #F5EBE4 0%, #EDD5C5 100%)',
  bg2: 'linear-gradient(135deg, #EAF0E9 0%, #D5E5D3 100%)',
  bg3: 'linear-gradient(135deg, #E6EAF5 0%, #D0D8F0 100%)',
  bg4: 'linear-gradient(135deg, #F5EEE4 0%, #EDDDC5 100%)',
  bg5: 'linear-gradient(135deg, #F0E4F5 0%, #E0C5ED 100%)',
  bg6: 'linear-gradient(135deg, #E4F0F5 0%, #C5DFE8 100%)',
}

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('ru-RU')
}

export function minPrice(salon: Salon): number {
  return Math.min(...salon.services.map(s => s.priceCents))
}
