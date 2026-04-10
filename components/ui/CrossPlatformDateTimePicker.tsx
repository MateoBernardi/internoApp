import NativeDateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';

type InteractionPoint = { x: number; y: number };

let listenersReady = false;
let lastInteractionPoint: InteractionPoint | null = null;
let lastInteractionTimestamp = 0;

function rememberInteractionPoint(x: number, y: number) {
  lastInteractionPoint = { x, y };
  lastInteractionTimestamp = Date.now();
}

function ensureInteractionListeners() {
  if (listenersReady || typeof document === 'undefined') return;

  const handlePointerDown = (event: any) => {
    if (typeof event?.clientX === 'number' && typeof event?.clientY === 'number') {
      rememberInteractionPoint(event.clientX, event.clientY);
    }
  };

  const handleClick = (event: any) => {
    if (typeof event?.clientX === 'number' && typeof event?.clientY === 'number') {
      rememberInteractionPoint(event.clientX, event.clientY);
    }
  };

  document.addEventListener('pointerdown', handlePointerDown, true);
  document.addEventListener('click', handleClick, true);
  listenersReady = true;
}

function getFallbackAnchorPoint(): InteractionPoint {
  if (typeof document !== 'undefined' && document.activeElement) {
    const activeElement = document.activeElement as HTMLElement;
    if (typeof activeElement?.getBoundingClientRect === 'function') {
      const rect = activeElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      }
    }
  }

  if (typeof window !== 'undefined') {
    return {
      x: Math.max(window.innerWidth / 2, 0),
      y: Math.max(window.innerHeight / 2, 0),
    };
  }

  return { x: 0, y: 0 };
}

function getAnchorPoint(): InteractionPoint {
  const hasRecentInteraction = Date.now() - lastInteractionTimestamp < 1500;
  return hasRecentInteraction && lastInteractionPoint
    ? lastInteractionPoint
    : getFallbackAnchorPoint();
}

type PickerMode = 'date' | 'time' | 'datetime';

type PickerEvent = {
  type: 'set' | 'dismissed';
  nativeEvent?: {
    timestamp?: number;
  };
};

type CrossPlatformDateTimePickerProps = {
  value: Date;
  mode?: PickerMode;
  display?: string;
  is24Hour?: boolean;
  testID?: string;
  onChange?: (event: PickerEvent, date?: Date) => void;
};

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toTimeInputValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function applyDateToBase(base: Date, value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const next = new Date(base);
  next.setFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  next.setSeconds(0, 0);
  return next;
}

function applyTimeToBase(base: Date, value: string): Date | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const next = new Date(base);
  next.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return next;
}

function normalizeToMinute(date: Date): Date {
  const normalized = new Date(date);
  normalized.setSeconds(0, 0);
  return normalized;
}

export default function CrossPlatformDateTimePicker(props: CrossPlatformDateTimePickerProps) {
  const { value, mode = 'date', onChange, testID, ...nativeProps } = props;
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (!isWeb || typeof document === 'undefined') {
      return;
    }

    ensureInteractionListeners();

    const input = document.createElement('input');
    input.setAttribute('data-testid', testID || 'webDateTimePicker');
    input.style.position = 'fixed';
    input.style.opacity = '0.001';
    input.style.pointerEvents = 'auto';
    input.style.width = '1px';
    input.style.height = '1px';
    input.style.border = '0';
    input.style.padding = '0';
    input.style.margin = '0';
    input.style.zIndex = '2147483647';

    const anchor = getAnchorPoint();
    const left = typeof window !== 'undefined'
      ? Math.min(Math.max(anchor.x, 0), Math.max(window.innerWidth - 1, 0))
      : Math.max(anchor.x, 0);
    const top = typeof window !== 'undefined'
      ? Math.min(Math.max(anchor.y, 0), Math.max(window.innerHeight - 1, 0))
      : Math.max(anchor.y, 0);

    input.style.left = `${left}px`;
    input.style.top = `${top}px`;

    input.type = mode === 'time' ? 'time' : 'date';
    input.value = mode === 'time' ? toTimeInputValue(value) : toDateInputValue(value);

    let changed = false;
    let finished = false;
    let openedAt = 0;

    const inputWithShowPicker = input as HTMLInputElement & { showPicker?: () => void };
    const supportsShowPicker = typeof inputWithShowPicker.showPicker === 'function';

    const emitDismissed = () => {
      if (finished) return;
      finished = true;
      onChange?.({ type: 'dismissed', nativeEvent: { timestamp: value.getTime() } }, undefined);
    };

    const handleChange = () => {
      const nextDate =
        mode === 'time'
          ? applyTimeToBase(value, input.value)
          : applyDateToBase(value, input.value);

      if (!nextDate) {
        emitDismissed();
        return;
      }

      changed = true;
      finished = true;
      const normalizedDate = normalizeToMinute(nextDate);
      onChange?.(
        {
          type: 'set',
          nativeEvent: { timestamp: normalizedDate.getTime() },
        },
        normalizedDate
      );
    };

    const handleCancel = () => {
      if (!changed) {
        emitDismissed();
      }
    };

    const handleBlur = () => {
      // Some browsers do not emit cancel for native pickers; blur is a fallback only.
      // With showPicker, blur can happen immediately on open, so ignore that first blur.
      const elapsedSinceOpen = Date.now() - openedAt;
      if (supportsShowPicker && elapsedSinceOpen >= 0 && elapsedSinceOpen < 250) {
        return;
      }

      if (!changed) {
        window.setTimeout(() => {
          if (!finished) emitDismissed();
        }, 0);
      }
    };

    input.addEventListener('change', handleChange);
    input.addEventListener('cancel', handleCancel as EventListener);
    input.addEventListener('blur', handleBlur as EventListener);
    document.body.appendChild(input);

    const openPicker = () => {
      openedAt = Date.now();
      try {
        input.focus();
        if (supportsShowPicker) {
          inputWithShowPicker.showPicker();
        } else {
          input.click();
        }
      } catch {
        input.click();
      }
    };

    const openTimer = window.setTimeout(openPicker, 0);

    return () => {
      window.clearTimeout(openTimer);
      input.removeEventListener('change', handleChange);
      input.removeEventListener('cancel', handleCancel as EventListener);
      input.removeEventListener('blur', handleBlur as EventListener);
      if (input.parentElement) {
        input.parentElement.removeChild(input);
      }
    };
  }, [isWeb, mode, onChange, testID, value]);

  if (!isWeb) {
    return (
      <NativeDateTimePicker
        value={value}
        mode={mode}
        onChange={(event: any, selectedDate?: Date) => {
          if (!selectedDate) {
            onChange?.(event, selectedDate);
            return;
          }

          onChange?.(event, normalizeToMinute(selectedDate));
        }}
        testID={testID}
        {...(nativeProps as any)}
      />
    );
  }

  return null;
}
