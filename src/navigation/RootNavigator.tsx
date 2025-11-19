// src/navigation/RootNavigator.tsx
import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "../auth/AuthContext";
import AuthStack from "./AuthStack";
import AppTabs from "./AppTabs";

export default function RootNavigator() {
  const { isAuthenticated } = useAuth();
  return (
    <NavigationContainer>
      {isAuthenticated ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
