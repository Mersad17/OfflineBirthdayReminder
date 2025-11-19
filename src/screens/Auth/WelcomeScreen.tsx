// src/screens/Auth/WelcomeScreen.tsx
import { View, Text, Button } from "react-native";
import React from "react";

export default function WelcomeScreen({ navigation }: any) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Never miss a birthday 🎂</Text>
      <Button title="Create account" onPress={() => navigation.navigate("Register")} />
      <Button title="I already have an account" onPress={() => navigation.navigate("Login")} />
    </View>
  );
}
