import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ChittiGroup, Member } from '../types';
import { getGroupByMemberToken } from '../lib/supabase-db';
import { getCycleMonth } from '../utils/chitti';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../lib/ThemeContext';
import { ThemeColors, fonts } from '../lib/theme';

type Route = RouteProp<RootStackParamList, 'MemberPublicView'>;

function ordinal(n: number) {
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function MemberPublicViewScreen() {
  const route = useRoute<Route>();
  const { token } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [group, setGroup]   = useState<ChittiGroup | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    getGroupByMemberToken(token).then(result => {
      if (!result) { setError('Invalid or expired link.'); setLoading(false); return; }
      setGroup(result.group);
      setMember(result.group.members.find(m => m.id === result.memberId) ?? null);
      setLoading(false);
    }).catch(() => { setError('Failed to load. Please try again.'); setLoading(false); });
  }, [token]);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Loading your chitti status...</Text>
    </View>
  );

  if (error || !group || !member) return (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={56} color={colors.danger} />
      <Text style={styles.errorTitle}>Link not found</Text>
      <Text style={styles.errorSub}>{error || 'This link may be invalid or expired.'}</Text>
    </View>
  );

  const conductedCycles = group.cycles.filter(c => c.conducted);
  const pendingCycles   = group.cycles.filter(c => !c.conducted);
  const currentCycle    = pendingCycles[0] ?? null;
  const totalPaid       = conductedCycles.filter(c => c.payments.find(p => p.memberId === member.id && p.paid)).length;
  const totalMissed     = conductedCycles.filter(c => c.payments.find(p => p.memberId === member.id && !p.paid)).length;
  const currentPaid     = currentCycle?.payments.find(p => p.memberId === member.id)?.paid ?? false;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="people" size={24} color="#fff" />
        <Text style={styles.headerText}>Chitti Manager</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{member.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.memberName}>{member.name}</Text>
        <Text style={styles.groupName}>{group.name}</Text>
        {member.hasReceived ? (
          <View style={[styles.potBadge, { backgroundColor: colors.warningLight }]}>
            <Ionicons name="trophy" size={14} color={colors.warning} />
            <Text style={[styles.potBadgeText, { color: colors.warning }]}>Received pot in Cycle {member.cycleReceived}</Text>
          </View>
        ) : (
          <View style={[styles.potBadge, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="time-outline" size={14} color={colors.primaryText} />
            <Text style={[styles.potBadgeText, { color: colors.primaryText }]}>Yet to receive pot</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        {[
          { val: totalPaid,   color: colors.success,     label: 'Paid'     },
          { val: totalMissed, color: colors.danger,      label: 'Missed'   },
          { val: pendingCycles.length, color: colors.warning, label: 'Upcoming' },
          { val: `₹${(totalPaid * group.amount).toLocaleString()}`, color: colors.primaryText, label: 'Total paid' },
        ].map(({ val, color, label }) => (
          <View key={label} style={styles.statBox}>
            <Text style={[styles.statVal, { color }]}>{val}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {currentCycle && (
        <View style={[styles.currentCard, currentPaid ? styles.currentPaid : styles.currentPending]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.currentLabel}>Current Cycle</Text>
            <Text style={styles.currentCycle}>Cycle {currentCycle.cycleNumber} · {getCycleMonth(group, currentCycle.cycleNumber)}</Text>
            <Text style={styles.currentAmount}>₹{group.amount.toLocaleString()} due by {group.paymentDay ? ordinal(group.paymentDay) : '—'} of this month</Text>
          </View>
          <View style={[styles.pill, currentPaid ? styles.pillPaid : styles.pillPending]}>
            <Ionicons name={currentPaid ? 'checkmark-circle' : 'time-outline'} size={14} color={currentPaid ? colors.success : colors.warning} />
            <Text style={[styles.pillText, { color: currentPaid ? colors.success : colors.warning }]}>
              {currentPaid ? 'Paid' : 'Pending'}
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Payment History</Text>
      {group.cycles.map(cycle => {
        const p = cycle.payments.find(p => p.memberId === member.id);
        const paid = p?.paid ?? false;
        const isWinner = cycle.winnerId === member.id;
        return (
          <View key={cycle.id} style={styles.historyRow}>
            <View style={[styles.cycleBox, !cycle.conducted && { backgroundColor: colors.statBg }]}>
              <Text style={[styles.cycleNum, !cycle.conducted && { color: colors.textMuted }]}>{cycle.cycleNumber}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.historyMonth}>{getCycleMonth(group, cycle.cycleNumber)}</Text>
              {isWinner && <Text style={[styles.winText, { color: colors.warning }]}>🏆 Won ₹{cycle.winAmount.toLocaleString()}</Text>}
            </View>
            {cycle.conducted ? (
              <View style={[styles.badge, { backgroundColor: paid ? colors.successLight : colors.dangerLight }]}>
                <Ionicons name={paid ? 'checkmark-circle' : 'close-circle'} size={14} color={paid ? colors.success : colors.danger} />
                <Text style={[styles.badgeText, { color: paid ? colors.success : colors.danger }]}>{paid ? 'Paid' : 'Missed'}</Text>
              </View>
            ) : (
              <View style={[styles.badge, { backgroundColor: colors.statBg }]}>
                <Text style={[styles.badgeText, { color: colors.textMuted }]}>Upcoming</Text>
              </View>
            )}
          </View>
        );
      })}

      <Text style={styles.footer}>Powered by Chitti Manager</Text>
    </ScrollView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content:   { paddingBottom: 40 },
    center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: c.bg },
    loadingText: { fontSize: 14, ...fonts.regular, color: c.textMuted, marginTop: 12 },
    errorTitle:  { fontSize: 20, ...fonts.extraBold, color: c.text, marginTop: 16 },
    errorSub:    { fontSize: 14, ...fonts.regular, color: c.textMuted, marginTop: 6, textAlign: 'center' },
    header:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.primary, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20 },
    headerText:  { fontSize: 20, ...fonts.extraBold, color: '#fff' },
    profileCard: { backgroundColor: c.card, alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: c.border },
    avatar:      { width: 72, height: 72, borderRadius: 36, backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    avatarText:  { fontSize: 28, ...fonts.extraBold, color: c.primaryText },
    memberName:  { fontSize: 22, ...fonts.extraBold, color: c.text },
    groupName:   { fontSize: 14, ...fonts.regular, color: c.textMuted, marginTop: 2 },
    potBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 },
    potBadgeText:{ fontSize: 13, ...fonts.semiBold },
    statsRow:    { flexDirection: 'row', backgroundColor: c.card, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.border },
    statBox:     { flex: 1, alignItems: 'center' },
    statVal:     { fontSize: 18, ...fonts.extraBold },
    statLabel:   { fontSize: 11, ...fonts.regular, color: c.textMuted, marginTop: 3 },
    currentCard: { margin: 16, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center' },
    currentPaid:    { backgroundColor: c.successLight, borderWidth: 1, borderColor: c.success + '44' },
    currentPending: { backgroundColor: c.warningLight, borderWidth: 1, borderColor: c.warning + '44' },
    currentLabel:   { fontSize: 11, ...fonts.semiBold, color: c.textMuted, marginBottom: 4 },
    currentCycle:   { fontSize: 15, ...fonts.bold, color: c.text },
    currentAmount:  { fontSize: 13, ...fonts.regular, color: c.textSub, marginTop: 3 },
    pill:           { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
    pillPaid:       { backgroundColor: c.successLight },
    pillPending:    { backgroundColor: c.warningLight },
    pillText:       { fontSize: 12, ...fonts.bold },
    sectionTitle:   { fontSize: 16, ...fonts.extraBold, color: c.text, marginHorizontal: 16, marginTop: 4, marginBottom: 10 },
    historyRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.card, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    cycleBox:    { width: 36, height: 36, borderRadius: 10, backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' },
    cycleNum:    { fontSize: 14, ...fonts.extraBold, color: c.primaryText },
    historyMonth:{ fontSize: 14, ...fonts.semiBold, color: c.text },
    winText:     { fontSize: 12, ...fonts.medium, marginTop: 2 },
    badge:       { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
    badgeText:   { fontSize: 12, ...fonts.semiBold },
    footer:      { fontSize: 12, ...fonts.regular, color: c.textMuted, textAlign: 'center', marginTop: 24 },
  });
}
