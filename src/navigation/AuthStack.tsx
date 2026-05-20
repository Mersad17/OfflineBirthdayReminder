// src/navigation/AuthStack.tsx
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WelcomeScreen from "../screens/Auth/WelcomeScreen";
import LoginScreen from "../screens/Auth/LoginScreen";
import RegisterScreen from "../screens/Auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/Auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/Auth/ResetPasswordScreen";
import VerifyEmailScreen from "../screens/Auth/VerifyEmailScreen";

const Stack = createNativeStackNavigator();
export default function AuthStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
