import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChittiGroup } from '../types';
import { getCompletedCycles, getCurrentCycle, getCycleMonth } from '../utils/chitti';
import { useTheme } from '../lib/ThemeContext';
import { ThemeColors, fonts, fmtINR, tnum } from '../lib/theme';

interface Props {
  group: ChittiGroup;
  /** Role of the signed-in user in this group. Today every group is single-user-owned
   *  so this is always `foreman`; Phase 2 introduces real cross-account roles. */
  role?: 'foreman' | 'member';
  onPress: () => void;
  onDelete?: () => void;
}

/**
 * Cycle progress as discrete dots. A chit is a sequence of monthly events,
 * not a continuous percentage — render it that way.
 */
function CycleDots({ cycle, total, color, dimColor, currentColor }: {
  cycle: number;
  total: number;
  color: string;
  dimColor: string;
  currentColor: string;
}) {
  const max = Math.min(total, 24);
  const scale = total / max;
  const filledCount = Math.round(cycle / scale);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      {Array.from({ length: max }).map((_, i) => {
        const isFilled = i < filledCount;
        const isCurrent = i === filledCount - 1;
        return (
          <View
            key={i}
            style={{
              width: isCurrent ? 10 : 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: isFilled ? (isCurrent ? currentColor : color) : dimColor,
            }}
          />
        );
      })}
    </View>
  );
}

export default function GroupCard({ group, role = 'foreman', onPress }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const current = getCurrentCycle(group);
  const completed = getCompletedCycles(group).length;
  const cycleNum = current?.cycleNumber ?? (completed || 1);
  const chitValue = group.amount * group.totalMembers;
  const isForeman = role === 'foreman';

  const nextDueLabel = current
    ? `by ${getCycleMonth(group, cycleNum)}`
    : completed >= group.durationMonths ? 'Completed' : 'Not yet started';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {isForeman && <View style={styles.foremanStripe} />}

      {/* Top row — name + role badge */}
      <View style={styles.topRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={1}>{group.name}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.metaRupee, tnum]}>₹{fmtINR(chitValue)}</Text>
            <Text style={styles.metaText}> pot </Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}> {group.members.length} members</Text>
          </View>
        </View>
        <View style={[styles.roleBadge, isForeman ? styles.roleBadgeForeman : styles.roleBadgeMember]}>
          <Text style={[styles.roleBadgeText, isForeman ? styles.roleBadgeForemanText : styles.roleBadgeMemberText]}>
            {isForeman ? "You're the foreman" : 'Member'}
          </Text>
        </View>
      </View>

      {/* Mid row — next due */}
      <View style={styles.midRow}>
        <View>
          <Text style={styles.kicker}>YOUR NEXT DUE</Text>
          <View style={styles.midAmountRow}>
            <Text style={[styles.midAmount, tnum]}>₹{fmtINR(group.amount)}</Text>
            <Text style={styles.midBy}>{nextDueLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Bottom row — cycle progress */}
      <View style={styles.bottomRow}>
        <View style={{ gap: 6, flex: 1, minWidth: 0 }}>
          <Text style={styles.cycleLabel}>
            Cycle <Text style={tnum}>{cycleNum}</Text> of <Text style={tnum}>{group.durationMonths}</Text>
          </Text>
          <CycleDots
            cycle={cycleNum}
            total={group.durationMonths}
            color={`${colors.primary}88`}
            currentColor={colors.primary}
            dimColor={colors.divider2}
          />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.nextDrawLabel}>Next draw</Text>
          <Text style={styles.nextDrawVal}>{getCycleMonth(group, cycleNum)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      position: 'relative',
      backgroundColor: c.card,
      borderRadius: 16,
      paddingTop: 16, paddingBottom: 14, paddingLeft: 18, paddingRight: 16,
      borderWidth: 1, borderColor: c.border,
      overflow: 'hidden',
    },
    foremanStripe: {
      position: 'absolute',
      left: 0, top: 0, bottom: 0, width: 3,
      backgroundColor: c.primary,
    },

    topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    name:  { fontSize: 16, ...fonts.semiBold, color: c.text, letterSpacing: -0.2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, flexWrap: 'wrap' },
    metaRupee: { fontSize: 12.5, ...fonts.medium, color: c.textMuted },
    metaText:  { fontSize: 12.5, ...fonts.regular, color: c.textMuted },
    metaDot:   { fontSize: 12.5, color: c.divider2, marginHorizontal: 4 },

    roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    roleBadgeForeman: { backgroundColor: c.primaryLight },
    roleBadgeMember:  { backgroundColor: c.card },
    roleBadgeText: { fontSize: 11.5, ...fonts.semiBold, letterSpacing: 0.1 },
    roleBadgeForemanText: { color: c.primary },
    roleBadgeMemberText:  { color: c.textSub },

    midRow: { marginTop: 14 },
    kicker: { fontSize: 10.5, ...fonts.semiBold, color: c.textMuted, letterSpacing: 0.8 },
    midAmountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 },
    midAmount: { fontSize: 26, ...fonts.semiBold, color: c.text, letterSpacing: -0.4 },
    midBy:     { fontSize: 13, ...fonts.regular, color: c.textSub },

    divider: { height: 1, backgroundColor: c.border, marginTop: 14, marginBottom: 12 },

    bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    cycleLabel: { fontSize: 12, ...fonts.medium, color: c.textSub },
    nextDrawLabel: { fontSize: 12, ...fonts.regular, color: c.textSub },
    nextDrawVal:   { fontSize: 12, ...fonts.semiBold, color: c.text, marginTop: 2 },
  });
}
