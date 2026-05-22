import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChittiGroup, Member, Payment, Cycle } from '../types';
import { getGroupById, upsertGroup } from '../storage';
import { calculateDividend, getChitValue, getCycleMonth, getForemanCommission, getPaidCount } from '../utils/chitti';
import { RootStackParamList } from '../navigation/types';
import { useToast } from '../lib/ToastContext';
import { useTheme } from '../lib/ThemeContext';
import { ThemeColors, fonts, fmtINR, tnum } from '../lib/theme';
import { Avatar, Kicker, MemberRow, NavHeader, Pill, PrimaryButton } from '../components/chitti-ui';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PaymentTracking'>;
type Route = RouteProp<RootStackParamList, 'PaymentTracking'>;

type Mode = NonNullable<Payment['mode']>;
const MODES: Mode[] = ['upi', 'cash', 'bank', 'cheque', 'other'];
const MODE_LABEL: Record<Mode, string> = { upi: 'UPI', cash: 'Cash', bank: 'Bank', cheque: 'Cheque', other: 'Other' };
const MODE_GLYPH: Record<Mode, string> = { upi: '⊕', cash: '₹', bank: '⌗', cheque: '✎', other: '•' };

export default function PaymentTrackingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { groupId, cycleId } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const toast = useToast();

  const [group, setGroup] = useState<ChittiGroup | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);

  useEffect(() => { getGroupById(groupId).then(setGroup); }, [groupId]);
  if (!group) return null;

  const cycle = group.cycles.find(c => c.id === cycleId);
  if (!cycle) return null;

  const chitValue = getChitValue(group);
  const commission = getForemanCommission(group);
  // Estimate "last cycle dividend" for due-this-cycle display. Until a real auction
  // is recorded, dividend is 0 and the due equals the gross subscription.
  const lastConducted = [...group.cycles].slice(0, cycle.cycleNumber - 1).reverse().find(c => c.conducted);
  const lastDividend = lastConducted?.dividendPerMember ??
    (lastConducted ? calculateDividend(chitValue, lastConducted.winAmount, group.members.length || 1, lastConducted.foremanCommission ?? commission) : 0);
  const due = Math.max(0, group.amount - lastDividend);

  const total = group.members.length;
  const paidCount = getPaidCount(cycle);
  const allPaid = total > 0 && paidCount === total;

  const collected = paidCount * due;
  const pending = (total - paidCount) * due;

  const updateCycle = async (mut: (c: Cycle) => Cycle) => {
    const updatedCycles = group.cycles.map(c => c.id === cycleId ? mut(c) : c);
    const updated = { ...group, cycles: updatedCycles };
    await upsertGroup(updated);
    setGroup(updated);
  };

  const markPaid = async (memberId: string, mode: Mode, note: string) => {
    const member = group.members.find(m => m.id === memberId);
    await updateCycle(c => ({
      ...c,
      payments: c.payments.map(p =>
        p.memberId === memberId
          ? { ...p, paid: true, paidDate: new Date().toISOString(), mode, note: note.trim() || undefined }
          : p,
      ),
    }));
    setEditing(null);
    if (member) toast.success(`${member.name} · marked paid`, `₹${fmtINR(due)} · ${mode.toUpperCase()}`);
  };

  const unmark = async (memberId: string) => {
    Alert.alert('Unmark payment?', 'This will move them back to pending.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Unmark', style: 'destructive', onPress: () => updateCycle(c => ({
        ...c,
        payments: c.payments.map(p => p.memberId === memberId ? { ...p, paid: false, paidDate: undefined, mode: undefined } : p),
      })) },
    ]);
  };

  const markAll = async () => {
    Alert.alert('Mark all paid?', `All ${total} members will be marked paid with mode "cash".`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark all', onPress: () => updateCycle(c => ({
        ...c,
        payments: c.payments.map(p => p.paid ? p : { ...p, paid: true, paidDate: new Date().toISOString(), mode: 'cash' }),
      })) },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <NavHeader onBack={() => navigation.goBack()} title={group.name} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <View style={styles.titleBlock}>
          <Kicker color={colors.primary}>CYCLE {cycle.cycleNumber} OF {group.durationMonths} · {getCycleMonth(group, cycle.cycleNumber).toUpperCase()}</Kicker>
          <Text style={styles.title}>Mark this month's payments</Text>

          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownNum, tnum]}>₹{fmtINR(group.amount)}</Text>
            <Text style={styles.breakdownMuted}> gross </Text>
            <Text style={styles.breakdownMuted}>− </Text>
            <Text style={[styles.breakdownNum, tnum]}>₹{fmtINR(lastDividend)}</Text>
            <Text style={styles.breakdownMuted}> dividend </Text>
            <Text style={styles.breakdownMuted}>= </Text>
            <Text style={[styles.breakdownDue, tnum]}>₹{fmtINR(due)}</Text>
            <Text style={styles.breakdownMuted}> each member</Text>
          </View>
        </View>

        {/* Totals strip */}
        <View style={styles.statsRow}>
          <Stat label="Collected" value={`₹${fmtINR(collected)}`} tone="primary" />
          <Stat label="Pending"   value={`₹${fmtINR(pending)}`}   tone={pending === 0 ? 'muted' : 'neutral'} />
          <Stat label="Paid"      value={`${paidCount}/${total}`} tone="neutral" />
        </View>

        {/* Bulk action */}
        <View style={styles.bulkRow}>
          <Text style={[{ fontSize: 12, color: colors.textMuted }, tnum]}>{total - paidCount} still to mark</Text>
          {!allPaid && total > 0 && (
            <TouchableOpacity onPress={markAll} style={styles.bulkBtn}>
              <Text style={styles.bulkBtnText}>Mark all paid</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Member list */}
        <View style={styles.memberCard}>
          {group.members.map((m, i) => {
            const payment = cycle.payments.find(p => p.memberId === m.id);
            const paid = payment?.paid ?? false;
            const mode = payment?.mode;
            const paidOn = payment?.paidDate
              ? new Date(payment.paidDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
              : null;
            return (
              <View key={m.id} style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
                <MemberRow
                  name={m.name}
                  phone={paid && paidOn ? `Marked · ${paidOn}${mode ? ` · ${MODE_LABEL[mode]}` : ''}` : m.phone}
                  prizedCycle={m.cycleReceived}
                  status={
                    paid ? (
                      <TouchableOpacity onPress={() => unmark(m.id)}>
                        <Pill tone="paid">✓ ₹{fmtINR(due)}</Pill>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={() => setEditing(m)} style={styles.markBtn}>
                        <Text style={styles.markBtnText}>Mark paid</Text>
                      </TouchableOpacity>
                    )
                  }
                />
              </View>
            );
          })}
        </View>

        {group.members.length === 0 && (
          <Text style={{ textAlign: 'center', padding: 20, color: colors.textMuted }}>
            No members yet — add members from the group screen.
          </Text>
        )}
      </ScrollView>

      <View style={styles.ctaBar}>
        <PrimaryButton
          label={allPaid ? 'Conduct draw' : `Conduct draw — ${total - paidCount} pending`}
          trailingArrow={allPaid}
          disabled={!allPaid}
          onPress={() => navigation.navigate('Draw', { groupId, cycleId })}
        />
      </View>

      {editing && (
        <MarkPaymentSheet
          member={editing}
          amount={due}
          onCancel={() => setEditing(null)}
          onSave={(mode, note) => markPaid(editing.id, mode, note)}
        />
      )}
    </View>
  );
}

/* ───────────────────────── Mark-payment sheet ───────────────────────── */

function MarkPaymentSheet({ member, amount, onCancel, onSave }: {
  member: Member;
  amount: number;
  onCancel: () => void;
  onSave: (mode: Mode, note: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [mode, setMode] = useState<Mode>('upi');
  const [note, setNote] = useState('');
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity activeOpacity={1} style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onCancel} />
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Avatar name={member.name} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, ...fonts.semiBold, color: colors.text }}>{member.name}</Text>
              <Text style={[{ fontSize: 12.5, color: colors.textMuted, marginTop: 2 }, tnum]}>{member.phone}</Text>
            </View>
            <Text style={[{ fontSize: 22, ...fonts.bold, color: colors.text }, tnum]}>₹{fmtINR(amount)}</Text>
          </View>

          <Kicker>HOW DID THEY PAY?</Kicker>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {MODES.map(m => {
              const active = mode === m;
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMode(m)}
                  style={{
                    flex: 1, paddingVertical: 14, paddingHorizontal: 4,
                    borderRadius: 12,
                    backgroundColor: active ? colors.primaryLight : colors.card,
                    borderWidth: 1, borderColor: active ? colors.primary : 'transparent',
                    alignItems: 'center', gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 18, color: active ? colors.primary : colors.textSub }}>{MODE_GLYPH[m]}</Text>
                  <Text style={{ fontSize: 11, ...fonts.semiBold, color: active ? colors.primary : colors.textSub }}>
                    {MODE_LABEL[m]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ marginTop: 16 }}>
            <Kicker>OPTIONAL NOTE</Kicker>
            <View style={{
              marginTop: 8,
              backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
            }}>
              <TextInput
                style={{ fontSize: 14, ...fonts.regular, color: colors.text }}
                placeholder="e.g. paid at office"
                placeholderTextColor={colors.textHint}
                value={note}
                onChangeText={setNote}
              />
            </View>
          </View>

          <View style={{ marginTop: 18 }}>
            <PrimaryButton label={`✓ Mark paid · ₹${fmtINR(amount)}`} onPress={() => onSave(mode, note)} />
            <TouchableOpacity onPress={onCancel} style={{ paddingVertical: 12, alignItems: 'center', marginTop: 6 }}>
              <Text style={{ fontSize: 14, ...fonts.medium, color: colors.textSub }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'primary' | 'neutral' | 'muted' }) {
  const { colors } = useTheme();
  const fg = tone === 'primary' ? colors.primary : tone === 'muted' ? colors.textMuted : colors.text;
  return (
    <View style={{
      flex: 1, paddingVertical: 10, paddingHorizontal: 12,
      backgroundColor: colors.card, borderRadius: 12,
      borderWidth: 1, borderColor: colors.border,
    }}>
      <Text style={{ fontSize: 10.5, ...fonts.semiBold, color: colors.textMuted, letterSpacing: 0.6 }}>{label.toUpperCase()}</Text>
      <Text style={[{ marginTop: 4, fontSize: 16, ...fonts.semiBold, color: fg }, tnum]}>{value}</Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    content: { paddingBottom: 120 },
    titleBlock: { paddingHorizontal: 20, paddingTop: 4 },
    title: { marginTop: 6, fontSize: 26, ...fonts.bold, color: c.text, letterSpacing: -0.5 },

    breakdownRow: {
      marginTop: 12,
      backgroundColor: c.card, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 10,
      flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline',
    },
    breakdownNum:   { fontSize: 13, ...fonts.semiBold, color: c.text },
    breakdownMuted: { fontSize: 13, color: c.textMuted },
    breakdownDue:   { fontSize: 14, ...fonts.bold, color: c.primary },

    statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 14 },
    bulkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 12 },
    bulkBtn: {
      paddingHorizontal: 14, paddingVertical: 6,
      borderRadius: 999, borderWidth: 1, borderColor: c.divider2,
    },
    bulkBtnText: { fontSize: 13, ...fonts.semiBold, color: c.text },

    memberCard: {
      marginTop: 14, marginHorizontal: 20,
      paddingHorizontal: 14,
      backgroundColor: c.card, borderRadius: 16, borderWidth: 1, borderColor: c.border,
    },

    markBtn: {
      backgroundColor: c.primary,
      paddingHorizontal: 14, paddingVertical: 7,
      borderRadius: 999,
    },
    markBtnText: { fontSize: 12.5, ...fonts.semiBold, color: c.bg },

    ctaBar: {
      paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28,
      borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg,
    },

    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 20, paddingBottom: 32, paddingTop: 8,
    },
    grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.divider2, alignSelf: 'center', marginVertical: 10 },
  });
}
