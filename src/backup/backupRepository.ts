import { and, eq, inArray, isNull, or } from "drizzle-orm";

import { db } from "../db/client";
import {
  appSetting,
  contact,
  contactAlbum,
  contactAlbumPhoto,
  contactEvent,
  contactGroup,
  contactMemory,
  contactRelationship,
  contactTag,
  contactTagLink,
  customInfoEntry,
  customInfoField,
  customInfoSection,
  customInfoValue,
  interaction,
  reminder,
} from "../db/schema";

import { AppId } from "../contacts/types";

import {
  BACKUP_VERSION,
  FULL_BACKUP_INCLUDE,
  PLAIN_BACKUP_FORMAT,
  BackupCounts,
  BackupDataType,
  BackupDataV2,
  BackupExportOptions,
  BackupImportOptions,
  BackupImportPlan,
  BackupImportResult,
  BackupImportStrategy,
  BackupPreview,
  ContactImportConflict,
  LegacyBackupMode,
  PlainBackupV2,
} from "./types";

import {
  readAlbumPhotosForBackup,
  readContactPhotosForBackup,
  restoreAlbumPhotosFromBackup,
  restoreContactPhotosFromBackup,
} from "./backupMedia";
import { BackupProgressCallback, clampPercent } from "./progress";

const LOCAL_USER_ID = "local";

const VALID_MEMORY_TYPES = new Set([
  "note",
  "important",
  "ask_next_time",
  "date",
]);

const VALID_EVENT_TYPES = new Set([1, 2, 3, 4, 5, 6]);
const VALID_REMINDER_STATUSES = new Set([1, 2, 3, 4]);
const VALID_INTERACTION_TYPES = new Set([1, 2, 3, 4, 5]);

const VALID_CUSTOM_SECTION_SCOPES = new Set(["contact", "global"]);

const VALID_CUSTOM_FIELD_TYPES = new Set([
  "text",
  "long_text",
  "date",
  "number",
  "boolean",
]);

type BackupBuildContext = {
  selectedContactIds?: Set<string>;
  fullExport: boolean;
  include: ReturnType<typeof normalizeIncludeOptions>;
};

type PreparedImport = {
  data: BackupDataV2;
  contactIdMap: Map<string, string>;
  albumIdMap: Map<string, string>;
  albumPhotoIdMap: Map<string, string>;
  conflictSummary: BackupImportResult["conflicts"];
};

/* -------------------------------------------------------------------------- */
/* Progress                                                                     */
/* -------------------------------------------------------------------------- */

function report(
  onProgress: BackupProgressCallback | undefined,
  percent: number,
  message: string,
  detail?: string
) {
  const safePercent = clampPercent(percent);

  console.log(`[BackupRepository] ${safePercent}% ${message}`, detail ?? "");

  onProgress?.({
    percent: safePercent,
    message,
    detail,
  });
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                   */
/* -------------------------------------------------------------------------- */

export async function buildPlainBackup(
  options?: BackupExportOptions,
  onProgress?: BackupProgressCallback
): Promise<PlainBackupV2> {
  const safeOptions = normalizeExportOptions(options);

  report(onProgress, 2, "Preparing export plan...");

  const selectedContactIds =
    safeOptions.scope === "selected_contacts"
      ? new Set((safeOptions.selectedContactIds ?? []).map(String))
      : undefined;

  if (safeOptions.scope === "selected_contacts" && !selectedContactIds?.size) {
    throw new Error("Choose at least one contact to export.");
  }

  const context: BackupBuildContext = {
    selectedContactIds,
    fullExport: safeOptions.scope === "full",
    include: normalizeIncludeOptions(safeOptions.include),
  };

  report(onProgress, 5, "Reading groups...");

  const allContactGroups = await db
    .select()
    .from(contactGroup)
    .where(isNull(contactGroup.deletedAt));

  report(onProgress, 9, "Reading tags...");

  const allContactTags = await db
    .select()
    .from(contactTag)
    .where(isNull(contactTag.deletedAt));

  report(onProgress, 14, "Reading contacts...");

  const allContacts = await db
    .select()
    .from(contact)
    .where(isNull(contact.deletedAt));

  report(onProgress, 20, "Reading contact-tag links...");

  const allContactTagLinks = await db.select().from(contactTagLink);

  report(onProgress, 26, "Reading memories...");

  const allContactMemories = await db
    .select()
    .from(contactMemory)
    .where(isNull(contactMemory.deletedAt));

  report(onProgress, 32, "Reading events...");

  const allContactEvents = await db
    .select()
    .from(contactEvent)
    .where(isNull(contactEvent.deletedAt));

  report(onProgress, 38, "Reading reminders...");

  const allReminders = await db
    .select()
    .from(reminder)
    .where(isNull(reminder.deletedAt));

  report(onProgress, 44, "Reading interactions...");

  const allInteractions = await db
    .select()
    .from(interaction)
    .where(isNull(interaction.deletedAt));

  report(onProgress, 50, "Reading custom info...");

  const allCustomInfoSections = await db
    .select()
    .from(customInfoSection)
    .where(isNull(customInfoSection.deletedAt));

  const allCustomInfoFields = await db
    .select()
    .from(customInfoField)
    .where(isNull(customInfoField.deletedAt));

  const allCustomInfoEntries = await db
    .select()
    .from(customInfoEntry)
    .where(isNull(customInfoEntry.deletedAt));

  const allCustomInfoValues = await db
    .select()
    .from(customInfoValue)
    .where(isNull(customInfoValue.deletedAt));

  report(onProgress, 58, "Reading albums...");

  const allContactAlbums = await db
    .select()
    .from(contactAlbum)
    .where(isNull(contactAlbum.deletedAt));

  const allContactAlbumPhotos = await db
    .select()
    .from(contactAlbumPhoto)
    .where(isNull(contactAlbumPhoto.deletedAt));

  report(onProgress, 64, "Reading relationships...");

  const allContactRelationships = await db
    .select()
    .from(contactRelationship)
    .where(isNull(contactRelationship.deletedAt));

  report(onProgress, 70, "Reading app settings...");

  const allAppSettings = await db.select().from(appSetting);

  const filtered = filterExportRows({
    context,
    contactGroups: allContactGroups,
    contactTags: allContactTags,
    contacts: allContacts,
    contactTagLinks: allContactTagLinks,
    contactMemories: allContactMemories,
    contactEvents: allContactEvents,
    reminders: allReminders,
    interactions: allInteractions,
    customInfoSections: allCustomInfoSections,
    customInfoFields: allCustomInfoFields,
    customInfoEntries: allCustomInfoEntries,
    customInfoValues: allCustomInfoValues,
    contactAlbums: allContactAlbums,
    contactAlbumPhotos: allContactAlbumPhotos,
    contactRelationships: allContactRelationships,
    appSettings: allAppSettings,
  });

  report(onProgress, 78, "Reading contact photos...");

  const contactPhotos = context.include.contactPhotos
    ? await readContactPhotosForBackup(
        filtered.contacts.map((item: any) => ({
          id: item.id,
          photoUri: item.photoUri,
        })),
        (photoProgress) => {
          report(
            onProgress,
            78 + photoProgress.percent * 0.07,
            photoProgress.message,
            photoProgress.detail
          );
        }
      )
    : [];

  report(onProgress, 86, "Reading album photos...");

  const albumPhotos = context.include.albumPhotos
    ? await readAlbumPhotosForBackup(
        filtered.contactAlbumPhotos.map((item: any) => ({
          id: item.id,
          albumId: item.albumId,
          contactId: item.contactId,
          uri: item.uri,
          width: item.width,
          height: item.height,
          takenAt: item.takenAt,
          sortOrder: item.sortOrder,
        })),
        (photoProgress) => {
          report(
            onProgress,
            86 + photoProgress.percent * 0.07,
            photoProgress.message,
            photoProgress.detail
          );
        }
      )
    : [];

  const data: BackupDataV2 = {
    contactGroups: serializeRows(filtered.contactGroups),
    contactTags: serializeRows(filtered.contactTags),
    contacts: serializeRows(filtered.contacts),
    contactTagLinks: serializeRows(filtered.contactTagLinks),
    contactMemories: serializeRows(filtered.contactMemories),
    contactEvents: serializeRows(filtered.contactEvents),
    reminders: serializeRows(filtered.reminders),
    interactions: serializeRows(filtered.interactions),

    customInfoSections: serializeRows(filtered.customInfoSections),
    customInfoFields: serializeRows(filtered.customInfoFields),
    customInfoEntries: serializeRows(filtered.customInfoEntries),
    customInfoValues: serializeRows(filtered.customInfoValues),

    contactAlbums: serializeRows(filtered.contactAlbums),
    contactAlbumPhotos: serializeRows(filtered.contactAlbumPhotos),
    contactRelationships: serializeRows(filtered.contactRelationships),

    appSettings: serializeRows(filtered.appSettings),

    contactPhotos,
    albumPhotos,
  };

  const counts = buildCounts(data);

  report(
    onProgress,
    96,
    "Backup data ready.",
    `${counts.contacts} contacts, ${counts.contactEvents} events, ${counts.reminders} reminders`
  );

  return {
    format: PLAIN_BACKUP_FORMAT,
    version: BACKUP_VERSION,
    manifest: {
      backupVersion: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      exportType: safeOptions.scope,
      selectedContactIds:
        safeOptions.scope === "selected_contacts"
          ? Array.from(selectedContactIds ?? [])
          : undefined,
      includedDataTypes: getIncludedDataTypes(context.include),
      counts,
      app: {
        name: "Birthdayly",
      },
    },
    data,
  };
}

export function validatePlainBackup(input: unknown): PlainBackupV2 {
  const backup = input as any;

  if (!backup || typeof backup !== "object") {
    throw new Error("Invalid backup file.");
  }

  if (backup.format !== PLAIN_BACKUP_FORMAT) {
    throw new Error("This is not a plain Birthdayly backup.");
  }

  if (backup.version === 1) {
    return upgradeLegacyPlainBackupToV2(backup);
  }

  if (backup.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${backup.version}.`);
  }

  if (!backup.manifest || typeof backup.manifest !== "object") {
    throw new Error("Invalid backup: missing manifest.");
  }

  if (!backup.data || typeof backup.data !== "object") {
    throw new Error("Invalid backup: missing data.");
  }

  const normalizedData = normalizeBackupData(backup.data);

  assertBackupDataArrays(normalizedData);

  return {
    format: PLAIN_BACKUP_FORMAT,
    version: BACKUP_VERSION,
    manifest: {
      backupVersion: BACKUP_VERSION,
      exportedAt:
        backup.manifest.exportedAt ??
        backup.exportedAt ??
        new Date().toISOString(),
      exportType: backup.manifest.exportType ?? "full",
      selectedContactIds: Array.isArray(backup.manifest.selectedContactIds)
        ? backup.manifest.selectedContactIds.map(String)
        : undefined,
      includedDataTypes: Array.isArray(backup.manifest.includedDataTypes)
        ? backup.manifest.includedDataTypes
        : getIncludedDataTypes(FULL_BACKUP_INCLUDE),
      counts: buildCounts(normalizedData),
      app: {
        name: "Birthdayly",
        appVersion: backup.manifest.app?.appVersion ?? backup.app?.appVersion,
        platform: backup.manifest.app?.platform ?? backup.app?.platform,
      },
    },
    data: normalizedData,
  };
}

export function buildBackupPreview(
  backupInput: unknown,
  filename?: string
): BackupPreview {
  const backup = validatePlainBackup(backupInput);

  return {
    encrypted: false,
    filename,
    format: backup.format,
    version: backup.version,
    manifest: {
      ...backup.manifest,
      counts: buildCounts(backup.data),
    },
  };
}

export async function buildImportPlan(
  backupInput: unknown,
  options: BackupImportOptions
): Promise<BackupImportPlan> {
  const backup = validatePlainBackup(backupInput);
  const safeOptions = normalizeImportOptions(options);

  const scopedData = filterBackupDataForImport(backup.data, safeOptions);
  const preparedData = prepareBackupDataForInsert(scopedData);

  const localContacts = await db
    .select()
    .from(contact)
    .where(isNull(contact.deletedAt));

  const conflicts = detectContactConflicts(
    preparedData.contacts,
    localContacts,
    safeOptions.strategy
  );

  return {
    strategy: safeOptions.strategy,
    selectedContactIds: safeOptions.selectedContactIds,
    include: safeOptions.include,
    conflicts,
  };
}

export async function importPlainBackupToDatabase(
  backupInput: unknown,
  optionsOrMode: BackupImportOptions | BackupImportPlan | LegacyBackupMode,
  onProgress?: BackupProgressCallback
): Promise<BackupImportResult> {
  const backup = validatePlainBackup(backupInput);
  const safeOptions = normalizeImportOptions(optionsOrMode);

  report(onProgress, 5, "Validated backup file.");

  const scopedData = filterBackupDataForImport(backup.data, safeOptions);
  const preparedData = prepareBackupDataForInsert(scopedData);

  report(
    onProgress,
    12,
    "Prepared backup data.",
    `${preparedData.contacts.length} contacts, ${preparedData.contactGroups.length} groups`
  );

  const plan =
    isImportPlan(optionsOrMode)
      ? optionsOrMode
      : await buildImportPlan(backup, safeOptions);

  report(
    onProgress,
    18,
    "Built import plan.",
    `${plan.conflicts.length} contact matches found`
  );

  const preparedImport = prepareImportWithPlan(preparedData, plan);

  await db.transaction(async (tx) => {
    if (safeOptions.strategy === "replace_all") {
      report(onProgress, 24, "Clearing all local data...");
      await clearAllData(tx);
    }

    if (safeOptions.strategy === "replace_selected") {
      const idsToDelete = getLocalContactIdsToReplace(plan);

      if (idsToDelete.length > 0) {
        report(
          onProgress,
          28,
          "Replacing selected contacts...",
          `${idsToDelete.length} local contacts`
        );

        await deleteContactsByIds(tx, idsToDelete);
      }
    }

    report(onProgress, 45, "Importing backup data...");

    await insertPreparedBackupData(
      tx,
      preparedImport.data,
      safeOptions.strategy
    );
  });

  report(onProgress, 75, "Restoring contact photos...");

  const restoredContactPhotos = await restoreContactPhotosFromBackup(
    preparedImport.data.contactPhotos,
    (photoProgress) => {
      report(
        onProgress,
        75 + photoProgress.percent * 0.09,
        photoProgress.message,
        photoProgress.detail
      );
    },
    {
      contactIdMap: preparedImport.contactIdMap,
    }
  );

  report(onProgress, 86, "Restoring album photos...");

  const restoredAlbumPhotos = await restoreAlbumPhotosFromBackup(
    preparedImport.data.albumPhotos,
    (photoProgress) => {
      report(
        onProgress,
        86 + photoProgress.percent * 0.09,
        photoProgress.message,
        photoProgress.detail
      );
    },
    {
      contactIdMap: preparedImport.contactIdMap,
      albumPhotoIdMap: preparedImport.albumPhotoIdMap,
    }
  );

  report(onProgress, 100, "Database import complete.");

  return {
    imported: buildCounts(preparedImport.data),
    skipped: buildEmptyCounts(),
    conflicts: preparedImport.conflictSummary,
    restoredPhotos: {
      restored: restoredContactPhotos.restored + restoredAlbumPhotos.restored,
      failed: restoredContactPhotos.failed + restoredAlbumPhotos.failed,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Export filtering                                                             */
/* -------------------------------------------------------------------------- */

function filterExportRows(args: {
  context: BackupBuildContext;
  contactGroups: any[];
  contactTags: any[];
  contacts: any[];
  contactTagLinks: any[];
  contactMemories: any[];
  contactEvents: any[];
  reminders: any[];
  interactions: any[];
  customInfoSections: any[];
  customInfoFields: any[];
  customInfoEntries: any[];
  customInfoValues: any[];
  contactAlbums: any[];
  contactAlbumPhotos: any[];
  contactRelationships: any[];
  appSettings: any[];
}) {
  const { context } = args;
  const include = context.include;

  const contacts = include.contacts
    ? args.contacts.filter((row) => isContactInScope(row, context))
    : [];

  const contactIds = new Set(contacts.map((row) => String(row.id)));

  const contactEvents =
    include.events && include.contacts
      ? args.contactEvents.filter((row) =>
          contactIds.has(String(row.contactId))
        )
      : [];

  const eventIds = new Set(contactEvents.map((row) => String(row.id)));

  const reminders =
    include.reminders && include.events
      ? args.reminders.filter((row) => eventIds.has(String(row.eventId)))
      : [];

  const interactions =
    include.interactions && include.contacts
      ? args.interactions.filter((row) =>
          contactIds.has(String(row.contactId))
        )
      : [];

  const contactMemories =
    include.memories && include.contacts
      ? args.contactMemories.filter((row) =>
          contactIds.has(String(row.contactId))
        )
      : [];

  const contactTagLinks =
    include.tags && include.contacts
      ? args.contactTagLinks.filter((row) =>
          contactIds.has(String(row.contactId))
        )
      : [];

  const tagIds = new Set(contactTagLinks.map((row) => String(row.tagId)));

  const contactTags = include.tags
    ? context.fullExport
      ? args.contactTags
      : args.contactTags.filter((row) => tagIds.has(String(row.id)))
    : [];

  const usedGroupIds = new Set(
    contacts.map((row) => row.groupId).filter(Boolean).map(String)
  );

  const contactGroups = include.groups
    ? context.fullExport
      ? args.contactGroups
      : args.contactGroups.filter((row) => usedGroupIds.has(String(row.id)))
    : [];

  const customInfoEntries =
    include.customInfo && include.contacts
      ? args.customInfoEntries.filter((row) =>
          contactIds.has(String(row.contactId))
        )
      : [];

  const customEntryIds = new Set(customInfoEntries.map((row) => String(row.id)));
  const customSectionIds = new Set(
    customInfoEntries.map((row) => String(row.sectionId))
  );

  const customInfoValues =
    include.customInfo && include.contacts
      ? args.customInfoValues.filter(
          (row) =>
            contactIds.has(String(row.contactId)) &&
            customEntryIds.has(String(row.entryId))
        )
      : [];

  customInfoValues.forEach((row) => {
    if (row.fieldId) {
      // field ids are handled below through section ids.
    }
  });

  const customInfoSections = include.customInfo
    ? context.fullExport
      ? args.customInfoSections
      : args.customInfoSections.filter(
          (row) =>
            customSectionIds.has(String(row.id)) ||
            (row.contactId && contactIds.has(String(row.contactId)))
        )
    : [];

  customInfoSections.forEach((row) => customSectionIds.add(String(row.id)));

  const customInfoFields = include.customInfo
    ? args.customInfoFields.filter((row) =>
        customSectionIds.has(String(row.sectionId))
      )
    : [];

  const fieldIds = new Set(customInfoFields.map((row) => String(row.id)));

  const finalCustomInfoValues = customInfoValues.filter((row) =>
    fieldIds.has(String(row.fieldId))
  );

  const contactAlbums =
    include.albums && include.contacts
      ? args.contactAlbums.filter((row) => contactIds.has(String(row.contactId)))
      : [];

  const albumIds = new Set(contactAlbums.map((row) => String(row.id)));

  const contactAlbumPhotos =
    include.albumPhotos && include.albums
      ? args.contactAlbumPhotos.filter(
          (row) =>
            contactIds.has(String(row.contactId)) &&
            albumIds.has(String(row.albumId))
        )
      : [];

  const contactRelationships =
    include.relationships && include.contacts
      ? context.fullExport
        ? args.contactRelationships
        : args.contactRelationships.filter(
            (row) =>
              contactIds.has(String(row.contactId)) &&
              contactIds.has(String(row.relatedContactId))
          )
      : [];

  const appSettings = include.appSettings ? args.appSettings : [];

  return {
    contactGroups,
    contactTags,
    contacts,
    contactTagLinks,
    contactMemories,
    contactEvents,
    reminders,
    interactions,
    customInfoSections,
    customInfoFields,
    customInfoEntries,
    customInfoValues: finalCustomInfoValues,
    contactAlbums,
    contactAlbumPhotos,
    contactRelationships,
    appSettings,
  };
}

function isContactInScope(row: any, context: BackupBuildContext) {
  if (context.fullExport) return true;

  if (!context.selectedContactIds) return false;

  return context.selectedContactIds.has(String(row.id));
}

/* -------------------------------------------------------------------------- */
/* Import filtering                                                             */
/* -------------------------------------------------------------------------- */

function filterBackupDataForImport(
  dataInput: BackupDataV2,
  options: BackupImportOptions
): BackupDataV2 {
  const data = normalizeBackupData(dataInput);
  const include = normalizeIncludeOptions(options.include);

  const selectedContactIds = options.selectedContactIds?.length
    ? new Set(options.selectedContactIds.map(String))
    : null;

  const contacts = include.contacts
    ? selectedContactIds
      ? data.contacts.filter((row) => selectedContactIds.has(String(row.id)))
      : data.contacts
    : [];

  const contactIds = new Set(contacts.map((row) => String(row.id)));

  const contactEvents =
    include.events && include.contacts
      ? data.contactEvents.filter((row) =>
          contactIds.has(String(row.contactId ?? row.contact_id))
        )
      : [];

  const eventIds = new Set(contactEvents.map((row) => String(row.id)));

  const reminders =
    include.reminders && include.events
      ? data.reminders.filter((row) =>
          eventIds.has(String(row.eventId ?? row.event_id))
        )
      : [];

  const interactions =
    include.interactions && include.contacts
      ? data.interactions.filter((row) =>
          contactIds.has(String(row.contactId ?? row.contact_id))
        )
      : [];

  const contactMemories =
    include.memories && include.contacts
      ? data.contactMemories.filter((row) =>
          contactIds.has(String(row.contactId ?? row.contact_id))
        )
      : [];

  const contactTagLinks =
    include.tags && include.contacts
      ? data.contactTagLinks.filter((row) =>
          contactIds.has(String(row.contactId ?? row.contact_id))
        )
      : [];

  const tagIds = new Set(
    contactTagLinks.map((row) => String(row.tagId ?? row.tag_id))
  );

  const contactTags = include.tags
    ? data.contactTags.filter((row) => tagIds.has(String(row.id)))
    : [];

  const groupIds = new Set(
    contacts
      .map((row) => row.groupId ?? row.group_id ?? row.group)
      .filter(Boolean)
      .map(String)
  );

  const contactGroups = include.groups
    ? data.contactGroups.filter((row) => groupIds.has(String(row.id)))
    : [];

  const customInfoEntries =
    include.customInfo && include.contacts
      ? data.customInfoEntries.filter((row) =>
          contactIds.has(String(row.contactId ?? row.contact_id))
        )
      : [];

  const customEntryIds = new Set(customInfoEntries.map((row) => String(row.id)));

  const customInfoValues =
    include.customInfo && include.contacts
      ? data.customInfoValues.filter(
          (row) =>
            contactIds.has(String(row.contactId ?? row.contact_id)) &&
            customEntryIds.has(String(row.entryId ?? row.entry_id))
        )
      : [];

  const customSectionIds = new Set(
    customInfoEntries
      .map((row) => row.sectionId ?? row.section_id)
      .filter(Boolean)
      .map(String)
  );

  const customInfoSections = include.customInfo
    ? data.customInfoSections.filter(
        (row) =>
          customSectionIds.has(String(row.id)) ||
          (row.contactId && contactIds.has(String(row.contactId))) ||
          (row.contact_id && contactIds.has(String(row.contact_id)))
      )
    : [];

  customInfoSections.forEach((row) => customSectionIds.add(String(row.id)));

  const customInfoFields = include.customInfo
    ? data.customInfoFields.filter((row) =>
        customSectionIds.has(String(row.sectionId ?? row.section_id))
      )
    : [];

  const customFieldIds = new Set(customInfoFields.map((row) => String(row.id)));

  const finalCustomInfoValues = customInfoValues.filter((row) =>
    customFieldIds.has(String(row.fieldId ?? row.field_id))
  );

  const contactAlbums =
    include.albums && include.contacts
      ? data.contactAlbums.filter((row) =>
          contactIds.has(String(row.contactId ?? row.contact_id))
        )
      : [];

  const albumIds = new Set(contactAlbums.map((row) => String(row.id)));

  const contactAlbumPhotos =
    include.albumPhotos && include.albums
      ? data.contactAlbumPhotos.filter(
          (row) =>
            contactIds.has(String(row.contactId ?? row.contact_id)) &&
            albumIds.has(String(row.albumId ?? row.album_id))
        )
      : [];

  const albumPhotoIds = new Set(contactAlbumPhotos.map((row) => String(row.id)));

  const contactPhotos =
    include.contactPhotos && include.contacts
      ? data.contactPhotos.filter((photo) =>
          contactIds.has(String(photo.contactId))
        )
      : [];

  const albumPhotos =
    include.albumPhotos && include.albums
      ? data.albumPhotos.filter(
          (photo) =>
            contactIds.has(String(photo.contactId)) &&
            albumIds.has(String(photo.albumId)) &&
            albumPhotoIds.has(String(photo.id))
        )
      : [];

  const contactRelationships =
    include.relationships && include.contacts
      ? data.contactRelationships.filter(
          (row) =>
            contactIds.has(String(row.contactId ?? row.contact_id)) &&
            contactIds.has(
              String(row.relatedContactId ?? row.related_contact_id)
            )
        )
      : [];

  const appSettings = include.appSettings ? data.appSettings : [];

  return {
    contactGroups,
    contactTags,
    contacts,
    contactTagLinks,
    contactMemories,
    contactEvents,
    reminders,
    interactions,
    customInfoSections,
    customInfoFields,
    customInfoEntries,
    customInfoValues: finalCustomInfoValues,
    contactAlbums,
    contactAlbumPhotos,
    contactRelationships,
    appSettings,
    contactPhotos,
    albumPhotos,
  };
}

/* -------------------------------------------------------------------------- */
/* Conflict detection                                                           */
/* -------------------------------------------------------------------------- */

function detectContactConflicts(
  backupContacts: any[],
  localContacts: any[],
  strategy: BackupImportStrategy
): ContactImportConflict[] {
  const byId = new Map<string, any>();
  const byEmail = new Map<string, any>();
  const byPhone = new Map<string, any>();
  const byNameBirthday = new Map<string, any>();

  for (const local of localContacts) {
    byId.set(String(local.id), local);

    const email = normalizeEmail(local.email);
    if (email) byEmail.set(email, local);

    const phone = normalizePhone(local.phone);
    if (phone) byPhone.set(phone, local);

    const nameBirthday = normalizeNameBirthdayKey(local);
    if (nameBirthday) byNameBirthday.set(nameBirthday, local);
  }

  return backupContacts.map((backupContact) => {
    const backupContactId = String(backupContact.id);
    let localContact: any | undefined;
    let matchType: ContactImportConflict["matchType"] = "none";

    localContact = byId.get(backupContactId);

    if (localContact) {
      matchType = "id";
    }

    if (!localContact) {
      const email = normalizeEmail(backupContact.email);

      if (email) {
        localContact = byEmail.get(email);

        if (localContact) {
          matchType = "email";
        }
      }
    }

    if (!localContact) {
      const phone = normalizePhone(backupContact.phone);

      if (phone) {
        localContact = byPhone.get(phone);

        if (localContact) {
          matchType = "phone";
        }
      }
    }

    if (!localContact) {
      const nameBirthday = normalizeNameBirthdayKey(backupContact);

      if (nameBirthday) {
        localContact = byNameBirthday.get(nameBirthday);

        if (localContact) {
          matchType = "name_birthday";
        }
      }
    }

    return {
      backupContactId,
      localContactId: localContact?.id ? String(localContact.id) : undefined,
      contactName: buildContactName(backupContact),
      matchType,
      decision: getDefaultConflictDecision(strategy, matchType),
    };
  });
}

function getDefaultConflictDecision(
  strategy: BackupImportStrategy,
  matchType: ContactImportConflict["matchType"]
): ContactImportConflict["decision"] {
  if (matchType === "none") return "create_new";

  switch (strategy) {
    case "safe_merge":
      return "merge_missing";
    case "update_existing":
      return "update_from_backup";
    case "duplicate_conflicts":
      return "duplicate";
    case "replace_selected":
      return "update_from_backup";
    case "replace_all":
    default:
      return "create_new";
  }
}

/* -------------------------------------------------------------------------- */
/* Import preparation                                                           */
/* -------------------------------------------------------------------------- */

function prepareImportWithPlan(
  data: BackupDataV2,
  plan: BackupImportPlan
): PreparedImport {
  const contactIdMap = new Map<string, string>();
  const memoryIdMap = new Map<string, string>();
  const eventIdMap = new Map<string, string>();
  const reminderIdMap = new Map<string, string>();
  const interactionIdMap = new Map<string, string>();
  const sectionIdMap = new Map<string, string>();
  const fieldIdMap = new Map<string, string>();
  const entryIdMap = new Map<string, string>();
  const valueIdMap = new Map<string, string>();
  const albumIdMap = new Map<string, string>();
  const albumPhotoIdMap = new Map<string, string>();
  const relationshipIdMap = new Map<string, string>();

  const skippedContactIds = new Set<string>();
  const duplicatedContactIds = new Set<string>();
  const updateContactIds = new Set<string>();

  const conflictSummary: BackupImportResult["conflicts"] = {
    total: plan.conflicts.filter((conflict) => conflict.matchType !== "none")
      .length,
    createdNew: 0,
    merged: 0,
    updated: 0,
    duplicated: 0,
    keptLocal: 0,
  };

  for (const conflict of plan.conflicts) {
    const backupId = String(conflict.backupContactId);

    if (conflict.decision === "keep_local") {
      skippedContactIds.add(backupId);
      conflictSummary.keptLocal += 1;
      continue;
    }

    if (conflict.decision === "duplicate") {
      const newId = makeImportedId(backupId, "contact");
      contactIdMap.set(backupId, newId);
      duplicatedContactIds.add(backupId);
      conflictSummary.duplicated += 1;
      continue;
    }

    if (
      conflict.localContactId &&
      (conflict.decision === "merge_missing" ||
        conflict.decision === "update_from_backup")
    ) {
      contactIdMap.set(backupId, conflict.localContactId);

      if (conflict.decision === "merge_missing") {
        conflictSummary.merged += 1;
      } else {
        updateContactIds.add(backupId);
        conflictSummary.updated += 1;
      }

      continue;
    }

    conflictSummary.createdNew += 1;
  }

  const shouldSkipContact = (contactId: any) =>
    skippedContactIds.has(String(contactId));

  const mapContactId = (contactId: any) =>
    contactIdMap.get(String(contactId)) ?? String(contactId);

  const contacts = data.contacts
    .filter((row) => !shouldSkipContact(row.id))
    .filter((row) => {
      const originalId = String(row.id);

      if (!contactIdMap.has(originalId)) return true;

      if (duplicatedContactIds.has(originalId)) return true;

      if (updateContactIds.has(originalId)) return true;

      return false;
    })
    .map((row) => {
      const originalId = String(row.id);

      return {
        ...row,
        id: mapContactId(originalId),
      };
    });

  for (const row of data.contactMemories) {
    if (duplicatedContactIds.has(String(row.contactId))) {
      memoryIdMap.set(String(row.id), makeImportedId(row.id, "memory"));
    }
  }

  for (const row of data.contactEvents) {
    if (duplicatedContactIds.has(String(row.contactId))) {
      eventIdMap.set(String(row.id), makeImportedId(row.id, "event"));
    }
  }

  for (const row of data.reminders) {
    if (eventIdMap.has(String(row.eventId))) {
      reminderIdMap.set(String(row.id), makeImportedId(row.id, "reminder"));
    }
  }

  for (const row of data.interactions) {
    if (duplicatedContactIds.has(String(row.contactId))) {
      interactionIdMap.set(String(row.id), makeImportedId(row.id, "interaction"));
    }
  }

  for (const row of data.customInfoSections) {
    if (row.contactId && duplicatedContactIds.has(String(row.contactId))) {
      sectionIdMap.set(String(row.id), makeImportedId(row.id, "section"));
    }
  }

  for (const row of data.customInfoFields) {
    if (sectionIdMap.has(String(row.sectionId))) {
      fieldIdMap.set(String(row.id), makeImportedId(row.id, "field"));
    }
  }

  for (const row of data.customInfoEntries) {
    if (duplicatedContactIds.has(String(row.contactId))) {
      entryIdMap.set(String(row.id), makeImportedId(row.id, "entry"));
    }
  }

  for (const row of data.customInfoValues) {
    if (
      duplicatedContactIds.has(String(row.contactId)) ||
      entryIdMap.has(String(row.entryId)) ||
      fieldIdMap.has(String(row.fieldId))
    ) {
      valueIdMap.set(String(row.id), makeImportedId(row.id, "value"));
    }
  }

  for (const row of data.contactAlbums) {
    if (duplicatedContactIds.has(String(row.contactId))) {
      albumIdMap.set(String(row.id), makeImportedId(row.id, "album"));
    }
  }

  for (const row of data.contactAlbumPhotos) {
    if (
      duplicatedContactIds.has(String(row.contactId)) ||
      albumIdMap.has(String(row.albumId))
    ) {
      albumPhotoIdMap.set(String(row.id), makeImportedId(row.id, "albumphoto"));
    }
  }

  for (const row of data.contactRelationships) {
    const contactId = String(row.contactId);
    const relatedContactId = String(row.relatedContactId);

    if (
      duplicatedContactIds.has(contactId) ||
      duplicatedContactIds.has(relatedContactId) ||
      contactIdMap.has(contactId) ||
      contactIdMap.has(relatedContactId)
    ) {
      relationshipIdMap.set(
        String(row.id),
        makeImportedId(row.id, "relationship")
      );
    }
  }

  const contactTagLinks = data.contactTagLinks
    .filter((row) => !shouldSkipContact(row.contactId))
    .map((row) => ({
      ...row,
      contactId: mapContactId(row.contactId),
    }));

  const contactMemories = data.contactMemories
    .filter((row) => !shouldSkipContact(row.contactId))
    .map((row) => ({
      ...row,
      id: memoryIdMap.get(String(row.id)) ?? row.id,
      contactId: mapContactId(row.contactId),
    }));

  const contactEvents = data.contactEvents
    .filter((row) => !shouldSkipContact(row.contactId))
    .map((row) => ({
      ...row,
      id: eventIdMap.get(String(row.id)) ?? row.id,
      contactId: mapContactId(row.contactId),
    }));

  const reminders = data.reminders
    .filter((row) => eventIdMap.has(String(row.eventId)) || true)
    .map((row) => ({
      ...row,
      id: reminderIdMap.get(String(row.id)) ?? row.id,
      eventId: eventIdMap.get(String(row.eventId)) ?? row.eventId,
      notificationId: null,
    }))
    .filter((row) =>
      contactEvents.some((eventRow) => String(eventRow.id) === String(row.eventId))
    );

  const interactions = data.interactions
    .filter((row) => !shouldSkipContact(row.contactId))
    .map((row) => ({
      ...row,
      id: interactionIdMap.get(String(row.id)) ?? row.id,
      contactId: mapContactId(row.contactId),
    }));

  const customInfoSections = data.customInfoSections
    .filter((row) => !row.contactId || !shouldSkipContact(row.contactId))
    .map((row) => ({
      ...row,
      id: sectionIdMap.get(String(row.id)) ?? row.id,
      contactId: row.contactId ? mapContactId(row.contactId) : null,
    }));

  const customInfoFields = data.customInfoFields
    .filter((row) =>
      customInfoSections.some(
        (sectionRow) =>
          String(sectionRow.id) ===
          String(sectionIdMap.get(String(row.sectionId)) ?? row.sectionId)
      )
    )
    .map((row) => ({
      ...row,
      id: fieldIdMap.get(String(row.id)) ?? row.id,
      sectionId: sectionIdMap.get(String(row.sectionId)) ?? row.sectionId,
    }));

  const customInfoEntries = data.customInfoEntries
    .filter((row) => !shouldSkipContact(row.contactId))
    .map((row) => ({
      ...row,
      id: entryIdMap.get(String(row.id)) ?? row.id,
      sectionId: sectionIdMap.get(String(row.sectionId)) ?? row.sectionId,
      contactId: mapContactId(row.contactId),
    }));

  const customInfoValues = data.customInfoValues
    .filter((row) => !shouldSkipContact(row.contactId))
    .map((row) => ({
      ...row,
      id: valueIdMap.get(String(row.id)) ?? row.id,
      entryId: entryIdMap.get(String(row.entryId)) ?? row.entryId,
      fieldId: fieldIdMap.get(String(row.fieldId)) ?? row.fieldId,
      contactId: mapContactId(row.contactId),
    }));

  const contactAlbums = data.contactAlbums
    .filter((row) => !shouldSkipContact(row.contactId))
    .map((row) => ({
      ...row,
      id: albumIdMap.get(String(row.id)) ?? row.id,
      contactId: mapContactId(row.contactId),
      coverPhotoId: row.coverPhotoId
        ? albumPhotoIdMap.get(String(row.coverPhotoId)) ?? row.coverPhotoId
        : null,
    }));

  const contactAlbumPhotos = data.contactAlbumPhotos
    .filter((row) => !shouldSkipContact(row.contactId))
    .map((row) => ({
      ...row,
      id: albumPhotoIdMap.get(String(row.id)) ?? row.id,
      albumId: albumIdMap.get(String(row.albumId)) ?? row.albumId,
      contactId: mapContactId(row.contactId),
    }));

  const contactRelationships = data.contactRelationships
    .filter(
      (row) =>
        !shouldSkipContact(row.contactId) &&
        !shouldSkipContact(row.relatedContactId)
    )
    .map((row) => {
      const nextContactId = mapContactId(row.contactId);
      const nextRelatedContactId = mapContactId(row.relatedContactId);

      return {
        ...row,
        id: relationshipIdMap.get(String(row.id)) ?? row.id,
        contactId: nextContactId,
        relatedContactId: nextRelatedContactId,
        pairKey: buildPairKey(nextContactId, nextRelatedContactId),
      };
    })
    .filter((row) => row.contactId !== row.relatedContactId);

  const contactPhotos = data.contactPhotos
    .filter((photo) => !shouldSkipContact(photo.contactId))
    .map((photo) => ({
      ...photo,
      contactId: mapContactId(photo.contactId),
    }));

  const albumPhotos = data.albumPhotos
    .filter((photo) => !shouldSkipContact(photo.contactId))
    .map((photo) => ({
      ...photo,
      id: albumPhotoIdMap.get(String(photo.id)) ?? photo.id,
      albumId: albumIdMap.get(String(photo.albumId)) ?? photo.albumId,
      contactId: mapContactId(photo.contactId),
    }));

  return {
    data: {
      contactGroups: data.contactGroups,
      contactTags: data.contactTags,
      contacts,
      contactTagLinks,
      contactMemories,
      contactEvents,
      reminders,
      interactions,
      customInfoSections,
      customInfoFields,
      customInfoEntries,
      customInfoValues,
      contactAlbums,
      contactAlbumPhotos,
      contactRelationships,
      appSettings: data.appSettings,
      contactPhotos,
      albumPhotos,
    },
    contactIdMap,
    albumIdMap,
    albumPhotoIdMap,
    conflictSummary,
  };
}

/* -------------------------------------------------------------------------- */
/* Insert / update / delete                                                     */
/* -------------------------------------------------------------------------- */

async function clearAllData(tx: any) {
  await tx.delete(contactTagLink);
  await tx.delete(reminder);
  await tx.delete(interaction);
  await tx.delete(contactMemory);
  await tx.delete(contactAlbumPhoto);
  await tx.delete(contactAlbum);
  await tx.delete(customInfoValue);
  await tx.delete(customInfoEntry);
  await tx.delete(customInfoField);
  await tx.delete(customInfoSection);
  await tx.delete(contactRelationship);
  await tx.delete(contactEvent);
  await tx.delete(contact);
  await tx.delete(contactTag);
  await tx.delete(contactGroup);
  await tx.delete(appSetting);
}

async function deleteContactsByIds(tx: any, contactIds: string[]) {
  if (contactIds.length === 0) return;

  await tx.delete(contactTagLink).where(inArray(contactTagLink.contactId, contactIds));
  await tx.delete(interaction).where(inArray(interaction.contactId, contactIds));
  await tx.delete(contactMemory).where(inArray(contactMemory.contactId, contactIds));
  await tx
    .delete(contactAlbumPhoto)
    .where(inArray(contactAlbumPhoto.contactId, contactIds));
  await tx.delete(contactAlbum).where(inArray(contactAlbum.contactId, contactIds));
  await tx
    .delete(customInfoValue)
    .where(inArray(customInfoValue.contactId, contactIds));
  await tx
    .delete(customInfoEntry)
    .where(inArray(customInfoEntry.contactId, contactIds));
  await tx
    .delete(customInfoSection)
    .where(inArray(customInfoSection.contactId, contactIds));

  await tx
    .delete(contactRelationship)
    .where(
      or(
        inArray(contactRelationship.contactId, contactIds),
        inArray(contactRelationship.relatedContactId, contactIds)
      )
    );

  const eventRows = await tx
    .select({ id: contactEvent.id })
    .from(contactEvent)
    .where(inArray(contactEvent.contactId, contactIds));

  const eventIds = eventRows.map((row: any) => String(row.id));

  if (eventIds.length > 0) {
    await tx.delete(reminder).where(inArray(reminder.eventId, eventIds));
  }

  await tx.delete(contactEvent).where(inArray(contactEvent.contactId, contactIds));
  await tx.delete(contact).where(inArray(contact.id, contactIds));
}

async function insertPreparedBackupData(
  tx: any,
  data: BackupDataV2,
  strategy: BackupImportStrategy
) {
  const shouldUpdate =
    strategy === "update_existing" ||
    strategy === "replace_selected" ||
    strategy === "replace_all";

  await insertRows(tx, contactGroup, data.contactGroups, shouldUpdate);
  await insertRows(tx, contactTag, data.contactTags, shouldUpdate);
  await insertRows(tx, contact, data.contacts, shouldUpdate);

  await insertRows(tx, contactTagLink, data.contactTagLinks, false);

  await insertRows(tx, contactMemory, data.contactMemories, shouldUpdate);
  await insertRows(tx, contactEvent, data.contactEvents, shouldUpdate);
  await insertRows(tx, reminder, data.reminders, shouldUpdate);
  await insertRows(tx, interaction, data.interactions, shouldUpdate);

  await insertRows(tx, customInfoSection, data.customInfoSections, shouldUpdate);
  await insertRows(tx, customInfoField, data.customInfoFields, shouldUpdate);
  await insertRows(tx, customInfoEntry, data.customInfoEntries, shouldUpdate);
  await insertRows(tx, customInfoValue, data.customInfoValues, shouldUpdate);

  await insertRows(tx, contactAlbum, data.contactAlbums, shouldUpdate);
  await insertRows(tx, contactAlbumPhoto, data.contactAlbumPhotos, shouldUpdate);
  await insertRows(tx, contactRelationship, data.contactRelationships, shouldUpdate);

  await insertAppSettings(tx, data.appSettings, shouldUpdate);
}

async function insertRows(
  tx: any,
  table: any,
  rows: any[],
  shouldUpdate: boolean
) {
  if (!rows.length) return;

  if (!shouldUpdate) {
    await tx.insert(table).values(rows).onConflictDoNothing();
    return;
  }

  for (const row of rows) {
    const { id, ...set } = row;

    if (!id) continue;

    await tx
      .insert(table)
      .values(row)
      .onConflictDoUpdate({
        target: table.id,
        set,
      });
  }
}

async function insertAppSettings(
  tx: any,
  rows: any[],
  shouldUpdate: boolean
) {
  if (!rows.length) return;

  if (!shouldUpdate) {
    await tx.insert(appSetting).values(rows).onConflictDoNothing();
    return;
  }

  for (const row of rows) {
    const { key, ...set } = row;

    if (!key) continue;

    await tx
      .insert(appSetting)
      .values(row)
      .onConflictDoUpdate({
        target: appSetting.key,
        set,
      });
  }
}

/* -------------------------------------------------------------------------- */
/* Normalization                                                                */
/* -------------------------------------------------------------------------- */

function prepareBackupDataForInsert(dataInput: BackupDataV2): BackupDataV2 {
  const data = normalizeBackupData(dataInput);

  const contactGroups = compactValidRows(
    data.contactGroups.map(normalizeContactGroupForImport),
    "contact group"
  );

  const groupIds = new Set(contactGroups.map((row) => row.id));

  const contactTags = compactValidRows(
    data.contactTags.map(normalizeContactTagForImport),
    "contact tag"
  );

  const tagIds = new Set(contactTags.map((row) => row.id));

  const contacts = compactValidRows(
    data.contacts.map(normalizeContactForImport),
    "contact"
  ).map((row) => ({
    ...row,
    groupId: row.groupId && groupIds.has(row.groupId) ? row.groupId : null,
  }));

  const contactIds = new Set(contacts.map((row) => row.id));

  const contactTagLinks = compactValidRows(
    data.contactTagLinks.map(normalizeContactTagLinkForImport),
    "contact-tag link"
  ).filter((row) => contactIds.has(row.contactId) && tagIds.has(row.tagId));

  const contactMemories = compactValidRows(
    data.contactMemories.map(normalizeContactMemoryForImport),
    "contact memory"
  ).filter((row) => contactIds.has(row.contactId));

  const contactEvents = compactValidRows(
    data.contactEvents.map(normalizeContactEventForImport),
    "contact event"
  ).filter((row) => contactIds.has(row.contactId));

  const eventIds = new Set(contactEvents.map((row) => row.id));

  const reminders = compactValidRows(
    data.reminders.map(normalizeReminderForImport),
    "reminder"
  ).filter((row) => eventIds.has(row.eventId));

  const interactions = compactValidRows(
    data.interactions.map(normalizeInteractionForImport),
    "interaction"
  ).filter((row) => contactIds.has(row.contactId));

  const customInfoSections = compactValidRows(
    data.customInfoSections.map(normalizeCustomInfoSectionForImport),
    "custom info section"
  ).filter((row) => !row.contactId || contactIds.has(row.contactId));

  const sectionIds = new Set(customInfoSections.map((row) => row.id));

  const customInfoFields = compactValidRows(
    data.customInfoFields.map(normalizeCustomInfoFieldForImport),
    "custom info field"
  ).filter((row) => sectionIds.has(row.sectionId));

  const fieldIds = new Set(customInfoFields.map((row) => row.id));

  const customInfoEntries = compactValidRows(
    data.customInfoEntries.map(normalizeCustomInfoEntryForImport),
    "custom info entry"
  ).filter(
    (row) => contactIds.has(row.contactId) && sectionIds.has(row.sectionId)
  );

  const entryIds = new Set(customInfoEntries.map((row) => row.id));

  const customInfoValues = compactValidRows(
    data.customInfoValues.map(normalizeCustomInfoValueForImport),
    "custom info value"
  ).filter(
    (row) =>
      contactIds.has(row.contactId) &&
      entryIds.has(row.entryId) &&
      fieldIds.has(row.fieldId)
  );

  const contactAlbums = compactValidRows(
    data.contactAlbums.map(normalizeContactAlbumForImport),
    "contact album"
  ).filter((row) => contactIds.has(row.contactId));

  const albumIds = new Set(contactAlbums.map((row) => row.id));

  const contactAlbumPhotos = compactValidRows(
    data.contactAlbumPhotos.map(normalizeContactAlbumPhotoForImport),
    "contact album photo"
  ).filter(
    (row) => contactIds.has(row.contactId) && albumIds.has(row.albumId)
  );

  const albumPhotoIds = new Set(contactAlbumPhotos.map((row) => row.id));

  const contactRelationships = compactValidRows(
    data.contactRelationships.map(normalizeContactRelationshipForImport),
    "contact relationship"
  )
    .filter(
      (row) =>
        contactIds.has(row.contactId) && contactIds.has(row.relatedContactId)
    )
    .filter((row) => row.contactId !== row.relatedContactId)
    .map((row) => ({
      ...row,
      pairKey: buildPairKey(row.contactId, row.relatedContactId),
    }));

  const appSettings = compactValidRows(
    data.appSettings.map(normalizeAppSettingForImport),
    "app setting"
  );

  const contactPhotos = (data.contactPhotos ?? []).filter((photo: any) =>
    contactIds.has(String(photo.contactId))
  );

  const albumPhotos = (data.albumPhotos ?? []).filter(
    (photo: any) =>
      contactIds.has(String(photo.contactId)) &&
      albumIds.has(String(photo.albumId)) &&
      albumPhotoIds.has(String(photo.id))
  );

  return {
    contactGroups,
    contactTags,
    contacts,
    contactTagLinks,
    contactMemories,
    contactEvents,
    reminders,
    interactions,
    customInfoSections,
    customInfoFields,
    customInfoEntries,
    customInfoValues,
    contactAlbums,
    contactAlbumPhotos,
    contactRelationships,
    appSettings,
    contactPhotos,
    albumPhotos,
  };
}

function normalizeContactGroupForImport(row: any) {
  const id = getId(row);

  if (!id) return null;
  if (looksLikeContact(row)) return null;

  const name = normalizeRequiredString(row.name);

  if (!name) return null;

  return {
    id,
    userId: row.userId ?? row.user_id ?? LOCAL_USER_ID,
    name,
    normalizedName:
      row.normalizedName ?? row.normalized_name ?? normalizeName(name),
    color: row.color ?? null,
    icon: row.icon ?? null,
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
    updatedAt: fallbackDate(row.updatedAt ?? row.updated_at),
    deletedAt: reviveDate(row.deletedAt ?? row.deleted_at),
  };
}

function normalizeContactTagForImport(row: any) {
  const id = getId(row);

  if (!id) return null;
  if (looksLikeContact(row)) return null;

  const name = normalizeRequiredString(row.name);

  if (!name) return null;

  return {
    id,
    userId: row.userId ?? row.user_id ?? LOCAL_USER_ID,
    name,
    normalizedName:
      row.normalizedName ?? row.normalized_name ?? normalizeName(name),
    color: row.color ?? null,
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
    updatedAt: fallbackDate(row.updatedAt ?? row.updated_at),
    deletedAt: reviveDate(row.deletedAt ?? row.deleted_at),
  };
}

function normalizeContactForImport(row: any) {
  const id = getId(row);

  if (!id) return null;
  if (looksLikeGroupOrTagOnly(row)) return null;

  const firstName = normalizeRequiredString(row.firstName ?? row.first_name);

  if (!firstName) return null;

  return {
    id,
    userId: row.userId ?? row.user_id ?? LOCAL_USER_ID,
    firstName,
    lastName: normalizeNullableString(row.lastName ?? row.last_name),
    birthday: row.birthday ?? null,
    phone: normalizeNullableString(row.phone),
    email: normalizeNullableString(row.email),
    groupId: normalizeNullableString(row.groupId ?? row.group_id ?? row.group),
    isFavorite: normalizeBoolean(row.isFavorite ?? row.is_favorite, false),
    metAt: normalizeNullableString(row.metAt ?? row.met_at),
    knownSince: normalizeNullableString(row.knownSince ?? row.known_since),
    relationshipLabel: normalizeNullableString(
      row.relationshipLabel ?? row.relationship_label
    ),
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
    updatedAt: fallbackDate(row.updatedAt ?? row.updated_at),
    deletedAt: reviveDate(row.deletedAt ?? row.deleted_at),
    talkEveryDays: row.talkEveryDays ?? row.talk_every_days ?? null,
    talkLastAt: row.talkLastAt ?? row.talk_last_at ?? null,
    talkNextAt: row.talkNextAt ?? row.talk_next_at ?? null,
    photoUri: row.photoUri ?? row.photo_uri ?? row.photo ?? null,
    shortDescription: row.shortDescription ?? row.short_description ?? null,
    talkNotifiedAt: row.talkNotifiedAt ?? row.talk_notified_at ?? null,
  };
}

function normalizeContactTagLinkForImport(row: any) {
  const contactId = row.contactId ?? row.contact_id;
  const tagId = row.tagId ?? row.tag_id;

  if (!contactId || !tagId) return null;

  return {
    contactId: String(contactId),
    tagId: String(tagId),
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
  };
}

function normalizeContactMemoryForImport(row: any) {
  const id = getId(row);
  const contactId = row.contactId ?? row.contact_id ?? row.contact;

  if (!id || !contactId) return null;

  const text = normalizeRequiredString(row.text);

  if (!text) return null;

  const memoryType = String(row.memoryType ?? row.memory_type ?? "note");

  return {
    id,
    contactId: String(contactId),
    text,
    memoryType: VALID_MEMORY_TYPES.has(memoryType) ? memoryType : "note",
    date: row.date ?? null,
    isPinned: normalizeBoolean(row.isPinned ?? row.is_pinned, false),
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
    updatedAt: fallbackDate(row.updatedAt ?? row.updated_at),
    deletedAt: reviveDate(row.deletedAt ?? row.deleted_at),
  };
}

function normalizeContactEventForImport(row: any) {
  const id = getId(row);
  const contactId = row.contactId ?? row.contact_id ?? row.contact;

  if (!id || !contactId) return null;

  const startDate = normalizeRequiredString(row.startDate ?? row.start_date);

  if (!startDate) return null;

  return {
    id,
    userId: row.userId ?? row.user_id ?? LOCAL_USER_ID,
    contactId: String(contactId),
    title: normalizeRequiredString(row.title) ?? "Event",
    type: normalizeNumberInSet(row.type, VALID_EVENT_TYPES, 6),
    startDate,
    startTime: row.startTime ?? row.start_time ?? null,
    endDate: row.endDate ?? row.end_date ?? null,
    endTime: row.endTime ?? row.end_time ?? null,
    isRecurring: normalizeBoolean(row.isRecurring ?? row.is_recurring, false),
    isActive: normalizeBoolean(row.isActive ?? row.is_active, true),
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
    updatedAt: fallbackDate(row.updatedAt ?? row.updated_at),
    deletedAt: reviveDate(row.deletedAt ?? row.deleted_at),
  };
}

function normalizeReminderForImport(row: any) {
  const id = getId(row);
  const eventId = row.eventId ?? row.event_id ?? row.event;

  if (!id || !eventId) return null;

  return {
    id,
    eventId: String(eventId),
    daysBefore: row.daysBefore ?? row.days_before ?? null,
    absoluteDatetime: reviveDate(row.absoluteDatetime ?? row.absolute_datetime),
    timeOfDay: row.timeOfDay ?? row.time_of_day ?? null,
    status: normalizeNumberInSet(row.status, VALID_REMINDER_STATUSES, 1),
    sendAt: reviveDate(row.sendAt ?? row.send_at),
    isActive: normalizeBoolean(row.isActive ?? row.is_active, true),
    notificationId: null,
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
    updatedAt: fallbackDate(row.updatedAt ?? row.updated_at),
    deletedAt: reviveDate(row.deletedAt ?? row.deleted_at),
  };
}

function normalizeInteractionForImport(row: any) {
  const id = getId(row);
  const contactId = row.contactId ?? row.contact_id ?? row.contact;

  if (!id || !contactId) return null;

  return {
    id,
    contactId: String(contactId),
    happenedAt: fallbackDate(row.happenedAt ?? row.happened_at),
    durationMinutes: row.durationMinutes ?? row.duration_minutes ?? null,
    note: row.note ?? null,
    type: normalizeNumberInSet(row.type, VALID_INTERACTION_TYPES, 5),
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
    updatedAt: fallbackDate(row.updatedAt ?? row.updated_at),
    deletedAt: reviveDate(row.deletedAt ?? row.deleted_at),
  };
}

function normalizeCustomInfoSectionForImport(row: any) {
  const id = getId(row);

  if (!id) return null;

  const name = normalizeRequiredString(row.name);

  if (!name) return null;

  const scope = String(row.scope ?? "contact");

  return {
    id,
    userId: row.userId ?? row.user_id ?? LOCAL_USER_ID,
    contactId: normalizeNullableString(row.contactId ?? row.contact_id),
    name,
    normalizedName:
      row.normalizedName ?? row.normalized_name ?? normalizeName(name),
    icon: row.icon ?? null,
    color: row.color ?? null,
    scope: VALID_CUSTOM_SECTION_SCOPES.has(scope) ? scope : "contact",
    isRepeatable: normalizeBoolean(row.isRepeatable ?? row.is_repeatable, true),
    sortOrder: normalizeNumber(row.sortOrder ?? row.sort_order, 0),
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
    updatedAt: fallbackDate(row.updatedAt ?? row.updated_at),
    deletedAt: reviveDate(row.deletedAt ?? row.deleted_at),
  };
}

function normalizeCustomInfoFieldForImport(row: any) {
  const id = getId(row);
  const sectionId = row.sectionId ?? row.section_id;

  if (!id || !sectionId) return null;

  const label = normalizeRequiredString(row.label);

  if (!label) return null;

  const fieldType = String(row.fieldType ?? row.field_type ?? "text");

  return {
    id,
    sectionId: String(sectionId),
    label,
    fieldKey:
      normalizeRequiredString(row.fieldKey ?? row.field_key) ??
      normalizeName(label).replace(/\s+/g, "_"),
    fieldType: VALID_CUSTOM_FIELD_TYPES.has(fieldType) ? fieldType : "text",
    placeholder: row.placeholder ?? null,
    optionsJson: row.optionsJson ?? row.options_json ?? null,
    isRequired: normalizeBoolean(row.isRequired ?? row.is_required, false),
    sortOrder: normalizeNumber(row.sortOrder ?? row.sort_order, 0),
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
    updatedAt: fallbackDate(row.updatedAt ?? row.updated_at),
    deletedAt: reviveDate(row.deletedAt ?? row.deleted_at),
  };
}

function normalizeCustomInfoEntryForImport(row: any) {
  const id = getId(row);
  const sectionId = row.sectionId ?? row.section_id;
  const contactId = row.contactId ?? row.contact_id;

  if (!id || !sectionId || !contactId) return null;

  return {
    id,
    sectionId: String(sectionId),
    contactId: String(contactId),
    sortOrder: normalizeNumber(row.sortOrder ?? row.sort_order, 0),
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
    updatedAt: fallbackDate(row.updatedAt ?? row.updated_at),
    deletedAt: reviveDate(row.deletedAt ?? row.deleted_at),
  };
}

function normalizeCustomInfoValueForImport(row: any) {
  const id = getId(row);
  const entryId = row.entryId ?? row.entry_id;
  const fieldId = row.fieldId ?? row.field_id;
  const contactId = row.contactId ?? row.contact_id;

  if (!id || !entryId || !fieldId || !contactId) return null;

  return {
    id,
    entryId: String(entryId),
    fieldId: String(fieldId),
    contactId: String(contactId),
    valueText: row.valueText ?? row.value_text ?? null,
    valueNumber:
      row.valueNumber ?? row.value_number ?? row.numberValue ?? null,
    valueDate: row.valueDate ?? row.value_date ?? null,
    valueJson: row.valueJson ?? row.value_json ?? null,
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
    updatedAt: fallbackDate(row.updatedAt ?? row.updated_at),
    deletedAt: reviveDate(row.deletedAt ?? row.deleted_at),
  };
}

function normalizeContactAlbumForImport(row: any) {
  const id = getId(row);
  const contactId = row.contactId ?? row.contact_id;

  if (!id || !contactId) return null;

  const title = normalizeRequiredString(row.title);

  if (!title) return null;

  return {
    id,
    userId: row.userId ?? row.user_id ?? LOCAL_USER_ID,
    contactId: String(contactId),
    title,
    coverPhotoId: row.coverPhotoId ?? row.cover_photo_id ?? null,
    sortOrder: normalizeNumber(row.sortOrder ?? row.sort_order, 0),
    createdAt: fallbackTimestamp(row.createdAt ?? row.created_at),
    updatedAt: fallbackTimestamp(row.updatedAt ?? row.updated_at),
    deletedAt: reviveTimestamp(row.deletedAt ?? row.deleted_at),
  };
}

function normalizeContactAlbumPhotoForImport(row: any) {
  const id = getId(row);
  const albumId = row.albumId ?? row.album_id;
  const contactId = row.contactId ?? row.contact_id;

  if (!id || !albumId || !contactId) return null;

  return {
    id,
    albumId: String(albumId),
    contactId: String(contactId),
    uri: row.uri ?? "file://pending-album-photo-restore",
    width: row.width ?? null,
    height: row.height ?? null,
    takenAt: reviveTimestamp(row.takenAt ?? row.taken_at),
    sortOrder: normalizeNumber(row.sortOrder ?? row.sort_order, 0),
    createdAt: fallbackTimestamp(row.createdAt ?? row.created_at),
    updatedAt: fallbackTimestamp(row.updatedAt ?? row.updated_at),
    deletedAt: reviveTimestamp(row.deletedAt ?? row.deleted_at),
  };
}

function normalizeContactRelationshipForImport(row: any) {
  const id = getId(row);
  const contactId = row.contactId ?? row.contact_id;
  const relatedContactId = row.relatedContactId ?? row.related_contact_id;

  if (!id || !contactId || !relatedContactId) return null;

  const relationshipType = normalizeRequiredString(
    row.relationshipType ?? row.relationship_type
  );

  const reverseRelationshipType = normalizeRequiredString(
    row.reverseRelationshipType ?? row.reverse_relationship_type
  );

  if (!relationshipType || !reverseRelationshipType) return null;

  return {
    id,
    userId: row.userId ?? row.user_id ?? LOCAL_USER_ID,
    pairKey:
      row.pairKey ??
      row.pair_key ??
      buildPairKey(String(contactId), String(relatedContactId)),
    contactId: String(contactId),
    relatedContactId: String(relatedContactId),
    relationshipType,
    reverseRelationshipType,
    relationshipGroup:
      normalizeRequiredString(row.relationshipGroup ?? row.relationship_group) ??
      "other",
    note: row.note ?? null,
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
    updatedAt: fallbackDate(row.updatedAt ?? row.updated_at),
    deletedAt: reviveDate(row.deletedAt ?? row.deleted_at),
  };
}

function normalizeAppSettingForImport(row: any) {
  const key = normalizeRequiredString(row.key);

  if (!key) return null;

  return {
    key,
    value:
      typeof row.value === "string" ? row.value : JSON.stringify(row.value ?? ""),
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
    updatedAt: fallbackDate(row.updatedAt ?? row.updated_at),
  };
}

/* -------------------------------------------------------------------------- */
/* Validation / legacy                                                          */
/* -------------------------------------------------------------------------- */

function normalizeBackupData(data: Partial<BackupDataV2> | any): BackupDataV2 {
  return {
    contactGroups: arrayOrEmpty(data.contactGroups),
    contactTags: arrayOrEmpty(data.contactTags),
    contacts: arrayOrEmpty(data.contacts),
    contactTagLinks: arrayOrEmpty(data.contactTagLinks),
    contactMemories: arrayOrEmpty(data.contactMemories),
    contactEvents: arrayOrEmpty(data.contactEvents),
    reminders: arrayOrEmpty(data.reminders),
    interactions: arrayOrEmpty(data.interactions),

    customInfoSections: arrayOrEmpty(data.customInfoSections),
    customInfoFields: arrayOrEmpty(data.customInfoFields),
    customInfoEntries: arrayOrEmpty(data.customInfoEntries),
    customInfoValues: arrayOrEmpty(data.customInfoValues),

    contactAlbums: arrayOrEmpty(data.contactAlbums),
    contactAlbumPhotos: arrayOrEmpty(data.contactAlbumPhotos),
    contactRelationships: arrayOrEmpty(data.contactRelationships),

    appSettings: arrayOrEmpty(data.appSettings),

    contactPhotos: arrayOrEmpty(data.contactPhotos),
    albumPhotos: arrayOrEmpty(data.albumPhotos),
  };
}

function assertBackupDataArrays(data: BackupDataV2) {
  const entries: Array<[keyof BackupDataV2, unknown]> = Object.entries(
    data
  ) as Array<[keyof BackupDataV2, unknown]>;

  for (const [key, value] of entries) {
    if (!Array.isArray(value)) {
      throw new Error(`Invalid backup: ${String(key)} must be an array.`);
    }
  }
}

function upgradeLegacyPlainBackupToV2(legacyBackup: any): PlainBackupV2 {
  const data = normalizeBackupData(legacyBackup.data ?? {});
  const counts = buildCounts(data);

  return {
    format: PLAIN_BACKUP_FORMAT,
    version: BACKUP_VERSION,
    manifest: {
      backupVersion: BACKUP_VERSION,
      exportedAt: legacyBackup.exportedAt ?? new Date().toISOString(),
      exportType: "full",
      includedDataTypes: getIncludedDataTypes(FULL_BACKUP_INCLUDE),
      counts,
      app: {
        name: "Birthdayly",
        appVersion: legacyBackup.app?.appVersion,
        platform: legacyBackup.app?.platform,
      },
    },
    data,
  };
}

/* -------------------------------------------------------------------------- */
/* Options                                                                      */
/* -------------------------------------------------------------------------- */

function normalizeExportOptions(
  options?: BackupExportOptions
): BackupExportOptions {
  return {
    passwordProtected: options?.passwordProtected ?? true,
    password: options?.password,
    scope: options?.scope ?? "full",
    selectedContactIds: options?.selectedContactIds,
    include: normalizeIncludeOptions(options?.include ?? FULL_BACKUP_INCLUDE),
  };
}

function normalizeImportOptions(
  input: BackupImportOptions | BackupImportPlan | LegacyBackupMode
): BackupImportOptions {
  if (input === "merge") {
    return {
      strategy: "safe_merge",
      include: FULL_BACKUP_INCLUDE,
    };
  }

  if (input === "replace") {
    return {
      strategy: "replace_all",
      include: FULL_BACKUP_INCLUDE,
    };
  }

  return {
    strategy: input.strategy,
    selectedContactIds: input.selectedContactIds,
    include: normalizeIncludeOptions(input.include ?? FULL_BACKUP_INCLUDE),
  };
}

function normalizeIncludeOptions(include: any) {
  const safe = {
    contacts: Boolean(include?.contacts),
    groups: Boolean(include?.groups),
    tags: Boolean(include?.tags),
    memories: Boolean(include?.memories),
    events: Boolean(include?.events),
    reminders: Boolean(include?.reminders),
    interactions: Boolean(include?.interactions),
    customInfo: Boolean(include?.customInfo),
    contactPhotos: Boolean(include?.contactPhotos),
    albums: Boolean(include?.albums),
    albumPhotos: Boolean(include?.albumPhotos),
    relationships: Boolean(include?.relationships),
    appSettings: Boolean(include?.appSettings),
  };

  const needsContacts =
    safe.groups ||
    safe.tags ||
    safe.memories ||
    safe.events ||
    safe.reminders ||
    safe.interactions ||
    safe.customInfo ||
    safe.contactPhotos ||
    safe.albums ||
    safe.albumPhotos ||
    safe.relationships;

  if (needsContacts) {
    safe.contacts = true;
  }

  if (safe.reminders) {
    safe.events = true;
  }

  if (safe.albumPhotos) {
    safe.albums = true;
  }

  if (safe.contactPhotos || safe.albumPhotos) {
    safe.contacts = true;
  }

  return safe;
}

function getIncludedDataTypes(
  include: ReturnType<typeof normalizeIncludeOptions>
): BackupDataType[] {
  const types: BackupDataType[] = [];

  if (include.contacts) types.push("contacts");
  if (include.groups) types.push("groups");
  if (include.tags) types.push("tags");
  if (include.memories) types.push("memories");
  if (include.events) types.push("events");
  if (include.reminders) types.push("reminders");
  if (include.interactions) types.push("interactions");
  if (include.customInfo) types.push("custom_info");
  if (include.contactPhotos) types.push("contact_photos");
  if (include.albums) types.push("albums");
  if (include.albumPhotos) types.push("album_photos");
  if (include.relationships) types.push("relationships");
  if (include.appSettings) types.push("app_settings");

  return types;
}

function isImportPlan(input: unknown): input is BackupImportPlan {
  const value = input as BackupImportPlan;

  return (
    Boolean(value) &&
    typeof value === "object" &&
    Array.isArray(value.conflicts)
  );
}

/* -------------------------------------------------------------------------- */
/* Counts                                                                       */
/* -------------------------------------------------------------------------- */

function buildCounts(data: BackupDataV2): BackupCounts {
  return {
    contactGroups: data.contactGroups.length,
    contactTags: data.contactTags.length,
    contacts: data.contacts.length,
    contactTagLinks: data.contactTagLinks.length,
    contactMemories: data.contactMemories.length,
    contactEvents: data.contactEvents.length,
    reminders: data.reminders.length,
    interactions: data.interactions.length,
    customInfoSections: data.customInfoSections.length,
    customInfoFields: data.customInfoFields.length,
    customInfoEntries: data.customInfoEntries.length,
    customInfoValues: data.customInfoValues.length,
    contactAlbums: data.contactAlbums.length,
    contactAlbumPhotos: data.contactAlbumPhotos.length,
    contactRelationships: data.contactRelationships.length,
    appSettings: data.appSettings.length,
    contactPhotos: data.contactPhotos.length,
    albumPhotos: data.albumPhotos.length,
  };
}

function buildEmptyCounts(): Partial<BackupCounts> {
  return {
    contactGroups: 0,
    contactTags: 0,
    contacts: 0,
    contactTagLinks: 0,
    contactMemories: 0,
    contactEvents: 0,
    reminders: 0,
    interactions: 0,
    customInfoSections: 0,
    customInfoFields: 0,
    customInfoEntries: 0,
    customInfoValues: 0,
    contactAlbums: 0,
    contactAlbumPhotos: 0,
    contactRelationships: 0,
    appSettings: 0,
    contactPhotos: 0,
    albumPhotos: 0,
  };
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                      */
/* -------------------------------------------------------------------------- */

function serializeRows(rows: any[]) {
  return rows.map((row) => {
    const output: any = {};

    for (const [key, value] of Object.entries(row)) {
      output[key] = dateToJson(value);
    }

    return output;
  });
}

function dateToJson(value: any) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function reviveDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date in backup: ${value}`);
  }

  return date;
}

function fallbackDate(value: any) {
  return reviveDate(value) ?? new Date();
}

function reviveTimestamp(value: any): number | null {
  if (!value) return null;

  if (value instanceof Date) {
    return value.getTime();
  }

  const numberValue = Number(value);

  if (!Number.isNaN(numberValue)) {
    return numberValue;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp in backup: ${value}`);
  }

  return date.getTime();
}

function fallbackTimestamp(value: any) {
  return reviveTimestamp(value) ?? Date.now();
}

function arrayOrEmpty(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function compactValidRows<T>(rows: Array<T | null>, label: string): T[] {
  const valid = rows.filter((row): row is T => row !== null);
  const skipped = rows.length - valid.length;

  if (skipped > 0) {
    console.log(`[Backup import] Skipped ${skipped} invalid ${label} rows`);
  }

  return valid;
}

function hasValue(value: any) {
  return value !== undefined && value !== null && value !== "";
}

function getId(row: any) {
  return row.id ? String(row.id) : null;
}

function normalizeNullableString(value: any) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value);
}

function normalizeRequiredString(value: any) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return null;
}

function normalizeBoolean(value: any, fallback: boolean) {
  if (value === true || value === 1 || value === "1" || value === "true") {
    return true;
  }

  if (value === false || value === 0 || value === "0" || value === "false") {
    return false;
  }

  return fallback;
}

function normalizeNumber(value: any, fallback: number) {
  const num = Number(value);

  if (Number.isNaN(num)) {
    return fallback;
  }

  return num;
}

function normalizeNumberInSet(value: any, allowed: Set<number>, fallback: number) {
  const num = normalizeNumber(value, fallback);

  return allowed.has(num) ? num : fallback;
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function normalizeEmail(value: any) {
  if (!value || typeof value !== "string") return null;

  const email = value.trim().toLowerCase();

  return email.includes("@") ? email : null;
}

function normalizePhone(value: any) {
  if (!value || typeof value !== "string") return null;

  const phone = value.replace(/[^\d+]/g, "");

  return phone.length >= 6 ? phone : null;
}

function normalizeNameBirthdayKey(row: any) {
  const firstName = normalizeRequiredString(row.firstName ?? row.first_name);
  const lastName = normalizeNullableString(row.lastName ?? row.last_name);
  const birthday = normalizeNullableString(row.birthday);

  if (!firstName || !birthday) return null;

  return `${normalizeName(firstName)}|${normalizeName(lastName ?? "")}|${birthday}`;
}

function buildContactName(row: any) {
  const firstName = normalizeRequiredString(row.firstName ?? row.first_name);
  const lastName = normalizeNullableString(row.lastName ?? row.last_name);

  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "Unnamed contact";
}

function looksLikeContact(row: any) {
  return (
    hasValue(row.firstName) ||
    hasValue(row.first_name) ||
    hasValue(row.birthday) ||
    hasValue(row.phone) ||
    hasValue(row.email) ||
    hasValue(row.photoUri) ||
    hasValue(row.photo_uri) ||
    hasValue(row.talkEveryDays) ||
    hasValue(row.talk_every_days)
  );
}

function looksLikeGroupOrTagOnly(row: any) {
  return (
    hasValue(row.name) &&
    !hasValue(row.firstName) &&
    !hasValue(row.first_name) &&
    !hasValue(row.birthday) &&
    !hasValue(row.phone) &&
    !hasValue(row.email)
  );
}

function buildPairKey(contactId: string, relatedContactId: string) {
  return [contactId, relatedContactId].sort().join("__");
}

function makeImportedId(originalId: any, prefix: string) {
  return `${prefix}_${String(originalId)}_import_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function getLocalContactIdsToReplace(plan: BackupImportPlan) {
  return plan.conflicts
    .filter((conflict) => conflict.localContactId)
    .filter((conflict) => conflict.decision === "update_from_backup")
    .map((conflict) => String(conflict.localContactId));
}