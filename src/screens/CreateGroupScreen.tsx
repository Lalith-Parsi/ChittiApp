import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import 'react-native-get-random-values';
import { v4 as uuid } from 'uuid';
import { ChittiGroup } from '../types';
import { upsertGroup, getGroupById } from '../storage';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../lib/ThemeContext';
import { ThemeColors, fonts } from '../lib/theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'CreateGroup'>;
type Route = RouteProp<RootStackParamList, 'CreateGroup'>;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function daysInMonth(month: number, year: number) { return new Date(year, month + 1, 0).getDate(); }
function ordinal(n: number) {
  const s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default function CreateGroupScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const editId = route.params?.groupId;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const now = new Date();
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount]           = useState('');
  const [duration, setDuration]       = useState('');
  const [startDay, setStartDay]       = useState(1);
  const [startMonth, setStartMonth]   = useState(now.getMonth());
  const [startYear, setStartYear]     = useState(now.getFullYear());
  const [paymentDay, setPaymentDay]   = useState('1');
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    if (!editId) return;
    getGroupById(editId).then(g => {
      if (!g) return;
      setName(g.name); setDescription(g.description ?? '');
      setAmount(String(g.amount)); setDuration(String(g.durationMonths));
      setStartDay(g.startDay ?? 1); setStartMonth(g.startMonth ?? now.getMonth());
      setStartYear(g.startYear ?? now.getFullYear()); setPaymentDay(String(g.paymentDay ?? 1));
    });
  }, [editId]);

  const shiftMonth = (delta: number) => {
    let m = startMonth + delta, y = startYear;
    if (m > 11) { m = 0; y++; } if (m < 0) { m = 11; y--; }
    setStartMonth(m); setStartYear(y);
    if (startDay > daysInMonth(m, y)) setStartDay(daysInMonth(m, y));
  };
  const shiftDay = (delta: number) => {
    const max = daysInMonth(startMonth, startYear);
    let d = startDay + delta;
    if (d < 1) d = max; if (d > max) d = 1;
    setStartDay(d);
  };

  const handleSave = async () => {
    if (!name.trim()) { alert('Please enter a group name'); return; }
    const amt = parseInt(amount), dur = parseInt(duration), pDay = parseInt(paymentDay);
    if (!amt || amt <= 0)               { alert('Enter a valid monthly amount'); return; }
    if (!dur || dur <= 0)               { alert('Enter a valid duration'); return; }
    if (!pDay || pDay < 1 || pDay > 31) { alert('Payment day must be between 1 and 31'); return; }

    setLoading(true);
    try {
      const startDate = new Date(startYear, startMonth, startDay).toISOString();
      if (editId) {
        const existing = await getGroupById(editId);
        if (existing) await upsertGroup({ ...existing, name: name.trim(), description: description.trim(), amount: amt, durationMonths: dur, startDate, startDay, startMonth, startYear, paymentDay: pDay });
        navigation.goBack();
      } else {
        const newGroup: ChittiGroup = {
          id: uuid(), name: name.trim(), description: description.trim() || undefined,
          amount: amt, totalMembers: 0, durationMonths: dur,
          startDate, startDay, startMonth, startYear, paymentDay: pDay,
          members: [], cycles: [], createdAt: new Date().toISOString(), isActive: true,
        };
        await upsertGroup(newGroup);
        navigation.replace('GroupDetail', { groupId: newGroup.id });
      }
    } catch (e: any) {
      alert(e?.message ?? 'Failed to save group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{editId ? 'Edit Group' : 'New Chitti Group'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Group Name</Text>
          <TextInput style={styles.input} placeholder="e.g. Friends Chitti 2025" value={name} onChangeText={setName} placeholderTextColor={colors.textHint} />

          <Text style={styles.label}>Description <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="e.g. Monthly chitti for close friends" value={description} onChangeText={setDescription} multiline numberOfLines={3} placeholderTextColor={colors.textHint} textAlignVertical="top" />

          <Text style={styles.label}>Monthly Contribution (₹)</Text>
          <TextInput style={styles.input} placeholder="e.g. 2000" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholderTextColor={colors.textHint} />

          <Text style={styles.label}>Duration (months)</Text>
          <TextInput style={styles.input} placeholder="e.g. 20" value={duration} onChangeText={setDuration} keyboardType="numeric" placeholderTextColor={colors.textHint} />

          <Text style={styles.label}>Group Start Date</Text>
          <View style={styles.dateRow}>
            {[
              { label: 'Day',   val: String(startDay).padStart(2,'0'), up: () => shiftDay(1),   down: () => shiftDay(-1)   },
              { label: 'Month', val: MONTHS[startMonth],               up: () => shiftMonth(1), down: () => shiftMonth(-1) },
              { label: 'Year',  val: String(startYear),                up: () => setStartYear(y => y+1), down: () => setStartYear(y => y-1) },
            ].map((part, i) => (
              <React.Fragment key={part.label}>
                {i > 0 && <Text style={styles.dateSep}>/</Text>}
                <View style={styles.datePart}>
                  <TouchableOpacity style={styles.arrow} onPress={part.up}><Ionicons name="chevron-up" size={18} color={colors.primaryText} /></TouchableOpacity>
                  <View style={styles.dateBox}>
                    <Text style={styles.dateVal}>{part.val}</Text>
                    <Text style={styles.dateUnit}>{part.label}</Text>
                  </View>
                  <TouchableOpacity style={styles.arrow} onPress={part.down}><Ionicons name="chevron-down" size={18} color={colors.primaryText} /></TouchableOpacity>
                </View>
              </React.Fragment>
            ))}
          </View>

          <Text style={styles.label}>Payment Date (day of every month)</Text>
          <View style={styles.paymentRow}>
            <TextInput style={[styles.input, styles.paymentInput]} placeholder="e.g. 5" value={paymentDay} onChangeText={setPaymentDay} keyboardType="numeric" maxLength={2} placeholderTextColor={colors.textHint} />
            <View style={styles.paymentHint}>
              <Ionicons name="calendar-outline" size={16} color={colors.primaryText} />
              <Text style={styles.paymentHintText}>
                {paymentDay && !isNaN(parseInt(paymentDay)) ? `Pay by ${ordinal(parseInt(paymentDay))} of every month` : 'Enter a day (1–31)'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSave} disabled={loading}>
          <Text style={styles.btnText}>{editId ? 'Save Changes' : 'Create Group'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: 20, paddingBottom: 40 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 20 },
    back: { marginRight: 12 },
    title: { fontSize: 22, ...fonts.extraBold, color: c.text },
    card: {
      backgroundColor: c.card, borderRadius: 16, padding: 20, marginBottom: 20,
      shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    label:    { fontSize: 13, ...fonts.semiBold, color: c.textSub, marginBottom: 6, marginTop: 16 },
    optional: { ...fonts.regular, color: c.textHint },
    input: {
      borderWidth: 1.5, borderColor: c.inputBorder, borderRadius: 10,
      padding: 12, fontSize: 16, ...fonts.regular, color: c.text, backgroundColor: c.inputBg,
    },
    textArea: { minHeight: 80, lineHeight: 22 },
    dateRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
      backgroundColor: c.inputBg, borderRadius: 12, borderWidth: 1.5, borderColor: c.inputBorder, padding: 12,
    },
    datePart:  { flex: 1, alignItems: 'center', gap: 4 },
    arrow:     { width: 32, height: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primaryLight, borderRadius: 8 },
    dateBox:   { alignItems: 'center', paddingVertical: 4 },
    dateVal:   { fontSize: 18, ...fonts.extraBold, color: c.primaryText },
    dateUnit:  { fontSize: 10, ...fonts.semiBold, color: c.textMuted, marginTop: 2 },
    dateSep:   { fontSize: 20, color: c.border, paddingBottom: 8 },
    paymentRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
    paymentInput:    { width: 70 },
    paymentHint:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.primaryLight, borderRadius: 10, padding: 12 },
    paymentHintText: { fontSize: 13, ...fonts.medium, color: c.primaryText, flex: 1 },
    btn:         { backgroundColor: c.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    btnDisabled: { opacity: 0.6 },
    btnText:     { color: '#fff', fontSize: 17, ...fonts.bold },
  });
}
