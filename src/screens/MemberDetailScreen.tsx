import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Share, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ChittiGroup, Member, Cycle } from '../types';
import { getGroupById } from '../storage';
import { getCycleMonth } from '../utils/chitti';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../lib/ThemeContext';
import { ThemeColors, fonts } from '../lib/theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MemberDetail'>;
type Route = RouteProp<RootStackParamList, 'MemberDetail'>;

function ordinal(n: number) {
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function MemberDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { groupId, memberId } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [group, setGroup]   = useState<ChittiGroup | null>(null);
  const [member, setMember] = useState<Member | null>(null);

  useEffect(() => {
    getGroupById(groupId).then(g => {
      if (!g) return;
      setGroup(g);
      setMember(g.members.find(m => m.id === memberId) ?? null);
    });
  }, [groupId, memberId]);

  if (!group || !member) return null;

  const conductedCycles = group.cycles.filter(c => c.conducted);
  const pendingCycles   = group.cycles.filter(c => !c.conducted);
  const currentCycle    = pendingCycles[0] ?? null;
  const totalPaid       = conductedCycles.filter(c => c.payments.find(p => p.memberId === memberId && p.paid)).length;
  const totalMissed     = conductedCycles.filter(c => c.payments.find(p => p.memberId === memberId && !p.paid)).length;
  const currentPaid     = currentCycle?.payments.find(p => p.memberId === memberId)?.paid ?? false;

  const fullPhone = member.phone.replace(/\D/g, '');
  const waPhone   = fullPhone.startsWith('91') ? fullPhone : `91${fullPhone}`;

  const openWhatsApp = () => {
    const payDay = group.paymentDay ? ordinal(group.paymentDay) : 'the due date';
    const cycle  = currentCycle ? `Cycle ${currentCycle.cycleNumber} (${getCycleMonth(group, currentCycle.cycleNumber)})` : 'this month';
    const msg = `Hi ${member.name}! 👋\n\nThis is a reminder for *${group.name}* chitti.\n\n💰 Amount: ₹${group.amount.toLocaleString()}\n📅 Pay by: ${payDay} of this month\n🔄 ${cycle}\n\nPlease make your payment on time. Thank you! 🙏`;
    Linking.openURL(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`);
  };

  const sendLinkOnWhatsApp = () => {
    const token = member.shareToken;
    if (!token) { alert('No share link. Remove and re-add this member to generate one.'); return; }
    const link = Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/member/${token}`
      : `chitti://member/${token}`;
    const msg = `Hi ${member.name}! 👋\n\nHere's your *${group.name}* chitti status link:\n${link}\n\nYou can view your payment history and upcoming cycles anytime. 📊`;
    Linking.openURL(`https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`);
  };

  const shareStatus = async () => {
    const token = member.shareToken;
    const link = token
      ? (Platform.OS === 'web' && typeof window !== 'undefined'
          ? `${window.location.origin}/member/${token}`
          : `chitti://member/${token}`)
      : '';
    const lines = [
      `📊 Chitti Status — ${member.name}`,
      `Group: ${group.name}`,
      '',
      ...(link ? [`🔗 View your status: ${link}`, ''] : []),
      `✅ Paid cycles: ${totalPaid}`,
      `❌ Missed cycles: ${totalMissed}`,
      member.hasReceived ? `🏆 Received pot in Cycle ${member.cycleReceived}` : `⏳ Yet to receive pot`,
      '',
      `Next payment: ₹${group.amount.toLocaleString()} by ${group.paymentDay ? ordinal(group.paymentDay) : '—'} of every month`,
    ];
    await Share.share({ message: lines.join('\n'), url: link || undefined });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Member Details</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>{member.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.memberName}>{member.name}</Text>
        <Text style={styles.memberPhone}>{member.phone}</Text>
        {member.hasReceived ? (
          <View style={styles.potBadge}>
            <Ionicons name="trophy" size={14} color={colors.warning} />
            <Text style={[styles.potBadgeText, { color: colors.warning }]}>Received pot in Cycle {member.cycleReceived}</Text>
          </View>
        ) : (
          <View style={[styles.potBadge, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="time-outline" size={14} color={colors.primaryText} />
            <Text style={[styles.potBadgeText, { color: colors.primaryText }]}>Yet to receive pot</Text>
          </View>
        )}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.waBtn} onPress={openWhatsApp}>
            <Ionicons name="logo-whatsapp" size={18} color="#fff" />
            <Text style={styles.waBtnText}>Remind</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={sendLinkOnWhatsApp}>
            <Ionicons name="link-outline" size={18} color="#fff" />
            <Text style={styles.waBtnText}>Send Link</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={shareStatus}>
            <Ionicons name="share-outline" size={18} color={colors.primaryText} />
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
        </View>
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
            <Text style={styles.currentAmount}>₹{group.amount.toLocaleString()} due by {group.paymentDay ? ordinal(group.paymentDay) : '—'}</Text>
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
        const paid = cycle.payments.find(p => p.memberId === memberId)?.paid ?? false;
        const isWinner = cycle.winnerId === memberId;
        return (
          <View key={cycle.id} style={styles.historyRow}>
            <View style={[styles.cycleBox, !cycle.conducted && { backgroundColor: colors.statBg }]}>
              <Text style={[styles.cycleNum, !cycle.conducted && { color: colors.textMuted }]}>{cycle.cycleNumber}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.historyMonth}>{getCycleMonth(group, cycle.cycleNumber)}</Text>
              {isWinner && <Text style={styles.winText}>🏆 Won ₹{cycle.winAmount.toLocaleString()}</Text>}
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
    </ScrollView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content:   { paddingBottom: 40 },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14,
      backgroundColor: c.header, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    headerTitle: { fontSize: 19, ...fonts.extraBold, color: c.text },
    profileCard: { backgroundColor: c.card, alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: c.border },
    avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    avatarText:  { fontSize: 32, ...fonts.extraBold, color: c.primaryText },
    memberName:  { fontSize: 22, ...fonts.extraBold, color: c.text },
    memberPhone: { fontSize: 15, ...fonts.regular, color: c.textMuted, marginTop: 4 },
    potBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.warningLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginTop: 10 },
    potBadgeText:{ fontSize: 13, ...fonts.semiBold },
    actionRow:   { flexDirection: 'row', gap: 10, marginTop: 16 },
    waBtn:       { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#25D366', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11 },
    linkBtn:     { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: c.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11 },
    waBtnText:   { color: '#fff', fontSize: 14, ...fonts.bold },
    shareBtn:    { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: c.primaryLight, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11 },
    shareBtnText:{ color: c.primaryText, fontSize: 14, ...fonts.bold },
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
    historyRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.card, marginHorizontal: 16, marginBottom: 8,
      borderRadius: 12, padding: 14,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    cycleBox:    { width: 36, height: 36, borderRadius: 10, backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' },
    cycleNum:    { fontSize: 14, ...fonts.extraBold, color: c.primaryText },
    historyMonth:{ fontSize: 14, ...fonts.semiBold, color: c.text },
    winText:     { fontSize: 12, ...fonts.medium, color: c.warning, marginTop: 2 },
    badge:       { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
    badgeText:   { fontSize: 12, ...fonts.semiBold },
  });
}
