// src/screens/Settings/ManageGroupsTagsScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { SettingsStackParamsList } from "../../navigation/SettingsStack";
import {
  createContactGroup,
  createContactTag,
  deleteContactGroup,
  deleteContactTag,
  fetchContactGroups,
  fetchContactTags,
  updateContactGroup,
  updateContactTag,
} from "../../contacts/repository";
import { ContactGroup, ContactTag } from "../../contacts/types";
import {
  DEFAULT_GROUP_COLOR,
  DEFAULT_GROUP_ICON,
  DEFAULT_TAG_COLOR,
  GROUP_ICONS,
  LABEL_COLORS,
} from "../../lib/groupTagOptions";

type Props = NativeStackScreenProps<
  SettingsStackParamsList,
  "ManageGroupsTags"
>;

type Tab = "groups" | "tags";

type ManageColors = {
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

export default function ManageGroupsTagsScreen({
  navigation,
}: Props) {
  const { settings } = useAppearance();
  const colors = useMemo(() => makeManageColors(settings), [settings]);

  const [tab, setTab] = useState<Tab>("groups");
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [tags, setTags] = useState<ContactTag[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [tagModalVisible, setTagModalVisible] = useState(false);

  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);
  const [editingTag, setEditingTag] = useState<ContactTag | null>(null);

  const [groupName, setGroupName] = useState("");
  const [groupColor, setGroupColor] = useState(DEFAULT_GROUP_COLOR);
  const [groupIcon, setGroupIcon] =
    useState<(typeof GROUP_ICONS)[number]>(DEFAULT_GROUP_ICON);

  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState(DEFAULT_TAG_COLOR);

  useEffect(() => {
    navigation.setOptions?.({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [groupData, tagData] = await Promise.all([
        fetchContactGroups(),
        fetchContactTags(),
      ]);

      setGroups(groupData);
      setTags(tagData);
    } catch (error) {
      console.log("Could not load groups and tags:", error);
      Alert.alert("Groups & Tags", "Could not load groups and tags.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateGroup() {
    setEditingGroup(null);
    setGroupName("");
    setGroupColor(DEFAULT_GROUP_COLOR);
    setGroupIcon(DEFAULT_GROUP_ICON);
    setGroupModalVisible(true);
  }

  function openEditGroup(group: ContactGroup) {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupColor(group.color || DEFAULT_GROUP_COLOR);
    setGroupIcon((group.icon as (typeof GROUP_ICONS)[number]) || DEFAULT_GROUP_ICON);
    setGroupModalVisible(true);
  }

  function closeGroupModal() {
    if (saving) return;

    setGroupModalVisible(false);
  }

  function openCreateTag() {
    setEditingTag(null);
    setTagName("");
    setTagColor(DEFAULT_TAG_COLOR);
    setTagModalVisible(true);
  }

  function openEditTag(tag: ContactTag) {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color || DEFAULT_TAG_COLOR);
    setTagModalVisible(true);
  }

  function closeTagModal() {
    if (saving) return;

    setTagModalVisible(false);
  }

  async function saveGroup() {
    const cleanName = groupName.trim();

    if (!cleanName) {
      Alert.alert("Name required", "Please enter a group name.");
      return;
    }

    if (saving) return;

    setSaving(true);

    try {
      if (editingGroup) {
        const updated = await updateContactGroup(editingGroup.id, {
          name: cleanName,
          color: groupColor,
          icon: groupIcon,
        });

        setGroups((prev) =>
          prev.map((group) =>
            group.id === updated.id
              ? {
                  ...updated,
                  color: updated.color || groupColor,
                  icon: updated.icon || groupIcon,
                }
              : group
          )
        );
      } else {
        const created = await createContactGroup({
          name: cleanName,
          color: groupColor,
          icon: groupIcon,
        });

        setGroups((prev) => [
          {
            ...created,
            color: created.color || groupColor,
            icon: created.icon || groupIcon,
          },
          ...prev,
        ]);
      }

      setGroupModalVisible(false);
    } catch (error: any) {
      console.log("Save group failed:", error);
      Alert.alert(
        "Groups & Tags",
        JSON.stringify(error?.response?.data || "Could not save group.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveTag() {
    const cleanName = tagName.trim();

    if (!cleanName) {
      Alert.alert("Name required", "Please enter a tag name.");
      return;
    }

    if (saving) return;

    setSaving(true);

    try {
      if (editingTag) {
        const updated = await updateContactTag(editingTag.id, {
          name: cleanName,
          color: tagColor,
        });

        setTags((prev) =>
          prev.map((tag) =>
            tag.id === updated.id
              ? {
                  ...updated,
                  color: updated.color || tagColor,
                }
              : tag
          )
        );
      } else {
        const created = await createContactTag({
          name: cleanName,
          color: tagColor,
        });

        setTags((prev) => [
          {
            ...created,
            color: created.color || tagColor,
          },
          ...prev,
        ]);
      }

      setTagModalVisible(false);
    } catch (error: any) {
      console.log("Save tag failed:", error);
      Alert.alert(
        "Groups & Tags",
        JSON.stringify(error?.response?.data || "Could not save tag.")
      );
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteGroup(group: ContactGroup) {
    Alert.alert(
      "Delete group?",
      `Delete "${group.name}"? Contacts will remain, but this group will be removed.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteContactGroup(group.id);
              setGroups((prev) =>
                prev.filter((item) => item.id !== group.id)
              );
            } catch (error) {
              console.log("Delete group failed:", error);
              Alert.alert("Groups & Tags", "Could not delete group.");
            }
          },
        },
      ]
    );
  }

  function confirmDeleteTag(tag: ContactTag) {
    Alert.alert(
      "Delete tag?",
      `Delete "#${tag.name}"? It will be removed from contacts that use it.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteContactTag(tag.id);
              setTags((prev) => prev.filter((item) => item.id !== tag.id));
            } catch (error) {
              console.log("Delete tag failed:", error);
              Alert.alert("Groups & Tags", "Could not delete tag.");
            }
          },
        },
      ]
    );
  }

  const totalCount = groups.length + tags.length;

  return (
    <Screen>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <CompactHeader
            colors={colors}
            totalCount={totalCount}
            activeTab={tab}
            onBack={() => navigation.goBack()}
          />

          <View
            style={[
              styles.segment,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <SegmentButton
              label="Groups"
              count={groups.length}
              selected={tab === "groups"}
              colors={colors}
              onPress={() => setTab("groups")}
            />

            <SegmentButton
              label="Tags"
              count={tags.length}
              selected={tab === "tags"}
              colors={colors}
              onPress={() => setTab("tags")}
            />
          </View>

          {loading ? (
            <LoadingCard colors={colors} />
          ) : tab === "groups" ? (
            <ManageCard
              title="Groups"
              subtitle="Use groups for people categories like Friends, Family, Gym, Work, or Dating."
              icon="people-outline"
              addLabel="Add group"
              emptyTitle="No groups yet"
              emptySubtitle="Create your first group to organize people faster."
              colors={colors}
              onAdd={openCreateGroup}
              isEmpty={groups.length === 0}
            >
              {groups.map((group) => (
                <GroupRow
                  key={String(group.id)}
                  group={group}
                  colors={colors}
                  onEdit={() => openEditGroup(group)}
                  onDelete={() => confirmDeleteGroup(group)}
                />
              ))}
            </ManageCard>
          ) : (
            <ManageCard
              title="Tags"
              subtitle="Use tags for small details like important, travel, creative, client, or gym."
              icon="pricetags-outline"
              addLabel="Add tag"
              emptyTitle="No tags yet"
              emptySubtitle="Create simple tags to make people easier to find."
              colors={colors}
              onAdd={openCreateTag}
              isEmpty={tags.length === 0}
            >
              {tags.map((tag) => (
                <TagRow
                  key={String(tag.id)}
                  tag={tag}
                  colors={colors}
                  onEdit={() => openEditTag(tag)}
                  onDelete={() => confirmDeleteTag(tag)}
                />
              ))}
            </ManageCard>
          )}
        </ScrollView>

        <GroupModal
          visible={groupModalVisible}
          editing={Boolean(editingGroup)}
          name={groupName}
          color={groupColor}
          icon={groupIcon}
          saving={saving}
          colors={colors}
          onChangeName={setGroupName}
          onChangeColor={setGroupColor}
          onChangeIcon={setGroupIcon}
          onClose={closeGroupModal}
          onSave={saveGroup}
        />

        <TagModal
          visible={tagModalVisible}
          editing={Boolean(editingTag)}
          name={tagName}
          color={tagColor}
          saving={saving}
          colors={colors}
          onChangeName={setTagName}
          onChangeColor={setTagColor}
          onClose={closeTagModal}
          onSave={saveTag}
        />
      </View>
    </Screen>
  );
}

function CompactHeader({
  colors,
  totalCount,
  activeTab,
  onBack,
}: {
  colors: ManageColors;
  totalCount: number;
  activeTab: Tab;
  onBack: () => void;
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

      <View style={styles.headerTopRow}>
        <TouchableOpacity
          style={styles.headerCircleButton}
          onPress={onBack}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-back" size={23} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerPill}>
          <Ionicons name="sparkles-outline" size={14} color="#FFFFFF" />

          <Text style={styles.headerPillText}>
            {activeTab === "groups" ? "Groups" : "Tags"}
          </Text>
        </View>
      </View>

      <View style={styles.headerMainRow}>
        <View style={styles.headerIconBubble}>
          <Ionicons name="pricetags-outline" size={24} color="#FFFFFF" />
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>ORGANIZATION</Text>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Groups & Tags
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={2}>
            {totalCount} saved labels to organize how you remember people.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function SegmentButton({
  label,
  count,
  selected,
  colors,
  onPress,
}: {
  label: string;
  count: number;
  selected: boolean;
  colors: ManageColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.segmentButton,
        {
          backgroundColor: selected ? colors.primary : "transparent",
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text
        style={[
          styles.segmentText,
          { color: selected ? colors.buttonText : colors.text },
        ]}
      >
        {label}
      </Text>

      <View
        style={[
          styles.segmentCount,
          {
            backgroundColor: selected
              ? "rgba(255,255,255,0.20)"
              : colors.softCard,
          },
        ]}
      >
        <Text
          style={[
            styles.segmentCountText,
            { color: selected ? colors.buttonText : colors.text },
          ]}
        >
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function LoadingCard({ colors }: { colors: ManageColors }) {
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
      <View style={styles.loadingBox}>
        <ActivityIndicator color={colors.primary} />

        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading groups and tags…
        </Text>
      </View>
    </View>
  );
}

function ManageCard({
  title,
  subtitle,
  icon,
  addLabel,
  emptyTitle,
  emptySubtitle,
  colors,
  isEmpty,
  onAdd,
  children,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  addLabel: string;
  emptyTitle: string;
  emptySubtitle: string;
  colors: ManageColors;
  isEmpty: boolean;
  onAdd: () => void;
  children: React.ReactNode;
}) {
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
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardTitleRow}>
          <View
            style={[
              styles.sectionIconBubble,
              { backgroundColor: colors.softPrimary },
            ]}
          >
            <Ionicons name={icon} size={16} color={colors.primary} />
          </View>

          <View style={styles.cardTitleTextWrap}>
            <Text style={[styles.cardTitle, { color: colors.title }]}>
              {title}
            </Text>

            <Text
              style={[styles.cardSubtitle, { color: colors.text }]}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.addButton,
            {
              backgroundColor: colors.softPrimary,
              borderColor: withOpacity(colors.primary, "28"),
            },
          ]}
          onPress={onAdd}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={16} color={colors.primary} />

          <Text style={[styles.addButtonText, { color: colors.primary }]}>
            {addLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {isEmpty ? (
        <View
          style={[
            styles.emptyBox,
            {
              backgroundColor: colors.softCard,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: colors.softPrimary },
            ]}
          >
            <Ionicons name={icon} size={22} color={colors.primary} />
          </View>

          <View style={styles.emptyTextWrap}>
            <Text style={[styles.emptyTitle, { color: colors.title }]}>
              {emptyTitle}
            </Text>

            <Text style={[styles.emptySubtitle, { color: colors.text }]}>
              {emptySubtitle}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.listWrap}>{children}</View>
      )}
    </View>
  );
}

function GroupRow({
  group,
  colors,
  onEdit,
  onDelete,
}: {
  group: ContactGroup;
  colors: ManageColors;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const groupColor = group.color || colors.primary;
  const iconName = (group.icon || "people") as keyof typeof Ionicons.glyphMap;

  return (
    <View
      style={[
        styles.itemRow,
        {
          backgroundColor: colors.softCard,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.itemLeft}>
        <View
          style={[
            styles.groupIconCircle,
            { backgroundColor: withOpacity(groupColor, "18") },
          ]}
        >
          <Ionicons name={iconName as any} size={19} color={groupColor} />
        </View>

        <View style={styles.itemTextWrap}>
          <Text
            style={[styles.itemTitle, { color: colors.title }]}
            numberOfLines={1}
          >
            {group.name}
          </Text>

          <Text
            style={[styles.itemSubtitle, { color: groupColor }]}
            numberOfLines={1}
          >
            {groupColor}
          </Text>
        </View>
      </View>

      <RowActions colors={colors} onEdit={onEdit} onDelete={onDelete} />
    </View>
  );
}

function TagRow({
  tag,
  colors,
  onEdit,
  onDelete,
}: {
  tag: ContactTag;
  colors: ManageColors;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tagColor = tag.color || colors.primary;

  return (
    <View
      style={[
        styles.itemRow,
        {
          backgroundColor: colors.softCard,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.itemLeft}>
        <View
          style={[
            styles.tagPreview,
            {
              backgroundColor: withOpacity(tagColor, "18"),
              borderColor: withOpacity(tagColor, "35"),
            },
          ]}
        >
          <Text style={[styles.tagPreviewText, { color: tagColor }]}>
            #{tag.name}
          </Text>
        </View>
      </View>

      <RowActions colors={colors} onEdit={onEdit} onDelete={onDelete} />
    </View>
  );
}

function RowActions({
  colors,
  onEdit,
  onDelete,
}: {
  colors: ManageColors;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.rowActions}>
      <TouchableOpacity
        style={[
          styles.iconAction,
          { backgroundColor: colors.softPrimary },
        ]}
        onPress={onEdit}
        activeOpacity={0.82}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="pencil-outline" size={15} color={colors.primary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.iconAction,
          { backgroundColor: withOpacity(colors.danger, "12") },
        ]}
        onPress={onDelete}
        activeOpacity={0.82}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={15} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );
}

function GroupModal({
  visible,
  editing,
  name,
  color,
  icon,
  saving,
  colors,
  onChangeName,
  onChangeColor,
  onChangeIcon,
  onClose,
  onSave,
}: {
  visible: boolean;
  editing: boolean;
  name: string;
  color: string;
  icon: (typeof GROUP_ICONS)[number];
  saving: boolean;
  colors: ManageColors;
  onChangeName: (value: string) => void;
  onChangeColor: (value: string) => void;
  onChangeIcon: (value: (typeof GROUP_ICONS)[number]) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <ModalHeader
            eyebrow="GROUP"
            title={editing ? "Edit group" : "Create group"}
            icon="people-outline"
            colors={colors}
          />

          <FieldLabel label="Name" colors={colors} />

          <ThemedInput
            value={name}
            onChangeText={onChangeName}
            placeholder="Group name, e.g. Gym"
            autoCapitalize="words"
            colors={colors}
          />

          <FieldLabel label="Icon" colors={colors} />

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

          <FieldLabel label="Color" colors={colors} />

          <ColorPicker
            selectedColor={color}
            colors={colors}
            onChange={onChangeColor}
          />

          <ModalActions
            colors={colors}
            accentColor={color}
            saving={saving}
            onClose={onClose}
            onSave={onSave}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function TagModal({
  visible,
  editing,
  name,
  color,
  saving,
  colors,
  onChangeName,
  onChangeColor,
  onClose,
  onSave,
}: {
  visible: boolean;
  editing: boolean;
  name: string;
  color: string;
  saving: boolean;
  colors: ManageColors;
  onChangeName: (value: string) => void;
  onChangeColor: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <ModalHeader
            eyebrow="TAG"
            title={editing ? "Edit tag" : "Create tag"}
            icon="pricetag-outline"
            colors={colors}
          />

          <FieldLabel label="Name" colors={colors} />

          <ThemedInput
            value={name}
            onChangeText={onChangeName}
            placeholder="Tag name, e.g. important"
            autoCapitalize="none"
            colors={colors}
          />

          <FieldLabel label="Color" colors={colors} />

          <ColorPicker
            selectedColor={color}
            colors={colors}
            onChange={onChangeColor}
          />

          <View style={styles.tagPreviewRow}>
            <View
              style={[
                styles.tagPreview,
                {
                  backgroundColor: withOpacity(color, "18"),
                  borderColor: withOpacity(color, "35"),
                },
              ]}
            >
              <Text style={[styles.tagPreviewText, { color }]}>
                #{name || "tag"}
              </Text>
            </View>
          </View>

          <ModalActions
            colors={colors}
            accentColor={color}
            saving={saving}
            onClose={onClose}
            onSave={onSave}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ModalHeader({
  eyebrow,
  title,
  icon,
  colors,
}: {
  eyebrow: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: ManageColors;
}) {
  return (
    <View style={styles.modalHeader}>
      <View
        style={[
          styles.modalHeaderIcon,
          { backgroundColor: colors.softPrimary },
        ]}
      >
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>

      <View style={styles.modalHeaderTextWrap}>
        <Text style={[styles.modalEyebrow, { color: colors.primary }]}>
          {eyebrow}
        </Text>

        <Text style={[styles.modalTitle, { color: colors.title }]}>
          {title}
        </Text>
      </View>
    </View>
  );
}

function FieldLabel({
  label,
  colors,
}: {
  label: string;
  colors: ManageColors;
}) {
  return (
    <Text style={[styles.fieldLabel, { color: colors.title }]}>
      {label}
    </Text>
  );
}

function ThemedInput({
  colors,
  style,
  ...props
}: TextInputProps & {
  colors: ManageColors;
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

function ColorPicker({
  selectedColor,
  colors,
  onChange,
}: {
  selectedColor: string;
  colors: ManageColors;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.optionWrap}>
      {LABEL_COLORS.map((color) => {
        const active = selectedColor === color;

        return (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorOption,
              {
                backgroundColor: color,
                borderColor: active ? colors.title : "transparent",
              },
            ]}
            onPress={() => onChange(color)}
            activeOpacity={0.85}
          >
            {active ? (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ModalActions({
  colors,
  accentColor,
  saving,
  onClose,
  onSave,
}: {
  colors: ManageColors;
  accentColor: string;
  saving: boolean;
  onClose: () => void;
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
        onPress={onClose}
        disabled={saving}
        activeOpacity={0.85}
      >
        <Text style={[styles.modalCancelText, { color: colors.text }]}>
          Cancel
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.modalSaveButton,
          { backgroundColor: accentColor },
          saving && styles.disabled,
        ]}
        onPress={onSave}
        disabled={saving}
        activeOpacity={0.88}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.modalSaveText}>Save</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

/* helpers */

function makeManageColors(settings: any): ManageColors {
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

/* styles */

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 40,
    gap: 12,
  },

  compactHeader: {
    minHeight: 154,
    borderRadius: 28,
    padding: 16,
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

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerCircleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerPill: {
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

  headerPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  headerMainRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  headerIconBubble: {
    width: 54,
    height: 54,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "900",
    marginTop: 3,
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 2,
  },

  segment: {
    minHeight: 52,
    borderRadius: 22,
    borderWidth: 1,
    padding: 5,
    flexDirection: "row",
    gap: 6,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  segmentButton: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  segmentText: {
    fontSize: 13,
    fontWeight: "900",
  },

  segmentCount: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },

  segmentCountText: {
    fontSize: 11,
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

  loadingBox: {
    minHeight: 90,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  loadingText: {
    fontSize: 12,
    fontWeight: "800",
  },

  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },

  cardTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    gap: 10,
  },

  sectionIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  cardTitleTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  cardTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
  },

  cardSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 3,
  },

  addButton: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  addButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },

  emptyBox: {
    minHeight: 86,
    borderRadius: 22,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  emptySubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 3,
  },

  listWrap: {
    gap: 8,
  },

  itemRow: {
    minHeight: 68,
    borderRadius: 22,
    borderWidth: 1,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  itemLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  groupIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  itemTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  itemTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
  },

  itemSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "800",
    marginTop: 1,
  },

  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  iconAction: {
    width: 32,
    height: 32,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  tagPreview: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  tagPreviewText: {
    fontSize: 12,
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

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 16,
  },

  modalHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  modalHeaderTextWrap: {
    flex: 1,
    minWidth: 0,
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

  fieldLabel: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 7,
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

  disabled: {
    opacity: 0.6,
  },
});