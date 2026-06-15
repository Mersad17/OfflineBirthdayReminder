export type AccessPlanId =
  | "beta"
  | "free"
  | "personal_100"
  | "circle_500"
  | "unlimited";

export type LimitValue = number | "unlimited";

export type UserAccess = {
  plan: AccessPlanId;
  label: string;
  maxContacts: LimitValue;
  isBeta: boolean;
  isPaid: boolean;
  advancedBeforeMeet: boolean;
  premiumThemes: boolean;
  exportBackup: boolean;
};

export const PRIVATE_BETA_FULL_ACCESS = true;

export const ACCESS_PLANS: Record<AccessPlanId, UserAccess> = {
  beta: {
    plan: "beta",
    label: "Beta Access",
    maxContacts: "unlimited",
    isBeta: true,
    isPaid: false,
    advancedBeforeMeet: true,
    premiumThemes: true,
    exportBackup: true,
  },

  free: {
    plan: "free",
    label: "Free",
    maxContacts: 30,
    isBeta: false,
    isPaid: false,
    advancedBeforeMeet: false,
    premiumThemes: false,
    exportBackup: false,
  },

  personal_100: {
    plan: "personal_100",
    label: "Personal",
    maxContacts: 100,
    isBeta: false,
    isPaid: true,
    advancedBeforeMeet: true,
    premiumThemes: false,
    exportBackup: false,
  },

  circle_500: {
    plan: "circle_500",
    label: "Circle",
    maxContacts: 500,
    isBeta: false,
    isPaid: true,
    advancedBeforeMeet: true,
    premiumThemes: true,
    exportBackup: true,
  },

  unlimited: {
    plan: "unlimited",
    label: "Unlimited",
    maxContacts: "unlimited",
    isBeta: false,
    isPaid: true,
    advancedBeforeMeet: true,
    premiumThemes: true,
    exportBackup: true,
  },
};

export function getAccessForPlan(plan: AccessPlanId): UserAccess {
  return ACCESS_PLANS[plan] ?? ACCESS_PLANS.free;
}

export function isValidAccessPlan(value: string | null): value is AccessPlanId {
  return (
    value === "beta" ||
    value === "free" ||
    value === "personal_100" ||
    value === "circle_500" ||
    value === "unlimited"
  );
}

export function canCreateContact(access: UserAccess, activeContactCount: number) {
  if (access.maxContacts === "unlimited") {
    return true;
  }

  return activeContactCount < access.maxContacts;
}

export function getRemainingContacts(
  access: UserAccess,
  activeContactCount: number
): LimitValue {
  if (access.maxContacts === "unlimited") {
    return "unlimited";
  }

  return Math.max(access.maxContacts - activeContactCount, 0);
}

export function formatContactLimit(limit: LimitValue) {
  return limit === "unlimited" ? "Unlimited" : String(limit);
}