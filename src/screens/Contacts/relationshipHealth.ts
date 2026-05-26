import { Contact } from "../../contacts/types";
import { Interaction, interactionTypeLabel } from "../../interactions/types";

const BASE_CONNECTION_RHYTHM_DAYS = 30;
const ACTIVE_WEEK_WINDOW_DAYS = 7;
const PERFECT_WEEK_ACTIVE_DAYS = 4;

const NO_INTERACTION_FILL = 16;

const ACTIVE_DAY_CAPS: Record<number, number> = {
  0: 35,
  1: 50,
  2: 68,
  3: 85,
  4: 100,
};

const RED = "#EE6A5E";
const RED_DARK = "#D94C43";
const ORANGE = "#EBA55B";
const PURPLE = "#8A6BD8";

export type RelationshipHealth = {
  title: string;
  subtitle: string;
  color: string;
  fillPercent: number;
  lastInteractionLabel: string;
  daysSinceLastInteraction: number | null;
  activeDaysThisWeek: number;
};

function parseDate(value?: string | null) {
  if (!value) return null;

  const normalized = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

function todayStart() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date) {
  const ms = 24 * 60 * 60 * 1000;

  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());

  return Math.round((b.getTime() - a.getTime()) / ms);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getAny<T = any>(item: unknown, key: string): T | undefined {
  if (!item || typeof item !== "object") return undefined;
  return (item as Record<string, T>)[key];
}

function lastContactLabel(date: Date | null) {
  if (!date) return "No interaction yet";

  const since = daysBetween(date, todayStart());

  if (since === 0) return "Today";
  if (since === 1) return "1 day ago";

  return `${since} days ago`;
}

function getLatestRealInteractionDate(
  contact: Contact,
  interactions: Interaction[]
) {
  const interactionDates = interactions
    .map((interaction) => parseDate(interaction.happened_at))
    .filter((date): date is Date => Boolean(date));

  if (interactionDates.length > 0) {
    return interactionDates.sort((a, b) => b.getTime() - a.getTime())[0];
  }

  return parseDate(contact.talk_last_at);
}

function getActiveInteractionDaysInWindow(
  interactions: Interaction[],
  windowDays = ACTIVE_WEEK_WINDOW_DAYS
) {
  const today = todayStart();
  const activeDays = new Set<string>();

  for (const interaction of interactions) {
    const date = parseDate(interaction.happened_at);

    if (!date) continue;

    const diff = daysBetween(date, today);

    if (diff >= 0 && diff < windowDays) {
      activeDays.add(toDateKey(date));
    }
  }

  return activeDays.size;
}

function getEarnedFillCap(activeDaysThisWeek: number) {
  if (activeDaysThisWeek >= PERFECT_WEEK_ACTIVE_DAYS) {
    return ACTIVE_DAY_CAPS[4];
  }

  return ACTIVE_DAY_CAPS[activeDaysThisWeek] ?? ACTIVE_DAY_CAPS[0];
}

function getWeeklyConsistencyBonus(activeDaysThisWeek: number) {
  if (activeDaysThisWeek >= 4) return 53;
  if (activeDaysThisWeek === 3) return 34;
  if (activeDaysThisWeek === 2) return 18;
  if (activeDaysThisWeek === 1) return 5;

  return 0;
}

function getInteractionHistoryBonus(interactions: Interaction[]) {
  const count = interactions.length;

  if (count >= 12) return 8;
  if (count >= 8) return 6;
  if (count >= 5) return 4;
  if (count >= 3) return 3;
  if (count >= 1) return 2;

  return 0;
}

function getInteractionTypeText(interaction?: Interaction | null) {
  if (!interaction) return "";

  const rawType =
    getAny<string | number>(interaction, "type") ??
    getAny<string | number>(interaction, "interaction_type") ??
    getAny<string | number>(interaction, "kind");

  try {
    if (rawType !== undefined && rawType !== null) {
      return String(interactionTypeLabel(rawType as any)).toLowerCase();
    }
  } catch {
    // Safe fallback below.
  }

  return String(rawType ?? "").toLowerCase();
}

function getRecentInteractionBonus(interactions: Interaction[]) {
  if (!interactions.length) return 0;

  const latest = [...interactions].sort(
    (a, b) =>
      new Date(b.happened_at).getTime() -
      new Date(a.happened_at).getTime()
  )[0];

  const type = getInteractionTypeText(latest);

  if (
    type.includes("meet") ||
    type.includes("meeting") ||
    type.includes("call") ||
    type.includes("coffee") ||
    type.includes("lunch") ||
    type.includes("dinner") ||
    type.includes("visit") ||
    type.includes("date")
  ) {
    return 5;
  }

  if (
    type.includes("message") ||
    type.includes("text") ||
    type.includes("sms") ||
    type.includes("email")
  ) {
    return 3;
  }

  return 1;
}

function getFreshnessPercent(daysSinceLastInteraction: number) {
  const ratio = daysSinceLastInteraction / BASE_CONNECTION_RHYTHM_DAYS;

  if (ratio <= 0) {
    // One interaction today should feel meaningful, not perfect.
    return 38;
  }

  if (ratio <= 1) {
    // Day 0 -> 38%, day 30 -> 25%
    return 38 - ratio * 13;
  }

  if (ratio <= 2) {
    // Day 30 -> 25%, day 60 -> 14%
    return 25 - (ratio - 1) * 11;
  }

  if (ratio <= 3) {
    // Day 60 -> 14%, day 90 -> 8%
    return 14 - (ratio - 2) * 6;
  }

  return 8;
}

function getSubtitle(
  since: number,
  activeDaysThisWeek: number,
  fillPercent: number
) {
  if (activeDaysThisWeek >= PERFECT_WEEK_ACTIVE_DAYS && fillPercent >= 95) {
    return `Beautiful rhythm — ${activeDaysThisWeek} active days this week`;
  }

  if (activeDaysThisWeek >= 2) {
    return `${activeDaysThisWeek} active days this week`;
  }

  if (since === 0) {
    return "You logged a real moment today";
  }

  if (since === 1) {
    return "You logged a real moment 1 day ago";
  }

  return `You logged a real moment ${since} days ago`;
}

export function relationshipHealth(
  contact: Contact,
  interactions: Interaction[]
): RelationshipHealth {
  const latestInteractionDate = getLatestRealInteractionDate(
    contact,
    interactions
  );

  if (!latestInteractionDate) {
    return {
      title: "Connection freshness",
      subtitle: "No real interaction logged yet",
      color: PURPLE,
      fillPercent: NO_INTERACTION_FILL,
      lastInteractionLabel: "No interaction yet",
      daysSinceLastInteraction: null,
      activeDaysThisWeek: 0,
    };
  }

  const since = Math.max(0, daysBetween(latestInteractionDate, todayStart()));

  const activeDaysThisWeek = getActiveInteractionDaysInWindow(interactions);
  const earnedCap = getEarnedFillCap(activeDaysThisWeek);

  const freshness = getFreshnessPercent(since);
  const historyBonus = getInteractionHistoryBonus(interactions);
  const recentBonus = getRecentInteractionBonus(interactions);
  const consistencyBonus = getWeeklyConsistencyBonus(activeDaysThisWeek);

  const rawFillPercent = Math.round(
    freshness + historyBonus + recentBonus + consistencyBonus
  );

  const fillPercent = clamp(rawFillPercent, 8, earnedCap);

  return {
    title: "Connection freshness",
    subtitle: getSubtitle(since, activeDaysThisWeek, fillPercent),
    color: fillPercent >= 65 ? RED : fillPercent >= 35 ? ORANGE : RED_DARK,
    fillPercent,
    lastInteractionLabel: lastContactLabel(latestInteractionDate),
    daysSinceLastInteraction: since,
    activeDaysThisWeek,
  };
}