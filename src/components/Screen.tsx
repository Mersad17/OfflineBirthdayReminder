// src/components/Screen.tsx
import React from "react";
import {
  ImageBackground,
  Keyboard,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from "react-native";
import { useAppearance } from "../appearance/AppearanceContext";

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;

  /**
   * Important for screens with inputs inside ScrollView.
   * "always" prevents the first tap from only closing the keyboard.
   */
  keyboardShouldPersistTaps?: ScrollViewProps["keyboardShouldPersistTaps"];
  keyboardDismissMode?: ScrollViewProps["keyboardDismissMode"];
  dismissKeyboardOnPress?: boolean;
  showsVerticalScrollIndicator?: boolean;
};

export function Screen({
  children,
  scroll = false,
  style,
  keyboardShouldPersistTaps = "handled",
  keyboardDismissMode = "on-drag",
  dismissKeyboardOnPress = false,
  showsVerticalScrollIndicator = false,
}: Props) {
  const { settings } = useAppearance();

  const resizeMode = settings.backgroundResizeMode || "cover";
  const hasBgImage = !!settings.backgroundImageUri;

  const content = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={keyboardDismissMode}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      contentContainerStyle={[styles.contentScroll, style]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, style]}>{children}</View>
  );

  const wrappedContent = dismissKeyboardOnPress ? (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {content}
    </TouchableWithoutFeedback>
  ) : (
    content
  );

  if (hasBgImage) {
    return (
      <ImageBackground
        source={{ uri: settings.backgroundImageUri! }}
        resizeMode={resizeMode}
        style={[
          styles.background,
          { backgroundColor: settings.backgroundColor },
        ]}
      >
        {wrappedContent}
      </ImageBackground>
    );
  }

  return (
    <View
      style={[
        styles.background,
        { backgroundColor: settings.backgroundColor },
      ]}
    >
      {wrappedContent}
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