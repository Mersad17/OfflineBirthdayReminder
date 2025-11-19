// format a Date like "Sat, Oct 25" in device locale
export function formatFriendly(d: Date) {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(d);
  }
  
  // parse "YYYY-MM-DD" -> Date (local time, 00:00)
  export function parseYMD(ymd: string): Date {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  
  // compute next occurrence of a recurring annual date relative to "today"
  // rule for Feb 29: celebrate on Feb 28 in non-leap years (you picked this in backend tests)
  export function nextOccurrenceFrom(ymd: string, today = new Date()): Date {
    const [origY, origM, origD] = ymd.split("-").map(Number);
    const currentY = today.getFullYear();
  
    // base candidate: this year
    let month = origM;
    let day = origD;
  
    // handle Feb 29 -> Feb 28 in non-leap years
    if (month === 2 && day === 29) {
      if (!isLeapYear(currentY)) {
        day = 28;
      }
    }
  
    let candidate = new Date(currentY, month - 1, day);
    // if candidate already passed (strictly < today at midnight), move to next year
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (candidate < todayMidnight) {
      let nextY = currentY + 1;
      // adjust Feb 29 again for next year
      if (month === 2 && origD === 29 && !isLeapYear(nextY)) {
        candidate = new Date(nextY, 1, 28); // Feb = 1 index
      } else {
        candidate = new Date(nextY, month - 1, day);
      }
    }
    return candidate;
  }
  
  export function daysBetween(today: Date, future: Date): number {
    // diff in whole days, ignoring time-of-day
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const t1 = new Date(future.getFullYear(), future.getMonth(), future.getDate()).getTime();
    return Math.round((t1 - t0) / (1000 * 60 * 60 * 24));
  }
  
  function isLeapYear(year: number) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }
  
  // decide section label by weeks
  export function sectionFor(date: Date, today = new Date()): "This week" | "Next week" | "Later" {
    const w0 = weekNumber(today);
    const w = weekNumber(date);
    if (w === w0) return "This week";
    if (w === w0 + 1) return "Next week";
    return "Later";
  }
  
  // ISO week number (Monday-based) — simple approximation for grouping
  function weekNumber(d: Date) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    // set to nearest Thursday: current date + 4 - current day number (Monday=1, Sunday=7)
    const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
    date.setUTCDate(date.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
    const diff = Number(date) - Number(firstThursday);
    return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
  }
  