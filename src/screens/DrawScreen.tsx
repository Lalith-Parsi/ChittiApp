import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChittiGroup, DrawType, Member } from '../types';
import { getGroupById, upsertGroup } from '../storage';
import {
  assertMoneyConservation,
  calculateDividend,
  getChitValue,
  getEligibleMembers,
  getForemanCommission,
  getMaxDiscount,
} from '../utils/chitti';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../lib/ThemeContext';
import { ThemeColors, fonts, fmtINR, tnum } from '../lib/theme';
import {
  Avatar,
  Card,
  Kicker,
  MoneyEquation,
  NavHeader,
  Pill,
  PrimaryButton,
  Segmented,
} from '../components/chitti-ui';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Draw'>;
type Route = RouteProp<RootStackParamList, 'Draw'>;

export default function DrawScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { groupId, cycleId } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [group, setGroup] = useState<ChittiGroup | null>(null);
  const [mode, setMode] = useState<'lottery' | 'manual'>('lottery');
  const [rolling, setRolling] = useState(false);
  const [rollingDisplay, setRollingDisplay] = useState<string>('');
  const [winner, setWinner] = useState<Member | null>(null);
  const [prizeStr, setPrizeStr] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGroupById(groupId).then(g => {
      if (!g) return;
      setGroup(g);
      const cycle = g.cycles.find(c => c.id === cycleId);
      if (cycle?.drawType === 'manual' || cycle?.drawType === 'auction') setMode('manual');
    });
  }, [groupId, cycleId]);

  if (!group) return null;
  const cycle = group.cycles.find(c => c.id === cycleId);
  if (!cycle) return null;

  const chitValue = getChitValue(group);
  const commission = getForemanCommission(group);
  const maxDiscount = getMaxDiscount(group);
  const eligible = getEligibleMembers(group);

  const prize = parseInt(prizeStr.replace(/\D/g, ''), 10) || 0;
  const discount = Math.max(0, chitValue - prize);
  const dividendPerMember = calculateDividend(chitValue, prize || chitValue, group.members.length || 1, commission);
  const isAboveCap = discount > maxDiscount;
  const isBelowZero = prize > chitValue;
  const manualInvalid = !winner || prize <= 0 || isAboveCap || isBelowZero;
  const balanced = !manualInvalid && assertMoneyConservation({
    chitValue,
    prize,
    foremanCommission: commission,
    dividendPerMember,
    members: group.members.length,
  });

  /* ───────── Lottery ───────── */
  const rollLottery = () => {
    if (eligible.length === 0) {
      Alert.alert('No eligible members', 'All members have already been prized this term.');
      return;
    }
    setRolling(true);
    setWinner(null);
    let ticks = 0;
    const total = 18;
    const tick = () => {
      const pick = eligible[Math.floor(Math.random() * eligible.length)];
      setRollingDisplay(pick.name);
      ticks++;
      if (ticks >= total) {
        setRolling(false);
        setWinner(pick);
      } else {
        // Slow down as we approach the final tick.
        const delay = 80 + ticks * 18;
        setTimeout(tick, delay);
      }
    };
    setTimeout(tick, 60);
  };

  /* ───────── Save ───────── */
  const conduct = async () => {
    if (!winner) return;
    setSaving(true);
    try {
      const isLottery = mode === 'lottery';
      const finalPrize = isLottery ? chitValue : prize;
      const finalDividend = isLottery
        ? 0
        : calculateDividend(chitValue, finalPrize, group.members.length, commission);

      const updatedMembers = group.members.map(m =>
        m.id === winner.id ? { ...m, hasReceived: true, cycleReceived: cycle.cycleNumber } : m,
      );
      const updatedCycles = group.cycles.map(c =>
        c.id !== cycleId ? c : {
          ...c,
          winnerId: winner.id,
          winAmount: finalPrize,
          discount: chitValue - finalPrize,
          foremanCommission: commission,
          dividendPerMember: finalDividend,
          conducted: true,
          drawType: (isLottery ? 'lottery' : 'manual') as DrawType,
          date: new Date().toISOString(),
        },
      );
      await upsertGroup({ ...group, members: updatedMembers, cycles: updatedCycles });
      setConfirming(false);
      navigation.replace('CycleReceipt', { groupId, cycleId });
    } catch (e: unknown) {
      Alert.alert('Could not record', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const prizedCount = group.members.length - eligible.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <NavHeader onBack={() => navigation.goBack()} title={`Cycle ${cycle.cycleNumber} · ${group.name}`} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text style={styles.title}>Conduct the draw</Text>
        <Text style={styles.subtitle}>Everyone has paid — pick who takes this month's pot.</Text>

        <View style={{ marginTop: 18 }}>
          <Segmented
            options={[
              { id: 'lottery', label: 'Lottery' },
              { id: 'manual', label: 'Manual entry' },
            ]}
            value={mode}
            onChange={setMode}
          />
        </View>

        <View style={styles.eligibleBanner}>
          <Text style={[styles.eligibleText, tnum]}>
            Eligible <Text style={{ ...fonts.semiBold, color: colors.text }}>{eligible.length} of {group.members.length}</Text>
          </Text>
          <Text style={[{ fontSize: 12.5, color: colors.textMuted }, tnum]}>{prizedCount} already prized</Text>
        </View>

        {mode === 'lottery' ? (
          <LotteryBody
            chitValue={chitValue}
            rolling={rolling}
            rollingDisplay={rollingDisplay}
            winner={winner}
            onRoll={rollLottery}
          />
        ) : (
          <ManualBody
            chitValue={chitValue}
            commission={commission}
            maxDiscount={maxDiscount}
            members={group.members.length}
            eligible={eligible}
            winner={winner}
            setWinner={setWinner}
            prizeStr={prizeStr}
            setPrizeStr={setPrizeStr}
            dividendPerMember={dividendPerMember}
            isAboveCap={isAboveCap}
            balanced={balanced}
          />
        )}
      </ScrollView>

      <View style={styles.ctaBar}>
        <PrimaryButton
          label={mode === 'lottery'
            ? winner ? `Record cycle for ${winner.name}` : 'Draw winner'
            : 'Conduct draw and record'}
          disabled={mode === 'lottery'
            ? rolling || (winner === null)
            : manualInvalid || rolling}
          onPress={() => {
            if (mode === 'lottery') {
              if (!winner) rollLottery();
              else setConfirming(true);
            } else {
              setConfirming(true);
            }
          }}
        />
        <Text style={styles.ctaFootnote}>
          This will be recorded permanently. Every member sees it.
        </Text>
      </View>

      <Modal visible={confirming} transparent animationType="slide" onRequestClose={() => setConfirming(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>Record this draw?</Text>
            <Text style={styles.sheetSub}>
              You're prizing <Text style={styles.sheetBold}>{winner?.name ?? '—'}</Text> for{' '}
              <Text style={styles.sheetBold}>₹{fmtINR(mode === 'lottery' ? chitValue : prize)}</Text>. Every member will see this.
              You can't undo it — only correct it with a new entry in the audit log.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <TouchableOpacity onPress={() => setConfirming(false)} style={styles.sheetSecondary}>
                <Text style={styles.sheetSecondaryText}>Go back</Text>
              </TouchableOpacity>
              <View style={{ flex: 1.4 }}>
                <PrimaryButton label={saving ? 'Recording…' : 'Yes, record'} disabled={saving} onPress={conduct} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ───────────────────────── Lottery body ───────────────────────── */

function LotteryBody({ chitValue, rolling, rollingDisplay, winner, onRoll }: {
  chitValue: number;
  rolling: boolean;
  rollingDisplay: string;
  winner: Member | null;
  onRoll: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 18, gap: 14 }}>
      <Card>
        <Kicker>THE POT</Kicker>
        <Text style={[{ marginTop: 4, fontSize: 36, ...fonts.bold, color: colors.text, letterSpacing: -0.7 }, tnum]}>
          ₹{fmtINR(chitValue)}
        </Text>
      </Card>

      <Card style={{ minHeight: 160, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {rolling ? (
          <>
            <Kicker>DRAWING</Kicker>
            <Text style={{ marginTop: 12, fontSize: 28, ...fonts.bold, color: colors.text, letterSpacing: -0.4 }} numberOfLines={1}>
              {rollingDisplay || '…'}
            </Text>
            <ActivityIndicator style={{ marginTop: 14 }} color={colors.primary} />
          </>
        ) : winner ? (
          <>
            <Avatar name={winner.name} size={72} />
            <Kicker color={colors.accent} style={{ marginTop: 14 }}>CYCLE WINNER</Kicker>
            <Text style={{ marginTop: 6, fontSize: 28, ...fonts.bold, color: colors.text, letterSpacing: -0.5 }} numberOfLines={1}>
              {winner.name}
            </Text>
            <Text style={[{ marginTop: 4, fontSize: 12, color: colors.textMuted }, tnum]}>
              {winner.phone}
            </Text>
            <Text style={{
              marginTop: 12, fontSize: 12, color: colors.textMuted, textAlign: 'center', maxWidth: 260, lineHeight: 18,
            }}>
              Lottery prizes the full pot — no discount, no dividend. Foreman commission is applied either way.
            </Text>
          </>
        ) : (
          <>
            <Kicker>READY</Kicker>
            <Text style={{ marginTop: 8, fontSize: 14, color: colors.textMuted, textAlign: 'center', maxWidth: 260, lineHeight: 20 }}>
              Tap "Draw winner" below to pick a random eligible member.
            </Text>
            <Pill tone="primary" style={{ marginTop: 14 }}>Lottery</Pill>
          </>
        )}
      </Card>

      {!rolling && (
        <TouchableOpacity onPress={onRoll} style={{ alignSelf: 'center' }}>
          <Text style={{ fontSize: 13, ...fonts.semiBold, color: colors.primary, paddingVertical: 6 }}>
            {winner ? 'Re-roll' : 'Tap to roll'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ───────────────────────── Manual body ───────────────────────── */

function ManualBody({
  chitValue, commission, maxDiscount, members, eligible, winner, setWinner,
  prizeStr, setPrizeStr, dividendPerMember, isAboveCap, balanced,
}: {
  chitValue: number;
  commission: number;
  maxDiscount: number;
  members: number;
  eligible: Member[];
  winner: Member | null;
  setWinner: (m: Member | null) => void;
  prizeStr: string;
  setPrizeStr: (s: string) => void;
  dividendPerMember: number;
  isAboveCap: boolean;
  balanced: boolean;
}) {
  const { colors } = useTheme();
  const [picking, setPicking] = useState(false);

  const prize = parseInt(prizeStr.replace(/\D/g, ''), 10) || 0;
  const discount = Math.max(0, chitValue - prize);

  return (
    <View style={{ marginTop: 18, gap: 14 }}>
      {/* Winner picker */}
      <View>
        <Text style={{ fontSize: 13, ...fonts.semiBold, color: colors.text }}>Who's taking it this cycle?</Text>
        <TouchableOpacity
          onPress={() => setPicking(true)}
          style={{
            marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 12,
            backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
          }}
        >
          {winner ? (
            <>
              <Avatar name={winner.name} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, ...fonts.semiBold, color: colors.text }}>{winner.name}</Text>
                <Text style={[{ fontSize: 12, color: colors.textMuted, marginTop: 2 }, tnum]}>{winner.phone}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.divider2 }} />
              <Text style={{ flex: 1, fontSize: 14, color: colors.textMuted }}>
                Pick from {eligible.length} eligible members
              </Text>
            </>
          )}
          <Text style={{ fontSize: 16, color: colors.textMuted }}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Prize input */}
      <View>
        <Text style={{ fontSize: 13, ...fonts.semiBold, color: colors.text }}>Prize amount (after discount)</Text>
        <View style={{
          marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 10,
          paddingHorizontal: 14, paddingVertical: 12,
          backgroundColor: colors.card,
          borderRadius: 14, borderWidth: 1, borderColor: isAboveCap ? colors.danger : 'transparent',
        }}>
          <Text style={{ fontSize: 22, color: colors.textSub, ...fonts.medium }}>₹</Text>
          <TextInput
            style={[{ flex: 1, fontSize: 24, ...fonts.medium, color: colors.text }, tnum]}
            placeholder="70,000"
            placeholderTextColor={colors.textHint}
            keyboardType="numeric"
            value={prize ? fmtINR(prize) : ''}
            onChangeText={(t) => setPrizeStr(t.replace(/\D/g, ''))}
          />
        </View>
        <Text style={{
          marginTop: 6, fontSize: 12,
          color: isAboveCap ? colors.danger : colors.textMuted,
        }}>
          {isAboveCap ? (
            `Discount ₹${fmtINR(discount)} exceeds the ${Math.round(maxDiscount / chitValue * 100)}% cap (₹${fmtINR(maxDiscount)}).`
          ) : prize > 0 ? (
            `Discount ₹${fmtINR(discount)} · ${chitValue ? Math.round(discount / chitValue * 100) : 0}% of the pot`
          ) : (
            'Enter what the winner is willing to take.'
          )}
        </Text>
      </View>

      {/* Live invariant */}
      <MoneyEquation
        chitValue={chitValue}
        prize={prize}
        foremanCommission={commission}
        dividendPerMember={dividendPerMember}
        members={members}
        balanced={balanced}
      />

      {/* Picker modal */}
      <Modal visible={picking} transparent animationType="slide" onRequestClose={() => setPicking(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay }}>
          <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '70%' }}>
            <Text style={{ fontSize: 18, ...fonts.bold, color: colors.text, marginBottom: 12 }}>Eligible members</Text>
            <ScrollView>
              {eligible.map((m, i) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => { setWinner(m); setPicking(false); }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
                    borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border,
                  }}
                >
                  <Avatar name={m.name} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, ...fonts.medium, color: colors.text }}>{m.name}</Text>
                    <Text style={[{ fontSize: 12, color: colors.textMuted, marginTop: 2 }, tnum]}>{m.phone}</Text>
                  </View>
                  {winner?.id === m.id && <Text style={{ fontSize: 18, color: colors.primary }}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setPicking(false)} style={{ paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, ...fonts.semiBold, color: colors.textSub }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    title: { fontSize: 28, ...fonts.bold, color: c.text, letterSpacing: -0.5, marginTop: 4 },
    subtitle: { marginTop: 4, fontSize: 13.5, color: c.textSub },

    eligibleBanner: {
      marginTop: 16, padding: 12, backgroundColor: c.card, borderRadius: 12,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    eligibleText: { fontSize: 12.5, color: c.textSub },

    fieldLabel: { fontSize: 13, ...fonts.semiBold, color: c.text },
    amountField: {
      marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 14, paddingVertical: 12,
      backgroundColor: c.card,
      borderRadius: 14, borderWidth: 1, borderColor: 'transparent',
    },

    ctaBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg },
    ctaFootnote: { marginTop: 8, fontSize: 11, color: c.textMuted, textAlign: 'center' },

    sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: c.overlay },
    sheet: { backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingBottom: 32, paddingTop: 8 },
    grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.divider2, alignSelf: 'center', marginVertical: 10 },
    sheetTitle: { fontSize: 22, ...fonts.bold, color: c.text, letterSpacing: -0.4, marginTop: 4 },
    sheetSub: { marginTop: 10, fontSize: 14, lineHeight: 21, ...fonts.regular, color: c.textSub },
    sheetBold: { ...fonts.semiBold, color: c.text },
    sheetSecondary: { flex: 1, paddingVertical: 16, backgroundColor: c.card, borderRadius: 14, alignItems: 'center' },
    sheetSecondaryText: { fontSize: 15, ...fonts.semiBold, color: c.text },
  });
}
