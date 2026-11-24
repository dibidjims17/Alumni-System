import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, useWindowDimensions } from 'react-native';

// Keeps the shared header/tab container stationary while only the section
// body slides in. Native-stack animation is disabled for these sibling routes;
// route params tell the incoming body which direction the user moved.
export default function SectionBodyTransition({ route, panHandlers, children, style }) {
  const { width } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const direction = route?.params?.sectionDirection || 0;
  const transitionKey = route?.params?.sectionTransitionKey;

  useEffect(() => {
    if (!direction || !transitionKey) {
      translateX.setValue(0);
      opacity.setValue(1);
      return;
    }

    const offset = Math.min(width * 0.16, 72) * direction;
    translateX.setValue(offset);
    opacity.setValue(0.88);

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 190,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, [direction, opacity, transitionKey, translateX, width]);

  return (
    <Animated.View
      style={[styles.body, style, { opacity, transform: [{ translateX }] }]}
      {...panHandlers}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, overflow: 'hidden' },
});
