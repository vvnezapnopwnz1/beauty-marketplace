import type { SearchResultItem } from '@shared/api/searchApi'

export type SearchCardVariant = 'normal' | 'featured-vertical' | 'featured-horizontal'

export type BentoRowItem = {
  item: SearchResultItem
  variant: SearchCardVariant
  /** Индекс 0–4 внутри батча из 5 — цвет градиента (см. BENTO_CARD_GRADIENTS). */
  bentoSlot: number
}

/** Score for featured selection (0–100 scale per ТЗ). */
export function calcScore(item: SearchResultItem): number {
  let score = 0
  if (item.rating != null && item.rating > 0) {
    score += (item.rating / 5) * 30
  }
  if (item.reviewCount != null && item.reviewCount > 0) {
    score += Math.min(item.reviewCount / 200, 1) * 20
  }
  if (item.onlineBooking) score += 20
  if (item.photoUrl?.trim()) score += 15
  const hasPricedServices = (item.services ?? []).some(s => s.priceCents > 0)
  if (hasPricedServices) score += 15
  return score
}

/**
 * Splits items into batches of 5; each batch picks one featured (max score, tie → first in batch).
 * Alternates vertical / horizontal featured per batch.
 * — vertical: featured первая в батче (как раньше).
 * — horizontal: сначала одна обычная карточка, затем featured (2 колонки справа в сетке 3×N).
 */
export function assignFeaturedVariants(items: SearchResultItem[]): BentoRowItem[] {
  const out: BentoRowItem[] = []
  const batchSize = 5

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchIndex = Math.floor(i / batchSize)
    const scores = batch.map(calcScore)

    let featuredIdx = 0
    let maxScore = scores[0] ?? -Infinity
    for (let j = 1; j < batch.length; j++) {
      const s = scores[j]!
      if (s > maxScore) {
        maxScore = s
        featuredIdx = j
      }
    }

    const featuredType: SearchCardVariant =
      batchIndex % 2 === 0 ? 'featured-vertical' : 'featured-horizontal'
    const featured = batch[featuredIdx]!
    const rest: SearchResultItem[] = []
    for (let k = 0; k < batch.length; k++) {
      if (k !== featuredIdx) rest.push(batch[k]!)
    }

    let reordered: SearchResultItem[]
    if (featuredType === 'featured-horizontal') {
      if (rest.length === 0) {
        reordered = [featured]
      } else {
        reordered = [rest[0]!, featured, ...rest.slice(1)]
      }
    } else {
      reordered = [featured, ...rest]
    }

    const featuredPosition =
      featuredType === 'featured-horizontal' ? (reordered.length === 1 ? 0 : 1) : 0

    for (let r = 0; r < reordered.length; r++) {
      out.push({
        item: reordered[r]!,
        variant: r === featuredPosition ? featuredType : 'normal',
        bentoSlot: r,
      })
    }
  }

  return out
}
