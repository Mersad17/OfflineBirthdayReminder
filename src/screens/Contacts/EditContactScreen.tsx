// src/screens/contacts/EditContactScreen.tsx
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ContactsStackParamList } from "../../navigation/ContactsStack";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppId, ContactGroup, ContactTag, CreateContactInput } from "../../contacts/types";
import {
  createContactGroup,
  createContactTag,
  fetchContactById,
  fetchContactGroups,
  fetchContactTags,
  updateContact,
} from "../../contacts/repository";
import {
  ActivityIndicator,
  Alert,
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
    Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { formatDateEU } from "../../lib/date";
import { Ionicons } from "@expo/vector-icons";
import {
  DEFAULT_GROUP_COLOR,
  DEFAULT_GROUP_ICON,
  DEFAULT_TAG_COLOR,
  GROUP_ICONS,
  LABEL_COLORS,
} from "../../lib/groupTagOptions";
type Props = NativeStackScreenProps<ContactsStackParamList, "EditContact">;

export default function EditContactScreen({ route, navigation }: Props) {
  const { contactId } = route.params;
  const { settings } = useAppearance();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contact, setContact] = useState<CreateContactInput | null>(null);
  const [groups, setGroups] = useState<ContactGroup[]>([]);

  const [selectedGroupId, setSelectedGroupId] = useState<AppId | null>(null);

  const [tags, setTags] = useState<ContactTag[]>([]);

  const [groupSearch, setGroupSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [tagColorsByName, setTagColorsByName] = useState<Record<string, string>>({});
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
  const [birthdayDateObj, setBirthdayDateObj] = useState(new Date());
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // 🔹 photo state
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [originalPhotoUri, setOriginalPhotoUri] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
      const [c, groupData, tagData] = await Promise.all([
        fetchContactById(contactId),
        fetchContactGroups(),
        fetchContactTags(),
      ]);

        setGroups(groupData);
        setTags(tagData);
        setContact(c as any);

        setFirstName(c.first_name || "");
        setLastName(c.last_name || "");
        setBirthday(c.birthday || "");

        if (c.birthday) {
          setBirthdayDateObj(new Date(c.birthday));
        }

        setEmail(c.email || "");
        setPhone(c.phone || "");
        setNotes(c.notes || "");

        setSelectedGroupId(c.group || null);
        const contactTags = c.tags_detail || [];

        setTagNames(contactTags.map((tag) => tag.name));

        const allKnownTags = [...tagData, ...contactTags];

        setTagColorsByName(
          allKnownTags.reduce((acc: Record<string, string>, tag: any) => {
            acc[tag.name.toLowerCase()] = tag.color || settings.primaryColor;
            return acc;
          }, {})
 
    );

        setPhotoUri(c.photo || null);
        setOriginalPhotoUri(c.photo || null);
     } catch (e: any) {
  console.log("UPDATE CONTACT ERROR:", e?.response?.data);

  Alert.alert(
    "Error",
    JSON.stringify(e?.response?.data || "Could not update Contact")
  );
} finally {
        setLoading(false);
      }
    })();
  }, [contactId]);

  function onDateChange(_: any, selectedDate?: Date) {
    if (!selectedDate) {
      setShowDatePicker(false);
      return;
    }
    setShowDatePicker(false);
    setBirthdayDateObj(selectedDate);
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    setBirthday(`${y}-${m}-${d}`);
  }

  // ---------- photo pick / remove ----------
  async function pickPhoto() {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow photo access to pick a picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], 
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri); // local file:// uri
    }
  }

  function removePhoto() {
    setPhotoUri(null);
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

  // fallback in case backend response does not return color/icon yet
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

  const alreadyExists = tagNames.some(
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

      if (!alreadyExists) {
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
const filteredGroups = useMemo(() => {
  const q = groupSearch.trim().toLowerCase();

  if (!q) return [];

  return groups.filter((group) =>
    group.name.toLowerCase().includes(q)
  );
}, [groups, groupSearch]);
const selectedGroup = useMemo(() => {
  if (!selectedGroupId) return null;

  return groups.find((group) => group.id === selectedGroupId) || null;
}, [groups, selectedGroupId]);
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
  async function onSave() {
    setError(null);
    if (birthday && !birthday.match(/^\d{4}-\d{2}-\d{2}$/)) {
        setError("Birthday date must be in YYYY-MM-DD format.");
        return;
      }
    if (!firstName || !firstName.trim()) {
      setError("FirstName Required.");
      return;
    }

    setSaving(true);
    try {
      await updateContact(contactId, {
        first_name: firstName,
        last_name: lastName,
        birthday: birthday ? birthday : null,
        email,
        phone,
        notes,
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
    } catch {
      Alert.alert("Error", "Could not update Contact");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !contact) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={settings.primaryColor} />
          <Text style={{ marginTop: 8, color: settings.textColor }}>
            Loading...
          </Text>
        </View>
      </Screen>
    );
  }

  const initials = `${(firstName || (contact as any).first_name || "")
    .charAt(0)
    .toUpperCase()}${(lastName || (contact as any).last_name || "")
    .charAt(0)
    .toUpperCase()}`;

  return (
    <Screen scroll>
      <View style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.page}>
          {/* HEADER */}
          <View
            style={[
              styles.headerCard,
              {
                backgroundColor: settings.cardColor,
                borderColor: settings.primaryColor + "40",
              },
            ]}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: settings.primaryColor + "22" },
                ]}
              >
                <Text
                  style={[
                    styles.avatarInitials,
                    { color: settings.primaryColor },
                  ]}
                >
                  {initials || "?"}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.photoButton,
                { borderColor: settings.primaryColor + "80" },
              ]}
              onPress={pickPhoto}
            >
              <Text
                style={[
                  styles.photoButtonText,
                  { color: settings.primaryColor },
                ]}
              >
                {photoUri ? "Change photo" : "Add photo"}
              </Text>
            </TouchableOpacity>

            {photoUri && (
              <TouchableOpacity onPress={removePhoto}>
                <Text style={styles.removePhotoText}>Remove photo</Text>
              </TouchableOpacity>
            )}

            <Text
              style={[
                styles.headerContact,
                { color: settings.primaryColor },
              ]}
            >
              {(contact as any).first_name} {(contact as any).last_name}
            </Text>
          </View>

          {/* FORM CARD */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: settings.cardColor,
                borderColor: settings.cardColor + "40",
              },
            ]}
          >
            <View style={styles.field}>
              <Text
                style={[styles.label, { color: settings.titleColor }]}
              >
                First Name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: settings.cardColor,
                    borderColor: settings.cardColor + "60",
                    color: settings.textColor,
                  },
                ]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Contact Name"
                placeholderTextColor={settings.textColor + "66"}
              />
            </View>

            <View style={styles.field}>
              <Text
                style={[styles.label, { color: settings.titleColor }]}
              >
                Last Name
              </Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: settings.cardColor,
                    borderColor: settings.cardColor + "60",
                    color: settings.textColor,
                  },
                ]}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter contact last name"
                placeholderTextColor={settings.textColor + "66"}
              />
            </View>
          <View style={styles.field}>
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
                      (selectedGroup.color || settings.primaryColor) + "80",
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
                            

          <View style={styles.field}>
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
                    tagColorsByName[tag.toLowerCase()] || settings.primaryColor;

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
                        style={[
                          styles.tagChipText,
                          { color: tagColor },
                        ]}
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
            <View style={styles.field}>
              <Text
                style={[styles.label, { color: settings.titleColor }]}
              >
                Birthday
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  {
                    borderColor: settings.primaryColor + "60",
                    backgroundColor: settings.primaryColor + "15",
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text
                  style={[
                    styles.dateButtonText,
                    { color: settings.primaryColor },
                  ]}
                >
                  {formatDateEU(birthday) || "Pick a date"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text
                style={[styles.label, { color: settings.titleColor }]}
              >
                Email
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: settings.cardColor,
                    borderColor: settings.cardColor + "60",
                    color: settings.textColor,
                  },
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor={settings.textColor + "66"}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.field}>
              <Text
                style={[styles.label, { color: settings.titleColor }]}
              >
                Phone
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: settings.cardColor,
                    borderColor: settings.cardColor + "60",
                    color: settings.textColor,
                  },
                ]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+33 6 12 34 56 78"
                placeholderTextColor={settings.textColor + "66"}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.field}>
              <Text
                style={[styles.label, { color: settings.titleColor }]}
              >
                Notes
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: settings.cardColor,
                    borderColor: settings.cardColor + "60",
                    color: settings.textColor,
                    textAlignVertical: "top",
                  },
                ]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Anything to add"
                placeholderTextColor={settings.textColor + "66"}
                autoCapitalize="sentences"
                multiline
                onFocus={() => {
                  setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  }, 150);
                }}
              />
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: settings.buttonColor },
                saving && { opacity: 0.6 },
              ]}
              onPress={onSave}
              disabled={saving}
            >
              <Text
                style={[
                  styles.saveButtonText,
                  { color: settings.buttonTextColor },
                ]}
              >
                {saving ? "Saving.." : "Save Changes"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text
                style={[
                  styles.cancelText,
                  { color: settings.textColor },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
<Modal
  visible={showGroupModal}
  transparent
  animationType="fade"
  onRequestClose={() => setShowGroupModal(false)}
>
  <View style={styles.modalOverlay}>
    <View
      style={[
        styles.modalCard,
        { backgroundColor: settings.cardColor },
      ]}
    >
      <Text
        style={[
          styles.modalTitle,
          { color: settings.titleColor },
        ]}
      >
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
                  borderColor: active ? settings.textColor : "transparent",
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
    <View
      style={[
        styles.modalCard,
        { backgroundColor: settings.cardColor },
      ]}
    >
      <Text
        style={[
          styles.modalTitle,
          { color: settings.titleColor },
        ]}
      >
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
                  borderColor: active ? settings.textColor : "transparent",
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
        {showDatePicker && (
          <DateTimePicker
            mode="date"
            value={birthdayDateObj}
            onChange={onDateChange}
            display={Platform.OS === "ios" ? "spinner" : "default"}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipInner: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
},
  page: {
    padding: 18,
    gap: 22,
    paddingBottom: 30,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
  },
  headerContact: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "800",
  },
  

emptyTagsText: {
  fontSize: 13,
  marginTop: 4,
},
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
  field: {
    gap: 4,
  },
  dateButton: {
    marginTop: 2,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dateButtonText: {
    fontWeight: "800",
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: {
    color: "#B91C1C",
    fontWeight: "600",
  },
  saveButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonText: {
    fontWeight: "700",
    fontSize: 17,
  },
  cancelText: {
    marginTop: 8,
    textAlign: "center",
  },

  // avatar / photo
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    marginBottom: 8,
  },
  avatarPlaceholder: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: "700",
  },
  photoButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 2,
  },
  photoButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  removePhotoText: {
    fontSize: 12,
    color: "#B91C1C",
    marginTop: 2,
  },
  chipRow: {
  gap: 8,
  paddingRight: 16,
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

});
