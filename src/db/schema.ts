import {
  sqliteTable,
  text,
  integer,
  index,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * CONTACT GROUP TABLE
 */
export const contactGroup = sqliteTable(
  "contact_group",
  {
    id: text("id")
      .primaryKey(),

    userId: text("user_id").notNull().default("local"),

    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),

    color: text("color"),
    icon: text("icon"),

    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("unique_contact_group_per_user").on(
      table.userId,
      table.normalizedName
    ),

    index("contact_group_user_normalized_idx").on(
      table.userId,
      table.normalizedName
    ),

    index("contact_group_name_idx").on(table.name),
  ]
);

/**
 * CONTACT TAG TABLE
 */
export const contactTag = sqliteTable(
  "contact_tag",
  {
    id: text("id")
      .primaryKey(),

    userId: text("user_id").notNull().default("local"),

    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),

    color: text("color"),

    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("unique_contact_tag_per_user").on(
      table.userId,
      table.normalizedName
    ),

    index("contact_tag_user_normalized_idx").on(
      table.userId,
      table.normalizedName
    ),

    index("contact_tag_name_idx").on(table.name),
  ]
);

/**
 * CONTACT TABLE
 */
export const contact = sqliteTable(
  "contact",
  {
    id: text("id")
      .primaryKey(),

    userId: text("user_id").notNull().default("local"),

    firstName: text("first_name").notNull(),
    lastName: text("last_name"),

    birthday: text("birthday"), // YYYY-MM-DD

    phone: text("phone"),
    email: text("email"),

    groupId: text("group_id").references(() => contactGroup.id, {
      onDelete: "set null",
    }),

    isFavorite: integer("is_favorite", { mode: "boolean" })
      .notNull()
      .default(false),

    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),

    /**
     * Django:
     * talk_every_days
     *
     * Keep the same meaning.
     */
    talkEveryDays: integer("talk_every_days"),

    talkLastAt: text("talk_last_at"), // YYYY-MM-DD
    talkNextAt: text("talk_next_at"), // YYYY-MM-DD

    /**
     * Expo local file URI.
     */
    photoUri: text("photo_uri"),

    shortDescription: text("short_description"),

    talkNotifiedAt: text("talk_notified_at"), // YYYY-MM-DD
  },
  (table) => [
    index("contact_user_favorite_idx").on(table.userId, table.isFavorite),
    index("contact_user_birthday_idx").on(table.userId, table.birthday),
    index("contact_user_group_idx").on(table.userId, table.groupId),
    index("contact_user_talk_next_idx").on(table.userId, table.talkNextAt),
    index("contact_name_idx").on(table.firstName, table.lastName),
  ]
);

/**
 * CONTACT-TAG MANY-TO-MANY TABLE
 */
export const contactTagLink = sqliteTable(
  "contact_tag_link",
  {
    contactId: text("contact_id")
      .notNull()
      .references(() => contact.id, { onDelete: "cascade" }),

    tagId: text("tag_id")
      .notNull()
      .references(() => contactTag.id, { onDelete: "cascade" }),

    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.contactId, table.tagId],
    }),

    index("contact_tag_link_contact_idx").on(table.contactId),
    index("contact_tag_link_tag_idx").on(table.tagId),
  ]
);

/**
 * CONTACT MEMORY TABLE
 *
 * Django:
 * ContactMemory
 */
export const contactMemory = sqliteTable(
  "contact_memory",
  {
    id: text("id")
      .primaryKey(),

    contactId: text("contact_id")
      .notNull()
      .references(() => contact.id, { onDelete: "cascade" }),

    text: text("text").notNull(),

    /**
     * Django choices:
     * note
     * important
     * ask_next_time
     * date
     */
    memoryType: text("memory_type").notNull().default("note"),

    /**
     * Optional date connected to this memory.
     * Store as YYYY-MM-DD.
     */
    date: text("date"),

    isPinned: integer("is_pinned", { mode: "boolean" })
      .notNull()
      .default(false),

    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),

    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),

    /**
     * Offline-first addition.
     */
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("contact_memory_contact_type_idx").on(
      table.contactId,
      table.memoryType
    ),

    index("contact_memory_contact_pinned_idx").on(
      table.contactId,
      table.isPinned
    ),

    index("contact_memory_date_idx").on(table.date),
  ]
);


/**
 * EVENT TYPE TABLE
 *
 * Example:
 * Birthday
 * Reminder
 * Call
 * Gift
 * Meeting
 */
export const eventType = sqliteTable(
  "event_type",
  {
    id: text("id")
      .primaryKey(),

    userId: text("user_id").notNull().default("local"),

    name: text("name").notNull(),
    value: text("value").notNull(),

    color: text("color"),
    icon: text("icon"),

    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("unique_event_type_per_user").on(
      table.userId,
      table.value
    ),

    index("event_type_user_value_idx").on(table.userId, table.value),
  ]
);

/**
 * CONTACT EVENT TABLE
 */
export const contactEvent = sqliteTable(
  "contact_event",
  {
    id: text("id")
      .primaryKey(),

    userId: text("user_id").notNull().default("local"),

    contactId: text("contact_id")
      .notNull()
      .references(() => contact.id, { onDelete: "cascade" }),

    title: text("title").notNull(),

    type: integer("type").notNull().default(6),

    startDate: text("start_date").notNull(),
    startTime: text("start_time"),

    endDate: text("end_date"),
    endTime: text("end_time"),

    isRecurring: integer("is_recurring", { mode: "boolean" })
      .notNull()
      .default(false),

    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(true),

    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("contact_event_user_contact_idx").on(table.userId, table.contactId),
    index("contact_event_contact_start_idx").on(table.contactId, table.startDate),
    index("contact_event_user_start_idx").on(table.userId, table.startDate),
    index("contact_event_type_idx").on(table.type),
  ]
);

/**
 * REMINDER TABLE
 *
 * Django:
 * Reminder
 */
export const reminder = sqliteTable(
  "reminder",
  {
    id: text("id")
      .primaryKey(),

    eventId: text("event_id")
      .notNull()
      .references(() => contactEvent.id, { onDelete: "cascade" }),

    /**
     * Example:
     * 1 day before
     * 3 days before
     * 7 days before
     */
    daysBefore: integer("days_before"),

    /**
     * Django DateTimeField.
     *
     * Store as timestamp_ms because this is an exact moment.
     */
    absoluteDatetime: integer("absolute_datetime", {
      mode: "timestamp_ms",
    }),

    /**
     * Django TimeField.
     *
     * Store as text:
     * "09:00"
     * "18:30"
     */
    timeOfDay: text("time_of_day"),

    /**
     * Django:
     * status = IntegerField(choices=ReminderStatus.choices())
     *
     * Use the same integer values as your old backend.
     * If PENDING was not 1 in Django, change the default.
     */
    status: integer("status").notNull().default(1),

    /**
     * Exact datetime when notification should be sent.
     */
    sendAt: integer("send_at", {
      mode: "timestamp_ms",
    }),

    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(true),

    /**
     * Expo local notification identifier.
     * This is not in Django, but it is important for offline-first.
     *
     * When you schedule a local notification, Expo gives you an id.
     * Save it here so you can cancel/update the notification later.
     */
    notificationId: text("notification_id"),

    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),

    /**
     * Offline-first addition.
     */
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("reminder_status_idx").on(table.status),
    index("reminder_send_at_idx").on(table.sendAt),
    index("reminder_event_idx").on(table.eventId),
    index("reminder_event_active_idx").on(table.eventId, table.isActive),
  ]
);


/**
 * INTERACTION TABLE
 *
 * Django:
 * Interaction
 */
export const interaction = sqliteTable(
  "interaction",
  {
    id: text("id")
      .primaryKey(),

    contactId: text("contact_id")
      .notNull()
      .references(() => contact.id, { onDelete: "cascade" }),

    happenedAt: integer("happened_at", { mode: "timestamp_ms" }).notNull(),

    durationMinutes: integer("duration_minutes"),

    note: text("note"),

    type: integer("type").notNull().default(5),

    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("interaction_contact_happened_idx").on(
      table.contactId,
      table.happenedAt
    ),
    index("interaction_type_idx").on(table.type),
  ]
);
export const contactAlbum = sqliteTable(
  "contact_album",
  {
    id: text("id").primaryKey().notNull(),

    userId: text("user_id").notNull().default("local"),

    contactId: text("contact_id")
      .notNull()
      .references(() => contact.id, {
        onDelete: "cascade",
      }),

    title: text("title").notNull(),

    coverPhotoId: text("cover_photo_id"),

    sortOrder: integer("sort_order").notNull().default(0),

    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deletedAt: integer("deleted_at"),
  },
  (table) => ({
    userContactIdx: index("contact_album_user_contact_idx").on(
      table.userId,
      table.contactId
    ),
    contactSortIdx: index("contact_album_contact_sort_idx").on(
      table.contactId,
      table.sortOrder
    ),
  })
);

export const contactAlbumPhoto = sqliteTable(
  "contact_album_photo",
  {
    id: text("id").primaryKey().notNull(),

    albumId: text("album_id")
      .notNull()
      .references(() => contactAlbum.id, {
        onDelete: "cascade",
      }),

    contactId: text("contact_id")
      .notNull()
      .references(() => contact.id, {
        onDelete: "cascade",
      }),

    uri: text("uri").notNull(),

    width: integer("width"),
    height: integer("height"),

    takenAt: integer("taken_at"),

    sortOrder: integer("sort_order").notNull().default(0),

    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deletedAt: integer("deleted_at"),
  },
  (table) => ({
    albumSortIdx: index("contact_album_photo_album_sort_idx").on(
      table.albumId,
      table.sortOrder
    ),
    contactAlbumIdx: index("contact_album_photo_contact_album_idx").on(
      table.contactId,
      table.albumId
    ),
  })
);
/**
 * APP SETTING TABLE
 *
 * Global local-first settings.
 * Used for appearance, preferences, app config, etc.
 */
export const appSetting = sqliteTable(
  "app_setting",
  {
    key: text("key").primaryKey().notNull(),

    value: text("value").notNull(),

    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("app_setting_updated_idx").on(table.updatedAt),
  ]
);