import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Image,
  Modal,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import {
  createContact,
  createContactGroup,
  createContactTag,
  fetchContactGroups,
  fetchContactTags,
} from "../../contacts/api";
import { ContactGroup, ContactTag } from "../../contacts/types";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import {
  DEFAULT_GROUP_COLOR,
  DEFAULT_GROUP_ICON,
  DEFAULT_TAG_COLOR,
  GROUP_ICONS,
  GroupIconName,
  LABEL_COLORS,
 } from "../../lib/groupTagOptions";

type Props = {
  navigation: any;
};



export default function AddContactScreen({ navigation }: Props) {
  const { settings } = useAppearance();

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [birthday, setBirthday] = useState("");
  const [birthdayDate, setBirthdayDate] = useState<Date | undefined>(undefined);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [tags, setTags] = useState<ContactTag[]>([]);

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
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

  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    async function loadRelationshipData() {
      try {
        const [groupData, tagData] = await Promise.all([
          fetchContactGroups(),
          fetchContactTags(),
        ]);

        setGroups(groupData);
        setTags(tagData);

        setTagColorsByName(
          tagData.reduce((acc: Record<string, string>, tag: ContactTag) => {
            acc[tag.name.toLowerCase()] = tag.color || settings.primaryColor;
            return acc;
          }, {})
        );
      } catch (error) {
        console.log("Failed to load relationship data:", error);
      }
    }

    loadRelationshipData();
  }, []);

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null;

    return groups.find((group) => group.id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();

    if (!q) return [];

    return groups.filter((group) => group.name.toLowerCase().includes(q));
  }, [groups, groupSearch]);

  const exactGroupExists = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();

    if (!q) return true;

    return groups.some((group) => group.name.toLowerCase() === q);
  }, [groups, groupSearch]);

  const filteredTagSuggestions = useMemo(() => {
    const q = tagSearch.trim().toLowerCase();

    if (!q) return [];

    return tags
      .filter((tag) => tag.name.toLowerCase().includes(q))
      .filter(
        (tag) =>
          !tagNames.some(
            (selected) => selected.toLowerCase() === tag.name.toLowerCase()
          )
      )
      .slice(0, 8);
  }, [tags, tagSearch, tagNames]);

  const exactTagExists = useMemo(() => {
    const q = tagSearch.trim().toLowerCase();

    if (!q) return true;

    return tags.some((tag) => tag.name.toLowerCase() === q);
  }, [tags, tagSearch]);

  function formatDate(d: Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function openBirthdayPicker() {
    setShowBirthdayPicker(true);
  }

  function onBirthdayChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") {
      setShowBirthdayPicker(false);
    }

    if (date) {
      setBirthdayDate(date);
      setBirthday(formatDate(date));
    }
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow photo access to pick a picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  function openCreateGroupModalFromSearch() {
    const clean = groupSearch.trim();

    if (clean) {
      setNewGroupName(clean);
    }

    setShowGroupModal(true);
  }

  function openCreateTagModalFromSearch() {
    const clean = tagSearch.trim();

    if (clean) {
      setNewTagName(clean);
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
      [tag.name.toLowerCase()]: tag.color || settings.primaryColor,
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
    } catch (e: any) {
      Alert.alert(
        "Error",
        JSON.stringify(e?.response?.data || "Could not create group")
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
    } catch (e: any) {
      Alert.alert(
        "Error",
        JSON.stringify(e?.response?.data || "Could not create tag")
      );
    } finally {
      setCreatingTag(false);
    }
  }

  async function onSubmit() {
    if (!first.trim()) {
      Alert.alert("Name required", "Please enter first name.");
      return;
    }

    setSaving(true);

    try {
      await createContact({
        first_name: first.trim(),
        last_name: last.trim() || null,
        birthday: birthday || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        photo_uri: photoUri || undefined,
        is_favorite: null,
        group: selectedGroupId,
        tag_names: tagNames,
      });

      Alert.alert("Success", "Contact created.");
      navigation.goBack();
    } catch (e: any) {
      console.log("CREATE CONTACT ERROR:", e?.response?.data);

      const detail = e?.response?.data?.detail;

      if (detail) {
        Alert.alert("Cannot add contact", detail);
      } else {
        Alert.alert(
          "Error",
          JSON.stringify(e?.response?.data || "Failed to create contact.")
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <Screen scroll>
        <View style={styles.container}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.card, { backgroundColor: settings.cardColor }]}>
              <Text style={[styles.sectionTitle, { color: settings.titleColor }]}>
                Photo
              </Text>

              <View style={styles.photoRow}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photo} />
                ) : (
                  <View
                    style={[
                      styles.photoPlaceholder,
                      { backgroundColor: settings.cardColor },
                    ]}
                  >
                    <Text style={{ color: settings.textColor + "80" }}>
                      No photo
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.photoButton,
                    { backgroundColor: settings.buttonColor },
                  ]}
                  onPress={pickPhoto}
                >
                  <Text
                    style={[
                      styles.photoButtonText,
                      { color: settings.buttonTextColor },
                    ]}
                  >
                    {photoUri ? "Change photo" : "Add photo"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <Text style={[styles.sectionTitle, { color: settings.titleColor }]}>
                Basic info
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: settings.titleColor }]}>
                  First name
                </Text>

                <TextInput
                  value={first}
                  onChangeText={setFirst}
                  placeholder="Jane"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, { color: settings.textColor }]}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: settings.titleColor }]}>
                  Last name
                </Text>

                <TextInput
                  value={last}
                  onChangeText={setLast}
                  placeholder="Doe"
                  placeholderTextColor="#9CA3AF"
                  style={[styles.input, { color: settings.textColor }]}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.divider} />

              <Text style={[styles.sectionTitle, { color: settings.titleColor }]}>
                Relationship
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: settings.titleColor }]}>
                  Group
                </Text>

                <TextInput
                  value={groupSearch}
                  onChangeText={setGroupSearch}
                  placeholder="Search group..."
                  placeholderTextColor={settings.textColor + "66"}
                  style={[
                    styles.input,
                    {
                      backgroundColor: settings.cardColor,
                      borderColor: settings.cardColor + "60",
                      color: settings.textColor,
                    },
                  ]}
                />

                <View style={styles.tagWrap}>
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      {
                        backgroundColor:
                          selectedGroupId === null
                            ? settings.primaryColor
                            : settings.cardColor,
                      },
                    ]}
                    onPress={() => setSelectedGroupId(null)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            selectedGroupId === null
                              ? settings.buttonTextColor
                              : settings.textColor,
                        },
                      ]}
                    >
                      None
                    </Text>
                  </TouchableOpacity>

                  {selectedGroup && (
                    <TouchableOpacity
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            selectedGroup.color || settings.primaryColor,
                          borderColor:
                            (selectedGroup.color || settings.primaryColor) +
                            "80",
                        },
                      ]}
                      onPress={() => setSelectedGroupId(null)}
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
                  )}
                </View>

                {groupSearch.trim() && (
                  <View style={styles.suggestionBox}>
                    {filteredGroups.map((group) => {
                      const active = selectedGroupId === group.id;
                      const groupColor = group.color || settings.primaryColor;
                      const groupIcon = group.icon || "people";

                      return (
                        <TouchableOpacity
                          key={group.id}
                          style={[
                            styles.suggestionChip,
                            {
                              backgroundColor: active
                                ? groupColor
                                : groupColor + "20",
                            },
                          ]}
                          onPress={() => {
                            setSelectedGroupId(group.id);
                            setGroupSearch("");
                          }}
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

                    {!exactGroupExists && (
                      <TouchableOpacity
                        style={[
                          styles.suggestionChip,
                          { backgroundColor: settings.primaryColor + "15" },
                        ]}
                        onPress={openCreateGroupModalFromSearch}
                      >
                        <Text
                          style={[
                            styles.suggestionChipText,
                            { color: settings.primaryColor },
                          ]}
                        >
                          + Create “{groupSearch.trim()}”
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: settings.titleColor }]}>
                  Tags
                </Text>

                <TextInput
                  value={tagSearch}
                  onChangeText={setTagSearch}
                  placeholder="Search tag..."
                  placeholderTextColor={settings.textColor + "66"}
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    {
                      backgroundColor: settings.cardColor,
                      borderColor: settings.cardColor + "60",
                      color: settings.textColor,
                    },
                  ]}
                />

                {tagSearch.trim() && (
                  <View style={styles.suggestionBox}>
                    {filteredTagSuggestions.map((tag) => {
                      const tagColor = tag.color || settings.primaryColor;

                      return (
                        <TouchableOpacity
                          key={tag.id}
                          style={[
                            styles.suggestionChip,
                            { backgroundColor: tagColor + "20" },
                          ]}
                          onPress={() => addExistingTag(tag)}
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

                    {!exactTagExists && (
                      <TouchableOpacity
                        style={[
                          styles.suggestionChip,
                          { backgroundColor: settings.primaryColor + "15" },
                        ]}
                        onPress={openCreateTagModalFromSearch}
                      >
                        <Text
                          style={[
                            styles.suggestionChipText,
                            { color: settings.primaryColor },
                          ]}
                        >
                          + Create “{tagSearch.trim()}”
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <View style={styles.tagWrap}>
                  {tagNames.map((tag) => {
                    const tagColor =
                      tagColorsByName[tag.toLowerCase()] ||
                      settings.primaryColor;

                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[
                          styles.tagChip,
                          { backgroundColor: tagColor + "20" },
                        ]}
                        onPress={() => removeTag(tag)}
                      >
                        <Text
                          style={[styles.tagChipText, { color: tagColor }]}
                        >
                          #{tag} ×
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {tagNames.length === 0 && (
                    <Text
                      style={[
                        styles.emptyTagsText,
                        { color: settings.textColor + "80" },
                      ]}
                    >
                      No tags selected.
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={[styles.sectionTitle, { color: settings.titleColor }]}>
                Details
              </Text>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: settings.titleColor }]}>
                    Birthday
                  </Text>
                  <Text style={styles.labelHint}>Tap to pick a date</Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={openBirthdayPicker}
                  style={[styles.input, styles.dateInput]}
                >
                  <Text style={birthday ? styles.dateText : styles.datePlaceholder}>
                    {birthday || "1990-07-21"}
                  </Text>
                  <Text style={styles.dateIcon}>📅</Text>
                </TouchableOpacity>

                {showBirthdayPicker && (
                  <DateTimePicker
                    value={birthdayDate || new Date(1990, 0, 1)}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onBirthdayChange}
                    maximumDate={new Date()}
                  />
                )}
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: settings.titleColor }]}>
                    Email
                  </Text>
                  <Text style={styles.optionalTag}>Optional</Text>
                </View>

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@example.com"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={[styles.input, { color: settings.textColor }]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: settings.titleColor }]}>
                    Phone
                  </Text>
                  <Text style={styles.optionalTag}>Optional</Text>
                </View>

                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+33 6 12 34 56 78"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  style={[styles.input, { color: settings.textColor }]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: settings.titleColor }]}>
                    Notes
                  </Text>
                  <Text style={styles.optionalTag}>Optional</Text>
                </View>

                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Something to remember about this contact..."
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="sentences"
                  style={[
                    styles.input,
                    styles.notesInput,
                    { color: settings.textColor },
                  ]}
                  multiline
                  textAlignVertical="top"
                  onFocus={() => {
                    setTimeout(() => {
                      scrollRef.current?.scrollToEnd({ animated: true });
                    }, 150);
                  }}
                />
              </View>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.goBack()}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    { color: settings.textColor },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: settings.buttonColor },
                  saving && styles.primaryButtonDisabled,
                ]}
                onPress={onSubmit}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: settings.buttonTextColor },
                  ]}
                >
                  {saving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        <Modal
          visible={showGroupModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowGroupModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: settings.cardColor }]}>
              <Text style={[styles.modalTitle, { color: settings.titleColor }]}>
                Create group
              </Text>

              <TextInput
                value={newGroupName}
                onChangeText={setNewGroupName}
                placeholder="Group name, e.g. Gym"
                placeholderTextColor={settings.textColor + "66"}
                style={[
                  styles.input,
                  {
                    backgroundColor: settings.cardColor,
                    borderColor: settings.cardColor + "60",
                    color: settings.textColor,
                  },
                ]}
              />

              <Text style={[styles.modalLabel, { color: settings.titleColor }]}>
                Icon
              </Text>

              <View style={styles.optionWrap}>
                {GROUP_ICONS.map((icon) => {
                  const active = newGroupIcon === icon;

                  return (
                    <TouchableOpacity
                      key={icon}
                      style={[
                        styles.iconOption,
                        {
                          backgroundColor: active
                            ? newGroupColor
                            : newGroupColor + "18",
                        },
                      ]}
                      onPress={() => setNewGroupIcon(icon)}
                    >
                      <Ionicons
                        name={icon as any}
                        size={20}
                        color={active ? "#FFFFFF" : newGroupColor}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.modalLabel, { color: settings.titleColor }]}>
                Color
              </Text>

              <View style={styles.optionWrap}>
                {LABEL_COLORS.map((color) => {
                  const active = newGroupColor === color;

                  return (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        {
                          backgroundColor: color,
                          borderColor: active
                            ? settings.textColor
                            : "transparent",
                        },
                      ]}
                      onPress={() => setNewGroupColor(color)}
                    />
                  );
                })}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowGroupModal(false)}
                  disabled={creatingGroup}
                >
                  <Text style={{ color: settings.textColor }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalSaveButton,
                    { backgroundColor: newGroupColor },
                    creatingGroup && { opacity: 0.6 },
                  ]}
                  onPress={handleCreateGroup}
                  disabled={creatingGroup}
                >
                  <Text style={styles.modalSaveText}>
                    {creatingGroup ? "Creating..." : "Create"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showTagModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTagModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: settings.cardColor }]}>
              <Text style={[styles.modalTitle, { color: settings.titleColor }]}>
                Create tag
              </Text>

              <TextInput
                value={newTagName}
                onChangeText={setNewTagName}
                placeholder="Tag name, e.g. important"
                placeholderTextColor={settings.textColor + "66"}
                autoCapitalize="none"
                style={[
                  styles.input,
                  {
                    backgroundColor: settings.cardColor,
                    borderColor: settings.cardColor + "60",
                    color: settings.textColor,
                  },
                ]}
              />

              <Text style={[styles.modalLabel, { color: settings.titleColor }]}>
                Color
              </Text>

              <View style={styles.optionWrap}>
                {LABEL_COLORS.map((color) => {
                  const active = newTagColor === color;

                  return (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        {
                          backgroundColor: color,
                          borderColor: active
                            ? settings.textColor
                            : "transparent",
                        },
                      ]}
                      onPress={() => setNewTagColor(color)}
                    />
                  );
                })}
              </View>

              <View style={styles.tagPreviewRow}>
                <View
                  style={[
                    styles.tagChip,
                    { backgroundColor: newTagColor + "20" },
                  ]}
                >
                  <Text style={[styles.tagChipText, { color: newTagColor }]}>
                    #{newTagName || "tag"}
                  </Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowTagModal(false)}
                  disabled={creatingTag}
                >
                  <Text style={{ color: settings.textColor }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalSaveButton,
                    { backgroundColor: newTagColor },
                    creatingTag && { opacity: 0.6 },
                  ]}
                  onPress={handleCreateTag}
                  disabled={creatingTag}
                >
                  <Text style={styles.modalSaveText}>
                    {creatingTag ? "Creating..." : "Create"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  photoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  photoButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
  },
  labelHint: {
    fontSize: 11,
    color: "#999",
  },
  optionalTag: {
    fontSize: 11,
    color: "#777",
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
    fontSize: 14,
  },
  notesInput: {
    minHeight: 80,
    paddingTop: 8,
    paddingBottom: 8,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateText: {
    fontSize: 14,
    color: "#333",
  },
  datePlaceholder: {
    fontSize: 14,
    color: "#999",
  },
  dateIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  secondaryButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  primaryButton: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  chipInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  emptyTagsText: {
    fontSize: 13,
    marginTop: 4,
  },
  suggestionBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  suggestionChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suggestionChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  iconOption: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  colorOption: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
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
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  modalSaveText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});