// App.tsx
import { AuthProvider } from "./src/auth/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { useRegisterPushToken } from "./src/notifications/useRegisterPushToken";
import React from "react";

function Bootstrap(){
  useRegisterPushToken();
  return <RootNavigator/>
}

export default function App() {
  return (
    <AuthProvider>
      <Bootstrap />
    </AuthProvider>
  );
}
