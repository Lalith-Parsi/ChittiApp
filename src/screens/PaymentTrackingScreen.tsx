import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ChittiGroup, Member, Payment } from '../types';
import { getGroupById, upsertGroup } from '../storage';
import { getPaidCount, getCycleMonth } from '../utils/chitti';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../lib/ThemeContext';
import { ThemeColors, fonts } from '../lib/theme';

function ordinal(n: number) {
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function sendWhatsApp(member: Member, group: ChittiGroup, cycleNumber: number, cycleMonth: string) {
  const phone = member.phone.replace(/\D/g, '');
  const fullPhone = phone.startsWith('91') ? phone : `91${phone}`;
  const payDay = group.paymentDay ? ordinal(group.paymentDay) : 'the due date';
  const msg = `Hi ${member.name}! 👋\n\nThis is a reminder for *${group.name}* chitti.\n\n💰 Amount: ₹${group.amount.toLocaleString()}\n📅 Pay by: ${payDay} of this month\n🔄 Cycle ${cycleNumber} (${cycleMonth})\n\nPlease make your payment on time. Thank you! 🙏`;
  Linking.openURL(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`);
}

type Nav = NativeStackNavigationProp<RootStackParamList, 'PaymentTracking'>;
type Route = RouteProp<RootStackParamList, 'PaymentTracking'>;

export default function PaymentTrackingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { groupId, cycleId } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [group, setGroup] = useState<ChittiGroup | null>(null);
  useEffect(() => { getGroupById(groupId).then(setGroup); }, [groupId]);

  if (!group) return null;
  const cycle = group.cycles.find(c => c.id === cycleId);
  if (!cycle) return null;

  const paidCount = getPaidCount(cycle);
  const total     = group.members.length;
  const progress  = total > 0 ? paidCount / total : 0;
  const cycleMonth = getCycleMonth(group, cycle.cycleNumber);

  const pendingMembers = group.members.filter(m => {
    const p = cycle.payments.find(p => p.memberId === m.id);
    return !p?.paid;
  });

  const togglePayment = async (memberId: string) => {
    const updatedCycles = group.cycles.map(c => {
      if (c.id !== cycleId) return c;
      return { ...c, payments: c.payments.map((p: Payment) =>
        p.memberId === memberId ? { ...p, paid: !p.paid, paidDate: !p.paid ? new Date().toISOString() : undefined } : p
      )};
    });
    const updated = { ...group, cycles: updatedCycles };
    await upsertGroup(updated);
    setGroup(updated);
  };

  const markAllPaid = async () => {
    if (!window.confirm('Mark all members as paid for this cycle?')) return;
    const updatedCycles = group.cycles.map(c => c.id !== cycleId ? c : { ...c, payments: c.payments.map((p: Payment) => ({ ...p, paid: true, paidDate: p.paid ? p.paidDate : new Date().toISOString() })) });
    const updated = { ...group, cycles: updatedCycles };
    await upsertGroup(updated); setGroup(updated);
  };

  const unmarkAllPaid = async () => {
    if (!window.confirm('Unmark all payments for this cycle?')) return;
    const updatedCycles = group.cycles.map(c => c.id !== cycleId ? c : { ...c, payments: c.payments.map((p: Payment) => ({ ...p, paid: false, paidDate: undefined })) });
    const updated = { ...group, cycles: updatedCycles };
    await upsertGroup(updated); setGroup(updated);
  };

  const updatedCycle = group.cycles.find(c => c.id === cycleId)!;

  const renderMember = ({ item }: { item: Member }) => {
    const payment = updatedCycle.payments.find(p => p.memberId === item.id);
    const isPaid  = payment?.paid ?? false;
    return (
      <TouchableOpacity style={[styles.memberRow, isPaid && styles.memberRowPaid]} onPress={() => togglePayment(item.id)} activeOpacity={0.8}>
        <View style={[styles.avatar, isPaid && styles.avatarPaid]}>
          <Text style={[styles.avatarText, isPaid && { color: colors.success }]}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.name}</Text>
          <Text style={styles.memberPhone}>{item.phone}</Text>
          {isPaid && payment?.paidDate && (
            <Text style={styles.paidDate}>Paid {new Date(payment.paidDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
          )}
        </View>
        {!isPaid ? (
          <TouchableOpacity style={styles.waBtnSmall} onPress={() => sendWhatsApp(item, group, updatedCycle.cycleNumber, cycleMonth)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
          </TouchableOpacity>
        ) : (
          <View style={styles.badgePaid}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.badgePaidText}>Paid</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Cycle {cycle.cycleNumber} Payments</Text>
        {updatedCycle.conducted && (
          <View style={styles.conductedBadge}>
            <Ionicons name="checkmark-circle" size={13} color={colors.success} />
            <Text style={styles.conductedText}>Done</Text>
          </View>
        )}
      </View>

      {updatedCycle.conducted && updatedCycle.winnerId && (() => {
        const winner = group.members.find(m => m.id === updatedCycle.winnerId);
        return winner ? (
          <View style={styles.winnerBanner}>
            <Ionicons name="trophy" size={18} color={colors.warning} />
            <Text style={styles.winnerBannerText}>{winner.name} won ₹{updatedCycle.winAmount.toLocaleString()}</Text>
          </View>
        ) : null;
      })()}

      <View style={styles.progressCard}>
        <View style={styles.progressStats}>
          <View style={styles.progressStat}>
            <Text style={[styles.progressVal, { color: colors.success }]}>{paidCount}</Text>
            <Text style={styles.progressLabel}>Paid</Text>
          </View>
          <View style={styles.progressStat}>
            <Text style={[styles.progressVal, { color: colors.warning }]}>{total - paidCount}</Text>
            <Text style={styles.progressLabel}>Pending</Text>
          </View>
          <View style={styles.progressStat}>
            <Text style={[styles.progressVal, { color: colors.primaryText }]}>₹{(paidCount * group.amount).toLocaleString()}</Text>
            <Text style={styles.progressLabel}>Collected</Text>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` as any }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(progress * 100)}% collected</Text>
      </View>

      <View style={styles.actionsRow}>
        <Text style={styles.sectionHint}>Tap row to toggle · 📱 to remind</Text>
        <View style={styles.actionBtns}>
          {pendingMembers.length > 0 && (
            <TouchableOpacity onPress={() => pendingMembers.forEach(m => sendWhatsApp(m, group, updatedCycle.cycleNumber, cycleMonth))} style={styles.remindBtn}>
              <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
              <Text style={styles.remindBtnText}>Remind ({pendingMembers.length})</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={markAllPaid} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>All Paid</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={unmarkAllPaid} style={styles.unmarkBtn}>
            <Text style={styles.unmarkText}>Unmark</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList data={group.members} keyExtractor={m => m.id} contentContainerStyle={styles.list} renderItem={renderMember} />

      {paidCount === total && total > 0 && (
        <View style={styles.readyBanner}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.readyText}>All paid! Ready for the draw.</Text>
          <TouchableOpacity style={styles.drawNowBtn} onPress={() => navigation.navigate('Draw', { groupId, cycleId })}>
            <Text style={styles.drawNowText}>Draw Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14,
      backgroundColor: c.header, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    title: { fontSize: 19, ...fonts.extraBold, color: c.text, flex: 1 },
    conductedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.successLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    conductedText:  { fontSize: 12, ...fonts.bold, color: c.success },
    winnerBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.warningLight, paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    winnerBannerText: { fontSize: 14, ...fonts.bold, color: c.warning },
    progressCard: { backgroundColor: c.card, padding: 20, borderBottomWidth: 1, borderBottomColor: c.border },
    progressStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14 },
    progressStat:  { alignItems: 'center' },
    progressVal:   { fontSize: 20, ...fonts.extraBold },
    progressLabel: { fontSize: 12, ...fonts.regular, color: c.textMuted, marginTop: 2 },
    progressBarBg:   { height: 8, backgroundColor: c.border, borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%' as any, backgroundColor: c.success, borderRadius: 4 },
    progressText:    { fontSize: 12, ...fonts.regular, color: c.textMuted, textAlign: 'right', marginTop: 6 },
    actionsRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 10,
    },
    sectionHint: { fontSize: 12, ...fonts.regular, color: c.textMuted, flex: 1 },
    actionBtns:  { flexDirection: 'row', gap: 8 },
    remindBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.successLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: c.success + '44' },
    remindBtnText: { fontSize: 12, ...fonts.bold, color: '#25D366' },
    markAllBtn:  { backgroundColor: c.primaryLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    markAllText: { fontSize: 12, ...fonts.bold, color: c.primaryText },
    unmarkBtn:   { backgroundColor: c.dangerLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    unmarkText:  { fontSize: 12, ...fonts.bold, color: c.danger },
    list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
    memberRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.card, borderRadius: 12, padding: 14, marginBottom: 10,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    memberRowPaid: { backgroundColor: c.successLight },
    avatar:     { width: 42, height: 42, borderRadius: 21, backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' },
    avatarPaid: { backgroundColor: c.successLight },
    avatarText: { fontSize: 17, ...fonts.bold, color: c.primaryText },
    memberInfo:  { flex: 1 },
    memberName:  { fontSize: 15, ...fonts.bold, color: c.text },
    memberPhone: { fontSize: 13, ...fonts.regular, color: c.textMuted, marginTop: 2 },
    paidDate:    { fontSize: 11, ...fonts.medium, color: c.success, marginTop: 2 },
    waBtnSmall:  { width: 36, height: 36, borderRadius: 10, backgroundColor: c.successLight, alignItems: 'center', justifyContent: 'center' },
    badgePaid:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.successLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
    badgePaidText: { fontSize: 12, ...fonts.semiBold, color: c.success },
    readyBanner: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      backgroundColor: c.card, flexDirection: 'row', alignItems: 'center',
      padding: 16, paddingBottom: 32, borderTopWidth: 1, borderTopColor: c.border, gap: 8,
    },
    readyText:   { flex: 1, fontSize: 14, ...fonts.semiBold, color: c.success },
    drawNowBtn:  { backgroundColor: c.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
    drawNowText: { color: '#fff', fontSize: 13, ...fonts.bold },
  });
}
