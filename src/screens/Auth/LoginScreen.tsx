// src/screens/Auth/LoginScreen.tsx
import React, { useState } from "react";
import { View, TextInput, Button, Text } from "react-native";
import { useAuth } from "../../auth/AuthContext";

export default function LoginScreen() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
 
  async function onSubmit() {
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      
      alert("Login failed");
    }
  }

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text>Email</Text>
      <TextInput autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={{ borderWidth: 1, padding: 8 }} />
      <Text>Password</Text>
      <TextInput secureTextEntry value={password} onChangeText={setPassword} style={{ borderWidth: 1, padding: 8 }} />
      <Button title={loading ? "..." : "Login"} onPress={onSubmit} />
    </View>
  );
}
