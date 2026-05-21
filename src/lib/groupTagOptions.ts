export const LABEL_COLORS = [
  "#EF4444", // red
  "#F97316", // orange
  "#F59E0B", // amber
  "#22C55E", // green
  "#06B6D4", // cyan
  "#3B82F6", // blue
  "#6366F1", // indigo
  "#A855F7", // purple
  "#EC4899", // pink
  "#64748B", // slate
] as const;

export const GROUP_ICONS = [
  "people",
  "briefcase",
  "heart",
  "fitness",
  "school",
  "home",
  "business",
  "cafe",
  "airplane",
  "star",
  "restaurant",
"football",
"code"
] as const;

export type GroupIconName = (typeof GROUP_ICONS)[number];

export const DEFAULT_GROUP_COLOR = "#3B82F6";
export const DEFAULT_TAG_COLOR = "#6366F1";
export const DEFAULT_GROUP_ICON: GroupIconName = "people";