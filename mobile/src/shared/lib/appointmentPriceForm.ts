export type AppointmentPriceForm = {
  manualEnabled: boolean;
  valueCents: number | null;
  initialValueCents: number | null;
};

export function rubToCents(raw: string): number | null {
  const normalized = raw
    .trim()
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, "")
    .replace(",", ".");
  if (normalized === "" || normalized === "." || normalized === "-")
    return null;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n * 100));
}

export function centsToRubInput(value: number | null): string {
  if (value === null) return "";
  return String(Math.round(value / 100));
}

export function calculateSelectedServicesTotalCents<
  T extends { id: string; priceCents?: number | null },
>(serviceIds: string[], services: T[]): number {
  const selected = new Set(serviceIds);
  return services.reduce(
    (sum, service) =>
      selected.has(service.id) ? sum + (service.priceCents ?? 0) : sum,
    0,
  );
}

export function shouldSendManualTotal(form: AppointmentPriceForm): boolean {
  return (
    form.manualEnabled &&
    form.valueCents !== form.initialValueCents &&
    form.valueCents !== null
  );
}
