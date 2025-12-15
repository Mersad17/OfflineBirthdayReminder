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

  const backgroundStyle = [
    styles.background,
    !hasBgImage && { backgroundColor: settings.backgroundColor },
  ];

  if (hasBgImage) {
    return (
      <ImageBackground
        source={{ uri: settings.backgroundImageUri! }}
        resizeMode={resizeMode}
        style={backgroundStyle}
      >
        <Container
          {...(scroll
            ? { contentContainerStyle: [styles.contentScroll, style] }
            : { style: [styles.content, style] })}
        >
          {children}
        </Container>
      </ImageBackground>
    );
  }

  // no image → plain background color
  return (
    <View style={backgroundStyle}>
      <Container
        {...(scroll
          ? { contentContainerStyle: [styles.contentScroll, style] }
          : { style: [styles.content, style] })}
      >
        {children}
      </Container>
    </View>
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
