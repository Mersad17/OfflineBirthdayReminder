// src/components/Screen.tsx
import React from "react";
import {
  View,
  ImageBackground,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { useAppearance } from "../appearance/AppearanceContext";

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
};

export function Screen({ children, scroll = false, style }: Props) {
  const { settings } = useAppearance();
  const resizeMode = settings.backgroundResizeMode || "cover";
  const hasBgImage = !!settings.backgroundImageUri;

  const Container = scroll ? ScrollView : View;

  // 👇 ICI : on force le type
  const Background: React.ElementType = hasBgImage ? ImageBackground : View;

  const backgroundProps = hasBgImage
    ? {
        source: { uri: settings.backgroundImageUri! },
        resizeMode,
      }
    : { style: { backgroundColor: settings.backgroundColor } };

  return (
    <Background
      {...backgroundProps}
      style={[styles.background, backgroundProps.style]}
    >
      <Container
        {...(scroll
          ? { contentContainerStyle: [styles.contentScroll, style] }
          : { style: [styles.content, style] })}
      >
        {children}
      </Container>
    </Background>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentScroll: {
    flexGrow: 1,
  },
});
