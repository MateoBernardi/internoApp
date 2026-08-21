import { glassColors, glassStyles } from '@/shared/ui/glass';
import React, { memo, useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export interface GlassTab {
  key: string;
  label: string;
  showBadge?: boolean;
}

interface GlassTabSelectorProps {
  tabs: GlassTab[];
  activeKey: string;
  onChange: (key: string) => void;
}

/**
 * Segmented tab control with a sliding glass pill indicator. Generic over
 * any number of tabs — the indicator width/position is derived from the
 * measured container width, not hardcoded to two tabs.
 */
export const GlassTabSelector = memo(({ tabs, activeKey, onChange }: GlassTabSelectorProps) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === activeKey));
  const indexAnim = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    Animated.timing(indexAnim, {
      toValue: activeIndex,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, indexAnim]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const segmentWidth = tabs.length > 0 ? containerWidth / tabs.length : 0;
  const indicatorTranslateX = indexAnim.interpolate({
    inputRange: tabs.map((_, i) => i),
    outputRange: tabs.map((_, i) => i * segmentWidth),
  });

  return (
    <View style={[glassStyles.fieldGlass, styles.container]} onLayout={handleLayout}>
      {containerWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            {
              width: segmentWidth,
              transform: [{ translateX: indicatorTranslateX }],
            },
          ]}
        />
      )}
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onChange(tab.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <View style={styles.tabLabelRow}>
              <Text style={[styles.tabText, isActive ? styles.tabTextActive : styles.tabTextInactive]}>
                {tab.label}
              </Text>
              {tab.showBadge && <View style={styles.badgeDot} />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

GlassTabSelector.displayName = 'GlassTabSelector';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 12,
    backgroundColor: 'rgba(26,115,232,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(26,115,232,0.35)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: glassColors.link,
  },
  tabTextInactive: {
    color: glassColors.textMuted,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: glassColors.error,
    flexShrink: 0,
  },
});
