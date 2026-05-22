import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import 'react-native-get-random-values';
import { v4 as uuid } from 'uuid';
import { Member } from '../types';
import { getGroupById, upsertGroup } from '../storage';
import { saveMemberToken } from '../lib/firestore';
import { auth } from '../lib/firebase';
import { initializeCycles, syncCyclePayments } from '../utils/chitti';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../lib/ThemeContext';
import { ThemeColors, fonts } from '../lib/theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AddMember'>;
type Route = RouteProp<RootStackParamList, 'AddMember'>;

export default function AddMemberScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { groupId } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [name, setName]     = useState('');
  const [phone, setPhone]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) { alert('Please enter member name'); return; }
    if (!phone.trim() || phone.length < 10) { alert('Enter a valid phone number'); return; }

    setLoading(true);
    try {
      const group = await getGroupById(groupId);
      if (!group) return;

      const newMember: Member = {
        id: uuid(), name: name.trim(), phone: phone.trim(),
        hasReceived: false, joinedAt: new Date().toISOString(), shareToken: uuid(),
      };

      const uid = auth.currentUser?.uid;
      if (uid && newMember.shareToken) await saveMemberToken(newMember.shareToken, uid, group.id, newMember.id);

      const updatedMembers = [...group.members, newMember];
      const freshCycles = initializeCycles({ ...group, members: updatedMembers, totalMembers: updatedMembers.length, durationMonths: group.durationMonths });
      const mergedCycles = freshCycles.map((fresh, i) => {
        const existing = group.cycles[i];
        return existing ? syncCyclePayments(existing, updatedMembers) : fresh;
      });

      await upsertGroup({ ...group, members: updatedMembers, totalMembers: updatedMembers.length, cycles: mergedCycles });
      setName(''); setPhone('');
      alert(`${newMember.name} has been added!`);
    } catch (e: any) {
      alert(e?.message ?? 'Failed to add member');
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
          <Text style={styles.title}>Add Member</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="person-add" size={32} color={colors.primaryText} />
          </View>
          <Text style={styles.cardTitle}>Member Details</Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} placeholder="e.g. Priya Sharma" value={name} onChangeText={setName} autoCapitalize="words" placeholderTextColor={colors.textHint} />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput style={styles.input} placeholder="e.g. 9876543210" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={10} placeholderTextColor={colors.textHint} />
        </View>

        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleAdd} disabled={loading}>
          <Ionicons name="person-add" size={20} color="#fff" />
          <Text style={styles.btnText}>Add Member</Text>
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
      alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    iconCircle: {
      width: 72, height: 72, borderRadius: 36, backgroundColor: c.primaryLight,
      alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    cardTitle: { fontSize: 18, ...fonts.bold, color: c.text, marginBottom: 16, alignSelf: 'flex-start' },
    label: { fontSize: 13, ...fonts.semiBold, color: c.textSub, marginBottom: 6, marginTop: 12, alignSelf: 'flex-start', width: '100%' },
    input: {
      borderWidth: 1.5, borderColor: c.inputBorder, borderRadius: 10,
      padding: 12, fontSize: 16, ...fonts.regular, color: c.text, backgroundColor: c.inputBg, width: '100%',
    },
    btn: {
      backgroundColor: c.primary, borderRadius: 14, paddingVertical: 16,
      alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: '#fff', fontSize: 17, ...fonts.bold },
  });
}
