import React from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { createContact } from "../../contacts/api";

export default function AddContactScreen({ navigation }: any) {
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [birthday, setBirthday] = React.useState(""); // "YYYY-MM-DD"
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function onSubmit() {
    // minimal client-side guard; server is the source of truth
    if (!first.trim() || !last.trim()) {
      Alert.alert("Name required", "Please enter first and last name.");
      return;
    }
    setSaving(true);
    try {
      await createContact({
        first_name: first.trim(),
        last_name: last.trim(),
        birthday: birthday ? birthday : undefined,
        email: email || undefined,
        phone: phone || undefined,
      });
      Alert.alert("Success", "Contact created.");
      navigation.goBack();
    } catch (e: any) {
      // respect backend error messages (e.g., plan limit reached)
      const detail = e?.response?.data?.detail;
      if (detail) {
        Alert.alert("Cannot add contact", detail);
      } else {
        Alert.alert("Error", "Failed to create contact.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>Add Contact</Text>

      <Text>First name</Text>
      <TextInput value={first} onChangeText={setFirst} style={{ borderWidth: 1, padding: 8 }} />

      <Text>Last name</Text>
      <TextInput value={last} onChangeText={setLast} style={{ borderWidth: 1, padding: 8 }} />

      <Text>Birthday (YYYY-MM-DD)</Text>
      <TextInput value={birthday} onChangeText={setBirthday} placeholder="1990-07-21" style={{ borderWidth: 1, padding: 8 }} />

      <Text>Email (optional)</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={{ borderWidth: 1, padding: 8 }} />

      <Text>Phone (optional)</Text>
      <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={{ borderWidth: 1, padding: 8 }} />

      <Button title={saving ? "Saving..." : "Save"} onPress={onSubmit} />
    </View>
  );
}
