/**
 * Shared atoms ported from the Claude Design prototype
 * (`.planning/design-handoff/project/lib/chitti-ui.jsx`).
 *
 * Every redesigned screen pulls Wordmark / Avatar / RoleBadge / NavHeader /
 * SectionLabel / Pill / VerifiedSeal / MoneyEquation / KickerCard from here so
 * the design language stays consistent across the app.
 */

import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../lib/ThemeContext';
import { ThemeColors, fonts, fmtINR, tnum } from '../lib/theme';

/* ───────────────────────── Wordmark ───────────────────────── */

export function Wordmark({ size = 32, color, dotColor }: { size?: number; color?: string; dotColor?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ position: 'relative', alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: size, ...fonts.bold, color: color ?? colors.text, letterSpacing: -size * 0.02, lineHeight: size * 1.05 }}>
        chitti
      </Text>
      <View
        style={{
          position: 'absolute',
          width: size * 0.14,
          height: size * 0.14,
          borderRadius: size * 0.07,
          backgroundColor: dotColor ?? colors.accent,
          right: size * 0.24,
          top: size * 0.1,
        }}
      />
    </View>
  );
}

/* ───────────────────────── Avatar ───────────────────────── */

const AVATAR_PALETTE = ['#C9A24B', '#E7C77A', '#7CC79E', '#E5A89A', '#9AB5D8', '#D8B8E5'];

export function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, size = 36, color }: { name: string; size?: number; color?: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color ?? colorForName(name),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#1A1714', fontSize: size * 0.4, ...fonts.semiBold, letterSpacing: 0.5 }}>
        {initialsFor(name)}
      </Text>
    </View>
  );
}

/* ───────────────────────── Role badge ───────────────────────── */

export function RoleBadge({ role }: { role: 'foreman' | 'member' }) {
  const { colors } = useTheme();
  const isF = role === 'foreman';
  return (
    <View style={{
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
      backgroundColor: isF ? colors.primaryLight : colors.card,
    }}>
      <Text style={{ fontSize: 11.5, ...fonts.semiBold, color: isF ? colors.primary : colors.textSub }}>
        {isF ? "You're the foreman" : 'Member'}
      </Text>
    </View>
  );
}

/* ───────────────────────── Pill ───────────────────────── */

export type PillTone = 'paid' | 'pending' | 'error' | 'ghost' | 'primary' | 'accent';

export function Pill({ tone = 'ghost', children, style }: { tone?: PillTone; children: ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  const map: Record<PillTone, { bg: string; fg: string }> = {
    paid:    { bg: colors.successLight, fg: colors.success },
    pending: { bg: colors.warningLight, fg: colors.warning },
    error:   { bg: colors.dangerLight,  fg: colors.danger },
    ghost:   { bg: colors.card,         fg: colors.textSub },
    primary: { bg: colors.primaryLight, fg: colors.primary },
    accent:  { bg: colors.accentLight,  fg: colors.accent },
  };
  const { bg, fg } = map[tone];
  return (
    <View style={[{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: bg }, style]}>
      <Text style={{ fontSize: 11.5, ...fonts.semiBold, color: fg, letterSpacing: 0.1 }}>{children}</Text>
    </View>
  );
}

/* ───────────────────────── Section label (kicker) ───────────────────────── */

export function Kicker({ children, color, style }: { children: ReactNode; color?: string; style?: TextStyle }) {
  const { colors } = useTheme();
  return (
    <Text style={[{ fontSize: 11, ...fonts.semiBold, color: color ?? colors.textMuted, letterSpacing: 1 }, style]}>
      {children}
    </Text>
  );
}

/* ───────────────────────── Nav header ───────────────────────── */

export function NavHeader({
  onBack,
  title,
  right,
}: {
  onBack?: () => void;
  title?: string;
  right?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={{
      paddingTop: 60, paddingBottom: 12, paddingHorizontal: 20,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.bg,
    }}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} hitSlop={8}>
          <Text style={{ fontSize: 26, lineHeight: 26, color: colors.textSub }}>‹</Text>
        </TouchableOpacity>
      ) : <View style={{ width: 26 }} />}
      <Text style={{ fontSize: 13, ...fonts.semiBold, color: colors.textMuted, flex: 1, textAlign: 'center' }} numberOfLines={1}>
        {title ?? ''}
      </Text>
      {right ?? <View style={{ width: 26 }} />}
    </View>
  );
}

/* ───────────────────────── Card primitive ───────────────────────── */

export function Card({ children, style, stripe }: { children: ReactNode; style?: ViewStyle; stripe?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[{
      position: 'relative',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    }, style]}>
      {stripe && (
        <View style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
          backgroundColor: colors.primary,
        }} />
      )}
      {children}
    </View>
  );
}

/* ───────────────────────── Primary button ───────────────────────── */

export function PrimaryButton({
  label,
  onPress,
  disabled,
  trailingArrow,
  style,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  trailingArrow?: boolean;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[{
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        opacity: disabled ? 0.4 : 1,
      }, style]}
    >
      <Text style={{ fontSize: 16, ...fonts.semiBold, color: colors.bg }}>
        {label}{trailingArrow ? '  →' : ''}
      </Text>
    </TouchableOpacity>
  );
}

/* ───────────────────────── Money-conservation equation block ─────────────────────────
 *
 * The signature interaction. Renders the live invariant:
 *     C = prize + foremanCommission + dividend × N
 * Used inline on the conduct-draw screen and prominently on the cycle receipt.
 */

export function MoneyEquation({
  chitValue,
  prize,
  foremanCommission,
  dividendPerMember,
  members,
  variant = 'inline',
  balanced,
}: {
  chitValue: number;
  prize: number;
  foremanCommission: number;
  dividendPerMember: number;
  members: number;
  variant?: 'inline' | 'receipt';
  balanced?: boolean;
}) {
  const { colors } = useTheme();
  const isReceipt = variant === 'receipt';
  const labelTone = balanced ? colors.accent : colors.textMuted;

  if (isReceipt) {
    return (
      <View style={{
        backgroundColor: colors.card,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 18,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Kicker color={colors.accent}>THE MATH</Kicker>
          <Text style={{ fontSize: 11, ...fonts.regular, color: colors.textMuted, fontStyle: 'italic' }}>
            Chit Funds Act, 1982 §13
          </Text>
        </View>
        <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Kicker>THE POT</Kicker>
          <Text style={[{ fontSize: 34, ...fonts.bold, color: colors.text, letterSpacing: -0.6 }, tnum]}>
            ₹{fmtINR(chitValue)}
          </Text>
        </View>
        <EquationRow op="=" amount={prize} label="winner takes" />
        <EquationRow op="+" amount={foremanCommission} label="foreman commission" />
        <EquationRow op="+" amount={dividendPerMember * members} label={`dividend pool — ${members} × ₹${fmtINR(dividendPerMember)}`} />
        <VerifiedSealRow />
      </View>
    );
  }

  // Inline (conduct-draw) variant
  return (
    <View style={{
      borderRadius: 14,
      borderWidth: 1,
      borderColor: balanced ? colors.accent : colors.border,
      backgroundColor: balanced ? colors.accentLight : colors.card,
      padding: 14,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Kicker color={labelTone}>THE MATH · LIVE</Kicker>
        {balanced && <Pill tone="accent">✓ Balanced</Pill>}
      </View>
      <Text style={{
        marginTop: 10,
        fontSize: 16,
        ...fonts.medium,
        color: balanced ? colors.text : colors.textMuted,
        letterSpacing: -0.2,
        lineHeight: 24,
      }}>
        <Text style={tnum}>₹{fmtINR(chitValue)}</Text>
        <Text style={{ color: colors.textMuted }}>  =  </Text>
        <Text style={tnum}>₹{fmtINR(prize)}</Text>
        <Text style={{ color: colors.textMuted }}>  +  </Text>
        <Text style={tnum}>₹{fmtINR(foremanCommission)}</Text>
        <Text style={{ color: colors.textMuted }}>  +  </Text>
        <Text style={tnum}>₹{fmtINR(dividendPerMember)}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>{` × ${members}`}</Text>
      </Text>
      <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 11.5, color: colors.textMuted }}>Winner</Text>
        <Text style={{ fontSize: 11.5, color: colors.textMuted }}>Commission</Text>
        <Text style={{ fontSize: 11.5, color: colors.textMuted }}>Each member</Text>
      </View>
    </View>
  );
}

function EquationRow({ op, amount, label }: { op: string; amount: number; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'baseline',
      paddingVertical: 10,
      borderTopWidth: 1, borderTopColor: colors.border,
      gap: 12,
    }}>
      <Text style={{ width: 24, fontSize: 22, ...fonts.semiBold, color: op === '=' ? colors.accent : colors.textMuted }}>
        {op}
      </Text>
      <Text style={{ flex: 1, fontSize: 13, color: colors.textMuted }}>{label}</Text>
      <Text style={[{ fontSize: 22, ...fonts.semiBold, color: colors.text, letterSpacing: -0.3 }, tnum]}>
        ₹{fmtINR(amount)}
      </Text>
    </View>
  );
}

function VerifiedSealRow() {
  const { colors } = useTheme();
  return (
    <View style={{
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      borderStyle: 'dashed',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    }}>
      <VerifiedSeal size={68} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 18, ...fonts.bold, color: colors.text }}>Math verified</Text>
        <Text style={{ marginTop: 2, fontSize: 12, color: colors.textMuted, lineHeight: 17 }}>
          Every rupee of the pot is accounted for. No money sits in the app.
        </Text>
      </View>
    </View>
  );
}

/* ───────────────────────── Verified seal ─────────────────────────
 *
 * The brass stamp — product's signature visual. Uses concentric Views since
 * we don't depend on react-native-svg. Looks close enough to the prototype
 * SVG for the trust signal; an SVG upgrade is a follow-up.
 */

export function VerifiedSeal({ size = 86 }: { size?: number }) {
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: '#C9A24B',
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ rotate: '-6deg' }],
      shadowColor: '#8E6E27',
      shadowOpacity: 0.4,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    }}>
      <View style={{
        width: size - 8,
        height: size - 8,
        borderRadius: (size - 8) / 2,
        borderWidth: 1,
        borderColor: 'rgba(255, 248, 227, 0.45)',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{
          fontSize: size * 0.42,
          ...fonts.bold,
          color: '#1A1308',
          lineHeight: size * 0.5,
        }}>
          ✓
        </Text>
        <Text style={{
          fontSize: size * 0.09,
          ...fonts.bold,
          color: '#3a2c0d',
          letterSpacing: 1.5,
          marginTop: 2,
        }}>
          VERIFIED
        </Text>
      </View>
    </View>
  );
}

/* ───────────────────────── Cycle dots progress ───────────────────────── */

export function CycleDots({
  cycle,
  total,
  width = 200,
}: {
  cycle: number;
  total: number;
  width?: number;
}) {
  const { colors } = useTheme();
  const max = Math.min(total, 24);
  const scale = total / max;
  const filledCount = Math.round(cycle / scale);
  const dotGap = 3;
  const baseDot = Math.max(3, Math.floor((width - dotGap * (max - 1)) / (max + 2)));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: dotGap }}>
      {Array.from({ length: max }).map((_, i) => {
        const isFilled = i < filledCount;
        const isCurrent = i === filledCount - 1;
        return (
          <View
            key={i}
            style={{
              width: isCurrent ? baseDot * 2 : baseDot,
              height: baseDot,
              borderRadius: baseDot / 2,
              backgroundColor: isFilled
                ? (isCurrent ? colors.primary : `${colors.primary}88`)
                : colors.divider2,
            }}
          />
        );
      })}
    </View>
  );
}

/* ───────────────────────── Member row ───────────────────────── */

export function MemberRow({
  name,
  phone,
  prizedCycle,
  status,
  trailing,
  onPress,
}: {
  name: string;
  phone?: string;
  prizedCycle?: number;
  status?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const styles = makeMemberRowStyles(colors);
  const Wrap: React.ElementType = onPress ? TouchableOpacity : View;
  return (
    <Wrap onPress={onPress} activeOpacity={onPress ? 0.7 : 1} style={styles.row}>
      <Avatar name={name} size={36} />
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          {prizedCycle !== undefined && (
            <View style={styles.prizedPill}>
              <Text style={styles.prizedText}>PRIZED · C{prizedCycle}</Text>
            </View>
          )}
        </View>
        {phone && <Text style={[styles.phone, tnum]}>{phone}</Text>}
      </View>
      {status ?? trailing}
    </Wrap>
  );
}

function makeMemberRowStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    body: { flex: 1, minWidth: 0 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { fontSize: 14.5, ...fonts.medium, color: c.text, flexShrink: 1 },
    prizedPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: c.accentLight },
    prizedText: { fontSize: 10.5, ...fonts.semiBold, color: c.accent, letterSpacing: 0.5 },
    phone: { fontSize: 11.5, ...fonts.regular, color: c.textMuted, marginTop: 2 },
  });
}

/* ───────────────────────── Segmented control ───────────────────────── */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string; disabled?: boolean }[];
  value: T;
  onChange: (id: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, padding: 3 }}>
      {options.map(opt => {
        const active = value === opt.id;
        return (
          <TouchableOpacity
            key={opt.id}
            onPress={() => !opt.disabled && onChange(opt.id)}
            disabled={opt.disabled}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: active ? colors.bg : 'transparent',
              alignItems: 'center',
              opacity: opt.disabled ? 0.4 : 1,
            }}
          >
            <Text style={{
              fontSize: 13.5,
              ...fonts.semiBold,
              color: active ? colors.text : colors.textSub,
            }}>
              {opt.label}{opt.disabled ? '  · soon' : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ───────────────────────── Field label + helper ───────────────────────── */

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 14, ...fonts.semiBold, color: colors.text }}>{children}</Text>
      {hint && <Text style={{ marginTop: 4, fontSize: 12.5, color: colors.textMuted, lineHeight: 18 }}>{hint}</Text>}
    </View>
  );
}
