import type { Query } from '@tanstack/react-query';

const ALLOW_HEADS = new Set([
  'me',
  'today',
  'appointments',
  'appointmentsHeatmap',
  'clients',
  'client',
  'services',
  'financesSummary',
  'notifications',
  'notificationsUnread',
]);

/** Persist only allowlisted query roots (spec §8.1). */
export function shouldDehydrateQuery(query: Query): boolean {
  const key = query.queryKey;
  if (!Array.isArray(key) || key.length === 0) return false;
  return ALLOW_HEADS.has(String(key[0]));
}
