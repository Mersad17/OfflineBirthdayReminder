import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  ContactProfileLayoutItem,
  ContactProfileLayoutSource,
} from "../../profileSections/types";
import {
  CONTACT_PROFILE_SECTION_META,
  normalizeContactProfileLayoutItems,
} from "../../profileSections/defaults";

type Props = {
  visible: boolean;
  contactName: string;
  groupName?: string | null;
  source: ContactProfileLayoutSource;
  items: ContactProfileLayoutItem[];
  saving: boolean;
  settings: any;
  onCancel: () => void;
  onSaveForContact: (items: ContactProfileLayoutItem[]) => Promise<void> | void;
  onSaveForGroup?: (items: ContactProfileLayoutItem[]) => Promise<void> | void;
  onSaveForGlobal: (items: ContactProfileLayoutItem[]) => Promise<void> | void;
  onResetContact: () => Promise<void> | void;
};

type Theme = {
  background: string;
  card: string;
  title: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  buttonText: string;
  softPrimary: string;
  danger: string;
};

function withOpacity(hexColor?: string | null, opacityHex = "22") {
  if (!hexColor || typeof hexColor !== "string") return `#000000${opacityHex}`;

  const normalized = hexColor.trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
    return `${normalized}${opacityHex}`;
  }

  return normalized;
}

function makeTheme(settings: any): Theme {
  const textColor = settings?.textColor || "#2B211B";
  const primary = settings?.primaryColor || "#EE6A5E";

  return {
    background: settings?.backgroundColor || "#F7EFE7",
    card: settings?.cardColor || "#FFF9F1",
    title: settings?.titleColor || textColor,
    text: textColor,
    muted: withOpacity(textColor, "99"),
    border: withOpacity(textColor, "18"),
    primary,
    buttonText: settings?.buttonTextColor || "#FFFFFF",
    softPrimary: withOpacity(primary, "16"),
    danger: "#EE6A5E",
  };
}

function sortItems(items: ContactProfileLayoutItem[]) {
  return normalizeContactProfileLayoutItems(items);
}

function sourceLabel(source: ContactProfileLayoutSource) {
  if (source === "contact") return "Custom for this contact";
  if (source === "group") return "Using group layout";
  if (source === "global") return "Using your global layout";
  return "Using default layout";
}

export function ProfileLayoutModal({
  visible,
  contactName,
  groupName,
  source,
  items,
  saving,
  settings,
  onCancel,
  onSaveForContact,
  onSaveForGroup,
  onSaveForGlobal,
  onResetContact,
}: Props) {
  const theme = useMemo(() => makeTheme(settings), [settings]);
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [draftItems, setDraftItems] = useState<ContactProfileLayoutItem[]>(() =>
    sortItems(items)
  );

  useEffect(() => {
    if (visible) {
      setDraftItems(sortItems(items));
    }
  }, [visible, items]);

  const visibleCount = draftItems.filter((item) => item.visible).length;

  function moveItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= draftItems.length) return;

    setDraftItems((current) => {
      const next = [...current];
      const temp = next[index];

      next[index] = next[nextIndex];
      next[nextIndex] = temp;

      return next.map((item, nextOrder) => ({
        ...item,
        order: nextOrder,
      }));
    });
  }

  function toggleItem(key: ContactProfileLayoutItem["key"]) {
    setDraftItems((current) =>
      current.map((item) =>
        item.key === key
          ? {
              ...item,
              visible: !item.visible,
            }
          : item
      )
    );
  }

function confirmSaveForGroup() {
  if (!onSaveForGroup || !groupName) return;

  Alert.alert(
    `Apply to ${groupName}?`,
    `This layout will be used by contacts in ${groupName}, unless a contact has its own custom layout.`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Apply to group",
        onPress: () => {
          void onSaveForGroup(sortItems(draftItems));
        },
      },
    ]
  );
}

function confirmSaveForGlobal() {
  Alert.alert(
    "Save as global default?",
    "This layout will be used by contacts that do not have a contact-specific or group-specific layout.",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Save global default",
        onPress: () => {
          void onSaveForGlobal(sortItems(draftItems));
        },
      },
    ]
  );
}

  function confirmResetContact() {
    Alert.alert(
      "Reset this contact layout?",
      `${contactName} will stop using a custom layout and will use your global layout instead.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            void onResetContact();
          },
        },
      ]
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.eyebrow}>PROFILE LAYOUT</Text>
              <Text style={styles.title}>Customize {contactName}</Text>
              <Text style={styles.subtitle}>
                Choose what appears on this profile and reorder the sections.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onCancel}
              disabled={saving}
            >
              <Ionicons name="close" size={22} color={theme.title} />
            </TouchableOpacity>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusIcon}>
              <Ionicons
                name="options-outline"
                size={18}
                color={theme.primary}
              />
            </View>

            <View style={styles.statusTextWrap}>
              <Text style={styles.statusTitle}>{sourceLabel(source)}</Text>
              <Text style={styles.statusSubtitle}>
                {visibleCount} visible section{visibleCount === 1 ? "" : "s"}
              </Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {draftItems.map((item, index) => {
              const meta = CONTACT_PROFILE_SECTION_META[item.key];
              const iconName = meta.icon as keyof typeof Ionicons.glyphMap;

              return (
                <View
                  key={item.key}
                  style={[
                    styles.sectionRow,
                    !item.visible && styles.sectionRowHidden,
                  ]}
                >
                  <View style={styles.sectionLeft}>
                    <View
                      style={[
                        styles.sectionIcon,
                        {
                          backgroundColor: item.visible
                            ? theme.softPrimary
                            : theme.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={iconName}
                        size={18}
                        color={item.visible ? theme.primary : theme.muted}
                      />
                    </View>

                    <View style={styles.sectionTextWrap}>
                      <Text
                        style={[
                          styles.sectionTitle,
                          !item.visible && styles.hiddenText,
                        ]}
                      >
                        {meta.title}
                      </Text>
                      <Text style={styles.sectionSubtitle} numberOfLines={1}>
                        {meta.subtitle}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.sectionActions}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => moveItem(index, -1)}
                      disabled={index === 0 || saving}
                    >
                      <Ionicons
                        name="chevron-up"
                        size={18}
                        color={index === 0 ? theme.border : theme.muted}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => moveItem(index, 1)}
                      disabled={index === draftItems.length - 1 || saving}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={18}
                        color={
                          index === draftItems.length - 1
                            ? theme.border
                            : theme.muted
                        }
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.visibilityButton,
                        item.visible && styles.visibilityButtonActive,
                      ]}
                      onPress={() => toggleItem(item.key)}
                      disabled={saving}
                    >
                      <Ionicons
                        name={item.visible ? "eye" : "eye-off-outline"}
                        size={17}
                        color={item.visible ? theme.buttonText : theme.muted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>

<View style={styles.footer}>
  {source === "contact" ? (
    <TouchableOpacity
      style={styles.resetButton}
      onPress={confirmResetContact}
      disabled={saving}
    >
      <Text style={styles.resetText}>Reset this contact</Text>
    </TouchableOpacity>
  ) : null}

  <TouchableOpacity
    style={styles.primaryButtonFull}
    onPress={() => onSaveForContact(sortItems(draftItems))}
    disabled={saving}
  >
    {saving ? (
      <ActivityIndicator color={theme.buttonText} />
    ) : (
      <Text style={styles.primaryButtonText}>Save for this contact</Text>
    )}
  </TouchableOpacity>

  <View style={styles.footerActions}>
    {onSaveForGroup && groupName ? (
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={confirmSaveForGroup}
        disabled={saving}
      >
        <Text style={styles.secondaryButtonText} numberOfLines={1}>
            Apply to group ({groupName})
        </Text>
      </TouchableOpacity>
    ) : null}

    <TouchableOpacity
      style={styles.secondaryButton}
      onPress={confirmSaveForGlobal}
      disabled={saving}
    >
      <Text style={styles.secondaryButtonText} numberOfLines={1}>
        Save global
      </Text>
    </TouchableOpacity>
  </View>
</View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    primaryButtonFull: {
  minHeight: 52,
  borderRadius: 18,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.primary,
  marginBottom: 10,
},
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
                maxHeight: "92%",
                backgroundColor: theme.background,
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                paddingTop: 18,
                paddingHorizontal: 18,
                paddingBottom:  34,
                },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    headerTextWrap: {
      flex: 1,
      paddingRight: 12,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 1.4,
      color: theme.primary,
      marginBottom: 6,
    },
    title: {
      fontSize: 24,
      fontWeight: "900",
      color: theme.title,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.muted,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
    statusCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      marginBottom: 14,
    },
    statusIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.softPrimary,
      marginRight: 11,
    },
    statusTextWrap: {
      flex: 1,
    },
    statusTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: theme.title,
      marginBottom: 2,
    },
    statusSubtitle: {
      fontSize: 12,
      color: theme.muted,
    },
    listContent: {
      paddingBottom: 12,
    },
    sectionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      marginBottom: 10,
    },
    sectionRowHidden: {
      opacity: 0.58,
    },
    sectionLeft: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      paddingRight: 8,
    },
    sectionIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },
    sectionTextWrap: {
      flex: 1,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: theme.title,
      marginBottom: 3,
    },
    hiddenText: {
      textDecorationLine: "line-through",
    },
    sectionSubtitle: {
      fontSize: 12,
      color: theme.muted,
    },
    sectionActions: {
      flexDirection: "row",
      alignItems: "center",
    },
    iconButton: {
      width: 30,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
    },
    visibilityButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      marginLeft: 4,
    },
    visibilityButtonActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingTop: 14,
        paddingBottom:  28,
        },
    resetButton: {
      alignSelf: "center",
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginBottom: 10,
    },
    resetText: {
      color: theme.danger,
      fontWeight: "800",
      fontSize: 13,
    },
    footerActions: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    secondaryButton: {
      flex: 1,
      minHeight: 50,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      marginRight: 10,
    },
    secondaryButtonText: {
      color: theme.title,
      fontSize: 14,
      fontWeight: "800",
    },
    primaryButton: {
      flex: 1.4,
      minHeight: 50,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primary,
    },
    primaryButtonText: {
      color: theme.buttonText,
      fontSize: 14,
      fontWeight: "900",
    },
  });
}