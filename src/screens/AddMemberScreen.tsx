import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Share,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import 'react-native-get-random-values';
import { v4 as uuid } from 'uuid';
import { Member } from '../types';
import { getGroupById, upsertGroup } from '../storage';
import { saveMemberToken } from '../lib/firestore';
import { auth } from '../lib/firebase';
import { initializeCycles, syncCyclePayments } from '../utils/chitti';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../lib/ThemeContext';
import { ThemeColors, fonts, tnum } from '../lib/theme';
import { Kicker, NavHeader, PrimaryButton, Segmented } from '../components/chitti-ui';

type Nav = NativeStackNavigationProp<RootStackParamList, 'AddMember'>;
type Route = RouteProp<RootStackParamList, 'AddMember'>;

type Path = 'contacts' | 'manual';

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 5) return d;
  return d.slice(0, 5) + ' ' + d.slice(5);
}

export default function AddMemberScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { groupId } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [path, setPath] = useState<Path>('manual');
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [name, setName] = useState('');
  const [recentlyAdded, setRecentlyAdded] = useState<Member | null>(null);
  const [saving, setSaving] = useState(false);

  const digits = phoneDisplay.replace(/\D/g, '');
  const isPhoneValid = digits.length === 10 && /^[6-9]/.test(digits);
  const showValidationError = digits.length > 0 && !isPhoneValid;

  const addMember = async () => {
    if (!isPhoneValid) {
      Alert.alert('Invalid phone', 'Enter a 10-digit mobile number starting with 6-9.');
      return;
    }
    setSaving(true);
    try {
      const group = await getGroupById(groupId);
      if (!group) return;

      const newMember: Member = {
        id: uuid(),
        name: name.trim() || `+91 ${digits}`,
        phone: `+91 ${formatPhone(digits)}`,
        hasReceived: false,
        joinedAt: new Date().toISOString(),
        shareToken: uuid(),
      };

      const uid = auth.currentUser?.uid;
      if (uid && newMember.shareToken) {
        await saveMemberToken(newMember.shareToken, uid, group.id, newMember.id);
      }

      const updatedMembers = [...group.members, newMember];
      const fresh = initializeCycles({ ...group, members: updatedMembers, totalMembers: updatedMembers.length });
      const cycles = fresh.map((c, i) => {
        const existing = group.cycles[i];
        return existing ? syncCyclePayments(existing, updatedMembers) : c;
      });

      await upsertGroup({ ...group, members: updatedMembers, totalMembers: updatedMembers.length, cycles });

      setRecentlyAdded(newMember);
      setPhoneDisplay('');
      setName('');
    } catch (e: unknown) {
      Alert.alert('Could not add', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const shareInvite = async () => {
    try {
      const group = await getGroupById(groupId);
      const link = `chitti://join/${groupId}`;
      const msg = `Join ${group?.name ?? 'our chit'} on ChittiApp: ${link}`;
      await Share.share({ message: msg });
    } catch {
      // Cancelled.
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <NavHeader
        onBack={() => navigation.goBack()}
        title="Add to chit"
        right={
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
            <Text style={{ fontSize: 15, ...fonts.semiBold, color: colors.primary }}>Done</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Add members</Text>
        <Text style={styles.sub}>Adds the chit to their phone the moment they sign in with this number.</Text>

        <View style={{ marginTop: 18 }}>
          <Segmented
            options={[
              { id: 'contacts', label: 'From contacts' },
              { id: 'manual',   label: 'Type number' },
            ]}
            value={path}
            onChange={setPath}
          />
        </View>

        {path === 'contacts' && <ContactsPermissionState onSwitchToManual={() => setPath('manual')} />}

        {path === 'manual' && (
          <View style={{ marginTop: 18 }}>
            {recentlyAdded && (
              <View style={styles.addedPill}>
                <Text style={styles.addedText}>
                  ✓ Added <Text style={{ ...fonts.semiBold }}>{recentlyAdded.name}</Text>
                  <Text style={tnum}> · {recentlyAdded.phone}</Text>. They'll see this chit when they sign in.
                </Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Phone number</Text>
            <View style={[styles.phoneField, showValidationError && { borderColor: colors.danger }]}>
              <View style={styles.codeChip}>
                <Text style={[styles.codeChipText, tnum]}>+91</Text>
              </View>
              <View style={styles.codeDivider} />
              <TextInput
                style={[styles.phoneInput, tnum]}
                placeholder="98XXX XXXXX"
                placeholderTextColor={colors.textHint}
                value={phoneDisplay}
                onChangeText={(t) => setPhoneDisplay(formatPhone(t))}
                keyboardType="phone-pad"
                maxLength={11}
              />
            </View>
            {showValidationError && (
              <Text style={styles.errorText}>Enter a 10-digit mobile number starting with 6-9.</Text>
            )}

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>
              Display name <Text style={{ color: colors.textMuted, ...fonts.regular }}>· optional</Text>
            </Text>
            <View style={styles.nameField}>
              <TextInput
                style={styles.nameInput}
                placeholder="e.g. Ravi"
                placeholderTextColor={colors.textHint}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
            <Text style={{ marginTop: 6, fontSize: 12, color: colors.textMuted }}>
              How they'll appear in the ledger. They can change it later.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Invite footer */}
      <View style={styles.inviteFooter}>
        <View style={styles.inviteIcon}>
          <Text style={{ fontSize: 18, color: '#1FA855', ...fonts.bold }}>✉</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13.5, ...fonts.semiBold, color: colors.text }}>Share group link</Text>
          <Text style={[{ fontSize: 11.5, color: colors.textMuted, marginTop: 2 }, tnum]} numberOfLines={1}>
            chitti://join/{groupId.slice(0, 12)}…
          </Text>
        </View>
        <TouchableOpacity onPress={shareInvite} style={styles.inviteShareBtn}>
          <Text style={{ fontSize: 13, ...fonts.semiBold, color: colors.text }}>Share</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.ctaBar}>
        <PrimaryButton
          label={saving ? 'Adding…' : recentlyAdded ? 'Add another' : 'Add to chit'}
          disabled={!isPhoneValid || saving}
          onPress={addMember}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function ContactsPermissionState({ onSwitchToManual }: { onSwitchToManual: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingTop: 50, alignItems: 'center' }}>
      <View style={{
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: colors.card,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 36, color: colors.textMuted }}>○</Text>
      </View>
      <Text style={{ marginTop: 18, fontSize: 22, ...fonts.bold, color: colors.text, letterSpacing: -0.3 }}>
        Contacts not available
      </Text>
      <Text style={{
        marginTop: 8, fontSize: 14, color: colors.textSub, lineHeight: 20, textAlign: 'center', maxWidth: 280,
      }}>
        ChittiApp will read contacts only when you grant permission in a future update (Phase 3). For now, type the number directly.
      </Text>
      <TouchableOpacity onPress={onSwitchToManual} style={{ marginTop: 22 }}>
        <Text style={{ fontSize: 15, ...fonts.semiBold, color: colors.primary }}>Type number instead</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    content: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 120 },
    title: { fontSize: 26, ...fonts.bold, color: c.text, letterSpacing: -0.4 },
    sub:   { marginTop: 6, fontSize: 13.5, color: c.textSub, lineHeight: 20 },

    fieldLabel: { fontSize: 13, ...fonts.semiBold, color: c.text },

    phoneField: {
      marginTop: 8,
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.card, borderRadius: 14,
      paddingHorizontal: 12, paddingVertical: 6,
      borderWidth: 1, borderColor: 'transparent',
    },
    codeChip: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: c.divider2,
      paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
    },
    codeChipText: { fontSize: 15, ...fonts.semiBold, color: c.text },
    codeDivider:  { width: 1, height: 28, backgroundColor: c.divider2 },
    phoneInput:   { flex: 1, fontSize: 20, ...fonts.medium, color: c.text, paddingVertical: 8 },

    errorText: { marginTop: 8, fontSize: 12.5, ...fonts.medium, color: c.danger },

    nameField: { marginTop: 8, backgroundColor: c.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
    nameInput: { fontSize: 16, ...fonts.regular, color: c.text },

    addedPill: {
      marginBottom: 16,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.successLight,
    },
    addedText: { fontSize: 13, color: c.success, lineHeight: 18 },

    inviteFooter: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 20, paddingVertical: 12,
      backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.border,
    },
    inviteIcon: {
      width: 36, height: 36, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#1FA85522',
    },
    inviteShareBtn: {
      paddingHorizontal: 12, paddingVertical: 8,
      borderRadius: 8, borderWidth: 1, borderColor: c.divider2,
    },

    ctaBar: {
      paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28,
      borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg,
    },
  });
}
