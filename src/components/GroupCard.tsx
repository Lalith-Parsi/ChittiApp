import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChittiGroup } from '../types';
import { getCurrentCycle, getCompletedCycles, getCycleMonth } from '../utils/chitti';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/ThemeContext';
import { ThemeColors, fonts } from '../lib/theme';

function ordinal(n: number) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

interface Props {
  group: ChittiGroup;
  onPress: () => void;
  onDelete?: () => void;
}

export default function GroupCard({ group, onPress, onDelete }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const currentCycle   = getCurrentCycle(group);
  const completedCount = getCompletedCycles(group).length;
  const totalCollected = completedCount * group.amount * group.members.length;
  const pendingCount   = currentCycle ? currentCycle.payments.filter(p => !p.paid).length : 0;
  const progress       = group.durationMonths > 0 ? completedCount / group.durationMonths : 0;
  const isArchived     = group.isActive === false;

  return (
    <TouchableOpacity style={[styles.card, isArchived && styles.cardArchived]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.header}>
        <View style={[styles.iconBox, isArchived && styles.iconBoxArchived]}>
          <Ionicons name={isArchived ? 'archive' : 'people'} size={22} color="#fff" />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{group.name}</Text>
          {group.description
            ? <Text style={styles.desc} numberOfLines={1}>{group.description}</Text>
            : <Text style={styles.sub}>{group.members.length} members · ₹{group.amount.toLocaleString()}/month</Text>
          }
        </View>
        <View style={styles.headerRight}>
          {onDelete && (
            <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </TouchableOpacity>
          )}
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
      </View>

      <View style={styles.footer}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>₹{totalCollected.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Collected</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statVal}>{completedCount}/{group.durationMonths}</Text>
          <Text style={styles.statLabel}>Cycles done</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          {pendingCount > 0
            ? <Text style={[styles.statVal, { color: colors.warning }]}>{pendingCount}</Text>
            : currentCycle
              ? <Text style={[styles.statVal, { color: colors.success }]}>✓</Text>
              : <Text style={[styles.statVal, { color: colors.primaryText }]}>{ordinal(group.paymentDay ?? 1)}</Text>
          }
          <Text style={styles.statLabel}>
            {pendingCount > 0 ? 'Pending' : currentCycle ? 'All paid' : 'Pay day'}
          </Text>
        </View>
      </View>

      {currentCycle && (
        <View style={styles.cycleBadge}>
          <Ionicons name="time-outline" size={11} color={colors.primaryText} />
          <Text style={styles.cycleText}>
            Cycle {currentCycle.cycleNumber} · {getCycleMonth(group, currentCycle.cycleNumber)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 14,
      shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 }, elevation: 3,
    },
    cardArchived: { opacity: 0.6 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    iconBox: {
      width: 44, height: 44, borderRadius: 12, backgroundColor: c.primary,
      alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    iconBoxArchived: { backgroundColor: c.textMuted },
    info: { flex: 1 },
    name: { fontSize: 16, ...fonts.bold, color: c.text },
    sub:  { fontSize: 13, ...fonts.regular, color: c.textSub, marginTop: 2 },
    desc: { fontSize: 13, ...fonts.regular, color: c.textMuted, marginTop: 2, fontStyle: 'italic' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    progressTrack: { height: 4, backgroundColor: c.primaryLight, borderRadius: 2, marginBottom: 12, overflow: 'hidden' },
    progressFill:  { height: 4, backgroundColor: c.primary, borderRadius: 2 },
    footer: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.statBg, borderRadius: 10, padding: 10,
    },
    stat: { flex: 1, alignItems: 'center' },
    statVal:   { fontSize: 14, ...fonts.bold, color: c.text },
    statLabel: { fontSize: 11, ...fonts.regular, color: c.textMuted, marginTop: 2 },
    divider:   { width: 1, height: 28, backgroundColor: c.border },
    cycleBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      marginTop: 10, backgroundColor: c.primaryLight, borderRadius: 8,
      paddingVertical: 5, paddingHorizontal: 10, alignSelf: 'flex-start',
    },
    cycleText: { fontSize: 12, ...fonts.semiBold, color: c.primaryText },
  });
}
