/**
 * App-wide toast / snackbar system.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success('Marked paid');
 *   toast.info('You are in demo mode');
 *   toast.error('Could not save');
 *
 * Toasts queue up and auto-dismiss after 2.5s. Stacks at the top under the
 * status bar; tapping a toast dismisses it immediately.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from './ThemeContext';
import { ThemeColors, fonts } from './theme';

type Tone = 'success' | 'info' | 'error';

interface ToastItem {
  id: number;
  tone: Tone;
  message: string;
  hint?: string;
}

interface ToastContextType {
  show: (message: string, opts?: { tone?: Tone; hint?: string }) => void;
  success: (message: string, hint?: string) => void;
  info: (message: string, hint?: string) => void;
  error: (message: string, hint?: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  show: () => {},
  success: () => {},
  info: () => {},
  error: () => {},
});

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback((message: string, opts?: { tone?: Tone; hint?: string }) => {
    const id = nextId++;
    const item: ToastItem = { id, tone: opts?.tone ?? 'success', message, hint: opts?.hint };
    setItems(prev => [...prev, item]);
    setTimeout(() => dismiss(id), 2500);
  }, [dismiss]);

  const api = useMemo<ToastContextType>(() => ({
    show,
    success: (m, hint) => show(m, { tone: 'success', hint }),
    info:    (m, hint) => show(m, { tone: 'info', hint }),
    error:   (m, hint) => show(m, { tone: 'error', hint }),
  }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastStack items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function ToastStack({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <View pointerEvents="box-none" style={styles.stack}>
      {items.map(t => (
        <Toast key={t.id} item={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </View>
  );
}

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,   { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    return () => {
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
    };
  }, [opacity, translateY]);

  const palette: Record<Tone, { bg: string; fg: string; mark: string }> = {
    success: { bg: colors.successLight, fg: colors.success, mark: '✓' },
    info:    { bg: colors.primaryLight, fg: colors.primary, mark: 'i' },
    error:   { bg: colors.dangerLight,  fg: colors.danger,  mark: '!' },
  };
  const p = palette[item.tone];

  return (
    <Animated.View style={[styles.toast, { backgroundColor: p.bg, opacity, transform: [{ translateY }] }]}>
      <TouchableOpacity activeOpacity={0.85} onPress={onDismiss} style={styles.toastInner}>
        <View style={[styles.mark, { backgroundColor: p.fg }]}>
          <Text style={[styles.markText, { color: p.bg }]}>{p.mark}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.message, { color: p.fg }]} numberOfLines={2}>{item.message}</Text>
          {item.hint && <Text style={[styles.hint, { color: p.fg }]} numberOfLines={2}>{item.hint}</Text>}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    top: 50,
    left: 0, right: 0,
    alignItems: 'center',
    gap: 8,
    zIndex: 9999,
    paddingHorizontal: 16,
  },
  toast: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  toastInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  mark: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  markText: { fontSize: 13, ...fonts.bold, lineHeight: 14 },
  message: { fontSize: 14, ...fonts.semiBold },
  hint:    { fontSize: 12, ...fonts.regular, marginTop: 2, opacity: 0.85 },
});
