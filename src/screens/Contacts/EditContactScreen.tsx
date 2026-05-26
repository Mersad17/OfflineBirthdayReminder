// src/screens/contacts/EditContactScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ContactsStackParamList } from "../../navigation/ContactsStack";
import {
  AppId,
  Contact,
  ContactGroup,
  ContactTag,
} from "../../contacts/types";
import {
  createContactGroup,
  createContactTag,
  fetchContactById,
  fetchContactGroups,
  fetchContactTags,
  updateContact,
} from "../../contacts/repository";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { formatDateEU } from "../../lib/date";
import {
  DEFAULT_GROUP_COLOR,
  DEFAULT_GROUP_ICON,
  DEFAULT_TAG_COLOR,
  GROUP_ICONS,
  LABEL_COLORS,
} from "../../lib/groupTagOptions";

type Props = NativeStackScreenProps<ContactsStackParamList, "EditContact">;

type EditContactColors = {
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
  shadow: string;
};

export default function EditContactScreen({ route, navigation }: Props) {
  const { contactId } = route.params;
  const { settings } = useAppearance();
  const colors = useMemo(() => makeEditContactColors(settings), [settings]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [contact, setContact] = useState<Contact | null>(null);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [tags, setTags] = useState<ContactTag[]>([]);

  const [selectedGroupId, setSelectedGroupId] = useState<AppId | null>(null);

  const [groupSearch, setGroupSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [tagColorsByName, setTagColorsByName] = useState<Record<string, string>>(
    {}
  );

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState(DEFAULT_GROUP_COLOR);
  const [newGroupIcon, setNewGroupIcon] =
    useState<(typeof GROUP_ICONS)[number]>(DEFAULT_GROUP_ICON);

  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLOR);

  const [creatingGroup, setCreatingGroup] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [birthdayDateObj, setBirthdayDateObj] = useState(new Date(1990, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [shortDescription, setShortDescription] = useState("");

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [originalPhotoUri, setOriginalPhotoUri] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadContact() {
      try {
        const [contactData, groupData, tagData] = await Promise.all([
          fetchContactById(contactId),
          fetchContactGroups(),
          fetchContactTags(),
        ]);

        if (!mounted) return;

        setContact(contactData);
        setGroups(groupData);
        setTags(tagData);

        setFirstName(contactData.first_name || "");
        setLastName(contactData.last_name || "");
        setBirthday(contactData.birthday || "");

        if (contactData.birthday) {
          const parsedDate = new Date(contactData.birthday);

          if (!Number.isNaN(parsedDate.getTime())) {
            setBirthdayDateObj(parsedDate);
          }
        }

        setEmail(contactData.email || "");
        setPhone(contactData.phone || "");
        setShortDescription(contactData.short_description || "");

        setSelectedGroupId(contactData.group || null);

        const contactTags = contactData.tags_detail || [];
        setTagNames(contactTags.map((tag) => tag.name));

        const allKnownTags = [...tagData, ...contactTags];

        setTagColorsByName(
          allKnownTags.reduce((acc: Record<string, string>, tag: any) => {
            acc[tag.name.toLowerCase()] = tag.color || settings.primaryColor;
            return acc;
          }, {})
        );

        setPhotoUri(contactData.photo || null);
        setOriginalPhotoUri(contactData.photo || null);
      } catch (error: any) {
        console.log("LOAD CONTACT ERROR:", error?.response?.data || error);

        Alert.alert(
          "Error",
          JSON.stringify(error?.response?.data || "Could not load contact")
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadContact();

    return () => {
      mounted = false;
    };
  }, [contactId, settings.primaryColor]);

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null;

    return groups.find((group) => group.id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  const filteredGroups = useMemo(() => {
    const query = groupSearch.trim().toLowerCase();

    if (!query) return [];

    return groups.filter((group) => group.name.toLowerCase().includes(query));
  }, [groups, groupSearch]);

  const exactGroupExists = useMemo(() => {
    const query = groupSearch.trim().toLowerCase();

    if (!query) return true;

    return groups.some((group) => group.name.toLowerCase() === query);
  }, [groups, groupSearch]);

  const filteredTagSuggestions = useMemo(() => {
    const query = tagSearch.trim().toLowerCase();

    if (!query) return [];

    return tags
      .filter((tag) => tag.name.toLowerCase().includes(query))
      .filter(
        (tag) =>
          !tagNames.some(
            (selected) => selected.toLowerCase() === tag.name.toLowerCase()
          )
      )
      .slice(0, 8);
  }, [tags, tagSearch, tagNames]);

  const exactTagExists = useMemo(() => {
    const query = tagSearch.trim().toLowerCase();

    if (!query) return true;

    return tags.some((tag) => tag.name.toLowerCase() === query);
  }, [tags, tagSearch]);

  const displayName = `${firstName || contact?.first_name || ""} ${
    lastName || contact?.last_name || ""
  }`.trim();

  const initials = getInitials(firstName || contact?.first_name, lastName || contact?.last_name);

  function formatDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function onDateChange(_: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (!selectedDate) return;

    setBirthdayDateObj(selectedDate);
    setBirthday(formatDate(selectedDate));
  }

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow photo access to pick a picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  function removePhoto() {
    setPhotoUri(null);
  }

  function openCreateGroupModalFromSearch() {
    const cleanName = groupSearch.trim();

    if (cleanName) {
      setNewGroupName(cleanName);
    }

    setShowGroupModal(true);
  }

  function openCreateTagModalFromSearch() {
    const cleanName = tagSearch.trim();

    if (cleanName) {
      setNewTagName(cleanName);
    }

    setShowTagModal(true);
  }

  function addExistingTag(tag: ContactTag) {
    const alreadySelected = tagNames.some(
      (name) => name.toLowerCase() === tag.name.toLowerCase()
    );

    if (alreadySelected) {
      setTagSearch("");
      return;
    }

    setTagNames((prev) => [...prev, tag.name]);

    setTagColorsByName((prev) => ({
      ...prev,
      [tag.name.toLowerCase()]: tag.color || colors.primary,
    }));

    setTagSearch("");
  }

  function removeTag(tagToRemove: string) {
    setTagNames((prev) => prev.filter((tag) => tag !== tagToRemove));
  }

  async function handleCreateGroup() {
    const cleanName = newGroupName.trim();

    if (!cleanName) {
      Alert.alert("Name required", "Please enter a group name.");
      return;
    }

    setCreatingGroup(true);

    try {
      const group = await createContactGroup({
        name: cleanName,
        color: newGroupColor,
        icon: newGroupIcon,
      });

      const groupWithStyle = {
        ...group,
        color: group.color || newGroupColor,
        icon: group.icon || newGroupIcon,
      };

      setGroups((prev) => [...prev, groupWithStyle]);
      setSelectedGroupId(groupWithStyle.id);
      setGroupSearch("");

      setNewGroupName("");
      setNewGroupColor(DEFAULT_GROUP_COLOR);
      setNewGroupIcon(DEFAULT_GROUP_ICON);
      setShowGroupModal(false);
    } catch (error: any) {
      Alert.alert(
        "Create group",
        JSON.stringify(error?.response?.data || "Could not create group")
      );
    } finally {
      setCreatingGroup(false);
    }
  }

  async function handleCreateTag() {
    const cleanName = newTagName.trim();

    if (!cleanName) {
      Alert.alert("Name required", "Please enter a tag name.");
      return;
    }

    const alreadySelected = tagNames.some(
      (tag) => tag.toLowerCase() === cleanName.toLowerCase()
    );

    setCreatingTag(true);

    try {
      const createdTag = await createContactTag({
        name: cleanName,
        color: newTagColor,
      });

      const finalTagName = createdTag.name || cleanName;
      const finalTagColor = createdTag.color || newTagColor;

      const tagWithStyle = {
        ...createdTag,
        name: finalTagName,
        color: finalTagColor,
      };

      setTags((prev) => {
        const exists = prev.some(
          (tag) => tag.name.toLowerCase() === finalTagName.toLowerCase()
        );

        if (exists) return prev;

        return [tagWithStyle, ...prev];
      });

      setTagColorsByName((prev) => ({
        ...prev,
        [finalTagName.toLowerCase()]: finalTagColor,
      }));

      if (!alreadySelected) {
        setTagNames((prev) => [...prev, finalTagName]);
      }

      setNewTagName("");
      setNewTagColor(DEFAULT_TAG_COLOR);
      setTagSearch("");
      setShowTagModal(false);
    } catch (error: any) {
      Alert.alert(
        "Create tag",
        JSON.stringify(error?.response?.data || "Could not create tag")
      );
    } finally {
      setCreatingTag(false);
    }
  }

  async function onSave() {
    setError(null);

    if (birthday && !birthday.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setError("Birthday date must be in YYYY-MM-DD format.");
      return;
    }

    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }

    setSaving(true);

    try {
      await updateContact(contactId, {
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        birthday: birthday ? birthday : null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        short_description: shortDescription.trim() || null,
        group: selectedGroupId,
        tag_names: tagNames,
        photo_uri:
          photoUri === originalPhotoUri
            ? undefined
            : photoUri === null
            ? null
            : photoUri,
      });

      navigation.goBack();
    } catch (error: any) {
      console.log("UPDATE CONTACT ERROR:", error?.response?.data || error);
      Alert.alert("Error", "Could not update contact.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !contact) {
    return (
      <Screen>
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} />

          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading contact…
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.keyboardRoot, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <Screen scroll>
        <View style={[styles.root, { backgroundColor: colors.background }]}>
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <CompactEditHeader
              colors={colors}
              displayName={displayName || "Edit contact"}
              photoUri={photoUri}
              initials={initials}
              onPickPhoto={pickPhoto}
              onRemovePhoto={removePhoto}
            />

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
              <SectionTitle
                icon="person-outline"
                title="Basic info"
                colors={colors}
              />

              <FieldGroup label="First name" required colors={colors}>
                <ThemedInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Contact name"
                  autoCapitalize="words"
                  colors={colors}
                />
              </FieldGroup>

              <FieldGroup label="Last name" colors={colors}>
                <ThemedInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Enter contact last name"
                  autoCapitalize="words"
                  colors={colors}
                />
              </FieldGroup>

              <FieldGroup
                label="Short description"
                hint="Optional"
                colors={colors}
              >
                <ThemedInput
                  value={shortDescription}
                  onChangeText={setShortDescription}
                  placeholder="Anything important to remember..."
                  autoCapitalize="sentences"
                  multiline
                  textAlignVertical="top"
                  style={styles.notesInput}
                  colors={colors}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollRef.current?.scrollToEnd({ animated: true });
                    }, 150);
                  }}
                />
              </FieldGroup>

              <Divider colors={colors} />

              <SectionTitle
                icon="people-outline"
                title="Relationship"
                colors={colors}
              />

              <FieldGroup label="Group" colors={colors}>
                <ThemedInput
                  value={groupSearch}
                  onChangeText={setGroupSearch}
                  placeholder="Search group..."
                  autoCapitalize="words"
                  colors={colors}
                />

                <View style={styles.tagWrap}>
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          selectedGroupId === null
                            ? colors.primary
                            : colors.softCard,
                        borderColor:
                          selectedGroupId === null
                            ? colors.primary
                            : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedGroupId(null)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            selectedGroupId === null
                              ? colors.buttonText
                              : colors.text,
                        },
                      ]}
                    >
                      None
                    </Text>
                  </TouchableOpacity>

                  {selectedGroup ? (
                    <TouchableOpacity
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            selectedGroup.color || colors.primary,
                          borderColor: selectedGroup.color || colors.primary,
                        },
                      ]}
                      onPress={() => setSelectedGroupId(null)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.chipInner}>
                        <Ionicons
                          name={(selectedGroup.icon || "people") as any}
                          size={14}
                          color="#FFFFFF"
                        />

                        <Text style={[styles.chipText, { color: "#FFFFFF" }]}>
                          {selectedGroup.name} ×
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {groupSearch.trim() ? (
                  <View style={styles.suggestionBox}>
                    {filteredGroups.map((group) => {
                      const active = selectedGroupId === group.id;
                      const groupColor = group.color || colors.primary;
                      const groupIcon = group.icon || "people";

                      return (
                        <TouchableOpacity
                          key={String(group.id)}
                          style={[
                            styles.suggestionChip,
                            {
                              backgroundColor: active
                                ? groupColor
                                : withOpacity(groupColor, "18"),
                              borderColor: withOpacity(groupColor, "35"),
                            },
                          ]}
                          onPress={() => {
                            setSelectedGroupId(group.id);
                            setGroupSearch("");
                          }}
                          activeOpacity={0.85}
                        >
                          <View style={styles.chipInner}>
                            <Ionicons
                              name={groupIcon as any}
                              size={14}
                              color={active ? "#FFFFFF" : groupColor}
                            />

                            <Text
                              style={[
                                styles.suggestionChipText,
                                {
                                  color: active ? "#FFFFFF" : groupColor,
                                },
                              ]}
                            >
                              {group.name}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}

                    {!exactGroupExists ? (
                      <TouchableOpacity
                        style={[
                          styles.suggestionChip,
                          {
                            backgroundColor: colors.softPrimary,
                            borderColor: withOpacity(colors.primary, "35"),
                          },
                        ]}
                        onPress={openCreateGroupModalFromSearch}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.suggestionChipText,
                            { color: colors.primary },
                          ]}
                        >
                          + Create “{groupSearch.trim()}”
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
              </FieldGroup>

              <FieldGroup label="Tags" colors={colors}>
                <ThemedInput
                  value={tagSearch}
                  onChangeText={setTagSearch}
                  placeholder="Search tag..."
                  autoCapitalize="none"
                  colors={colors}
                />

                {tagSearch.trim() ? (
                  <View style={styles.suggestionBox}>
                    {filteredTagSuggestions.map((tag) => {
                      const tagColor = tag.color || colors.primary;

                      return (
                        <TouchableOpacity
                          key={String(tag.id)}
                          style={[
                            styles.suggestionChip,
                            {
                              backgroundColor: withOpacity(tagColor, "18"),
                              borderColor: withOpacity(tagColor, "35"),
                            },
                          ]}
                          onPress={() => addExistingTag(tag)}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={[
                              styles.suggestionChipText,
                              { color: tagColor },
                            ]}
                          >
                            #{tag.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}

                    {!exactTagExists ? (
                      <TouchableOpacity
                        style={[
                          styles.suggestionChip,
                          {
                            backgroundColor: colors.softPrimary,
                            borderColor: withOpacity(colors.primary, "35"),
                          },
                        ]}
                        onPress={openCreateTagModalFromSearch}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.suggestionChipText,
                            { color: colors.primary },
                          ]}
                        >
                          + Create “{tagSearch.trim()}”
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.tagWrap}>
                  {tagNames.length > 0 ? (
                    tagNames.map((tag) => {
                      const tagColor =
                        tagColorsByName[tag.toLowerCase()] || colors.primary;

                      return (
                        <TouchableOpacity
                          key={tag}
                          style={[
                            styles.tagChip,
                            {
                              backgroundColor: withOpacity(tagColor, "18"),
                              borderColor: withOpacity(tagColor, "35"),
                            },
                          ]}
                          onPress={() => removeTag(tag)}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={[
                              styles.tagChipText,
                              { color: tagColor },
                            ]}
                          >
                            #{tag} ×
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <Text
                      style={[
                        styles.emptyTagsText,
                        { color: colors.text },
                      ]}
                    >
                      No tags selected.
                    </Text>
                  )}
                </View>
              </FieldGroup>

              <Divider colors={colors} />

              <SectionTitle
                icon="calendar-outline"
                title="Details"
                colors={colors}
              />

              <FieldGroup
                label="Birthday"
                hint="Tap to pick a date"
                colors={colors}
              >
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setShowDatePicker(true)}
                  style={[
                    styles.input,
                    styles.dateInput,
                    {
                      backgroundColor: colors.softCard,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dateText,
                      { color: birthday ? colors.title : colors.muted },
                    ]}
                    numberOfLines={1}
                  >
                    {formatDateEU(birthday) || "Pick a date"}
                  </Text>

                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={colors.primary}
                  />
                </TouchableOpacity>

                {showDatePicker ? (
                  <DateTimePicker
                    mode="date"
                    value={birthdayDateObj}
                    onChange={onDateChange}
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    maximumDate={new Date()}
                  />
                ) : null}
              </FieldGroup>

              <FieldGroup label="Email" hint="Optional" colors={colors}>
                <ThemedInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  colors={colors}
                />
              </FieldGroup>

              <FieldGroup label="Phone" hint="Optional" colors={colors}>
                <ThemedInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+33 6 12 34 56 78"
                  keyboardType="phone-pad"
                  colors={colors}
                />
              </FieldGroup>

              {error ? (
                <View
                  style={[
                    styles.errorBox,
                    {
                      backgroundColor: withOpacity(colors.danger, "12"),
                      borderColor: withOpacity(colors.danger, "35"),
                    },
                  ]}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={17}
                    color={colors.danger}
                  />

                  <Text style={[styles.errorText, { color: colors.danger }]}>
                    {error}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => navigation.goBack()}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    { color: colors.text },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.button },
                  saving && styles.primaryButtonDisabled,
                ]}
                onPress={onSave}
                disabled={saving}
                activeOpacity={0.88}
              >
                {saving ? (
                  <ActivityIndicator color={colors.buttonText} />
                ) : (
                  <Text
                    style={[
                      styles.primaryButtonText,
                      { color: colors.buttonText },
                    ]}
                  >
                    Save changes
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          <CreateGroupModal
            visible={showGroupModal}
            name={newGroupName}
            color={newGroupColor}
            icon={newGroupIcon}
            creating={creatingGroup}
            colors={colors}
            onChangeName={setNewGroupName}
            onChangeColor={setNewGroupColor}
            onChangeIcon={setNewGroupIcon}
            onCancel={() => setShowGroupModal(false)}
            onSave={handleCreateGroup}
          />

          <CreateTagModal
            visible={showTagModal}
            name={newTagName}
            color={newTagColor}
            creating={creatingTag}
            colors={colors}
            onChangeName={setNewTagName}
            onChangeColor={setNewTagColor}
            onCancel={() => setShowTagModal(false)}
            onSave={handleCreateTag}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function CompactEditHeader({
  colors,
  displayName,
  photoUri,
  initials,
  onPickPhoto,
  onRemovePhoto,
}: {
  colors: EditContactColors;
  displayName: string;
  photoUri: string | null;
  initials: string;
  onPickPhoto: () => void;
  onRemovePhoto: () => void;
}) {
  return (
    <LinearGradient
      colors={[colors.primary, colors.button] as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.compactHeader}
    >
      <View style={styles.headerGlowOne} />
      <View style={styles.headerGlowTwo} />

      <View style={styles.headerRow}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.headerAvatarImage} />
        ) : (
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{initials || "?"}</Text>
          </View>
        )}

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>EDIT PROFILE</Text>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {displayName || "Edit contact"}
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Update what you want to remember.
          </Text>
        </View>
      </View>

      <View style={styles.photoActionsRow}>
        <TouchableOpacity
          style={styles.headerPhotoButton}
          onPress={onPickPhoto}
          activeOpacity={0.85}
        >
          <Ionicons name="camera-outline" size={15} color="#FFFFFF" />

          <Text style={styles.headerPhotoButtonText}>
            {photoUri ? "Change photo" : "Add photo"}
          </Text>
        </TouchableOpacity>

        {photoUri ? (
          <TouchableOpacity
            style={styles.headerRemoveButton}
            onPress={onRemovePhoto}
            activeOpacity={0.85}
          >
            <Ionicons name="trash-outline" size={15} color="#FFFFFF" />

            <Text style={styles.headerPhotoButtonText}>Remove</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </LinearGradient>
  );
}

function SectionTitle({
  icon,
  title,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  colors: EditContactColors;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <View
        style={[
          styles.sectionIconBubble,
          { backgroundColor: colors.softPrimary },
        ]}
      >
        <Ionicons name={icon} size={15} color={colors.primary} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.title }]}>
        {title}
      </Text>
    </View>
  );
}

function FieldGroup({
  label,
  hint,
  required,
  colors,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  colors: EditContactColors;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.title }]}>
          {label}
        </Text>

        {required ? (
          <Text style={[styles.requiredTag, { color: colors.primary }]}>
            Required
          </Text>
        ) : hint ? (
          <Text style={[styles.optionalTag, { color: colors.muted }]}>
            {hint}
          </Text>
        ) : null}
      </View>

      {children}
    </View>
  );
}

function ThemedInput({
  colors,
  style,
  ...props
}: TextInputProps & {
  colors: EditContactColors;
}) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={colors.muted}
      style={[
        styles.input,
        {
          backgroundColor: colors.softCard,
          borderColor: colors.border,
          color: colors.title,
        },
        style,
      ]}
    />
  );
}

function Divider({ colors }: { colors: EditContactColors }) {
  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: colors.border },
      ]}
    />
  );
}

function CreateGroupModal({
  visible,
  name,
  color,
  icon,
  creating,
  colors,
  onChangeName,
  onChangeColor,
  onChangeIcon,
  onCancel,
  onSave,
}: {
  visible: boolean;
  name: string;
  color: string;
  icon: (typeof GROUP_ICONS)[number];
  creating: boolean;
  colors: EditContactColors;
  onChangeName: (value: string) => void;
  onChangeColor: (value: string) => void;
  onChangeIcon: (value: (typeof GROUP_ICONS)[number]) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
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
          <Text style={[styles.modalEyebrow, { color: colors.primary }]}>
            GROUP
          </Text>

          <Text style={[styles.modalTitle, { color: colors.title }]}>
            Create group
          </Text>

          <Text style={[styles.modalSubtitle, { color: colors.text }]}>
            Groups help you organize people like friends, family, gym, work, or dating.
          </Text>

          <ThemedInput
            value={name}
            onChangeText={onChangeName}
            placeholder="Group name, e.g. Gym"
            autoCapitalize="words"
            colors={colors}
          />

          <Text style={[styles.modalLabel, { color: colors.title }]}>
            Icon
          </Text>

          <View style={styles.optionWrap}>
            {GROUP_ICONS.map((item) => {
              const active = icon === item;

              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.iconOption,
                    {
                      backgroundColor: active
                        ? color
                        : withOpacity(color, "18"),
                      borderColor: active ? color : withOpacity(color, "30"),
                    },
                  ]}
                  onPress={() => onChangeIcon(item)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={item as any}
                    size={20}
                    color={active ? "#FFFFFF" : color}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.modalLabel, { color: colors.title }]}>
            Color
          </Text>

          <View style={styles.optionWrap}>
            {LABEL_COLORS.map((item) => {
              const active = color === item;

              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.colorOption,
                    {
                      backgroundColor: item,
                      borderColor: active ? colors.title : "transparent",
                    },
                  ]}
                  onPress={() => onChangeColor(item)}
                  activeOpacity={0.85}
                >
                  {active ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <ModalActions
            creating={creating}
            colors={colors}
            saveColor={color}
            saveLabel="Create"
            creatingLabel="Creating..."
            onCancel={onCancel}
            onSave={onSave}
          />
        </View>
      </View>
    </Modal>
  );
}

function CreateTagModal({
  visible,
  name,
  color,
  creating,
  colors,
  onChangeName,
  onChangeColor,
  onCancel,
  onSave,
}: {
  visible: boolean;
  name: string;
  color: string;
  creating: boolean;
  colors: EditContactColors;
  onChangeName: (value: string) => void;
  onChangeColor: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
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
          <Text style={[styles.modalEyebrow, { color: colors.primary }]}>
            TAG
          </Text>

          <Text style={[styles.modalTitle, { color: colors.title }]}>
            Create tag
          </Text>

          <Text style={[styles.modalSubtitle, { color: colors.text }]}>
            Tags are small labels for personality, context, places, or memories.
          </Text>

          <ThemedInput
            value={name}
            onChangeText={onChangeName}
            placeholder="Tag name, e.g. important"
            autoCapitalize="none"
            colors={colors}
          />

          <Text style={[styles.modalLabel, { color: colors.title }]}>
            Color
          </Text>

          <View style={styles.optionWrap}>
            {LABEL_COLORS.map((item) => {
              const active = color === item;

              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.colorOption,
                    {
                      backgroundColor: item,
                      borderColor: active ? colors.title : "transparent",
                    },
                  ]}
                  onPress={() => onChangeColor(item)}
                  activeOpacity={0.85}
                >
                  {active ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.tagPreviewRow}>
            <View
              style={[
                styles.tagChip,
                {
                  backgroundColor: withOpacity(color, "18"),
                  borderColor: withOpacity(color, "35"),
                },
              ]}
            >
              <Text style={[styles.tagChipText, { color }]}>
                #{name || "tag"}
              </Text>
            </View>
          </View>

          <ModalActions
            creating={creating}
            colors={colors}
            saveColor={color}
            saveLabel="Create"
            creatingLabel="Creating..."
            onCancel={onCancel}
            onSave={onSave}
          />
        </View>
      </View>
    </Modal>
  );
}

function ModalActions({
  creating,
  colors,
  saveColor,
  saveLabel,
  creatingLabel,
  onCancel,
  onSave,
}: {
  creating: boolean;
  colors: EditContactColors;
  saveColor: string;
  saveLabel: string;
  creatingLabel: string;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <View style={styles.modalActions}>
      <TouchableOpacity
        style={[
          styles.modalCancelButton,
          {
            backgroundColor: colors.softCard,
            borderColor: colors.border,
          },
        ]}
        onPress={onCancel}
        disabled={creating}
        activeOpacity={0.85}
      >
        <Text style={[styles.modalCancelText, { color: colors.text }]}>
          Cancel
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.modalSaveButton,
          { backgroundColor: saveColor },
          creating && { opacity: 0.6 },
        ]}
        onPress={onSave}
        disabled={creating}
        activeOpacity={0.88}
      >
        {creating ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.modalSaveText}>{saveLabel}</Text>
        )}

        {creating ? (
          <Text style={styles.modalSaveText}>{creatingLabel}</Text>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

/* helpers */

function makeEditContactColors(settings: any): EditContactColors {
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
    shadow: settings.themeMode === "dark" ? "#000000" : "#6F3D2E",
  };
}

function withOpacity(hexColor?: string | null, opacityHex = "22") {
  if (!hexColor || typeof hexColor !== "string") {
    return `#000000${opacityHex}`;
  }

  const normalized = hexColor.trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
    return `${normalized}${opacityHex}`;
  }

  return normalized;
}

function getInitials(first?: string | null, last?: string | null) {
  return `${first?.[0] || ""}${last?.[0] || ""}`.toUpperCase() || "?";
}

/* styles */

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },

  root: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "800",
  },

  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 90,
  },

  compactHeader: {
    minHeight: 148,
    borderRadius: 28,
    padding: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  headerGlowOne: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 145,
    height: 145,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.16)",
  },

  headerGlowTwo: {
    position: "absolute",
    bottom: -75,
    left: -55,
    width: 160,
    height: 160,
    borderRadius: 86,
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  headerAvatar: {
    width: 54,
    height: 54,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerAvatarImage: {
    width: 54,
    height: 54,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },

  headerAvatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },

  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  headerEyebrow: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    lineHeight: 32,
    fontWeight: "900",
    marginTop: 3,
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 2,
  },

  photoActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },

  headerPhotoButton: {
    minHeight: 36,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  headerRemoveButton: {
    minHeight: 36,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  headerPhotoButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 15,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  sectionTitleRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  sectionIconBubble: {
    width: 30,
    height: 30,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.1,
  },

  fieldGroup: {
    marginBottom: 14,
  },

  labelRow: {
    minHeight: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 10,
  },

  label: {
    fontSize: 13,
    fontWeight: "900",
  },

  requiredTag: {
    fontSize: 11,
    fontWeight: "900",
  },

  optionalTag: {
    fontSize: 11,
    fontWeight: "800",
  },

  input: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "700",
  },

  notesInput: {
    minHeight: 94,
    paddingTop: 12,
    lineHeight: 20,
  },

  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dateText: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "800",
  },

  divider: {
    height: 1,
    marginVertical: 18,
  },

  chipInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  chip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  chipText: {
    fontSize: 12,
    fontWeight: "900",
  },

  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },

  tagChip: {
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  tagChipText: {
    fontSize: 12,
    fontWeight: "900",
  },

  emptyTagsText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.7,
  },

  suggestionBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 9,
  },

  suggestionChip: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  suggestionChipText: {
    fontSize: 12,
    fontWeight: "900",
  },

  errorBox: {
    minHeight: 44,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  errorText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },

  primaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonDisabled: {
    opacity: 0.6,
  },

  primaryButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 14, 10, 0.52)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },

  modalCard: {
    width: "100%",
    maxWidth: 390,
    borderRadius: 30,
    borderWidth: 1,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
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
    marginTop: 6,
  },

  modalSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    opacity: 0.76,
    marginTop: 6,
    marginBottom: 14,
  },

  modalLabel: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 16,
    marginBottom: 9,
  },

  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  iconOption: {
    width: 42,
    height: 42,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  colorOption: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },

  tagPreviewRow: {
    marginTop: 16,
    flexDirection: "row",
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },

  modalCancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  modalCancelText: {
    fontSize: 14,
    fontWeight: "900",
  },

  modalSaveButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  modalSaveText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
});