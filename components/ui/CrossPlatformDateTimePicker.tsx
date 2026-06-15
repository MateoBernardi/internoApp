import { ThemedText } from '@/components/themed-text';
import NativeDateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { es } from 'date-fns/locale/es'; // ← en v9 el path cambió
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

registerLocale('es', es);

type CrossPlatformDateTimePickerProps = {
  visible?: boolean;
  value: Date;
  mode?: 'date' | 'time';
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  is24Hour?: boolean;
  display?: React.ComponentProps<typeof NativeDateTimePicker>['display'];
  testID?: string;
  onConfirm?: (date: Date) => void;
  onCancel?: () => void;
  // Backward-compatible signature while consumers are migrated.
  onChange?: (event: DateTimePickerEvent, date?: Date) => void;
};

const timeInMinutes = (d: Date) => d.getHours() * 60 + d.getMinutes();

export default function CrossPlatformDateTimePicker(props: CrossPlatformDateTimePickerProps) {
  const {
    visible = true,
    value,
    onConfirm,
    onCancel,
    onChange,
    mode = 'date',
    minimumDate,
    maximumDate,
    disabled,
    is24Hour = true,
    display,
    testID,
  } = props;

  const isWeb = Platform.OS === 'web';
  const isIOS = Platform.OS === 'ios';
  const shouldRender = visible && !disabled;
  const [draftValue, setDraftValue] = useState(value);
  const hasEmitted = useRef(false);

  const safeValue = useMemo(() => {
    return value instanceof Date && !isNaN(value.getTime())
      ? value
      : new Date();
  }, [value]);

  useEffect(() => {
    setDraftValue(safeValue);
    if (visible) {
      hasEmitted.current = false;
    }
  }, [visible, safeValue]);

  const emitSet = (nextDate: Date) => {
    hasEmitted.current = false;
    const event = {
      type: 'set',
      nativeEvent: {
        timestamp: nextDate.getTime(),
        utcOffset: 0,
      },
    } as DateTimePickerEvent;
    onChange?.(event, nextDate);
    onConfirm?.(nextDate);
  };

  const emitDismiss = () => {
    hasEmitted.current = false;
    setDraftValue(safeValue);
    const event = {
      type: 'dismissed',
      nativeEvent: {
        timestamp: Date.now(),
        utcOffset: 0,
      },
    } as DateTimePickerEvent;
    onChange?.(event);
    onCancel?.();
  };

  const nativeDisplay = useMemo(() => {
    if (display) return display;
    if (isIOS) return 'spinner';
    return 'default';
  }, [display, isIOS]);

  if (!shouldRender) {
    return null;
  }

  // Renderizar la versión nativa (iOS / Android)
  if (!isWeb) {
    if (!isIOS) {
      return (
        <NativeDateTimePicker
          value={value}
          mode={mode}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          is24Hour={is24Hour}
          display={nativeDisplay}
          testID={testID}
          onChange={(event, selectedDate) => {
            if (hasEmitted.current) return;
            if (event.type === 'dismissed' || !selectedDate) {
              hasEmitted.current = true;
              emitDismiss();
              return;
            }
            hasEmitted.current = true;
            emitSet(selectedDate);
          }}
        />
      );
    }

    return (
      <View style={styles.container}>
        <NativeDateTimePicker
          value={draftValue}
          mode={mode}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          is24Hour={is24Hour}
          display={nativeDisplay}
          testID={testID}
          onChange={(event, selectedDate) => {
            if (event.type === 'dismissed') {
              emitDismiss();
              return;
            }
            if (selectedDate) {
              setDraftValue(selectedDate);
            }
          }}
        />

        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={emitDismiss}>
            <ThemedText style={styles.actionText}>Cancelar</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            if (minimumDate && draftValue < minimumDate) return;
            if (maximumDate && draftValue > maximumDate) return;
            emitSet(draftValue);
          }}>
            <ThemedText style={[styles.actionText, styles.actionConfirm]}>OK</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (mode === 'time') {
    return (
      <View style={styles.webOverlay}>
        <View style={styles.webContainer}>
          <ReactDatePicker
            wrapperClassName="cp-picker-wrap"
            calendarClassName="cp-picker-calendar"
            selected={draftValue}
            onChange={(date: Date | null) => date && setDraftValue(date)}
            showTimeSelect
            showTimeSelectOnly
            timeIntervals={15}
            timeCaption="Hora"
            dateFormat="HH:mm"
            timeFormat="HH:mm"
            minTime={minimumDate}
            maxTime={maximumDate}
            locale="es"
            inline
          />
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={emitDismiss}>
              <ThemedText style={styles.actionText}>Cancelar</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              if (minimumDate && timeInMinutes(draftValue) < timeInMinutes(minimumDate)) return;
              if (maximumDate && timeInMinutes(draftValue) > timeInMinutes(maximumDate)) return;
              emitSet(draftValue);
            }}>
              <ThemedText style={[styles.actionText, styles.actionConfirm]}>OK</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Por defecto, renderiza modo 'date'
  return (
    <View style={styles.webOverlay}>
      <View style={styles.webContainer}>
        <ReactDatePicker
          wrapperClassName="cp-picker-wrap"
          calendarClassName="cp-picker-calendar"
          selected={draftValue}
          onChange={(date: Date | null) => date && setDraftValue(date)}
          minDate={minimumDate}
          maxDate={maximumDate}
          locale="es"
          inline
        />
        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={emitDismiss}>
            <ThemedText style={styles.actionText}>Cancelar</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => emitSet(draftValue)}>
            <ThemedText style={[styles.actionText, styles.actionConfirm]}>OK</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  actionsRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    columnGap: 16,
  },
  actionText: {
    fontSize: 14,
  },
  actionConfirm: {
    fontWeight: '700',
  },
  webContainer: {
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d9dce3',
    borderRadius: 14,
    padding: 10,
    gap: 8,
    width: 340,
    maxWidth: '92%',
  },
  webOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
});