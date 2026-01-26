import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { memo } from 'react';
import {
    FlatList,
    FlatListProps,
    ListRenderItem,
    StyleSheet,
    View,
    ViewStyle,
} from 'react-native';

type OwnFlatListProps<T> = Omit<FlatListProps<T>, 'renderItem'> & {
  data: T[];
  renderItem: ListRenderItem<T>;
  containerStyle?: ViewStyle;
  itemSeparatorStyle?: ViewStyle;
  showSeparators?: boolean;
};

const OwnFlatListInner = <T,>({
    data,
    renderItem,
    containerStyle,
    itemSeparatorStyle,
    showSeparators = true,
    ...flatListProps
  }: OwnFlatListProps<T>) => {
    const colorScheme = useColorScheme();
    const backgroundColor = Colors[colorScheme ?? 'light'].background;
    const textColor = Colors[colorScheme ?? 'light'].text;

    return (
      <View style={[styles.container, { backgroundColor }, containerStyle]}>
        <FlatList
          data={data}
          renderItem={renderItem}
          scrollEnabled={flatListProps.scrollEnabled !== false}
          ItemSeparatorComponent={
            showSeparators
              ? () => (
                  <View
                    style={[
                      styles.separator,
                      {
                        backgroundColor:
                          colorScheme === 'dark'
                            ? 'rgba(255, 255, 255, 0.1)'
                            : 'rgba(0, 0, 0, 0.08)',
                      },
                      itemSeparatorStyle,
                    ]}
                  />
                )
              : undefined
          }
          contentContainerStyle={styles.contentContainer}
          {...flatListProps}
        />
      </View>
    );
  };

export const OwnFlatList = memo(OwnFlatListInner) as typeof OwnFlatListInner;

// OwnFlatList.displayName = 'OwnFlatList';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 8,
  },
  separator: {
    height: 1,
    marginVertical: 0,
    marginHorizontal: 16,
  },
});
