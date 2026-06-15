import { eq, like } from "drizzle-orm";

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
  eventType,
  interaction,
  reminder,
} from "../db/schema";

const USER_ID = "local";
const DUMMY_PREFIX = "dummy_";

type SeedDummyDataOptions = {
  contactCount?: number;
  resetExistingDummyData?: boolean;
};

type SeedDummyDataResult = {
  contacts: number;
  groups: number;
  tags: number;
  memories: number;
  events: number;
  reminders: number;
  interactions: number;
  albums: number;
  photos: number;
  customSections: number;
  relationships: number;
};

const FIRST_NAMES = [
  "Sarah",
  "Lucas",
  "Emma",
  "Noah",
  "Lina",
  "Adam",
  "Sofia",
  "Hugo",
  "Mia",
  "Elias",
  "Nora",
  "Leo",
  "Camille",
  "Yanis",
  "Clara",
  "Mehdi",
  "Julia",
  "Arthur",
  "Ines",
  "Thomas",
  "Amina",
  "Gabriel",
  "Elena",
  "Nicolas",
];

const LAST_NAMES = [
  "Martin",
  "Bernard",
  "Dubois",
  "Thomas",
  "Robert",
  "Richard",
  "Petit",
  "Durand",
  "Leroy",
  "Moreau",
  "Simon",
  "Laurent",
  "Lefebvre",
  "Michel",
  "Garcia",
  "Roux",
  "Fournier",
  "Girard",
];

const GROUPS = [
  {
    id: makeId("group", "family"),
    name: "Demo Family",
    color: "#EBA55B",
    icon: "people-outline",
  },
  {
    id: makeId("group", "friends"),
    name: "Demo Friends",
    color: "#7DA56D",
    icon: "heart-outline",
  },
  {
    id: makeId("group", "work"),
    name: "Demo Work",
    color: "#4D82D8",
    icon: "briefcase-outline",
  },
  {
    id: makeId("group", "dating"),
    name: "Demo Dating",
    color: "#D86BA4",
    icon: "sparkles-outline",
  },
  {
    id: makeId("group", "community"),
    name: "Demo Community",
    color: "#8A6BD8",
    icon: "planet-outline",
  },
];
const TAGS = [
  "Creative",
  "Travel",
  "Fitness",
  "Business",
  "Family",
  "Important",
  "Birthday soon",
  "Needs follow-up",
  "Funny",
  "Food lover",
  "Football",
  "Music",
  "Deep talks",
  "Client",
  "Close friend",
];

const EVENT_TYPES = [
  { id: makeId("event_type", "1"), name: "Birthday", value: "1", icon: "🎂", color: "#EBA55B" },
  { id: makeId("event_type", "2"), name: "Meeting", value: "2", icon: "🤝", color: "#4D82D8" },
  { id: makeId("event_type", "3"), name: "Call", value: "3", icon: "📞", color: "#7DA56D" },
  { id: makeId("event_type", "4"), name: "Gift", value: "4", icon: "🎁", color: "#D86BA4" },
  { id: makeId("event_type", "5"), name: "Follow-up", value: "5", icon: "💬", color: "#8A6BD8" },
  { id: makeId("event_type", "6"), name: "Other", value: "6", icon: "✨", color: "#6B7280" },
];

export async function seedDummyData(
  options: SeedDummyDataOptions = {}
): Promise<SeedDummyDataResult> {
  const contactCount = options.contactCount ?? 120;
  const resetExistingDummyData = options.resetExistingDummyData ?? true;

  if (resetExistingDummyData) {
    await clearDummyData();
  }

  const now = new Date();
  const nowMs = Date.now();

  const groups = GROUPS.map((group) => ({
    id: group.id,
    userId: USER_ID,
    name: group.name,
    normalizedName: normalize(group.name),
    color: group.color,
    icon: group.icon,
    createdAt: now,
    updatedAt: now,
  }));

  const tags = TAGS.map((name, index) => ({
    id: makeId("tag", index + 1),
    userId: USER_ID,
    name,
    normalizedName: normalize(name),
    color: pickColor(index),
    createdAt: now,
    updatedAt: now,
  }));

  const eventTypes = EVENT_TYPES.map((type) => ({
    id: type.id,
    userId: USER_ID,
    name: type.name,
    value: type.value,
    color: type.color,
    icon: type.icon,
    createdAt: now,
    updatedAt: now,
  }));

  const contacts: any[] = [];
  const tagLinks: any[] = [];
  const memories: any[] = [];
  const events: any[] = [];
  const reminders: any[] = [];
  const interactions: any[] = [];
const albums: any[] = [];
const photos: any[] = [];
const albumCoverUpdates: { albumId: string; coverPhotoId: string }[] = [];
  const customSections: any[] = [];
  const customFields: any[] = [];
  const customEntries: any[] = [];
  const customValues: any[] = [];
  const relationships: any[] = [];

  for (let i = 1; i <= contactCount; i += 1) {
    const firstName = FIRST_NAMES[(i - 1) % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i - 1) % LAST_NAMES.length];
    const fullName = `${firstName} ${lastName}`;

    const group = GROUPS[(i - 1) % GROUPS.length];
    const contactId = makeId("contact", i);

    const birthdayMonth = ((i * 3) % 12) + 1;
    const birthdayDay = ((i * 7) % 27) + 1;
    const birthdayYear = 1980 + (i % 24);

    const lastTalkDaysAgo = (i * 5) % 90;
    const talkEveryDays = [7, 14, 21, 30, 45, 60][i % 6];
    const talkLastAt = addDays(new Date(), -lastTalkDaysAgo);
    const talkNextAt = addDays(talkLastAt, talkEveryDays);

    contacts.push({
      id: contactId,
      userId: USER_ID,
      firstName,
      lastName,
      birthday: `${birthdayYear}-${pad2(birthdayMonth)}-${pad2(birthdayDay)}`,
      phone: `+33 6 ${pad2(i % 99)} ${pad2((i * 3) % 99)} ${pad2((i * 7) % 99)} ${pad2((i * 11) % 99)}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@example.com`,
      groupId: group.id,
      isFavorite: i % 8 === 0,
      metAt: pickMetAt(i),
      knownSince: `${2015 + (i % 10)}-${pad2(((i * 2) % 12) + 1)}-${pad2(((i * 5) % 27) + 1)}`,
      relationshipLabel: pickRelationshipLabel(i),
      talkEveryDays,
      talkLastAt: formatDateOnly(talkLastAt),
      talkNextAt: formatDateOnly(talkNextAt),
      photoUri: `https://i.pravatar.cc/300?u=${encodeURIComponent(contactId)}`,
      shortDescription: makeShortDescription(fullName, i),
      talkNotifiedAt: null,
      createdAt: addDays(now, -120 + i),
      updatedAt: now,
    });

    /**
     * Tags
     */
    const tagA = tags[i % tags.length];
    const tagB = tags[(i + 4) % tags.length];

    tagLinks.push({
      contactId,
      tagId: tagA.id,
      createdAt: now,
    });

    tagLinks.push({
      contactId,
      tagId: tagB.id,
      createdAt: now,
    });

    /**
     * Memories
     */
    memories.push({
      id: makeId("memory", `${i}_note`),
      contactId,
      text: `${firstName} likes meaningful conversations and remembers small details.`,
      memoryType: "note",
      date: null,
      isPinned: false,
      createdAt: addDays(now, -30 - i),
      updatedAt: now,
    });

    memories.push({
      id: makeId("memory", `${i}_important`),
      contactId,
      text: `Important: ${firstName} appreciates when you ask about family, work, and future plans.`,
      memoryType: "important",
      date: null,
      isPinned: true,
      createdAt: addDays(now, -25 - i),
      updatedAt: now,
    });

    memories.push({
      id: makeId("memory", `${i}_ask`),
      contactId,
      text: `Ask next time: how is the project / trip / personal goal going?`,
      memoryType: "ask_next_time",
      date: null,
      isPinned: i % 3 === 0,
      createdAt: addDays(now, -18 - i),
      updatedAt: now,
    });

    memories.push({
      id: makeId("memory", `${i}_date`),
      contactId,
      text: `Shared a nice moment together. Good person to keep close.`,
      memoryType: "date",
      date: formatDateOnly(addDays(now, -10 - i)),
      isPinned: false,
      createdAt: addDays(now, -10 - i),
      updatedAt: now,
    });

    /**
     * Events + reminders
     */
    const eventDateA = addDays(now, (i % 45) - 5);
    const eventDateB = addDays(now, (i % 90) + 7);

    const eventAId = makeId("event", `${i}_birthday`);
    const eventBId = makeId("event", `${i}_followup`);

    events.push({
      id: eventAId,
      userId: USER_ID,
      contactId,
      title: `${firstName}'s birthday`,
      type: 1,
      startDate: formatDateOnly(eventDateA),
      startTime: "09:00",
      endDate: null,
      endTime: null,
      isRecurring: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    events.push({
      id: eventBId,
      userId: USER_ID,
      contactId,
      title: pickEventTitle(firstName, i),
      type: pickEventType(i),
      startDate: formatDateOnly(eventDateB),
      startTime: pickTime(i),
      endDate: null,
      endTime: null,
      isRecurring: i % 5 === 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    reminders.push({
      id: makeId("reminder", `${i}_birthday_1`),
      eventId: eventAId,
      daysBefore: 1,
      absoluteDatetime: setTime(addDays(eventDateA, -1), 9, 0),
      timeOfDay: "09:00",
      status: 1,
      sendAt: setTime(addDays(eventDateA, -1), 9, 0),
      isActive: true,
      notificationId: null,
      createdAt: now,
      updatedAt: now,
    });

    reminders.push({
      id: makeId("reminder", `${i}_birthday_7`),
      eventId: eventAId,
      daysBefore: 7,
      absoluteDatetime: setTime(addDays(eventDateA, -7), 9, 0),
      timeOfDay: "09:00",
      status: 1,
      sendAt: setTime(addDays(eventDateA, -7), 9, 0),
      isActive: true,
      notificationId: null,
      createdAt: now,
      updatedAt: now,
    });

    reminders.push({
      id: makeId("reminder", `${i}_followup_1`),
      eventId: eventBId,
      daysBefore: 1,
      absoluteDatetime: setTime(addDays(eventDateB, -1), 18, 0),
      timeOfDay: "18:00",
      status: 1,
      sendAt: setTime(addDays(eventDateB, -1), 18, 0),
      isActive: true,
      notificationId: null,
      createdAt: now,
      updatedAt: now,
    });

    /**
     * Interaction history
     */
    for (let j = 1; j <= 3; j += 1) {
      interactions.push({
        id: makeId("interaction", `${i}_${j}`),
        contactId,
        happenedAt: addDays(now, -(j * 8 + (i % 20))),
        durationMinutes: [5, 15, 30, 45, 60][(i + j) % 5],
        note: pickInteractionNote(firstName, j),
        type: [1, 2, 3, 4, 5][(i + j) % 5],
        createdAt: addDays(now, -(j * 8 + (i % 20))),
        updatedAt: now,
      });
    }

    /**
     * Albums/photos for first 60 contacts
     */
    if (i <= Math.min(contactCount, 60)) {
      const albumId = makeId("album", i);
      const firstPhotoId = makeId("photo", `${i}_1`);

albums.push({
  id: albumId,
  userId: USER_ID,
  contactId,
  title: "Shared memories",
  coverPhotoId: null,
  sortOrder: 0,
  createdAt: nowMs,
  updatedAt: nowMs,
});
albumCoverUpdates.push({
  albumId,
  coverPhotoId: firstPhotoId,
});

      for (let p = 1; p <= 3; p += 1) {
        photos.push({
          id: makeId("photo", `${i}_${p}`),
          albumId,
          contactId,
          uri: `https://picsum.photos/seed/${encodeURIComponent(`${contactId}_${p}`)}/900/1200`,
          width: 900,
          height: 1200,
          takenAt: addDays(now, -(p * 12 + i)).getTime(),
          sortOrder: p,
          createdAt: nowMs,
          updatedAt: nowMs,
        });
      }
    }

    /**
     * Custom sections for first 35 contacts
     */
    if (i <= Math.min(contactCount, 35)) {
      const sectionId = makeId("section", i);
      const fieldAId = makeId("field", `${i}_gift`);
      const fieldBId = makeId("field", `${i}_food`);
      const entryId = makeId("entry", i);

      customSections.push({
        id: sectionId,
        userId: USER_ID,
        contactId,
        name: "Personal details",
        normalizedName: "personal-details",
        icon: "sparkles-outline",
        color: "#EBA55B",
        scope: "contact",
        isRepeatable: true,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      });

      customFields.push({
        id: fieldAId,
        sectionId,
        label: "Gift idea",
        fieldKey: "gift_idea",
        fieldType: "text",
        placeholder: "Something they would love",
        optionsJson: null,
        isRequired: false,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      });

      customFields.push({
        id: fieldBId,
        sectionId,
        label: "Favorite food",
        fieldKey: "favorite_food",
        fieldType: "text",
        placeholder: "Food, drink, restaurant...",
        optionsJson: null,
        isRequired: false,
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      });

      customEntries.push({
        id: entryId,
        sectionId,
        contactId,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      });

      customValues.push({
        id: makeId("value", `${i}_gift`),
        entryId,
        fieldId: fieldAId,
        contactId,
        valueText: pickGiftIdea(i),
        valueNumber: null,
        valueDate: null,
        valueJson: null,
        createdAt: now,
        updatedAt: now,
      });

      customValues.push({
        id: makeId("value", `${i}_food`),
        entryId,
        fieldId: fieldBId,
        contactId,
        valueText: pickFood(i),
        valueNumber: null,
        valueDate: null,
        valueJson: null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  /**
   * Life Circle relationships
   */
  for (let i = 1; i <= contactCount - 1; i += 2) {
    const contactId = makeId("contact", i);
    const relatedContactId = makeId("contact", i + 1);
    const pairKey = makePairKey(contactId, relatedContactId);

    relationships.push({
      id: makeId("relationship", i),
      userId: USER_ID,
      pairKey,
      contactId,
      relatedContactId,
      relationshipType: pickRelationshipType(i),
      reverseRelationshipType: pickReverseRelationshipType(i),
      relationshipGroup: pickRelationshipGroup(i),
      note: "Dummy Life Circle connection for testing relationship graph density.",
      createdAt: now,
      updatedAt: now,
    });
  }
await insertInChunks(contactGroup, groups, 40, "contactGroup");
await insertInChunks(contactTag, tags, 40, "contactTag");
await insertInChunks(eventType, eventTypes, 40, "eventType");
await insertInChunks(contact, contacts, 40, "contact");
await insertInChunks(contactTagLink, tagLinks, 40, "contactTagLink");
await insertInChunks(contactMemory, memories, 40, "contactMemory");
await insertInChunks(contactEvent, events, 40, "contactEvent");
await insertInChunks(reminder, reminders, 40, "reminder");
await insertInChunks(interaction, interactions, 40, "interaction");
await insertInChunks(contactAlbum, albums, 40, "contactAlbum");
await insertInChunks(contactAlbumPhoto, photos, 40, "contactAlbumPhoto");

for (const update of albumCoverUpdates) {
  await db
    .update(contactAlbum)
    .set({
      coverPhotoId: update.coverPhotoId,
      updatedAt: Date.now(),
    })
    .where(eq(contactAlbum.id, update.albumId));
}

await insertInChunks(customInfoSection, customSections, 40, "customInfoSection");
await insertInChunks(customInfoField, customFields, 40, "customInfoField");
await insertInChunks(customInfoEntry, customEntries, 40, "customInfoEntry");
await insertInChunks(customInfoValue, customValues, 40, "customInfoValue");
await insertInChunks(contactRelationship, relationships, 40, "contactRelationship");
  await db
    .insert(appSetting)
    .values({
      key: "dev.dummy_data_seeded_at",
      value: new Date().toISOString(),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: appSetting.key,
      set: {
        value: new Date().toISOString(),
        updatedAt: now,
      },
    });

  return {
    contacts: contacts.length,
    groups: groups.length,
    tags: tags.length,
    memories: memories.length,
    events: events.length,
    reminders: reminders.length,
    interactions: interactions.length,
    albums: albums.length,
    photos: photos.length,
    customSections: customSections.length,
    relationships: relationships.length,
  };
}

export async function clearDummyData() {
  /**
   * Delete child tables first.
   */
  await db.delete(customInfoValue).where(like(customInfoValue.id, `${DUMMY_PREFIX}%`));
  await db.delete(customInfoEntry).where(like(customInfoEntry.id, `${DUMMY_PREFIX}%`));
  await db.delete(customInfoField).where(like(customInfoField.id, `${DUMMY_PREFIX}%`));
  await db.delete(customInfoSection).where(like(customInfoSection.id, `${DUMMY_PREFIX}%`));

  await db.delete(reminder).where(like(reminder.id, `${DUMMY_PREFIX}%`));
  await db.delete(contactEvent).where(like(contactEvent.id, `${DUMMY_PREFIX}%`));

  await db.delete(contactAlbumPhoto).where(like(contactAlbumPhoto.id, `${DUMMY_PREFIX}%`));
  await db.delete(contactAlbum).where(like(contactAlbum.id, `${DUMMY_PREFIX}%`));

  await db.delete(contactMemory).where(like(contactMemory.id, `${DUMMY_PREFIX}%`));
  await db.delete(interaction).where(like(interaction.id, `${DUMMY_PREFIX}%`));
  await db.delete(contactRelationship).where(like(contactRelationship.id, `${DUMMY_PREFIX}%`));

  await db.delete(contactTagLink).where(like(contactTagLink.contactId, `${DUMMY_PREFIX}%`));

  await db.delete(contact).where(like(contact.id, `${DUMMY_PREFIX}%`));
  await db.delete(contactTag).where(like(contactTag.id, `${DUMMY_PREFIX}%`));
  await db.delete(contactGroup).where(like(contactGroup.id, `${DUMMY_PREFIX}%`));
  await db.delete(eventType).where(like(eventType.id, `${DUMMY_PREFIX}%`));
}

async function insertInChunks(
  table: any,
  rows: any[],
  chunkSize = 40,
  label = "unknown"
) {
  if (rows.length === 0) return;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    try {
      await db.insert(table).values(chunk);
    } catch (error) {
      console.log(`Dummy seed failed while inserting: ${label}`);
      console.log("Chunk start:", i);
      console.log("First row in failed chunk:", chunk[0]);
      throw error;
    }
  }
}
/**
 * Helpers
 */

function makeId(type: string, value: string | number) {
  return `${DUMMY_PREFIX}${type}_${value}`;
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateOnly(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function setTime(date: Date, hour: number, minute: number) {
  const copy = new Date(date);
  copy.setHours(hour, minute, 0, 0);
  return copy;
}

function pickColor(index: number) {
  const colors = [
    "#EBA55B",
    "#7DA56D",
    "#4D82D8",
    "#D86BA4",
    "#8A6BD8",
    "#EE6A5E",
    "#64748B",
  ];

  return colors[index % colors.length];
}

function pickMetAt(index: number) {
  const values = [
    "University",
    "Work",
    "Gym",
    "Through friends",
    "Family event",
    "Online",
    "Football",
    "Clermont-Ferrand",
  ];

  return values[index % values.length];
}

function pickRelationshipLabel(index: number) {
  const values = [
    "Close friend",
    "Friend",
    "Family",
    "Colleague",
    "Client",
    "Date",
    "Community",
    "Important person",
  ];

  return values[index % values.length];
}

function makeShortDescription(name: string, index: number) {
  const descriptions = [
    `${name} is someone worth keeping close. Loves meaningful details and thoughtful follow-ups.`,
    `${name} is energetic, social, and appreciates when you remember personal moments.`,
    `${name} is calm, loyal, and values honest conversations.`,
    `${name} is creative and loves travel, food, and spontaneous plans.`,
    `${name} is busy but appreciates short, warm check-ins.`,
  ];

  return descriptions[index % descriptions.length];
}

function pickEventTitle(firstName: string, index: number) {
  const titles = [
    `Check in with ${firstName}`,
    `Ask ${firstName} about their project`,
    `Coffee with ${firstName}`,
    `Send a message to ${firstName}`,
    `Gift idea reminder for ${firstName}`,
    `Follow up with ${firstName}`,
  ];

  return titles[index % titles.length];
}

function pickEventType(index: number) {
  const types = [2, 3, 4, 5, 6];
  return types[index % types.length];
}

function pickTime(index: number) {
  const times = ["09:00", "12:30", "18:00", "19:30", "20:00"];
  return times[index % times.length];
}

function pickInteractionNote(firstName: string, index: number) {
  const notes = [
    `Had a quick chat with ${firstName}. Good energy.`,
    `Talked about life, work, and future plans.`,
    `Need to follow up on what they mentioned last time.`,
  ];

  return notes[(index - 1) % notes.length];
}

function pickGiftIdea(index: number) {
  const ideas = [
    "Nice notebook",
    "Coffee gift card",
    "Book about psychology",
    "Fitness accessory",
    "Personal photo print",
    "Dinner invitation",
  ];

  return ideas[index % ideas.length];
}

function pickFood(index: number) {
  const foods = [
    "Italian food",
    "Sushi",
    "Grilled chicken",
    "Homemade desserts",
    "Coffee and croissants",
    "Spicy food",
  ];

  return foods[index % foods.length];
}

function makePairKey(contactId: string, relatedContactId: string) {
  return [contactId, relatedContactId].sort().join("__");
}

function pickRelationshipType(index: number) {
  const values = ["friend", "brother", "sister", "partner", "colleague", "parent"];
  return values[index % values.length];
}

function pickReverseRelationshipType(index: number) {
  const values = ["friend", "brother", "sister", "partner", "colleague", "child"];
  return values[index % values.length];
}

function pickRelationshipGroup(index: number) {
  const values = ["friend", "family", "work", "romantic", "other"];
  return values[index % values.length];
}