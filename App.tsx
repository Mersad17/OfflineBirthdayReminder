// App.tsx
import { AuthProvider } from "./src/auth/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import React from "react";

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
