// src/screens/Contacts/LifeCircleCard.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useAppearance } from "../../appearance/AppearanceContext";
import { AppId, Contact } from "../../contacts/types";
import {
  fetchContactById,
  fetchContacts,
} from "../../contacts/repository";
import { ContactRelationshipDTO, createContactRelationship, deleteContactRelationship, fetchContactRelationshipsForContact } from "../../relationship/repository";
import { ContactRelationshipGroup, getRelationshipOption, RELATIONSHIP_GROUP_LABELS, RELATIONSHIP_GROUP_ORDER, RELATIONSHIP_OPTIONS, RelationshipOption } from "../../relationship/relationshipOptions";

import { LinearGradient } from "expo-linear-gradient";
type Props = {
  contact: Contact;
  navigation: any;
};

type LifeCircleColors = {
  background: string;
  card: string;
  title: string;
  text: string;
  primary: string;
  button: string;
  buttonText: string;
  border: string;
  muted: string;
  softCard: string;
  softPrimary: string;
  danger: string;
  warning: string;
  success: string;
  shadow: string;
};

type LifeConnection = {
  relationship: ContactRelationshipDTO;
  person: Contact;
  label: string;
  group: ContactRelationshipGroup;
  icon: keyof typeof Ionicons.glyphMap;
};

export default function LifeCircleCard({ contact, navigation }: Props) {
  const isFocused = useIsFocused();
  const { settings } = useAppearance();
  const colors = useMemo(() => makeLifeCircleColors(settings), [settings]);

  const [connections, setConnections] = useState<LifeConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [viewAllOpen, setViewAllOpen] = useState(false);
const [familyTreeOpen, setFamilyTreeOpen] = useState(false);
  useEffect(() => {
    if (isFocused) {
      loadConnections();
    }
  }, [isFocused, contact.id]);

  async function loadConnections() {
    try {
      setLoading(true);

      const rows = await fetchContactRelationshipsForContact(contact.id as AppId);

      const hydrated = await Promise.all(
        rows.map(async (row) => {
          const isForward = String(row.contactId) === String(contact.id);
          const personId = isForward ? row.relatedContactId : row.contactId;
          const type = isForward
            ? row.relationshipType
            : row.reverseRelationshipType;

          const option = getRelationshipOption(type);
          const person = await fetchContactById(personId as AppId);

          return {
            relationship: row,
            person,
            label: option.label,
            group: option.group,
            icon: option.icon,
          };
        })
      );

      setConnections(hydrated);
    } catch (error) {
      console.log("Load life circle failed:", error);
      Alert.alert("Life circle", "Could not load connected people.");
    } finally {
      setLoading(false);
    }
  }

  function openPerson(person: Contact) {
    navigation.navigate("ContactDetail", {
      contactId: person.id as AppId,
      contactName: getContactName(person),
    });
  }

  async function removeConnection(connection: LifeConnection) {
    Alert.alert(
      "Remove connection?",
      `Remove ${getContactName(connection.person)} from this life circle?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteContactRelationship(connection.relationship.id as AppId);
              await loadConnections();
            } catch (error) {
              console.log("Remove relationship failed:", error);
              Alert.alert("Life circle", "Could not remove this connection.");
            }
          },
        },
      ]
    );
  }

  const previewConnections = connections.slice(0, 4);

  const grouped = useMemo(() => {
    const result: Record<ContactRelationshipGroup, LifeConnection[]> = {
      partner: [],
      children: [],
      parents: [],
      siblings: [],
      extended_family: [],
      social: [],
      work: [],
      other: [],
    };

    connections.forEach((item) => {
      result[item.group]?.push(item);
    });

    return result;
  }, [connections]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.headerIcon,
              { backgroundColor: colors.softPrimary },
            ]}
          >
            <Ionicons name="git-network-outline" size={18} color={colors.primary} />
          </View>

          <View style={styles.headerTextWrap}>
            <Text style={[styles.title, { color: colors.title }]}>
              Life circle
            </Text>

            <Text style={[styles.subtitle, { color: colors.text }]}>
              People connected to {contact.first_name || "this person"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.button }]}
          onPress={() => setAddOpen(true)}
          activeOpacity={0.86}
        >
          <Ionicons name="add" size={18} color={colors.buttonText} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading connections…
          </Text>
        </View>
      ) : connections.length === 0 ? (
        <TouchableOpacity
          style={[
            styles.emptyBox,
            {
              backgroundColor: colors.softCard,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setAddOpen(true)}
          activeOpacity={0.86}
        >
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: colors.softPrimary },
            ]}
          >
            <Ionicons name="people-outline" size={24} color={colors.primary} />
          </View>

          <Text style={[styles.emptyTitle, { color: colors.title }]}>
            No connected people yet
          </Text>

          <Text style={[styles.emptyText, { color: colors.text }]}>
            Add family, partner, children, friends, or colleagues connected to this person.
          </Text>
        </TouchableOpacity>
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.previewRow}
          >
            {previewConnections.map((connection) => (
              <TouchableOpacity
                key={String(connection.relationship.id)}
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: colors.softCard,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => openPerson(connection.person)}
                onLongPress={() => removeConnection(connection)}
                activeOpacity={0.86}
              >
                <Avatar contact={connection.person} colors={colors} size={46} />

                <Text
                  style={[styles.previewName, { color: colors.title }]}
                  numberOfLines={1}
                >
                  {getContactFirstName(connection.person)}
                </Text>

                <Text
                  style={[styles.previewRelation, { color: colors.primary }]}
                  numberOfLines={1}
                >
                  {connection.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.viewAllRow,
              { borderTopColor: colors.border },
            ]}
            onPress={() => setViewAllOpen(true)}
            activeOpacity={0.84}
          >
            <Text style={[styles.viewAllText, { color: colors.title }]}>
              View all {connections.length} connection
              {connections.length > 1 ? "s" : ""}
            </Text>

            <Ionicons name="chevron-forward" size={17} color={colors.muted} />
          </TouchableOpacity>
        </>
      )}

      <AddRelationshipModal
        visible={addOpen}
        currentContact={contact}
        existingPersonIds={connections.map((item) => String(item.person.id))}
        colors={colors}
        onClose={() => setAddOpen(false)}
        onSaved={async () => {
          setAddOpen(false);
          await loadConnections();
        }}
      />

      <LifeCircleModal
            visible={viewAllOpen}
            currentContact={contact}
            grouped={grouped}
            colors={colors}
            onClose={() => setViewAllOpen(false)}
            onOpenPerson={openPerson}
            onRemove={removeConnection}
            onAdd={() => {
                setViewAllOpen(false);
                setAddOpen(true);
            }}
            onOpenFamilyTree={() => {
                setViewAllOpen(false);
                requestAnimationFrame(() => setFamilyTreeOpen(true));
                }}
            />

            <FamilyTreeModal
            visible={familyTreeOpen}
            currentContact={contact}
            grouped={grouped}
            colors={colors}
            onClose={() => setFamilyTreeOpen(false)}
            onOpenPerson={openPerson}
            />
    </View>
  );
}

function AddRelationshipModal({
  visible,
  currentContact,
  existingPersonIds,
  colors,
  onClose,
  onSaved,
}: {
  visible: boolean;
  currentContact: Contact;
  existingPersonIds: string[];
  colors: LifeCircleColors;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedOption, setSelectedOption] =
    useState<RelationshipOption | null>(null);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSearch("");
      setSelectedContact(null);
      setSelectedOption(null);
      loadContacts();
    }
  }, [visible]);

  async function loadContacts() {
    try {
      setLoadingContacts(true);

      const response = await fetchContacts({ page: 1 } as any);
      const results = normalizeContactsResponse(response);

      setContacts(results);
    } catch (error) {
      console.log("Load contacts for relationship failed:", error);
      Alert.alert("Life circle", "Could not load contacts.");
    } finally {
      setLoadingContacts(false);
    }
  }

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return contacts
      .filter((person) => String(person.id) !== String(currentContact.id))
      .filter((person) => !existingPersonIds.includes(String(person.id)))
      .filter((person) => {
        if (!query) return true;

        const name = getContactName(person).toLowerCase();
        const phone = person.phone?.toLowerCase() ?? "";
        const email = person.email?.toLowerCase() ?? "";

        return (
          name.includes(query) ||
          phone.includes(query) ||
          email.includes(query)
        );
      })
      .slice(0, 10);
  }, [contacts, currentContact.id, existingPersonIds, search]);

  async function saveConnection() {
    if (!selectedContact) {
      Alert.alert("Life circle", "Choose a contact first.");
      return;
    }

    if (!selectedOption) {
      Alert.alert("Life circle", "Choose the relationship.");
      return;
    }

    try {
      setSaving(true);

      await createContactRelationship({
        contactId: currentContact.id as AppId,
        relatedContactId: selectedContact.id as AppId,
        relationshipType: selectedOption.type,
        reverseRelationshipType: selectedOption.reverseType,
        relationshipGroup: selectedOption.group,
      });

      onSaved();
    } catch (error: any) {
      console.log("Create relationship failed:", error);
      Alert.alert(
        "Life circle",
        error?.message || "Could not create this connection."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalEyebrow, { color: colors.primary }]}>
                LIFE CIRCLE
              </Text>

              <Text style={[styles.modalTitle, { color: colors.title }]}>
                Connect someone
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.modalClose, { backgroundColor: colors.softCard }]}
              onPress={onClose}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.modalHint, { color: colors.text }]}>
            Who is connected to {currentContact.first_name || "this person"}?
          </Text>

          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: colors.softCard,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="search-outline" size={18} color={colors.muted} />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search contacts..."
              placeholderTextColor={colors.muted}
              style={[styles.searchInput, { color: colors.title }]}
            />
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {loadingContacts ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              filteredContacts.map((person) => {
                const selected =
                  selectedContact &&
                  String(selectedContact.id) === String(person.id);

                return (
                  <TouchableOpacity
                    key={String(person.id)}
                    style={[
                      styles.personRow,
                      {
                        backgroundColor: selected
                          ? colors.softPrimary
                          : colors.softCard,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedContact(person)}
                    activeOpacity={0.84}
                  >
                    <Avatar contact={person} colors={colors} size={40} />

                    <View style={styles.personRowText}>
                      <Text
                        style={[styles.personName, { color: colors.title }]}
                        numberOfLines={1}
                      >
                        {getContactName(person)}
                      </Text>

                      <Text
                        style={[styles.personMeta, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {person.group_detail?.name || person.phone || "Contact"}
                      </Text>
                    </View>

                    {selected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.primary}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              })
            )}

            <Text style={[styles.optionTitle, { color: colors.title }]}>
              What is {selectedContact ? getContactFirstName(selectedContact) : "this person"} to {currentContact.first_name || "this contact"}?
            </Text>

            <View style={styles.optionsWrap}>
              {RELATIONSHIP_OPTIONS.map((option) => {
                const selected = selectedOption?.type === option.type;

                return (
                  <TouchableOpacity
                    key={option.type}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: selected
                          ? colors.primary
                          : colors.softCard,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedOption(option)}
                    activeOpacity={0.84}
                  >
                    <Ionicons
                      name={option.icon}
                      size={14}
                      color={selected ? colors.buttonText : colors.primary}
                    />

                    <Text
                      style={[
                        styles.optionChipText,
                        {
                          color: selected ? colors.buttonText : colors.text,
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedContact && selectedOption ? (
              <View
                style={[
                  styles.previewBox,
                  {
                    backgroundColor: colors.softPrimary,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text style={[styles.previewText, { color: colors.title }]}>
                  {getContactFirstName(selectedContact)} will appear as{" "}
                  <Text style={{ color: colors.primary }}>
                    {currentContact.first_name || "this contact"}’s {selectedOption.label}
                  </Text>
                  .
                </Text>

                <Text style={[styles.previewSubText, { color: colors.text }]}>
                  {currentContact.first_name || "This contact"} will appear as{" "}
                  {getContactFirstName(selectedContact)}’s{" "}
                  {selectedOption.reverseLabel}.
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  backgroundColor: colors.softCard,
                  borderColor: colors.border,
                },
              ]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={[styles.cancelText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: colors.button },
                saving && { opacity: 0.6 },
              ]}
              onPress={saveConnection}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.buttonText} />
              ) : (
                <Text style={[styles.saveText, { color: colors.buttonText }]}>
                  Save connection
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function LifeCircleModal({
  visible,
  currentContact,
  grouped,
  colors,
  onClose,
  onOpenPerson,
  onRemove,
  onAdd,
  onOpenFamilyTree,
}: {
  visible: boolean;
  currentContact: Contact;
  grouped: Record<ContactRelationshipGroup, LifeConnection[]>;
  colors: LifeCircleColors;
  onClose: () => void;
  onOpenPerson: (person: Contact) => void;
  onRemove: (connection: LifeConnection) => void;
  onAdd: () => void;
  onOpenFamilyTree: () => void;
}) {
  const visibleGroups = RELATIONSHIP_GROUP_ORDER.filter(
    (group) => grouped[group].length > 0
  );

  const totalConnections = visibleGroups.reduce(
    (total, group) => total + grouped[group].length,
    0
  );

  const firstName = currentContact.first_name || "Contact";

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.fullModalRoot, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={[colors.primary, colors.button] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.viewAllHeaderGradient}
        >
          <View style={styles.viewAllGlowOne} />
          <View style={styles.viewAllGlowTwo} />

          <View style={styles.viewAllTopRow}>
            <TouchableOpacity
              style={styles.viewAllCloseButton}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-down" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.viewAllPill}>
              <Ionicons name="git-network-outline" size={14} color="#FFFFFF" />

              <Text style={styles.viewAllPillText}>
                {totalConnections} connection{totalConnections > 1 ? "s" : ""}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.viewAllAddButton}
              onPress={onAdd}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.viewAllHeroRow}>
            <View style={styles.viewAllHeroIcon}>
              <Ionicons name="people-outline" size={24} color="#FFFFFF" />
            </View>

            <View style={styles.viewAllHeroText}>
              <Text style={styles.viewAllEyebrow}>LIFE CIRCLE</Text>

              <Text style={styles.viewAllTitle} numberOfLines={1}>
                {firstName}’s circle
              </Text>

              <Text style={styles.viewAllSubtitle} numberOfLines={2}>
                Family, partner, children, friends, and people connected to this person.
              </Text>
            </View>
          </View>

          <View style={styles.viewAllStatsRow}>
            <View style={styles.viewAllStatPill}>
              <Text style={styles.viewAllStatText}>
                {visibleGroups.length} group{visibleGroups.length > 1 ? "s" : ""}
              </Text>
            </View>

            <View style={styles.viewAllStatPill}>
              <Text style={styles.viewAllStatText}>
                Tap to open profile
              </Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.fullModalContent}
        >
          <TouchableOpacity
            style={[
              styles.familyTreeButton,
              {
                backgroundColor: colors.softPrimary,
                borderColor: withOpacity(colors.primary, "35"),
              },
            ]}
            onPress={onOpenFamilyTree}
            activeOpacity={0.86}
          >
            <View
              style={[
                styles.familyTreeButtonIcon,
                { backgroundColor: colors.primary },
              ]}
            >
              <Ionicons
                name="git-network-outline"
                size={18}
                color={colors.buttonText}
              />
            </View>

            <View style={styles.familyTreeButtonTextWrap}>
              <Text
                style={[styles.familyTreeButtonTitle, { color: colors.title }]}
              >
                See family tree
              </Text>

              <Text
                style={[styles.familyTreeButtonSubtitle, { color: colors.text }]}
              >
                Visualize parents, partner, siblings, and children.
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={17} color={colors.muted} />
          </TouchableOpacity>

          {visibleGroups.map((group) => {
            const items = grouped[group];

            return (
              <View key={group} style={styles.groupBlock}>
                <View style={styles.viewAllGroupHeader}>
                  <Text style={[styles.groupTitle, { color: colors.title }]}>
                    {RELATIONSHIP_GROUP_LABELS[group]}
                  </Text>

                  <View
                    style={[
                      styles.viewAllGroupCount,
                      {
                        backgroundColor: colors.softPrimary,
                        borderColor: withOpacity(colors.primary, "30"),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.viewAllGroupCountText,
                        { color: colors.primary },
                      ]}
                    >
                      {items.length}
                    </Text>
                  </View>
                </View>

                {items.map((connection) => (
                  <TouchableOpacity
                    key={String(connection.relationship.id)}
                    style={[
                      styles.fullPersonRow,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => onOpenPerson(connection.person)}
                    onLongPress={() => onRemove(connection)}
                    activeOpacity={0.86}
                  >
                    <Avatar
                      contact={connection.person}
                      colors={colors}
                      size={42}
                    />

                    <View style={styles.fullPersonText}>
                      <Text
                        style={[styles.fullPersonName, { color: colors.title }]}
                        numberOfLines={1}
                      >
                        {getContactName(connection.person)}
                      </Text>

                      <View style={styles.viewAllRelationRow}>
                        <View
                          style={[
                            styles.viewAllRelationPill,
                            {
                              backgroundColor: colors.softPrimary,
                              borderColor: withOpacity(colors.primary, "28"),
                            },
                          ]}
                        >
                          <Ionicons
                            name={connection.icon}
                            size={12}
                            color={colors.primary}
                          />

                          <Text
                            style={[
                              styles.viewAllRelationText,
                              { color: colors.primary },
                            ]}
                            numberOfLines={1}
                          >
                            {connection.label}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={colors.muted}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
function FamilyTreeModal({
  visible,
  currentContact,
  grouped,
  colors,
  onClose,
  onOpenPerson,
}: {
  visible: boolean;
  currentContact: Contact;
  grouped: Record<ContactRelationshipGroup, LifeConnection[]>;
  colors: LifeCircleColors;
  onClose: () => void;
  onOpenPerson: (person: Contact) => void;
}) {
  const parents = grouped.parents.slice(0, 2);
  const partner = grouped.partner[0] ?? null;
  const siblings = grouped.siblings.slice(0, 3);
  const children = grouped.children.slice(0, 4);

  const hasTree =
    parents.length > 0 || partner || siblings.length > 0 || children.length > 0;

  const firstName = currentContact.first_name || "Contact";

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.treeRoot, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={[colors.primary, colors.button] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.treeHeaderGradient}
        >
          <View style={styles.treeHeaderGlowOne} />
          <View style={styles.treeHeaderGlowTwo} />

          <View style={styles.treeHeaderTopRow}>
            <TouchableOpacity
              style={styles.treeHeaderButton}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-down" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.treeHeaderPill}>
              <Ionicons name="git-network-outline" size={14} color="#FFFFFF" />

              <Text style={styles.treeHeaderPillText}>Family tree</Text>
            </View>
          </View>

          <View style={styles.treeHeaderMainRow}>
            <View style={styles.treeHeaderIcon}>
              <Ionicons name="git-network-outline" size={23} color="#FFFFFF" />
            </View>

            <View style={styles.treeHeaderTextWrap}>
              <Text style={styles.treeHeaderEyebrow}>VISUAL MAP</Text>

              <Text style={styles.treeHeaderTitle} numberOfLines={1}>
                {firstName}’s family tree
              </Text>

              <Text style={styles.treeHeaderSubtitle} numberOfLines={2}>
                Parents, partner, siblings, and children from saved connections.
              </Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.treeContent}
        >
          {!hasTree ? (
            <View
              style={[
                styles.treeEmptyCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  shadowColor: colors.shadow,
                },
              ]}
            >
              <View
                style={[
                  styles.treeEmptyIcon,
                  { backgroundColor: colors.softPrimary },
                ]}
              >
                <Ionicons
                  name="git-network-outline"
                  size={28}
                  color={colors.primary}
                />
              </View>

              <Text style={[styles.treeEmptyTitle, { color: colors.title }]}>
                No family tree yet
              </Text>

              <Text style={[styles.treeEmptyText, { color: colors.text }]}>
                Add parents, partner, siblings, or children in Life circle first.
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.treeCanvas,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  shadowColor: colors.shadow,
                },
              ]}
            >
              {parents.length > 0 ? (
                <View style={styles.treeLevel}>
                  <TreeLevelLabel label="Parents" colors={colors} />

                  <View style={styles.treePeopleRow}>
                    {parents.map((connection) => (
                      <TreePersonNode
                        key={String(connection.relationship.id)}
                        connection={connection}
                        colors={colors}
                        onPress={() => onOpenPerson(connection.person)}
                      />
                    ))}
                  </View>

                  <TreeConnector colors={colors} />
                </View>
              ) : null}

              <View style={styles.treeMiddleRow}>
                {partner ? (
                  <>
                    <TreePersonNode
                      connection={partner}
                      colors={colors}
                      compact
                      onPress={() => onOpenPerson(partner.person)}
                    />

                    <View
                      style={[
                        styles.treeHorizontalLine,
                        { backgroundColor: colors.border },
                      ]}
                    />
                  </>
                ) : null}

                <CurrentPersonNode contact={currentContact} colors={colors} />

                {siblings.length > 0 ? (
                  <>
                    <View
                      style={[
                        styles.treeHorizontalLine,
                        { backgroundColor: colors.border },
                      ]}
                    />

                    <View style={styles.siblingStack}>
                      {siblings.map((connection) => (
                        <TouchableOpacity
                          key={String(connection.relationship.id)}
                          style={[
                            styles.siblingMiniNode,
                            {
                              backgroundColor: colors.softCard,
                              borderColor: colors.border,
                            },
                          ]}
                          onPress={() => onOpenPerson(connection.person)}
                          activeOpacity={0.86}
                        >
                          <Avatar
                            contact={connection.person}
                            colors={colors}
                            size={28}
                          />

                          <View style={styles.siblingTextWrap}>
                            <Text
                              style={[
                                styles.siblingName,
                                { color: colors.title },
                              ]}
                              numberOfLines={1}
                            >
                              {getContactFirstName(connection.person)}
                            </Text>

                            <Text
                              style={[
                                styles.siblingRelation,
                                { color: colors.primary },
                              ]}
                              numberOfLines={1}
                            >
                              {connection.label}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : null}
              </View>

              {children.length > 0 ? (
                <View style={styles.treeLevel}>
                  <TreeConnector colors={colors} />

                  <TreeLevelLabel label="Children" colors={colors} />

                  <View style={styles.treePeopleRow}>
                    {children.map((connection) => (
                      <TreePersonNode
                        key={String(connection.relationship.id)}
                        connection={connection}
                        colors={colors}
                        onPress={() => onOpenPerson(connection.person)}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          )}

          <View
            style={[
              styles.treeInfoCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <View
              style={[
                styles.treeInfoIcon,
                { backgroundColor: colors.softPrimary },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={colors.primary}
              />
            </View>

            <View style={styles.treeInfoTextWrap}>
              <Text style={[styles.treeInfoTitle, { color: colors.title }]}>
                Simple family tree
              </Text>

              <Text style={[styles.treeInfoText, { color: colors.text }]}>
                This shows one level around this contact. Later, you can expand it into a full multi-generation tree.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function TreeLevelLabel({
  label,
  colors,
}: {
  label: string;
  colors: LifeCircleColors;
}) {
  return (
    <View
      style={[
        styles.treeLevelLabel,
        {
          backgroundColor: colors.softPrimary,
          borderColor: withOpacity(colors.primary, "30"),
        },
      ]}
    >
      <Text style={[styles.treeLevelLabelText, { color: colors.primary }]}>
        {label}
      </Text>
    </View>
  );
}

function TreeConnector({ colors }: { colors: LifeCircleColors }) {
  return (
    <View style={styles.treeConnectorWrap}>
      <View
        style={[styles.treeVerticalLine, { backgroundColor: colors.border }]}
      />
    </View>
  );
}

function CurrentPersonNode({
  contact,
  colors,
}: {
  contact: Contact;
  colors: LifeCircleColors;
}) {
  return (
    <View
      style={[
        styles.currentNode,
        {
          backgroundColor: colors.primary,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <Avatar contact={contact} colors={colors} size={58} />

      <Text
        style={[styles.currentNodeName, { color: colors.buttonText }]}
        numberOfLines={1}
      >
        {getContactFirstName(contact)}
      </Text>

      <Text
        style={[styles.currentNodeSub, { color: withOpacity(colors.buttonText, "CC") }]}
        numberOfLines={1}
      >
        Current contact
      </Text>
    </View>
  );
}

function TreePersonNode({
  connection,
  colors,
  compact,
  onPress,
}: {
  connection: LifeConnection;
  colors: LifeCircleColors;
  compact?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.treeNode,
        compact && styles.treeNodeCompact,
        {
          backgroundColor: colors.softCard,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <Avatar contact={connection.person} colors={colors} size={compact ? 38 : 44} />

      <Text
        style={[styles.treeNodeName, { color: colors.title }]}
        numberOfLines={1}
      >
        {getContactFirstName(connection.person)}
      </Text>

      <Text
        style={[styles.treeNodeRelation, { color: colors.primary }]}
        numberOfLines={1}
      >
        {connection.label}
      </Text>
    </TouchableOpacity>
  );
}
function Avatar({
  contact,
  colors,
  size,
}: {
  contact: Contact;
  colors: LifeCircleColors;
  size: number;
}) {
  if (contact.photo) {
    return (
      <Image
        source={{ uri: contact.photo }}
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.38),
        }}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.38),
          backgroundColor: colors.softPrimary,
        },
      ]}
    >
      <Text style={[styles.avatarText, { color: colors.primary }]}>
        {getInitials(contact)}
      </Text>
    </View>
  );
}

/* helpers */

function makeLifeCircleColors(settings: any): LifeCircleColors {
  return {
    background: settings.backgroundColor,
    card: settings.cardColor,
    title: settings.titleColor,
    text: settings.textColor,
    primary: settings.primaryColor,
    button: settings.buttonColor || settings.primaryColor,
    buttonText: settings.buttonTextColor,
    border: withOpacity(settings.textColor, "16"),
    muted: withOpacity(settings.textColor, "88"),
    softCard: withOpacity(settings.textColor, "08"),
    softPrimary: withOpacity(settings.primaryColor, "16"),
    danger: "#EE6A5E",
    warning: "#EBA55B",
    success: "#7DA56D",
    shadow: settings.themeMode === "dark" ? "#000000" : "#6F3D2E",
  };
}

function normalizeContactsResponse(data: any): Contact[] {
  if (Array.isArray(data)) return data;

  return data?.results ?? [];
}

function getContactName(contact: Contact) {
  return `${contact.first_name || ""} ${contact.last_name || ""}`.trim() || "Unnamed";
}

function getContactFirstName(contact: Contact) {
  return contact.first_name || getContactName(contact);
}

function getInitials(contact: Contact) {
  const first = contact.first_name?.[0] ?? "";
  const last = contact.last_name?.[0] ?? "";

  return `${first}${last}`.toUpperCase() || "?";
}

function withOpacity(hexColor?: string | null, opacityHex = "22") {
  if (!hexColor || typeof hexColor !== "string") return `#000000${opacityHex}`;

  const normalized = hexColor.trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
    return `${normalized}${opacityHex}`;
  }

  return normalized;
}

/* styles */

const styles = StyleSheet.create({
    viewAllHeaderGradient: {
  minHeight: 164,
  borderBottomLeftRadius: 28,
  borderBottomRightRadius: 28,
  paddingHorizontal: 16,
  paddingTop: 14,
  paddingBottom: 14,
  overflow: "hidden",
},
viewAllHeroRow: {
  marginTop: 14,
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
},

viewAllHeroIcon: {
  width: 50,
  height: 50,
  borderRadius: 21,
  backgroundColor: "rgba(255,255,255,0.16)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.14)",
  alignItems: "center",
  justifyContent: "center",
},

viewAllTitle: {
  color: "#FFFFFF",
  fontSize: 24,
  lineHeight: 29,
  fontWeight: "900",
  marginTop: 2,
},

viewAllStatsRow: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 12,
},

viewAllGlowOne: {
  position: "absolute",
  top: -70,
  right: -45,
  width: 160,
  height: 160,
  borderRadius: 90,
  backgroundColor: "rgba(255,255,255,0.16)",
},

viewAllGlowTwo: {
  position: "absolute",
  bottom: -80,
  left: -55,
  width: 165,
  height: 165,
  borderRadius: 90,
  backgroundColor: "rgba(255,255,255,0.10)",
},

viewAllTopRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

viewAllCloseButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: "rgba(255,255,255,0.14)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.14)",
  alignItems: "center",
  justifyContent: "center",
},

viewAllAddButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: "rgba(255,255,255,0.14)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.14)",
  alignItems: "center",
  justifyContent: "center",
},

viewAllPill: {
  minHeight: 36,
  borderRadius: 999,
  backgroundColor: "rgba(255,255,255,0.14)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.14)",
  paddingHorizontal: 12,
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
},

viewAllPillText: {
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: "900",
},





viewAllHeroText: {
  flex: 1,
  minWidth: 0,
},

viewAllEyebrow: {
  color: "rgba(255,255,255,0.66)",
  fontSize: 11,
  fontWeight: "900",
  letterSpacing: 1,
},



viewAllSubtitle: {
  color: "rgba(255,255,255,0.78)",
  fontSize: 12,
  lineHeight: 17,
  fontWeight: "700",
  marginTop: 2,
},



viewAllStatPill: {
  minHeight: 32,
  borderRadius: 999,
  backgroundColor: "rgba(255,255,255,0.12)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.12)",
  paddingHorizontal: 11,
  justifyContent: "center",
},

viewAllStatText: {
  color: "#FFFFFF",
  fontSize: 11,
  fontWeight: "900",
},

viewAllGroupHeader: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
},

viewAllGroupCount: {
  minWidth: 28,
  height: 28,
  borderRadius: 14,
  borderWidth: 1,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 8,
},

viewAllGroupCountText: {
  fontSize: 11,
  fontWeight: "900",
},

viewAllRelationRow: {
  flexDirection: "row",
  marginTop: 6,
},

viewAllRelationPill: {
  maxWidth: "100%",
  minHeight: 26,
  borderRadius: 999,
  borderWidth: 1,
  paddingHorizontal: 8,
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
},

viewAllRelationText: {
  fontSize: 11,
  fontWeight: "900",
},
treeHeaderGradient: {
  minHeight: 154,
  borderBottomLeftRadius: 28,
  borderBottomRightRadius: 28,
  paddingHorizontal: 16,
  paddingTop: 14,
  paddingBottom: 14,
  overflow: "hidden",
},

treeHeaderGlowOne: {
  position: "absolute",
  top: -65,
  right: -45,
  width: 150,
  height: 150,
  borderRadius: 80,
  backgroundColor: "rgba(255,255,255,0.16)",
},

treeHeaderGlowTwo: {
  position: "absolute",
  bottom: -80,
  left: -55,
  width: 160,
  height: 160,
  borderRadius: 86,
  backgroundColor: "rgba(255,255,255,0.10)",
},

treeHeaderTopRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

treeHeaderButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: "rgba(255,255,255,0.14)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.14)",
  alignItems: "center",
  justifyContent: "center",
},

treeHeaderPill: {
  minHeight: 36,
  borderRadius: 999,
  backgroundColor: "rgba(255,255,255,0.14)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.14)",
  paddingHorizontal: 12,
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
},

treeHeaderPillText: {
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: "900",
},

treeHeaderMainRow: {
  marginTop: 14,
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
},

treeHeaderIcon: {
  width: 50,
  height: 50,
  borderRadius: 21,
  backgroundColor: "rgba(255,255,255,0.16)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.14)",
  alignItems: "center",
  justifyContent: "center",
},

treeHeaderTextWrap: {
  flex: 1,
  minWidth: 0,
},

treeHeaderEyebrow: {
  color: "rgba(255,255,255,0.66)",
  fontSize: 11,
  fontWeight: "900",
  letterSpacing: 1,
},

treeHeaderTitle: {
  color: "#FFFFFF",
  fontSize: 24,
  lineHeight: 29,
  fontWeight: "900",
  marginTop: 2,
},

treeHeaderSubtitle: {
  color: "rgba(255,255,255,0.78)",
  fontSize: 12,
  lineHeight: 17,
  fontWeight: "700",
  marginTop: 2,
},
  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 15,
    marginHorizontal: 14,
    marginTop: 12,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  headerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    fontSize: 17,
    fontWeight: "900",
  },

  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 2,
  },

  addButton: {
    width: 38,
    height: 38,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingBox: {
    minHeight: 92,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  loadingText: {
    fontSize: 12,
    fontWeight: "800",
  },

  emptyBox: {
    minHeight: 132,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    marginTop: 14,
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    opacity: 0.74,
    textAlign: "center",
    marginTop: 5,
  },

  previewRow: {
    gap: 9,
    paddingTop: 14,
    paddingBottom: 4,
  },

  previewCard: {
    width: 92,
    minHeight: 112,
    borderRadius: 22,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
  },

  previewName: {
    fontSize: 12,
    fontWeight: "900",
    marginTop: 8,
  },

  previewRelation: {
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2,
  },

  viewAllRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  viewAllText: {
    fontSize: 13,
    fontWeight: "900",
  },

  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 13,
    fontWeight: "900",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 14, 10, 0.52)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },

  modalCard: {
    width: "100%",
    maxHeight: "88%",
    borderRadius: 30,
    borderWidth: 1,
    padding: 16,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  modalEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  modalTitle: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "900",
    marginTop: 2,
  },

  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  modalHint: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    opacity: 0.76,
    marginBottom: 12,
  },

  searchBox: {
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "700",
  },

  modalScroll: {
    marginTop: 12,
  },

  modalScrollContent: {
    gap: 8,
    paddingBottom: 12,
  },

  personRow: {
    minHeight: 62,
    borderRadius: 20,
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  personRowText: {
    flex: 1,
    minWidth: 0,
  },

  personName: {
    fontSize: 14,
    fontWeight: "900",
  },

  personMeta: {
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 2,
  },

  optionTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 4,
  },

  optionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  optionChip: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  optionChipText: {
    fontSize: 12,
    fontWeight: "900",
  },

  previewBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
  },

  previewText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
  },

  previewSubText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    opacity: 0.75,
    marginTop: 5,
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 10,
  },

  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    fontSize: 14,
    fontWeight: "900",
  },

  saveButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  saveText: {
    fontSize: 14,
    fontWeight: "900",
  },

  fullModalRoot: {
    flex: 1,
  },

  fullModalHeader: {
    minHeight: 92,
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  fullCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  fullHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  fullTitle: {
    fontSize: 19,
    fontWeight: "900",
  },

  fullSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 2,
  },

  fullAddButton: {
    width: 40,
    height: 40,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  fullModalContent: {
    padding: 14,
    paddingBottom: 40,
    gap: 16,
  },

  groupBlock: {
    gap: 8,
  },

  groupTitle: {
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },

  fullPersonRow: {
    minHeight: 68,
    borderRadius: 22,
    borderWidth: 1,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  fullPersonText: {
    flex: 1,
    minWidth: 0,
  },

  fullPersonName: {
    fontSize: 15,
    fontWeight: "900",
  },

  fullPersonRelation: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 2,
  },
  familyTreeButton: {
  minHeight: 76,
  borderRadius: 24,
  borderWidth: 1,
  padding: 12,
  flexDirection: "row",
  alignItems: "center",
  gap: 11,
},

familyTreeButtonIcon: {
  width: 42,
  height: 42,
  borderRadius: 17,
  alignItems: "center",
  justifyContent: "center",
},

familyTreeButtonTextWrap: {
  flex: 1,
  minWidth: 0,
},

familyTreeButtonTitle: {
  fontSize: 15,
  fontWeight: "900",
},

familyTreeButtonSubtitle: {
  fontSize: 12,
  lineHeight: 17,
  fontWeight: "700",
  opacity: 0.74,
  marginTop: 2,
},

treeRoot: {
  flex: 1,
},

treeHeader: {
  minHeight: 92,
  borderBottomWidth: 1,
  paddingHorizontal: 14,
  paddingTop: 18,
  paddingBottom: 12,
  flexDirection: "row",
  alignItems: "center",
  gap: 11,
},

treeContent: {
  padding: 14,
  paddingBottom: 42,
  gap: 12,
},

treeCanvas: {
  borderRadius: 30,
  borderWidth: 1,
  padding: 16,
  alignItems: "center",
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
},

treeLevel: {
  alignItems: "center",
  width: "100%",
},

treeLevelLabel: {
  minHeight: 28,
  borderRadius: 999,
  borderWidth: 1,
  paddingHorizontal: 10,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 10,
},

treeLevelLabelText: {
  fontSize: 11,
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: 0.6,
},

treePeopleRow: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: 10,
},

treeConnectorWrap: {
  height: 28,
  alignItems: "center",
  justifyContent: "center",
},

treeVerticalLine: {
  width: 2,
  height: 28,
  borderRadius: 999,
},

treeMiddleRow: {
  minHeight: 130,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
},

treeHorizontalLine: {
  width: 20,
  height: 2,
  borderRadius: 999,
},

currentNode: {
  width: 116,
  minHeight: 122,
  borderRadius: 30,
  padding: 12,
  alignItems: "center",
  justifyContent: "center",
  shadowOpacity: 0.12,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },
  elevation: 5,
},

currentNodeName: {
  fontSize: 14,
  fontWeight: "900",
  marginTop: 7,
},

currentNodeSub: {
  fontSize: 10,
  fontWeight: "800",
  marginTop: 2,
},

treeNode: {
  width: 96,
  minHeight: 108,
  borderRadius: 24,
  borderWidth: 1,
  padding: 10,
  alignItems: "center",
},

treeNodeCompact: {
  width: 88,
  minHeight: 98,
},

treeNodeName: {
  fontSize: 12,
  fontWeight: "900",
  marginTop: 7,
},

treeNodeRelation: {
  fontSize: 11,
  fontWeight: "900",
  marginTop: 2,
},

siblingStack: {
  gap: 7,
  maxWidth: 118,
},

siblingMiniNode: {
  minHeight: 46,
  borderRadius: 18,
  borderWidth: 1,
  padding: 7,
  flexDirection: "row",
  alignItems: "center",
  gap: 7,
},

siblingTextWrap: {
  flex: 1,
  minWidth: 0,
},

siblingName: {
  fontSize: 11,
  fontWeight: "900",
},

siblingRelation: {
  fontSize: 10,
  fontWeight: "900",
  marginTop: 1,
},

treeEmptyCard: {
  borderRadius: 28,
  borderWidth: 1,
  padding: 24,
  alignItems: "center",
},

treeEmptyIcon: {
  width: 64,
  height: 64,
  borderRadius: 24,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 14,
},

treeEmptyTitle: {
  fontSize: 18,
  fontWeight: "900",
},

treeEmptyText: {
  fontSize: 13,
  lineHeight: 19,
  fontWeight: "700",
  opacity: 0.74,
  textAlign: "center",
  marginTop: 6,
},

treeInfoCard: {
  minHeight: 78,
  borderRadius: 24,
  borderWidth: 1,
  padding: 13,
  flexDirection: "row",
  alignItems: "center",
  gap: 11,
},

treeInfoIcon: {
  width: 42,
  height: 42,
  borderRadius: 17,
  alignItems: "center",
  justifyContent: "center",
},

treeInfoTextWrap: {
  flex: 1,
  minWidth: 0,
},

treeInfoTitle: {
  fontSize: 14,
  fontWeight: "900",
},

treeInfoText: {
  fontSize: 12,
  lineHeight: 17,
  fontWeight: "700",
  opacity: 0.74,
  marginTop: 2,
},
});