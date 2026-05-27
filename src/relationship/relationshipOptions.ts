// src/relationships/relationshipOptions.ts
import { Ionicons } from "@expo/vector-icons";

export type ContactRelationshipGroup =
  | "partner"
  | "children"
  | "parents"
  | "siblings"
  | "extended_family"
  | "social"
  | "work"
  | "other";

export type RelationshipOption = {
  type: string;
  label: string;
  reverseType: string;
  reverseLabel: string;
  group: ContactRelationshipGroup;
  icon: keyof typeof Ionicons.glyphMap;
};

export const RELATIONSHIP_GROUP_ORDER: ContactRelationshipGroup[] = [
  "partner",
  "children",
  "parents",
  "siblings",
  "extended_family",
  "social",
  "work",
  "other",
];

export const RELATIONSHIP_GROUP_LABELS: Record<ContactRelationshipGroup, string> =
  {
    partner: "Partner",
    children: "Children",
    parents: "Parents",
    siblings: "Siblings",
    extended_family: "Extended family",
    social: "Social",
    work: "Work",
    other: "Other",
  };

export const RELATIONSHIP_OPTIONS: RelationshipOption[] = [
  {
    type: "wife",
    label: "Wife",
    reverseType: "partner",
    reverseLabel: "Partner",
    group: "partner",
    icon: "heart-outline",
  },
  {
    type: "husband",
    label: "Husband",
    reverseType: "partner",
    reverseLabel: "Partner",
    group: "partner",
    icon: "heart-outline",
  },
  {
    type: "partner",
    label: "Partner",
    reverseType: "partner",
    reverseLabel: "Partner",
    group: "partner",
    icon: "heart-outline",
  },
  {
    type: "girlfriend",
    label: "Girlfriend",
    reverseType: "partner",
    reverseLabel: "Partner",
    group: "partner",
    icon: "heart-outline",
  },
  {
    type: "boyfriend",
    label: "Boyfriend",
    reverseType: "partner",
    reverseLabel: "Partner",
    group: "partner",
    icon: "heart-outline",
  },
  {
    type: "daughter",
    label: "Daughter",
    reverseType: "parent",
    reverseLabel: "Parent",
    group: "children",
    icon: "flower-outline",
  },
  {
    type: "son",
    label: "Son",
    reverseType: "parent",
    reverseLabel: "Parent",
    group: "children",
    icon: "happy-outline",
  },
  {
    type: "child",
    label: "Child",
    reverseType: "parent",
    reverseLabel: "Parent",
    group: "children",
    icon: "happy-outline",
  },
  {
    type: "mother",
    label: "Mother",
    reverseType: "child",
    reverseLabel: "Child",
    group: "parents",
    icon: "home-outline",
  },
  {
    type: "father",
    label: "Father",
    reverseType: "child",
    reverseLabel: "Child",
    group: "parents",
    icon: "home-outline",
  },
  {
    type: "parent",
    label: "Parent",
    reverseType: "child",
    reverseLabel: "Child",
    group: "parents",
    icon: "home-outline",
  },
  {
    type: "sister",
    label: "Sister",
    reverseType: "sibling",
    reverseLabel: "Sibling",
    group: "siblings",
    icon: "people-outline",
  },
  {
    type: "brother",
    label: "Brother",
    reverseType: "sibling",
    reverseLabel: "Sibling",
    group: "siblings",
    icon: "people-outline",
  },
  {
    type: "sibling",
    label: "Sibling",
    reverseType: "sibling",
    reverseLabel: "Sibling",
    group: "siblings",
    icon: "people-outline",
  },
  {
    type: "grandmother",
    label: "Grandmother",
    reverseType: "grandchild",
    reverseLabel: "Grandchild",
    group: "extended_family",
    icon: "leaf-outline",
  },
  {
    type: "grandfather",
    label: "Grandfather",
    reverseType: "grandchild",
    reverseLabel: "Grandchild",
    group: "extended_family",
    icon: "leaf-outline",
  },
  {
    type: "cousin",
    label: "Cousin",
    reverseType: "cousin",
    reverseLabel: "Cousin",
    group: "extended_family",
    icon: "git-network-outline",
  },
  {
    type: "friend",
    label: "Friend",
    reverseType: "friend",
    reverseLabel: "Friend",
    group: "social",
    icon: "sparkles-outline",
  },
  {
    type: "best_friend",
    label: "Best friend",
    reverseType: "best_friend",
    reverseLabel: "Best friend",
    group: "social",
    icon: "star-outline",
  },
  {
    type: "roommate",
    label: "Roommate",
    reverseType: "roommate",
    reverseLabel: "Roommate",
    group: "social",
    icon: "bed-outline",
  },
  {
    type: "colleague",
    label: "Colleague",
    reverseType: "colleague",
    reverseLabel: "Colleague",
    group: "work",
    icon: "briefcase-outline",
  },
  {
    type: "client",
    label: "Client",
    reverseType: "professional_contact",
    reverseLabel: "Professional contact",
    group: "work",
    icon: "briefcase-outline",
  },
];

export function getRelationshipOption(type: string) {
  return (
    RELATIONSHIP_OPTIONS.find((option) => option.type === type) ?? {
      type,
      label: humanizeRelationship(type),
      reverseType: "related",
      reverseLabel: "Related",
      group: "other" as ContactRelationshipGroup,
      icon: "link-outline" as keyof typeof Ionicons.glyphMap,
    }
  );
}

function humanizeRelationship(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}