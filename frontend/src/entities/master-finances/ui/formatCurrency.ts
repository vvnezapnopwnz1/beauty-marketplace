export function formatCurrency(cents: number): string {
  const rubles = (cents / 100).toFixed(2)
  return `${rubles.replace('.', ',')} ₽`
}
