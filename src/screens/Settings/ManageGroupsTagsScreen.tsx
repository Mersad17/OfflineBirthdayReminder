import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import {
  createContactGroup,
  createContactTag,
  deleteContactGroup,
  deleteContactTag,
  fetchContactGroups,
  fetchContactTags,
  updateContactGroup,
  updateContactTag,
} from "../../contacts/api";
import { ContactGroup, ContactTag } from "../../contacts/types";
import {
  DEFAULT_GROUP_COLOR,
  DEFAULT_GROUP_ICON,
  DEFAULT_TAG_COLOR,
  GROUP_ICONS,
  GroupIconName,
  LABEL_COLORS,
} from "../../lib/groupTagOptions";

type Tab = "groups" | "tags";

export default function ManageGroupsTagsScreen() {
  const { settings } = useAppearance();

  const [tab, setTab] = useState<Tab>("groups");
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [tags, setTags] = useState<ContactTag[]>([]);

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

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [groupData, tagData] = await Promise.all([
        fetchContactGroups(),
        fetchContactTags(),
      ]);

      setGroups(groupData);
      setTags(tagData);
    } catch (e) {
      Alert.alert("Error", "Could not load groups and tags.");
    }
  }

  function openCreateGroup() {
    setEditingGroup(null);
    setGroupName("");
    setGroupColor("#3B82F6");
    setGroupIcon("people");
    setGroupModalVisible(true);
  }

  function openEditGroup(group: ContactGroup) {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupColor(group.color || "#3B82F6");
    setGroupIcon((group.icon as any) || "people");
    setGroupModalVisible(true);
  }

  function openCreateTag() {
    setEditingTag(null);
    setTagName("");
    setTagColor("#6366F1");
    setTagModalVisible(true);
  }

  function openEditTag(tag: ContactTag) {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color || "#6366F1");
    setTagModalVisible(true);
  }

  async function saveGroup() {
    const cleanName = groupName.trim();

    if (!cleanName) {
      Alert.alert("Name required", "Please enter a group name.");
      return;
    }

    setSaving(true);

    try {
      if (editingGroup) {
        const updated = await updateContactGroup(editingGroup.id, {
          name: cleanName,
          color: groupColor,
          icon: groupIcon,
        });

        setGroups((prev) =>
          prev.map((g) => (g.id === updated.id ? updated : g))
        );
      } else {
        const created = await createContactGroup({
          name: cleanName,
          color: groupColor,
          icon: groupIcon,
        });

        setGroups((prev) => [created, ...prev]);
      }

      setGroupModalVisible(false);
    } catch (e: any) {
      Alert.alert(
        "Error",
        JSON.stringify(e?.response?.data || "Could not save group.")
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

    setSaving(true);

    try {
      if (editingTag) {
        const updated = await updateContactTag(editingTag.id, {
          name: cleanName,
          color: tagColor,
        });

        setTags((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
      } else {
        const created = await createContactTag({
          name: cleanName,
          color: tagColor,
        });

        setTags((prev) => [created, ...prev]);
      }

      setTagModalVisible(false);
    } catch (e: any) {
      Alert.alert(
        "Error",
        JSON.stringify(e?.response?.data || "Could not save tag.")
      );
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteGroup(group: ContactGroup) {
    Alert.alert(
      "Delete group?",
      `Delete "${group.name}"? Contacts in this group will keep existing, but the group will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteContactGroup(group.id);
              setGroups((prev) => prev.filter((g) => g.id !== group.id));
            } catch {
              Alert.alert("Error", "Could not delete group.");
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
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteContactTag(tag.id);
              setTags((prev) => prev.filter((t) => t.id !== tag.id));
            } catch {
              Alert.alert("Error", "Could not delete tag.");
            }
          },
        },
      ]
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={[styles.title, { color: settings.titleColor }]}>
          Groups & Tags
        </Text>

        <Text style={[styles.subtitle, { color: settings.textColor }]}>
          Organize how you remember people.
        </Text>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[
              styles.tab,
              {
                backgroundColor:
                  tab === "groups" ? settings.primaryColor : settings.cardColor,
              },
            ]}
            onPress={() => setTab("groups")}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    tab === "groups"
                      ? settings.buttonTextColor
                      : settings.textColor,
                },
              ]}
            >
              Groups
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              {
                backgroundColor:
                  tab === "tags" ? settings.primaryColor : settings.cardColor,
              },
            ]}
            onPress={() => setTab("tags")}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    tab === "tags"
                      ? settings.buttonTextColor
                      : settings.textColor,
                },
              ]}
            >
              Tags
            </Text>
          </TouchableOpacity>
        </View>

        {tab === "groups" ? (
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.addButton,
                { backgroundColor: settings.buttonColor },
              ]}
              onPress={openCreateGroup}
            >
              <Text
                style={[
                  styles.addButtonText,
                  { color: settings.buttonTextColor },
                ]}
              >
                + Add group
              </Text>
            </TouchableOpacity>

            {groups.map((group) => {
              const color = group.color || settings.primaryColor;
              const icon = group.icon || "people";

              return (
                <View
                  key={group.id}
                  style={[
                    styles.row,
                    { backgroundColor: settings.cardColor },
                  ]}
                >
                  <View style={styles.rowLeft}>
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: color + "20" },
                      ]}
                    >
                      <Ionicons name={icon as any} size={20} color={color} />
                    </View>

                    <View>
                      <Text
                        style={[
                          styles.rowTitle,
                          { color: settings.titleColor },
                        ]}
                      >
                        {group.name}
                      </Text>
                      <Text style={[styles.rowSub, { color }]}>
                        {color}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rowActions}>
                    <TouchableOpacity onPress={() => openEditGroup(group)}>
                      <Text
                        style={[
                          styles.actionText,
                          { color: settings.primaryColor },
                        ]}
                      >
                        Edit
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => confirmDeleteGroup(group)}>
                      <Text style={styles.deleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.section}>
            <TouchableOpacity
              style={[
                styles.addButton,
                { backgroundColor: settings.buttonColor },
              ]}
              onPress={openCreateTag}
            >
              <Text
                style={[
                  styles.addButtonText,
                  { color: settings.buttonTextColor },
                ]}
              >
                + Add tag
              </Text>
            </TouchableOpacity>

            {tags.map((tag) => {
              const color = tag.color || settings.primaryColor;

              return (
                <View
                  key={tag.id}
                  style={[
                    styles.row,
                    { backgroundColor: settings.cardColor },
                  ]}
                >
                  <View style={styles.rowLeft}>
                    <View
                      style={[
                        styles.tagPreview,
                        { backgroundColor: color + "20" },
                      ]}
                    >
                      <Text style={[styles.tagPreviewText, { color }]}>
                        #{tag.name}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rowActions}>
                    <TouchableOpacity onPress={() => openEditTag(tag)}>
                      <Text
                        style={[
                          styles.actionText,
                          { color: settings.primaryColor },
                        ]}
                      >
                        Edit
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => confirmDeleteTag(tag)}>
                      <Text style={styles.deleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={groupModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGroupModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalCard, { backgroundColor: settings.cardColor }]}
          >
            <Text style={[styles.modalTitle, { color: settings.titleColor }]}>
              {editingGroup ? "Edit group" : "Create group"}
            </Text>

            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Group name"
              placeholderTextColor={settings.textColor + "66"}
              style={[
                styles.input,
                {
                  color: settings.textColor,
                  backgroundColor: settings.cardColor,
                  borderColor: settings.cardColor + "60",
                },
              ]}
            />

            <Text style={[styles.modalLabel, { color: settings.titleColor }]}>
              Icon
            </Text>

            <View style={styles.optionWrap}>
              {GROUP_ICONS.map((icon) => {
                const active = groupIcon === icon;

                return (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      {
                        backgroundColor: active
                          ? groupColor
                          : groupColor + "18",
                      },
                    ]}
                    onPress={() => setGroupIcon(icon)}
                  >
                    <Ionicons
                      name={icon as any}
                      size={20}
                      color={active ? "#FFFFFF" : groupColor}
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
                const active = groupColor === color;

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
                    onPress={() => setGroupColor(color)}
                  />
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setGroupModalVisible(false)}
                disabled={saving}
              >
                <Text style={{ color: settings.textColor }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveModalButton,
                  { backgroundColor: groupColor },
                  saving && { opacity: 0.6 },
                ]}
                onPress={saveGroup}
                disabled={saving}
              >
                <Text style={styles.saveModalText}>
                  {saving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={tagModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTagModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalCard, { backgroundColor: settings.cardColor }]}
          >
            <Text style={[styles.modalTitle, { color: settings.titleColor }]}>
              {editingTag ? "Edit tag" : "Create tag"}
            </Text>

            <TextInput
              value={tagName}
              onChangeText={setTagName}
              placeholder="Tag name"
              placeholderTextColor={settings.textColor + "66"}
              autoCapitalize="none"
              style={[
                styles.input,
                {
                  color: settings.textColor,
                  backgroundColor: settings.cardColor,
                  borderColor: settings.cardColor + "60",
                },
              ]}
            />

            <Text style={[styles.modalLabel, { color: settings.titleColor }]}>
              Color
            </Text>

            <View style={styles.optionWrap}>
              {LABEL_COLORS.map((color) => {
                const active = tagColor === color;

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
                    onPress={() => setTagColor(color)}
                  />
                );
              })}
            </View>

            <View style={styles.tagPreviewRow}>
              <View
                style={[
                  styles.tagPreview,
                  { backgroundColor: tagColor + "20" },
                ]}
              >
                <Text style={[styles.tagPreviewText, { color: tagColor }]}>
                  #{tagName || "tag"}
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setTagModalVisible(false)}
                disabled={saving}
              >
                <Text style={{ color: settings.textColor }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveModalButton,
                  { backgroundColor: tagColor },
                  saving && { opacity: 0.6 },
                ]}
                onPress={saveTag}
                disabled={saving}
              >
                <Text style={styles.saveModalText}>
                  {saving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 18,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
  },
  tabs: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    marginBottom: 18,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
  },
  tabText: {
    fontWeight: "700",
  },
  section: {
    gap: 10,
  },
  addButton: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 6,
  },
  addButtonText: {
    fontWeight: "800",
  },
  row: {
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#eee",
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  rowSub: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "600",
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  actionText: {
    fontWeight: "800",
  },
  deleteText: {
    color: "#DC2626",
    fontWeight: "800",
  },
  tagPreview: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagPreviewText: {
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
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
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  saveModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  saveModalText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});