import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Share } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChittiGroup } from '../types';
import { getGroupById } from '../storage';
import { calculateDividend, getChitValue, getCycleMonth, getForemanCommission } from '../utils/chitti';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../lib/ThemeContext';
import { ThemeColors, fonts, fmtINR, tnum } from '../lib/theme';
import { Avatar, Card, Kicker, MoneyEquation, NavHeader, Pill, PrimaryButton } from '../components/chitti-ui';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CycleReceipt'>;
type Route = RouteProp<RootStackParamList, 'CycleReceipt'>;

export default function CycleReceiptScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { groupId, cycleId } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [group, setGroup] = useState<ChittiGroup | null>(null);
  const [expandDividend, setExpandDividend] = useState(false);

  useEffect(() => { getGroupById(groupId).then(setGroup); }, [groupId]);
  if (!group) return null;

  const cycle = group.cycles.find(c => c.id === cycleId);
  if (!cycle) return null;

  const chitValue = getChitValue(group);
  const winner = group.members.find(m => m.id === cycle.winnerId);
  const prize = cycle.winAmount;
  const commission = cycle.foremanCommission ?? getForemanCommission(group);
  const dividend = cycle.dividendPerMember ??
    calculateDividend(chitValue, prize, group.members.length || 1, commission);
  const cycleMonth = getCycleMonth(group, cycle.cycleNumber);

  const recordedAt = cycle.date ? new Date(cycle.date) : null;
  const recordedLabel = recordedAt
    ? recordedAt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' +
      recordedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
    : '—';

  const shareMessage =
    `Cycle ${cycle.cycleNumber} of ${group.name} — done.\n` +
    `🏆 ${winner?.name ?? 'Winner'} took ₹${fmtINR(prize)}.\n` +
    `✓ Math verified — every rupee accounted for.\n` +
    `💰 Your dividend this cycle: ₹${fmtINR(dividend)}.`;

  const onShare = async () => {
    try {
      await Share.share({ message: shareMessage });
    } catch {
      // Cancelled by user — no-op.
    }
  };

  const onWhatsApp = () => {
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`).catch(() => onShare());
  };

  const dividendList = expandDividend ? group.members : group.members.slice(0, 5);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <NavHeader onBack={() => navigation.goBack()} title={`Cycle ${cycle.cycleNumber} receipt`} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 14 }}>
        {/* Header */}
        <View>
          <Kicker color={colors.accent}>RECORDED · {recordedLabel.toUpperCase()}</Kicker>
          <Text style={styles.title}>Recorded. Here's the receipt.</Text>
          <Text style={styles.subtitle}>{cycleMonth} · {group.name}</Text>
        </View>

        {/* Winner card */}
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Avatar name={winner?.name ?? '?'} size={56} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Kicker color={colors.accent}>PRIZED THIS CYCLE</Kicker>
            <Text style={{ marginTop: 4, fontSize: 18, ...fonts.semiBold, color: colors.text }} numberOfLines={1}>
              {winner?.name ?? '—'}
            </Text>
            <Text style={{ marginTop: 4, fontSize: 12.5, color: colors.textMuted }}>
              Foreman pays the prize outside the app
            </Text>
          </View>
          <Text style={[{ fontSize: 24, ...fonts.bold, color: colors.text, letterSpacing: -0.4 }, tnum]}>
            ₹{fmtINR(prize)}
          </Text>
        </Card>

        {/* THE MATH — signature block */}
        <MoneyEquation
          variant="receipt"
          chitValue={chitValue}
          prize={prize}
          foremanCommission={commission}
          dividendPerMember={dividend}
          members={group.members.length}
        />

        {/* Personal note (assumes signed-in user is foreman in v1; member view comes Phase 2) */}
        <Card style={{ backgroundColor: colors.primaryLight, borderColor: colors.primaryLight }}>
          <Kicker color={colors.primary}>WHAT THIS MEANS FOR YOU</Kicker>
          <Text style={{ marginTop: 6, fontSize: 14, color: colors.text, lineHeight: 20 }}>
            Your next due is{' '}
            <Text style={[{ ...fonts.bold }, tnum]}>₹{fmtINR(Math.max(0, group.amount - dividend))}</Text>
            {dividend > 0 && (
              <>
                {' '}—{' '}
                <Text style={{ color: colors.success, ...fonts.semiBold }}>
                  down ₹{fmtINR(dividend)}
                </Text>
                {' '}from last cycle
              </>
            )}.
          </Text>
        </Card>

        {/* Dividend table */}
        <Card style={{ paddingHorizontal: 16 }}>
          <Kicker>DIVIDEND BACK TO EVERYONE</Kicker>
          <Text style={{ marginTop: 2, fontSize: 12.5, color: colors.textSub }}>
            ₹{fmtINR(dividend)} credited to all{' '}
            <Text style={tnum}>{group.members.length}</Text> members
          </Text>
          {dividendList.map((m, i) => (
            <View
              key={m.id}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                paddingVertical: 10,
                borderTopWidth: i === 0 ? 1 : 1,
                borderTopColor: colors.border,
                marginTop: i === 0 ? 10 : 0,
              }}
            >
              <Avatar name={m.name} size={28} />
              <Text style={{ flex: 1, fontSize: 14, color: colors.text }} numberOfLines={1}>{m.name}</Text>
              <Text style={[{ fontSize: 14, ...fonts.semiBold, color: colors.success }, tnum]}>
                ₹{fmtINR(dividend)}
              </Text>
            </View>
          ))}
          {group.members.length > 5 && (
            <TouchableOpacity
              onPress={() => setExpandDividend(v => !v)}
              style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 13, ...fonts.semiBold, color: colors.primary }}>
                {expandDividend ? 'Show fewer' : `Show all ${group.members.length}`}
              </Text>
            </TouchableOpacity>
          )}
        </Card>
      </ScrollView>

      {/* CTAs */}
      <View style={styles.ctaBar}>
        <TouchableOpacity
          onPress={onWhatsApp}
          activeOpacity={0.85}
          style={{
            backgroundColor: '#1FA855',
            borderRadius: 14, paddingVertical: 16,
            alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: 8,
          }}
        >
          <Text style={{ fontSize: 16, ...fonts.semiBold, color: '#FFFFFF' }}>
            ✉  Share to WhatsApp
          </Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('PaymentTracking', { groupId, cycleId })}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>View full ledger</Text>
          </TouchableOpacity>
          <View style={[styles.secondary, { opacity: 0.55 }]}>
            <Text style={styles.secondaryText}>Open as PDF · soon</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    title: { marginTop: 6, fontSize: 28, ...fonts.bold, color: c.text, letterSpacing: -0.5, lineHeight: 32 },
    subtitle: { marginTop: 4, fontSize: 13, color: c.textSub },
    ctaBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg },
    secondary: {
      flex: 1, paddingVertical: 13, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.card, borderRadius: 12, borderWidth: 1, borderColor: c.border,
    },
    secondaryText: { fontSize: 14, ...fonts.semiBold, color: c.text },
  });
}
