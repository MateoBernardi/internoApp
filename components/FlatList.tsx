import { Colors } from '@/constants/theme';
import React, { memo } from 'react';
import {
    FlatList,
    FlatListProps,
    ListRenderItem,
    StyleSheet,
    View,
    ViewStyle,
} from 'react-native';

type OwnFlatListProps<T> = Omit<FlatListProps<T>, 'renderItem' | 'contentContainerStyle'> & {
  data: T[];
  renderItem: ListRenderItem<T>;
  containerStyle?: ViewStyle;
  itemSeparatorStyle?: ViewStyle;
  showSeparators?: boolean;
  contentContainerStyle?: ViewStyle;
};

const OwnFlatListInner = <T,>({
    data,
    renderItem,
    containerStyle,
    itemSeparatorStyle,
    showSeparators = true,
    contentContainerStyle,
    ...flatListProps
  }: OwnFlatListProps<T>) => {
    const colors = Colors['light'];

    return (
      <View style={[styles.container, { backgroundColor: colors.componentBackground }, containerStyle]}>
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
                        backgroundColor: colors.secondaryText,
                      },
                      itemSeparatorStyle,
                    ]}
                  />
                )
              : undefined
          }
          contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
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
