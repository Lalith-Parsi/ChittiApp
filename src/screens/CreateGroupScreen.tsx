import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import 'react-native-get-random-values';
import { v4 as uuid } from 'uuid';
import { ChittiGroup, DrawType } from '../types';
import { upsertGroup, getGroupById } from '../storage';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../lib/ThemeContext';
import { ThemeColors, fonts, fmtINR, tnum } from '../lib/theme';
import { FieldLabel, NavHeader, PrimaryButton, Segmented } from '../components/chitti-ui';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateGroup'>;
type Route = RouteProp<RootStackParamList, 'CreateGroup'>;

const COMMON_DUE_DAYS = [1, 5, 10, 15, 20, 25, 28];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function CreateGroupScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const editId = route.params?.groupId;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const now = new Date();
  const [name, setName] = useState('');
  const [chitValue, setChitValue] = useState(0);
  const [members, setMembers] = useState(20);
  const [commissionPct, setCommissionPct] = useState(5);
  const [maxDiscountPct, setMaxDiscountPct] = useState(30);
  const [paymentDay, setPaymentDay] = useState(15);
  const [drawType, setDrawType] = useState<DrawType>('lottery');
  const [startMonth, setStartMonth] = useState(now.getMonth());
  const [startYear, setStartYear] = useState(now.getFullYear());

  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  /** Load existing group when editing. */
  useEffect(() => {
    if (!editId) return;
    getGroupById(editId).then(g => {
      if (!g) return;
      setName(g.name);
      setChitValue((g.amount ?? 0) * (g.totalMembers || g.members.length || 1));
      setMembers(g.totalMembers || g.members.length || 20);
      setCommissionPct(g.foremanCommissionPct ?? 5);
      setMaxDiscountPct(g.maxDiscountPct ?? 30);
      setPaymentDay(g.paymentDay ?? 15);
      setDrawType((g.drawType as DrawType) ?? 'lottery');
      setStartMonth(g.startMonth ?? now.getMonth());
      setStartYear(g.startYear ?? now.getFullYear());
    });
  }, [editId]);

  const subscription = members > 0 ? Math.round(chitValue / members) : 0;
  const commissionAmt = Math.round((chitValue * commissionPct) / 100);
  const maxDiscountAmt = Math.round((chitValue * maxDiscountPct) / 100);

  const isCommissionInvalid = commissionPct > 5;
  const isDiscountInvalid = maxDiscountPct > 30;
  const canCreate = !!name.trim() && chitValue >= 1000 && members >= 2 && !isCommissionInvalid && !isDiscountInvalid;

  const save = async () => {
    setLoading(true);
    try {
      const startDate = new Date(startYear, startMonth, 1).toISOString();
      if (editId) {
        const existing = await getGroupById(editId);
        if (existing) {
          await upsertGroup({
            ...existing,
            name: name.trim(),
            amount: subscription,
            durationMonths: members,
            totalMembers: members,
            foremanCommissionPct: commissionPct,
            maxDiscountPct,
            paymentDay,
            drawType,
            startDate,
            startDay: 1,
            startMonth,
            startYear,
          });
        }
        navigation.goBack();
      } else {
        const newGroup: ChittiGroup = {
          id: uuid(),
          name: name.trim(),
          amount: subscription,
          totalMembers: members,
          durationMonths: members,
          foremanCommissionPct: commissionPct,
          maxDiscountPct,
          drawType,
          startDate,
          startDay: 1,
          startMonth,
          startYear,
          paymentDay,
          members: [],
          cycles: [],
          createdAt: new Date().toISOString(),
          isActive: true,
        };
        await upsertGroup(newGroup);
        navigation.replace('GroupDetail', { groupId: newGroup.id });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save group';
      Alert.alert('Could not save', msg);
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <NavHeader
        onBack={() => navigation.goBack()}
        title={editId ? 'Edit chit' : 'New chit'}
        right={<View style={{ width: 26 }} />}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Group name */}
        <FieldLabel hint="What you'll call it. Members will see this on their phones.">
          Group name
        </FieldLabel>
        <View style={styles.field}>
          <TextInput
            style={styles.input}
            placeholder="e.g. Anna Nagar Family Chit"
            placeholderTextColor={colors.textHint}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Chit value */}
        <FieldLabel hint="The pot every cycle — what everyone pools each month, in total.">
          Chit value
        </FieldLabel>
        <View style={styles.field}>
          <Text style={styles.rupeeGlyph}>₹</Text>
          <TextInput
            style={[styles.input, styles.bigInput, tnum]}
            placeholder="1,00,000"
            placeholderTextColor={colors.textHint}
            keyboardType="numeric"
            value={chitValue ? fmtINR(chitValue) : ''}
            onChangeText={(t) => setChitValue(parseInt(t.replace(/\D/g, ''), 10) || 0)}
          />
        </View>

        {/* Members */}
        <FieldLabel hint="This is also how many months the chit runs.">
          Number of members
        </FieldLabel>
        <Stepper value={members} onChange={setMembers} min={2} max={60} />
        <DerivedRow label="Each member pays" value={`₹${fmtINR(subscription)} / month`} tone="primary" />

        {/* Commission */}
        <FieldLabel hint="Your fee for running the chit. The Chit Funds Act, 1982 caps this at 5%.">
          Foreman commission
        </FieldLabel>
        <PercentRow value={commissionPct} onChange={setCommissionPct} max={10} cap={5} />
        {isCommissionInvalid && (
          <Text style={styles.errorText}>Commission cannot exceed the 5% legal cap.</Text>
        )}
        <DerivedRow
          label="You earn per cycle"
          value={`₹${fmtINR(commissionAmt)}`}
          tone={isCommissionInvalid ? 'error' : 'neutral'}
        />

        {/* Max discount */}
        <FieldLabel hint="How much a bidder can give up in the auction. Act cap is 30%.">
          Maximum discount
        </FieldLabel>
        <PercentRow value={maxDiscountPct} onChange={setMaxDiscountPct} max={40} cap={30} />
        {isDiscountInvalid && (
          <Text style={styles.errorText}>Discount cap cannot exceed 30%.</Text>
        )}
        <DerivedRow label="Max forgone" value={`₹${fmtINR(maxDiscountAmt)}`} tone="neutral" />

        {/* Due day */}
        <FieldLabel hint="Day of every month when subscriptions are due.">
          Payment due day
        </FieldLabel>
        <View style={styles.dayGrid}>
          {COMMON_DUE_DAYS.map(d => {
            const active = paymentDay === d;
            return (
              <TouchableOpacity
                key={d}
                onPress={() => setPaymentDay(d)}
                style={[styles.dayBtn, active && styles.dayBtnActive]}
              >
                <Text style={[styles.dayBtnText, tnum, active && styles.dayBtnTextActive]}>{d}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Draw type */}
        <FieldLabel hint="How the winner is chosen each cycle. You can mix lottery + manual across cycles.">
          Draw type
        </FieldLabel>
        <Segmented
          options={[
            { id: 'lottery', label: 'Lottery' },
            { id: 'manual',  label: 'Manual entry' },
            { id: 'auction', label: 'Auction', disabled: true },
          ]}
          value={drawType === 'self-assign' ? 'manual' : drawType}
          onChange={(v) => setDrawType(v as DrawType)}
        />

        {/* Start month */}
        <View style={{ marginTop: 22 }}>
          <FieldLabel hint="First cycle's subscription will be due that month.">
            Starting month
          </FieldLabel>
          <View style={styles.monthRow}>
            <TouchableOpacity
              style={styles.monthArrow}
              onPress={() => {
                let m = startMonth - 1, y = startYear;
                if (m < 0) { m = 11; y--; }
                setStartMonth(m); setStartYear(y);
              }}
            >
              <Text style={styles.monthArrowText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{MONTHS[startMonth]} {startYear}</Text>
            <TouchableOpacity
              style={styles.monthArrow}
              onPress={() => {
                let m = startMonth + 1, y = startYear;
                if (m > 11) { m = 0; y++; }
                setStartMonth(m); setStartYear(y);
              }}
            >
              <Text style={styles.monthArrowText}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={styles.ctaBar}>
        <PrimaryButton
          label={loading ? 'Saving…' : (editId ? 'Save changes' : 'Review and create')}
          disabled={!canCreate || loading}
          onPress={() => editId ? save() : setConfirming(true)}
        />
      </View>

      {/* Confirming sheet */}
      <Modal visible={confirming} transparent animationType="slide" onRequestClose={() => setConfirming(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>You're about to start this chit.</Text>
            <Text style={styles.sheetSub}>
              A <Text style={styles.sheetBold}>{members}-member, {members}-month</Text> chit with a{' '}
              <Text style={styles.sheetBold}>₹{fmtINR(chitValue)}</Text> pot. Each member pays{' '}
              <Text style={styles.sheetBold}>₹{fmtINR(subscription)}</Text> a month before any discount.
              You'll earn <Text style={styles.sheetBold}>₹{fmtINR(commissionAmt)}</Text> per cycle as foreman.
            </Text>

            <View style={styles.summaryBox}>
              <SummaryRow label="Starts" value={`${MONTHS[startMonth]} ${startYear} · cycle 1 of ${members}`} />
              <SummaryRow label="Due day" value={`${paymentDay} of every month`} />
              <SummaryRow label="Draw" value={drawType === 'lottery' ? 'Lottery' : 'Manual entry'} />
              <SummaryRow label="Max discount" value={`${maxDiscountPct}% — the Act cap`} />
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.sheetSecondary} onPress={() => setConfirming(false)}>
                <Text style={styles.sheetSecondaryText}>Go back</Text>
              </TouchableOpacity>
              <View style={{ flex: 1.4 }}>
                <PrimaryButton
                  label={loading ? 'Creating…' : 'Create chit'}
                  disabled={loading}
                  onPress={save}
                />
              </View>
            </View>
            {loading && <ActivityIndicator style={{ marginTop: 10 }} color={colors.primary} />}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

/* ───────────────────────── Helpers ───────────────────────── */

function Stepper({ value, onChange, min, max }: { value: number; onChange: (n: number) => void; min: number; max: number }) {
  const { colors } = useTheme();
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card, borderRadius: 12, padding: 4,
    }}>
      <TouchableOpacity style={stepBtn} onPress={() => onChange(Math.max(min, value - 1))}>
        <Text style={[stepBtnText, { color: colors.text }]}>−</Text>
      </TouchableOpacity>
      <Text style={[{ flex: 1, textAlign: 'center', fontSize: 22, ...fonts.semiBold, color: colors.text }, tnum]}>
        {value}
      </Text>
      <TouchableOpacity style={stepBtn} onPress={() => onChange(Math.min(max, value + 1))}>
        <Text style={[stepBtnText, { color: colors.text }]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
const stepBtn: any = { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' };
const stepBtnText: any = { fontSize: 22, ...fonts.regular };

function PercentRow({ value, onChange, max, cap }: { value: number; onChange: (n: number) => void; max: number; cap: number }) {
  const { colors } = useTheme();
  // Simple discrete picker (0..max in 1% steps shown as +/- buttons since RN has no native slider in Expo SDK 56 OOB).
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 4 }}>
      <TouchableOpacity style={stepBtn} onPress={() => onChange(Math.max(0, value - 1))}>
        <Text style={[stepBtnText, { color: colors.text }]}>−</Text>
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={[{ fontSize: 22, ...fonts.semiBold, color: value > cap ? colors.danger : colors.text }, tnum]}>
          {value}%
        </Text>
        <Text style={{ fontSize: 10.5, ...fonts.semiBold, color: colors.textMuted, marginTop: 2, letterSpacing: 0.5 }}>
          ACT CAP: {cap}%
        </Text>
      </View>
      <TouchableOpacity style={stepBtn} onPress={() => onChange(Math.min(max, value + 1))}>
        <Text style={[stepBtnText, { color: colors.text }]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function DerivedRow({ label, value, tone }: { label: string; value: string; tone: 'primary' | 'neutral' | 'error' }) {
  const { colors } = useTheme();
  const bg = tone === 'primary' ? colors.primaryLight : colors.card;
  const fg = tone === 'primary' ? colors.primary : tone === 'error' ? colors.danger : colors.text;
  return (
    <View style={{
      marginTop: 10,
      paddingHorizontal: 14, paddingVertical: 10,
      backgroundColor: bg, borderRadius: 10,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <Text style={{ fontSize: 12.5, ...fonts.regular, color: colors.textSub }}>{label}</Text>
      <Text style={[{ fontSize: 15, ...fonts.semiBold, color: fg }, tnum]}>{value}</Text>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 4 }}>
      <Text style={{ fontSize: 13, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 13, ...fonts.semiBold, color: colors.text }}>{value}</Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },
    field: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
      marginBottom: 22, borderWidth: 1, borderColor: 'transparent',
    },
    input: { flex: 1, fontSize: 16, ...fonts.medium, color: c.text },
    bigInput: { fontSize: 22, letterSpacing: 0.3 },
    rupeeGlyph: { fontSize: 22, ...fonts.medium, color: c.textSub },
    errorText: { marginTop: 6, fontSize: 12.5, ...fonts.medium, color: c.danger },

    dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 22 },
    dayBtn: {
      flex: 1,
      minWidth: 40,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: c.card,
      alignItems: 'center',
    },
    dayBtnActive: { backgroundColor: c.primary },
    dayBtnText:   { fontSize: 14, ...fonts.semiBold, color: c.text },
    dayBtnTextActive: { color: c.bg },

    monthRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: c.card, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18,
    },
    monthArrow: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    monthArrowText: { fontSize: 22, color: c.textSub },
    monthLabel: { fontSize: 16, ...fonts.semiBold, color: c.text },

    ctaBar: {
      paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28,
      borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg,
    },

    sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: c.overlay },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingHorizontal: 24, paddingBottom: 32, paddingTop: 8,
    },
    grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.divider2, alignSelf: 'center', marginVertical: 10 },
    sheetTitle: { fontSize: 24, ...fonts.bold, color: c.text, letterSpacing: -0.4, marginTop: 6 },
    sheetSub:   { marginTop: 10, fontSize: 14.5, lineHeight: 22, ...fonts.regular, color: c.textSub },
    sheetBold:  { ...fonts.semiBold, color: c.text },
    summaryBox: { marginTop: 16, padding: 14, backgroundColor: c.card, borderRadius: 14, gap: 4 },
    sheetActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
    sheetSecondary: {
      flex: 1, paddingVertical: 16, backgroundColor: c.card, borderRadius: 14, alignItems: 'center',
    },
    sheetSecondaryText: { fontSize: 15, ...fonts.semiBold, color: c.text },
  });
}
