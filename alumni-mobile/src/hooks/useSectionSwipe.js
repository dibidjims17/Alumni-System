import { useRef } from 'react';
import { PanResponder } from 'react-native';

const ACTIVATE_DISTANCE = 18;
const NAVIGATE_DISTANCE = 64;
const NAVIGATE_VELOCITY = 0.45;
const NAVIGATION_LOCK_MS = 350;

// Adds horizontal sibling navigation without taking vertical scrolling away
// from ScrollView/FlatList. Swipe left advances; swipe right returns to the
// previous section. The visible SectionTabs remain the accessible fallback.
export default function useSectionSwipe({
  items,
  active,
  navigation,
  enabled = true,
}) {
  const configRef = useRef({ items, active, navigation, enabled });
  const lastNavigationRef = useRef(0);
  configRef.current = { items, active, navigation, enabled };

  const responderRef = useRef(null);
  if (!responderRef.current) {
    responderRef.current = PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (_event, gesture) => {
        if (!configRef.current.enabled) return false;
        const horizontal = Math.abs(gesture.dx);
        const vertical = Math.abs(gesture.dy);
        return horizontal >= ACTIVATE_DISTANCE && horizontal > vertical * 1.35;
      },
      onMoveShouldSetPanResponder: (_event, gesture) => {
        if (!configRef.current.enabled) return false;
        const horizontal = Math.abs(gesture.dx);
        const vertical = Math.abs(gesture.dy);
        return horizontal >= ACTIVATE_DISTANCE && horizontal > vertical * 1.35;
      },
      onPanResponderRelease: (_event, gesture) => {
        const { items: currentItems, active: currentActive, navigation: nav, enabled: canSwipe } =
          configRef.current;
        if (!canSwipe || !nav || !currentItems?.length) return;

        const horizontal = Math.abs(gesture.dx);
        const fastEnough = Math.abs(gesture.vx) >= NAVIGATE_VELOCITY;
        if (horizontal < NAVIGATE_DISTANCE && !(fastEnough && horizontal >= 30)) return;

        const activeIndex = currentItems.findIndex((item) => item.screen === currentActive);
        if (activeIndex < 0) return;

        const direction = gesture.dx < 0 ? 1 : -1;
        const target = currentItems[activeIndex + direction];
        if (!target) return;

        const now = Date.now();
        if (now - lastNavigationRef.current < NAVIGATION_LOCK_MS) return;
        lastNavigationRef.current = now;

        nav.navigate(target.screen, {
          sectionDirection: direction,
          sectionTransitionKey: now,
        });
      },
      onPanResponderTerminationRequest: () => true,
    });
  }

  return responderRef.current.panHandlers;
}
