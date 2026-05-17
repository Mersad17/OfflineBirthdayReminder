// src/events/utils.ts
import { formatDateEU } from "../lib/date";
import { EventDTO } from "./types";

function formatDurationMinutes(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function daysBetween(a: string, b: string) {
  const start = new Date(a);
  const end = new Date(b);
  const ms = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / ms));
}

function formatTime(time?: string | null) {
    if (!time) return null;
  
    // time is "HH:mm"
    const [h, m] = time.split(":");
  
    if (!h || !m) return null;
  
    return `${h}:${m}`;
  }
  

/**
 * ✅ Human readable duration / schedule preview
 * Used in cards + details
 */
export function getDurationPreview(event: EventDTO): string | null {
    // Multi-day
    if (event.end_date && event.start_date !== event.end_date) {
      return `${daysBetween(event.start_date, event.end_date)} days`;
    }
  
    // Same-day duration
    if (
      event.start_time &&
      event.end_time &&
      event.duration_minutes != null
    ) {
      return formatDurationMinutes(event.duration_minutes);
    }
  
    return null;
  }
  export function getEventTimeInfo(event: EventDTO): {
    main: string;
    sub?: string;
  } {
    // 🔁 Recurring
    if (event.is_recurring) {
      return {
        main: "🔁 Recurring",
        sub: event.start_date ? formatDateEU(event.start_date) : undefined,
      };
    }
  
    // 📅 Multi-day
    if (event.start_date && event.end_date && event.start_date !== event.end_date) {
      return {
        main: `📅 ${formatDateEU(event.start_date)} → ${formatDateEU(event.end_date)}`,
        sub: `${daysBetween(event.start_date, event.end_date)} days`,
      };
    }
  
    // ⏰ Same-day with time
    if (event.start_time && event.end_time) {
      return {
        main: `⏰ ${formatTime(event.start_time)} → ${formatTime(event.end_time)}`,
        sub:
          event.duration_minutes != null
            ? `⏱ ${formatDurationMinutes(event.duration_minutes)}`
            : undefined,
      };
    }
  
    // ⏰ Start time only
    if (event.start_time) {
      return {
        main: `⏰ Starts at ${formatTime(event.start_time)}`,
      };
    }
  
    // 🧪 Date only (ONLY if it exists)
    if (event.start_date) {
      return {
        main: `📅 ${formatDateEU(event.start_date)}`,
      };
    }
  
    // 🛑 Absolute fallback (no date, no time)
    return {
      main: "📌 No date specified",
    };
  }
  