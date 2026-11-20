import { getLabDateKey, parseLabDateTime } from "@/lib/lab-time";

export const IMPACT_CATEGORIES = ["GENERAL", "LASER", "CNT_REACTOR", "FUMEHOOD"] as const;
export function isSharedImpact(instrument: { impactCategory: string; crossShared: boolean }) {
  return instrument.crossShared || ["LASER", "CNT_REACTOR", "FUMEHOOD"].includes(instrument.impactCategory);
}
export function validateSafetySlot(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !["09:00", "18:00"].includes(time)) return null;
  const day = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date || [0, 6].includes(day.getUTCDay())) return null;
  const slot = parseLabDateTime(date, time);
  return Number.isFinite(slot.getTime()) && getLabDateKey(slot) === date ? slot : null;
}
