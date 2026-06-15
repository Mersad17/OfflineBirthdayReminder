import { and, count, eq, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { appSetting, contact } from "../db/schema";
import { AccessPlanId, isValidAccessPlan } from "./plans";

const ACCESS_PLAN_KEY = "access.plan";

export async function getStoredAccessPlan(): Promise<AccessPlanId | null> {
  const rows = await db
    .select({
      value: appSetting.value,
    })
    .from(appSetting)
    .where(eq(appSetting.key, ACCESS_PLAN_KEY))
    .limit(1);

  const value = rows[0]?.value ?? null;

  if (!isValidAccessPlan(value)) {
    return null;
  }

  return value;
}

export async function setStoredAccessPlan(plan: AccessPlanId) {
  const now = new Date();

  await db
    .insert(appSetting)
    .values({
      key: ACCESS_PLAN_KEY,
      value: plan,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: appSetting.key,
      set: {
        value: plan,
        updatedAt: now,
      },
    });
}

export async function getActiveContactCount() {
  const rows = await db
    .select({
      total: count(),
    })
    .from(contact)
    .where(and(eq(contact.userId, "local"), isNull(contact.deletedAt)));

  return rows[0]?.total ?? 0;
}