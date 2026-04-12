/**
 * Палитры медиа-блока bento-сетки (как в docs/beautica-v2-redesign.html `.grad-1` … `.grad-5`).
 * Пять слотов на батч из 5 карточек.
 */
export const BENTO_CARD_GRADIENTS: readonly string[] = [
  'linear-gradient(135deg, #4a3328 0%, #3a2820 100%)',
  'linear-gradient(135deg, #2a3a30 0%, #1f2b25 100%)',
  'linear-gradient(135deg, #352840 0%, #27203a 100%)',
  'linear-gradient(135deg, #3a2f28 0%, #2a2218 100%)',
  'linear-gradient(135deg, #2a3035 0%, #1f2830 100%)',
]

export function bentoGradientAt(slot: number): string {
  const i = Math.max(0, Math.min(4, slot))
  return BENTO_CARD_GRADIENTS[i] ?? BENTO_CARD_GRADIENTS[0]!
}
