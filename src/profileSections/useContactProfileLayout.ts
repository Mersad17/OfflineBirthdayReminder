import { useCallback, useEffect, useState } from "react";

import { AppId } from "../contacts/types";
import {
  ContactProfileLayout,
  ContactProfileLayoutItem,
  ContactProfileLayoutSource,
} from "./types";
import { createDefaultContactProfileLayout } from "./defaults";
import {
  deleteContactProfileLayout,
  fetchResolvedContactProfileLayout,
  saveContactProfileLayout,
  saveGlobalLayoutAndResetContactLayout,
  saveGroupLayoutAndResetContactLayout,
} from "./repository";

export function useContactProfileLayout(
  contactId: AppId | number | null | undefined,
  groupId?: AppId | number | null
) {
  const [layout, setLayout] = useState<ContactProfileLayout>(() =>
    createDefaultContactProfileLayout("global", null)
  );

  const [source, setSource] =
    useState<ContactProfileLayoutSource>("default");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    if (!contactId) {
      setLayout(createDefaultContactProfileLayout("global", null));
      setSource("default");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const resolved = await fetchResolvedContactProfileLayout(
        contactId,
        groupId
      );

      setLayout(resolved.layout);
      setSource(resolved.source);
    } finally {
      setLoading(false);
    }
  }, [contactId, groupId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveForContact = useCallback(
    async (items: ContactProfileLayoutItem[]) => {
      if (!contactId) return;

      try {
        setSaving(true);

        const saved = await saveContactProfileLayout(contactId, items);

        setLayout(saved);
        setSource("contact");
      } finally {
        setSaving(false);
      }
    },
    [contactId]
  );

  const saveForGroup = useCallback(
    async (items: ContactProfileLayoutItem[]) => {
      if (!contactId || !groupId) return;

      try {
        setSaving(true);

        const saved = await saveGroupLayoutAndResetContactLayout(
          contactId,
          groupId,
          items
        );

        setLayout(saved);
        setSource("group");
      } finally {
        setSaving(false);
      }
    },
    [contactId, groupId]
  );

  const saveForGlobal = useCallback(
    async (items: ContactProfileLayoutItem[]) => {
      if (!contactId) return;

      try {
        setSaving(true);

        await saveGlobalLayoutAndResetContactLayout(contactId, items);

        await reload();
      } finally {
        setSaving(false);
      }
    },
    [contactId, reload]
  );

  const resetContactLayout = useCallback(async () => {
    if (!contactId) return;

    try {
      setSaving(true);

      await deleteContactProfileLayout(contactId);
      await reload();
    } finally {
      setSaving(false);
    }
  }, [contactId, reload]);

  return {
    layout,
    source,
    loading,
    saving,
    reload,
    saveForContact,
    saveForGroup,
    saveForGlobal,
    resetContactLayout,
    canSaveForGroup: !!groupId,
  };
}