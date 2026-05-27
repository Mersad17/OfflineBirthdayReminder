// src/screens/Contacts/CustomInfoCards.tsx
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
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppearance } from "../../appearance/AppearanceContext";
import {
  CustomInfoEntry,
  CustomInfoFieldType,
  CustomInfoSection,
} from "../../customInfo/types";

type CustomInfoColors = {
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

export type CustomInfoBuilderPayload = {
  name: string;
  scope: "contact" | "global";
  is_repeatable: boolean;
  icon?: string | null;
  color?: string | null;
  fields: {
    label: string;
    field_type: CustomInfoFieldType;
    placeholder?: string | null;
    is_required?: boolean;
  }[];
};

type DraftField = {
  label: string;
  field_type: CustomInfoFieldType;
};

type Template = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  fields: DraftField[];
};

const FIELD_TYPE_ORDER: CustomInfoFieldType[] = [
  "text",
  "long_text",
  "date",
  "number",
  "boolean",
];

const FIELD_TYPE_META: Record<
  CustomInfoFieldType,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    placeholder: string;
  }
> = {
  text: {
    label: "Text",
    icon: "text-outline",
    placeholder: "Write value...",
  },
  long_text: {
    label: "Long",
    icon: "document-text-outline",
    placeholder: "Write a longer note...",
  },
  date: {
    label: "Date",
    icon: "calendar-outline",
    placeholder: "YYYY-MM-DD",
  },
  number: {
    label: "Number",
    icon: "calculator-outline",
    placeholder: "Number",
  },
  boolean: {
    label: "Yes/No",
    icon: "toggle-outline",
    placeholder: "Yes or no",
  },
};

const TEMPLATES: Template[] = [
  {
    name: "Kids",
    icon: "happy-outline",
    fields: [
      { label: "Child name", field_type: "text" },
      { label: "Birthday", field_type: "date" },
      { label: "School", field_type: "text" },
      { label: "Favorite toy", field_type: "text" },
    ],
  },
  {
    name: "Gift ideas",
    icon: "gift-outline",
    fields: [
      { label: "Likes", field_type: "long_text" },
      { label: "Sizes", field_type: "text" },
      { label: "Avoid", field_type: "long_text" },
    ],
  },
  {
    name: "Pets",
    icon: "paw-outline",
    fields: [
      { label: "Pet name", field_type: "text" },
      { label: "Type", field_type: "text" },
      { label: "Birthday", field_type: "date" },
    ],
  },
  {
    name: "Work details",
    icon: "briefcase-outline",
    fields: [
      { label: "Company", field_type: "text" },
      { label: "Role", field_type: "text" },
      { label: "Important context", field_type: "long_text" },
    ],
  },
];

const SECTION_ICON_OPTIONS: (keyof typeof Ionicons.glyphMap)[] = [
  "sparkles-outline",
  "heart-outline",
  "happy-outline",
  "people-outline",
  "person-outline",
  "home-outline",
  "gift-outline",
  "paw-outline",
  "briefcase-outline",
  "school-outline",
  "book-outline",
  "restaurant-outline",
  "cafe-outline",
  "fitness-outline",
  "football-outline",
  "musical-notes-outline",
  "airplane-outline",
  "car-outline",
  "medkit-outline",
  "shirt-outline",
  "color-palette-outline",
  "star-outline",
  "flower-outline",
  "leaf-outline",
  "bulb-outline",
  "calendar-outline",
  "location-outline",
  "chatbubble-ellipses-outline",
  "document-text-outline",
  "albums-outline",
];

export function CustomInfoPanel({
  sections,
  onCreate,
  onEditSection,
  onRemoveSection,
  onOpenEntry,
  onRemoveEntry,
}: {
  sections: CustomInfoSection[];
  onCreate: () => void;
  onEditSection: (section: CustomInfoSection) => void;
  onRemoveSection: (section: CustomInfoSection) => void;
  onOpenEntry: (section: CustomInfoSection, entry?: CustomInfoEntry | null) => void;
  onRemoveEntry: (section: CustomInfoSection, entry: CustomInfoEntry) => void;
}) {
  const { settings } = useAppearance();
  const colors = useMemo(() => makeCustomInfoColors(settings), [settings]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.panelHeader}>
        <View style={styles.panelHeaderLeft}>
          <View style={[styles.iconBubble, { backgroundColor: colors.softPrimary }]}>
            <Ionicons name="sparkles-outline" size={17} color={colors.primary} />
          </View>

          <View style={styles.headerTextWrap}>
            <Text style={[styles.panelTitle, { color: colors.title }]}>Custom info</Text>
            <Text style={[styles.panelSubtitle, { color: colors.text }]} numberOfLines={1}>
              Add missing details that matter to you
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.roundAddButton, { backgroundColor: colors.button }]}
          onPress={onCreate}
          activeOpacity={0.86}
        >
          <Ionicons name="add" size={19} color={colors.buttonText} />
        </TouchableOpacity>
      </View>

      {sections.length === 0 ? (
        <TouchableOpacity
          style={[
            styles.emptyCard,
            {
              backgroundColor: colors.softCard,
              borderColor: colors.border,
            },
          ]}
          onPress={onCreate}
          activeOpacity={0.86}
        >
          <View style={[styles.emptyIcon, { backgroundColor: colors.softPrimary }]}>
            <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
          </View>

          <View style={styles.emptyTextWrap}>
            <Text style={[styles.emptyTitle, { color: colors.title }]}>Custom Info</Text>
            <Text style={[styles.emptyText, { color: colors.text }]}>
              Add structured details like kids, gift ideas, work context, pets, school, or health notes.
            </Text>
          </View>

          <View style={[styles.emptyButton, { backgroundColor: colors.button }]}> 
            <Ionicons name="add" size={15} color={colors.buttonText} />
            <Text style={[styles.emptyButtonText, { color: colors.buttonText }]}>Add custom info</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.sectionList}>
          {sections.map((section) => (
            <CustomInfoSectionCard
              key={String(section.id)}
              section={section}
              colors={colors}
              styles={styles}
              onEditSection={onEditSection}
              onRemoveSection={onRemoveSection}
              onOpenEntry={onOpenEntry}
              onRemoveEntry={onRemoveEntry}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function CustomInfoSectionCard({
  section,
  colors,
  styles,
  onEditSection,
  onRemoveSection,
  onOpenEntry,
  onRemoveEntry,
}: {
  section: CustomInfoSection;
  colors: CustomInfoColors;
  styles: ReturnType<typeof createStyles>;
  onEditSection: (section: CustomInfoSection) => void;
  onRemoveSection: (section: CustomInfoSection) => void;
  onOpenEntry: (section: CustomInfoSection, entry?: CustomInfoEntry | null) => void;
  onRemoveEntry: (section: CustomInfoSection, entry: CustomInfoEntry) => void;
}) {
  const accent = section.color || colors.primary;
  const iconName = getSectionIcon(section.icon);
  const entries = section.entries ?? [];
  const visibleEntries = entries.slice(0, section.is_repeatable ? 2 : 1);
  const canAddItem = section.is_repeatable && entries.length > 0;

  function confirmRemoveSection() {
    Alert.alert(
      "Remove section?",
      `Remove “${section.name}” and all saved items inside it?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => onRemoveSection(section),
        },
      ]
    );
  }

  function confirmRemoveEntry(entry: CustomInfoEntry) {
    Alert.alert(
      "Remove item?",
      `Remove this item from “${section.name}”?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => onRemoveEntry(section, entry),
        },
      ]
    );
  }

  return (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: colors.softCard,
          borderColor: colors.border,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => onEditSection(section)}
        onLongPress={confirmRemoveSection}
        delayLongPress={450}
        activeOpacity={0.84}
      >
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionIcon, { backgroundColor: withOpacity(accent, "16") }]}> 
            <Ionicons name={iconName} size={17} color={accent} />
          </View>

          <View style={styles.sectionTextWrap}>
            <Text style={[styles.sectionTitle, { color: colors.title }]} numberOfLines={1}>
              {section.name}
            </Text>
            <Text style={[styles.sectionMeta, { color: colors.text }]} numberOfLines={1}>
              Tap to edit · hold to remove
            </Text>
          </View>
        </View>

        <View style={[styles.sectionMenuButton, { backgroundColor: colors.card }]}>
          <Ionicons name="create-outline" size={18} color={colors.muted} />
        </View>
      </TouchableOpacity>

      {visibleEntries.length > 0 ? (
        <View style={styles.entriesList}>
          {visibleEntries.map((entry, index) => (
            <TouchableOpacity
              key={String(entry.id)}
              style={[
                styles.entryPreview,
                {
                  backgroundColor: colors.card,
                  borderColor: index === 0 ? withOpacity(accent, "28") : colors.border,
                },
              ]}
              onPress={() => onOpenEntry(section, entry)}
              onLongPress={() => confirmRemoveEntry(entry)}
              delayLongPress={450}
              activeOpacity={0.84}
            >
              {section.fields.slice(0, 6).map((field) => (
                <View key={String(field.id)} style={styles.valueRow}>
                  <Text style={[styles.valueLabel, { color: colors.text }]} numberOfLines={1}>
                    {field.label}:
                  </Text>
                  <Text style={[styles.valueText, { color: colors.title }]} numberOfLines={1}>
                    {getCustomValueDisplay(entry.values?.[field.id], field.field_type)}
                  </Text>
                </View>
              ))}
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.noEntryBox,
            {
              backgroundColor: withOpacity(accent, "10"),
              borderColor: withOpacity(accent, "28"),
            },
          ]}
          onPress={() => onOpenEntry(section, null)}
          activeOpacity={0.86}
        >
          <Ionicons name="create-outline" size={18} color={accent} />
          <Text style={[styles.noEntryText, { color: accent }]}>Fill this section</Text>
        </TouchableOpacity>
      )}

      {canAddItem ? (
        <TouchableOpacity
          style={[
            styles.outlineButton,
            {
              borderColor: withOpacity(accent, "55"),
              backgroundColor: "transparent",
            },
          ]}
          onPress={() => onOpenEntry(section, null)}
          activeOpacity={0.86}
        >
          <Ionicons name="add" size={15} color={accent} />
          <Text style={[styles.outlineButtonText, { color: accent }]}> 
            "Add another item"
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function CustomInfoBuilderModal({
  visible,
  section,
  saving = false,
  onCancel,
  onSave,
}: {
  visible: boolean;
  section?: CustomInfoSection | null;
  saving?: boolean;
  onCancel: () => void;
  onSave: (payload: CustomInfoBuilderPayload) => void;
}) {
  const { settings } = useAppearance();
  const colors = useMemo(() => makeCustomInfoColors(settings), [settings]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState("");
  const [scope, setScope] = useState<"contact" | "global">("contact");
  const [isRepeatable, setIsRepeatable] = useState(false);
  const [icon, setIcon] = useState<keyof typeof Ionicons.glyphMap>("sparkles-outline");
  const [fields, setFields] = useState<DraftField[]>([
    { label: "", field_type: "text" },
  ]);

  useEffect(() => {
    if (!visible) return;

    if (section) {
      setName(section.name);
      setScope(section.scope);
      setIsRepeatable(section.is_repeatable);
      setIcon(getSectionIcon(section.icon));
      setFields(
        section.fields.length > 0
          ? section.fields.map((field) => ({
              label: field.label,
              field_type: field.field_type,
            }))
          : [{ label: "", field_type: "text" }]
      );
      return;
    }

    setName("");
    setScope("contact");
    setIsRepeatable(false);
    setIcon("sparkles-outline");
    setFields([{ label: "", field_type: "text" }]);
  }, [visible, section]);

  function applyTemplate(template: Template) {
    setName(template.name);
    setIcon(template.icon);
    setFields(template.fields);
  }

  function updateField(index: number, patch: Partial<DraftField>) {
    setFields((prev) =>
      prev.map((field, itemIndex) =>
        itemIndex === index ? { ...field, ...patch } : field
      )
    );
  }

  function cycleFieldType(index: number) {
    setFields((prev) =>
      prev.map((field, itemIndex) => {
        if (itemIndex !== index) return field;

        const currentIndex = FIELD_TYPE_ORDER.indexOf(field.field_type);
        const nextType = FIELD_TYPE_ORDER[(currentIndex + 1) % FIELD_TYPE_ORDER.length];

        return { ...field, field_type: nextType };
      })
    );
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function handleSave() {
    const cleanName = name.trim();
    const cleanFields = fields
      .map((field) => ({ ...field, label: field.label.trim() }))
      .filter((field) => field.label.length > 0);

    if (!cleanName) {
      Alert.alert("Custom info", "Give this section a name.");
      return;
    }

    if (cleanFields.length === 0) {
      Alert.alert("Custom info", "Add at least one field.");
      return;
    }

    onSave({
      name: cleanName,
      scope,
      is_repeatable: isRepeatable,
      icon,
      color: null,
      fields: cleanFields,
    });
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={[styles.builderScreen, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.builderHeader, { backgroundColor: colors.background }]}> 
          <TouchableOpacity style={[styles.headerButton, { backgroundColor: colors.card }]} onPress={onCancel}>
            <Ionicons name="chevron-back" size={22} color={colors.title} />
          </TouchableOpacity>

          <Text style={[styles.builderTitle, { color: colors.title }]}>
            {section ? "Edit custom info" : "Create custom info"}
          </Text>

          <TouchableOpacity style={[styles.headerButton, { backgroundColor: colors.card }]} onPress={onCancel}>
            <Ionicons name="close" size={21} color={colors.title} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.builderContent}
        >
          <Text style={[styles.builderLabel, { color: colors.title }]}>Start from template</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateRow}>
            {TEMPLATES.map((template) => (
              <TouchableOpacity
                key={template.name}
                style={[styles.templateChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => applyTemplate(template)}
                activeOpacity={0.85}
              >
                <Ionicons name={template.icon} size={15} color={colors.primary} />
                <Text style={[styles.templateChipText, { color: colors.title }]}>{template.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.builderLabel, { color: colors.title }]}>Choose icon</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.iconPickerRow}
          >
            {SECTION_ICON_OPTIONS.map((item) => {
              const active = icon === item;

              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.iconChoice,
                    {
                      backgroundColor: active ? colors.primary : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setIcon(item)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={item}
                    size={20}
                    color={active ? colors.buttonText : colors.primary}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.builderLabel, { color: colors.title }]}>Section name</Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Kids, Gift ideas, Work details..."
            placeholderTextColor={colors.muted}
            style={[
              styles.builderInput,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.title,
              },
            ]}
          />

          <Text style={[styles.builderLabel, { color: colors.title }]}>Fields</Text>

          <View style={[styles.fieldsCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            {fields.map((field, index) => {
              const meta = FIELD_TYPE_META[field.field_type];

              return (
                <View
                  key={`${index}-${field.field_type}`}
                  style={[
                    styles.fieldRow,
                    index < fields.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
                  ]}
                >
                  <Ionicons name="reorder-three-outline" size={18} color={colors.muted} />

                  <View style={[styles.fieldTypeIcon, { backgroundColor: colors.softPrimary }]}> 
                    <Ionicons name={meta.icon} size={17} color={colors.primary} />
                  </View>

                  <TextInput
                    value={field.label}
                    onChangeText={(value) => updateField(index, { label: value })}
                    placeholder="Field name"
                    placeholderTextColor={colors.muted}
                    style={[styles.fieldNameInput, { color: colors.title }]}
                  />

                  <TouchableOpacity
                    style={[styles.fieldTypeChip, { backgroundColor: colors.softCard, borderColor: colors.border }]}
                    onPress={() => cycleFieldType(index)}
                    activeOpacity={0.84}
                  >
                    <Text style={[styles.fieldTypeChipText, { color: colors.title }]}>{meta.label}</Text>
                    <Ionicons name="chevron-down" size={13} color={colors.muted} />
                  </TouchableOpacity>

                  {fields.length > 1 ? (
                    <TouchableOpacity style={styles.deleteFieldButton} onPress={() => removeField(index)}>
                      <Ionicons name="trash-outline" size={18} color={colors.muted} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}

            <TouchableOpacity
              style={[styles.addFieldButton, { borderColor: withOpacity(colors.primary, "55") }]}
              onPress={() => setFields((prev) => [...prev, { label: "", field_type: "text" }])}
              activeOpacity={0.86}
            >
              <Ionicons name="add" size={17} color={colors.primary} />
              <Text style={[styles.addFieldText, { color: colors.primary }]}>Add field</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.builderLabel, { color: colors.title }]}>Where should this appear?</Text>

          <ScopeRow
            title="Only this contact"
            subtitle="This will be visible only on this profile."
            selected={scope === "contact"}
            colors={colors}
            styles={styles}
            onPress={() => setScope("contact")}
          />

          <ScopeRow
            title="All contacts"
            subtitle="This structure will be available for every profile."
            selected={scope === "global"}
            colors={colors}
            styles={styles}
            onPress={() => setScope("global")}
          />

          <Text style={[styles.builderLabel, { color: colors.title }]}>Can this section have many items?</Text>

          <ScopeRow
            title="Repeatable section"
            subtitle="Good for kids, pets, trips, jobs, or multiple gift ideas."
            selected={isRepeatable}
            colors={colors}
            styles={styles}
            onPress={() => setIsRepeatable(!isRepeatable)}
          />
        </ScrollView>

        <View style={[styles.builderFooter, { backgroundColor: colors.background, borderTopColor: colors.border }]}> 
          <TouchableOpacity
            style={[styles.builderSaveButton, { backgroundColor: colors.button }, saving && styles.disabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.buttonText} />
            ) : (
              <Text style={[styles.builderSaveText, { color: colors.buttonText }]}>
                {section ? "Save changes" : "Save custom info"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ScopeRow({
  title,
  subtitle,
  selected,
  colors,
  styles,
  onPress,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  colors: CustomInfoColors;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.scopeRow} onPress={onPress} activeOpacity={0.85}>
      <Ionicons
        name={selected ? "radio-button-on" : "radio-button-off"}
        size={23}
        color={selected ? colors.primary : colors.muted}
      />

      <View style={styles.scopeTextWrap}>
        <Text style={[styles.scopeTitle, { color: colors.title }]}>{title}</Text>
        <Text style={[styles.scopeSubtitle, { color: colors.text }]}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function CustomInfoEntryModal({
  visible,
  section,
  entry,
  saving,
  onCancel,
  onSave,
}: {
  visible: boolean;
  section: CustomInfoSection | null;
  entry?: CustomInfoEntry | null;
  saving?: boolean;
  onCancel: () => void;
  onSave: (valuesByFieldId: Record<string, string>, entryId?: string | null) => void;
}) {
  const { settings } = useAppearance();
  const colors = useMemo(() => makeCustomInfoColors(settings), [settings]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible || !section) {
      setValues({});
      return;
    }

    const nextValues: Record<string, string> = {};

    section.fields.forEach((field) => {
      const storedValue = entry?.values?.[field.id];
      nextValues[field.id] = customValueToInput(storedValue, field.field_type);
    });

    setValues(nextValues);
  }, [visible, section, entry]);

  if (!section) return null;

  const accent = section.color || colors.primary;
  const iconName = getSectionIcon(section.icon);
  const isEditing = Boolean(entry?.id);

  function updateValue(fieldId: string, value: string) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={[styles.builderScreen, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.builderHeader, { backgroundColor: colors.background }]}> 
          <TouchableOpacity style={[styles.headerButton, { backgroundColor: colors.card }]} onPress={onCancel}>
            <Ionicons name="chevron-back" size={22} color={colors.title} />
          </TouchableOpacity>

          <View style={styles.entryHeaderTitleWrap}>
            <Text style={[styles.builderTitle, { color: colors.title }]} numberOfLines={1}>
              {section.name}
            </Text>
            <Text style={[styles.entryHeaderSubtitle, { color: colors.text }]} numberOfLines={1}>
              {isEditing ? "Edit saved item" : "Add a new item"}
            </Text>
          </View>

          <TouchableOpacity style={[styles.headerButton, { backgroundColor: colors.card }]} onPress={onCancel}>
            <Ionicons name="close" size={21} color={colors.title} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.builderContent}
        >
          <View style={[styles.entryIntroCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={[styles.sectionIcon, { backgroundColor: withOpacity(accent, "16") }]}> 
              <Ionicons name={iconName} size={18} color={accent} />
            </View>
            <View style={styles.sectionTextWrap}>
              <Text style={[styles.sectionTitle, { color: colors.title }]}>{section.name}</Text>
              <Text style={[styles.sectionMeta, { color: colors.text }]}>Fill the details you want to remember.</Text>
            </View>
          </View>

          {section.fields.map((field) => {
            const meta = FIELD_TYPE_META[field.field_type];
            const currentValue = values[field.id] ?? "";
            const isLongText = field.field_type === "long_text";
            const isNumber = field.field_type === "number";
            const isBoolean = field.field_type === "boolean";

            if (isBoolean) {
              const active = currentValue === "true" || currentValue === "1";

              return (
                <View key={String(field.id)} style={styles.entryFieldBlock}>
                  <Text style={[styles.builderLabel, { color: colors.title }]}>{field.label}</Text>

                  <TouchableOpacity
                    style={[styles.booleanRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => updateValue(field.id, active ? "false" : "true")}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.fieldTypeIcon, { backgroundColor: colors.softPrimary }]}> 
                      <Ionicons name={meta.icon} size={17} color={colors.primary} />
                    </View>

                    <View style={styles.scopeTextWrap}>
                      <Text style={[styles.scopeTitle, { color: colors.title }]}>{active ? "Yes" : "No"}</Text>
                      <Text style={[styles.scopeSubtitle, { color: colors.text }]}>Tap to change</Text>
                    </View>

                    <Ionicons name={active ? "checkbox" : "square-outline"} size={24} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              );
            }

            return (
              <View key={String(field.id)} style={styles.entryFieldBlock}>
                <Text style={[styles.builderLabel, { color: colors.title }]}>{field.label}</Text>

                <View style={[styles.entryInputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                  <View style={[styles.fieldTypeIcon, { backgroundColor: colors.softPrimary }]}> 
                    <Ionicons name={meta.icon} size={17} color={colors.primary} />
                  </View>

                  <TextInput
                    value={currentValue}
                    onChangeText={(value) => updateValue(field.id, value)}
                    placeholder={field.placeholder || meta.placeholder}
                    placeholderTextColor={colors.muted}
                    keyboardType={isNumber ? "numeric" : "default"}
                    multiline={isLongText}
                    style={[
                      styles.entryInput,
                      { color: colors.title },
                      isLongText && styles.entryInputLong,
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={[styles.builderFooter, { backgroundColor: colors.background, borderTopColor: colors.border }]}> 
          <TouchableOpacity
            style={[styles.builderSaveButton, { backgroundColor: colors.button }, saving && styles.disabled]}
            onPress={() => onSave(values, entry?.id ?? null)}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.buttonText} />
            ) : (
              <Text style={[styles.builderSaveText, { color: colors.buttonText }]}>Save info</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function getCustomValueDisplay(value: any, fieldType: CustomInfoFieldType) {
  if (!value) return "—";

  if (fieldType === "number") {
    return value.value_number !== null && value.value_number !== undefined
      ? String(value.value_number)
      : "—";
  }

  if (fieldType === "date") {
    return value.value_date || "—";
  }

  if (fieldType === "boolean") {
    if (value.value_number === 1) return "Yes";
    if (value.value_number === 0) return "No";
    return "—";
  }

  return value.value_text || "—";
}

function customValueToInput(value: any, fieldType: CustomInfoFieldType) {
  if (!value) return "";

  if (fieldType === "number") {
    return value.value_number !== null && value.value_number !== undefined
      ? String(value.value_number)
      : "";
  }

  if (fieldType === "date") {
    return value.value_date || "";
  }

  if (fieldType === "boolean") {
    return value.value_number === 1 ? "true" : "false";
  }

  return value.value_text || "";
}

function getSectionIcon(icon?: string | null): keyof typeof Ionicons.glyphMap {
  if (icon && Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, icon)) {
    return icon as keyof typeof Ionicons.glyphMap;
  }

  return "sparkles-outline";
}

function makeCustomInfoColors(settings: any): CustomInfoColors {
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
  if (!hexColor || typeof hexColor !== "string") return `#000000${opacityHex}`;

  const normalized = hexColor.trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
    return `${normalized}${opacityHex}`;
  }

  return normalized;
}

function createStyles(colors: CustomInfoColors) {
  return StyleSheet.create({
    panel: {
      marginHorizontal: 14,
      marginTop: 12,
      borderRadius: 28,
      borderWidth: 1,
      padding: 14,
      shadowOpacity: 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    panelHeader: {
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 12,
    },
    panelHeaderLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    iconBubble: {
      width: 36,
      height: 36,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    panelTitle: {
      fontSize: 16,
      fontWeight: "900",
      letterSpacing: -0.1,
    },
    panelSubtitle: {
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "700",
      opacity: 0.74,
      marginTop: 2,
    },
    roundAddButton: {
      width: 38,
      height: 38,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyCard: {
      minHeight: 118,
      borderRadius: 24,
      borderWidth: 1,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },
    emptyIcon: {
      width: 48,
      height: 48,
      borderRadius: 19,
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
    emptyText: {
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "700",
      opacity: 0.74,
      marginTop: 3,
    },
    emptyButton: {
      minHeight: 34,
      borderRadius: 999,
      paddingHorizontal: 11,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    emptyButtonText: {
      fontSize: 11,
      fontWeight: "900",
    },
    sectionList: {
      gap: 10,
    },
    sectionCard: {
      borderRadius: 24,
      borderWidth: 1,
      padding: 13,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    sectionTitleRow: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    sectionIcon: {
      width: 38,
      height: 38,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "900",
    },
    sectionMeta: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: "700",
      opacity: 0.74,
      marginTop: 2,
    },
    sectionMenuButton: {
      width: 34,
      height: 34,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
    },
    entriesList: {
      gap: 9,
      marginTop: 12,
    },
    entryPreview: {
      borderRadius: 20,
      borderWidth: 1,
      padding: 12,
      gap: 7,
    },
    valueRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    valueLabel: {
      width: "42%",
      fontSize: 12,
      fontWeight: "800",
      opacity: 0.86,
    },
    valueText: {
      flex: 1,
      textAlign: "right",
      fontSize: 13,
      fontWeight: "900",
    },
    entryFooterRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 3,
    },
    entryFooterText: {
      fontSize: 12,
      fontWeight: "900",
    },
    noEntryBox: {
      minHeight: 56,
      borderRadius: 18,
      borderWidth: 1,
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    noEntryText: {
      fontSize: 13,
      fontWeight: "900",
    },
    outlineButton: {
      minHeight: 44,
      borderRadius: 18,
      borderWidth: 1,
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },
    outlineButtonText: {
      fontSize: 13,
      fontWeight: "900",
    },
    builderScreen: {
      flex: 1,
    },
    builderHeader: {
      minHeight: 88,
      paddingTop: 44,
      paddingHorizontal: 16,
      paddingBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    builderTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 18,
      fontWeight: "900",
      letterSpacing: -0.2,
    },
    entryHeaderTitleWrap: {
      flex: 1,
      minWidth: 0,
      alignItems: "center",
    },
    entryHeaderSubtitle: {
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "700",
      opacity: 0.72,
      marginTop: 1,
    },
    builderContent: {
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === "android" ? 166 : 142,
    },
    builderLabel: {
      fontSize: 13,
      fontWeight: "900",
      marginTop: 17,
      marginBottom: 8,
    },
    templateRow: {
      gap: 8,
      paddingRight: 16,
    },
    templateChip: {
      minHeight: 38,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    templateChipText: {
      fontSize: 12,
      fontWeight: "900",
    },
    builderInput: {
      minHeight: 52,
      borderRadius: 18,
      borderWidth: 1,
      paddingHorizontal: 14,
      fontSize: 15,
      fontWeight: "800",
    },
    fieldsCard: {
      borderRadius: 24,
      borderWidth: 1,
      padding: 10,
    },
    fieldRow: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    fieldTypeIcon: {
      width: 34,
      height: 34,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
    },
    fieldNameInput: {
      flex: 1,
      minWidth: 0,
      minHeight: 44,
      fontSize: 14,
      fontWeight: "800",
    },
    fieldTypeChip: {
      minHeight: 34,
      maxWidth: 88,
      borderRadius: 13,
      borderWidth: 1,
      paddingHorizontal: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    fieldTypeChipText: {
      fontSize: 11,
      fontWeight: "900",
    },
    deleteFieldButton: {
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
    },
    addFieldButton: {
      minHeight: 44,
      borderRadius: 16,
      borderWidth: 1,
      borderStyle: "dashed",
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    addFieldText: {
      fontSize: 13,
      fontWeight: "900",
    },
    scopeRow: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      paddingVertical: 10,
    },
    scopeTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    scopeTitle: {
      fontSize: 14,
      fontWeight: "900",
    },
    scopeSubtitle: {
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "700",
      opacity: 0.72,
      marginTop: 2,
    },
    builderFooter: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      borderTopWidth: 1,
      paddingHorizontal: 18,
      paddingTop: 14,
      paddingBottom: Platform.OS === "android" ? 52 : 34,
    },
    builderSaveButton: {
      minHeight: 54,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    builderSaveText: {
      fontSize: 15,
      fontWeight: "900",
    },
    entryIntroCard: {
      minHeight: 66,
      borderRadius: 22,
      borderWidth: 1,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginTop: 4,
    },
    entryFieldBlock: {
      marginTop: 2,
    },
    entryInputWrap: {
      minHeight: 54,
      borderRadius: 18,
      borderWidth: 1,
      paddingHorizontal: 11,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },
    entryInput: {
      flex: 1,
      minWidth: 0,
      minHeight: 44,
      fontSize: 14,
      fontWeight: "800",
    },
    entryInputLong: {
      minHeight: 104,
      paddingTop: 12,
      textAlignVertical: "top",
    },
    booleanRow: {
      minHeight: 58,
      borderRadius: 18,
      borderWidth: 1,
      paddingHorizontal: 11,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    disabled: {
      opacity: 0.6,
    },
    iconPickerRow: {
  gap: 9,
  paddingRight: 16,
},

iconChoice: {
  width: 42,
  height: 42,
  borderRadius: 17,
  borderWidth: 1,
  alignItems: "center",
  justifyContent: "center",
},
  });
}
