import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AccessPlanId,
  canCreateContact,
  getAccessForPlan,
  PRIVATE_BETA_FULL_ACCESS,
  UserAccess,
} from "./plans";
import {
  getActiveContactCount,
  getStoredAccessPlan,
  setStoredAccessPlan,
} from "./accessRepository";

type ContactGateResult = {
  allowed: boolean;
  activeContactCount: number;
  maxContacts: UserAccess["maxContacts"];
};

type AccessContextValue = {
  access: UserAccess;
  loading: boolean;
  activeContactCount: number;
  refreshAccess: () => Promise<void>;
  refreshContactCount: () => Promise<number>;
  setPlanForTesting: (plan: AccessPlanId) => Promise<void>;
  checkCanCreateContact: () => Promise<ContactGateResult>;
};

const AccessContext = createContext<AccessContextValue | null>(null);

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const [access, setAccess] = useState<UserAccess>(() =>
    getAccessForPlan(PRIVATE_BETA_FULL_ACCESS ? "beta" : "free")
  );

  const [activeContactCount, setActiveContactCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshContactCount = useCallback(async () => {
    const total = await getActiveContactCount();
    setActiveContactCount(total);
    return total;
  }, []);

  const refreshAccess = useCallback(async () => {
    try {
      setLoading(true);

      await refreshContactCount();

      if (PRIVATE_BETA_FULL_ACCESS) {
        setAccess(getAccessForPlan("beta"));
        return;
      }

      const storedPlan = await getStoredAccessPlan();
      setAccess(getAccessForPlan(storedPlan ?? "free"));
    } finally {
      setLoading(false);
    }
  }, [refreshContactCount]);

  useEffect(() => {
    refreshAccess();
  }, [refreshAccess]);

  const setPlanForTesting = useCallback(
    async (plan: AccessPlanId) => {
      await setStoredAccessPlan(plan);
      await refreshAccess();
    },
    [refreshAccess]
  );

  const checkCanCreateContact = useCallback(async () => {
    const count = await refreshContactCount();

    return {
      allowed: canCreateContact(access, count),
      activeContactCount: count,
      maxContacts: access.maxContacts,
    };
  }, [access, refreshContactCount]);

  const value = useMemo<AccessContextValue>(
    () => ({
      access,
      loading,
      activeContactCount,
      refreshAccess,
      refreshContactCount,
      setPlanForTesting,
      checkCanCreateContact,
    }),
    [
      access,
      loading,
      activeContactCount,
      refreshAccess,
      refreshContactCount,
      setPlanForTesting,
      checkCanCreateContact,
    ]
  );

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
}

export function useAccess() {
  const context = useContext(AccessContext);

  if (!context) {
    throw new Error("useAccess must be used inside AccessProvider");
  }

  return context;
}