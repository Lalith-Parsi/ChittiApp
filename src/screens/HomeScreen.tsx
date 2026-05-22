import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, Alert, Modal } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { ChittiGroup } from '../types';
import { getGroups, deleteGroup } from '../storage';
import GroupCard from '../components/GroupCard';
import { RootStackParamList } from '../navigation/types';
import { useToast } from '../lib/ToastContext';
import { useTheme } from '../lib/ThemeContext';
import { ThemeColors, fonts, fmtINR, tnum } from '../lib/theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

/** Small wordmark used in the home header (smaller variant of LoginScreen wordmark). */
function Wordmark({ size, color, dotColor }: { size: number; color: string; dotColor: string }) {
  return (
    <View style={{ position: 'relative' }}>
      <Text style={{ fontSize: size, ...fonts.bold, color, letterSpacing: -0.5, lineHeight: size * 1.05 }}>
        chitti
      </Text>
      <View
        style={{
          position: 'absolute',
          width: size * 0.14,
          height: size * 0.14,
          borderRadius: size * 0.07,
          backgroundColor: dotColor,
          right: size * 0.24,
          top: size * 0.1,
        }}
      />
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user, isDemo, leaveDemoMode } = useAuth();
  const toast = useToast();

  const [groups, setGroups] = useState<ChittiGroup[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [shownDemoToast, setShownDemoToast] = useState(false);

  useFocusEffect(useCallback(() => { getGroups().then(setGroups); }, []));

  // Show "Welcome to demo mode" once per session.
  React.useEffect(() => {
    if (isDemo && !shownDemoToast) {
      setShownDemoToast(true);
      toast.info('Demo mode', '3 sample chits loaded — nothing here is saved.');
    }
  }, [isDemo, shownDemoToast, toast]);

  const handleSignOut = () => {
    setShowSettings(false);
    if (isDemo) {
      Alert.alert('Exit demo?', 'Sample chits will be cleared.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Exit demo', style: 'destructive', onPress: () => leaveDemoMode() },
      ]);
      return;
    }
    Alert.alert('Sign out?', 'You can sign back in with the same phone number.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut(auth).catch(() => {}) },
    ]);
  };

  const active = groups.filter(g => g.isActive !== false);

  /** Naïve "due this week" rollup — sums each active group's monthly subscription
   *  as a placeholder. Phase 5 ships the real dividend-adjusted figure. */
  const dueThisWeek = active.reduce((acc, g) => acc + g.amount, 0);

  const handleDelete = (group: ChittiGroup) => {
    Alert.alert(
      'Delete chit?',
      `"${group.name}" will be removed permanently. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteGroup(group.id).then(() => {
            setGroups(prev => prev.filter(g => g.id !== group.id));
            toast.success('Chit deleted');
          }),
        },
      ],
    );
  };

  /* ───────────────────────── Header ───────────────────────── */
  const Header = (
    <>
      <View style={styles.header}>
        <Wordmark size={26} color={colors.text} dotColor={colors.accent} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeBtn} hitSlop={8}>
            <Text style={styles.themeBtnText}>{isDark ? '☀' : '☾'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.themeBtn} hitSlop={8}>
            <Text style={styles.themeBtnText}>···</Text>
          </TouchableOpacity>
        </View>
      </View>
      {isDemo && (
        <View style={styles.demoBanner}>
          <View style={styles.demoDot} />
          <Text style={styles.demoBannerText}>Demo mode · nothing is saved</Text>
          <TouchableOpacity onPress={() => leaveDemoMode()} hitSlop={6}>
            <Text style={styles.demoBannerExit}>Exit</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const SettingsSheet = (
    <Modal visible={showSettings} transparent animationType="fade" onRequestClose={() => setShowSettings(false)}>
      <TouchableOpacity activeOpacity={1} style={{ flex: 1, backgroundColor: colors.overlay }} onPress={() => setShowSettings(false)}>
        <View style={styles.settingsSheet}>
          <View style={{ alignItems: 'center', marginBottom: 18 }}>
            <View style={styles.settingsAvatar}>
              <Text style={{ fontSize: 22, ...fonts.semiBold, color: colors.bg }}>
                {(user?.phoneNumber ?? '?').slice(-2)}
              </Text>
            </View>
            <Text style={[{ marginTop: 10, fontSize: 15, ...fonts.semiBold, color: colors.text }, tnum]}>
              {user?.phoneNumber ?? 'Signed in'}
            </Text>
            <Text style={{ marginTop: 2, fontSize: 12, color: colors.textMuted }}>chitti · v0.1</Text>
          </View>
          <TouchableOpacity onPress={() => { setShowSettings(false); toggleTheme(); }} style={styles.settingsRow}>
            <Text style={styles.settingsRowText}>{isDark ? 'Switch to light mode' : 'Switch to dark mode'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut} style={[styles.settingsRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Text style={[styles.settingsRowText, { color: colors.danger }]}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  /* ───────────────────────── Empty state ───────────────────────── */
  if (active.length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        {Header}
        {SettingsSheet}
        <View style={styles.emptyBlock}>
          <View style={styles.emptyStamp}>
            <Text style={styles.emptyStampGlyph}>₹</Text>
          </View>
          <Text style={styles.emptyTitle}>No chits yet.</Text>
          <Text style={styles.emptySub}>
            Start one for your family or office — or wait for someone to add you with this number.
          </Text>
          <TouchableOpacity
            style={styles.emptyPrimaryBtn}
            onPress={() => navigation.navigate('CreateGroup', {})}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyPrimaryBtnText}>Create your first chit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ───────────────────────── Populated state ───────────────────────── */
  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {Header}

      <FlatList
        data={active}
        keyExtractor={g => g.id}
        ListHeaderComponent={
          <View>
            <View style={styles.summaryBand}>
              <Text style={styles.summaryKicker}>DUE THIS WEEK</Text>
              <View style={styles.summaryAmountRow}>
                <Text style={[styles.summaryAmount, tnum]}>₹{fmtINR(dueThisWeek)}</Text>
                <Text style={styles.summaryAcross}>across {active.length} {active.length === 1 ? 'chit' : 'chits'}</Text>
              </View>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>MY CHITS · <Text style={tnum}>{active.length}</Text></Text>
            </View>
          </View>
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            role="foreman"
            onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
            onDelete={() => handleDelete(item)}
          />
        )}
      />

      {/* FAB — labelled, not iconic-only */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateGroup', {})}
        activeOpacity={0.85}
      >
        <Text style={styles.fabPlus}>+</Text>
        <Text style={styles.fabText}>New chit</Text>
      </TouchableOpacity>
      {SettingsSheet}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },

    header: {
      paddingTop: 60,
      paddingBottom: 12,
      paddingHorizontal: 24,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.bg,
    },
    themeBtn: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.card,
    },
    themeBtnText: { fontSize: 16, color: c.textSub },

    /* Summary band */
    summaryBand: {
      marginHorizontal: 20, marginTop: 8,
      padding: 18,
      borderRadius: 16,
      backgroundColor: c.primaryLight,
      borderWidth: 1, borderColor: c.primaryLight,
    },
    summaryKicker: { fontSize: 11.5, ...fonts.semiBold, color: c.primary, letterSpacing: 1 },
    summaryAmountRow: { marginTop: 6, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    summaryAmount: { fontSize: 34, ...fonts.semiBold, color: c.text, letterSpacing: -0.6 },
    summaryAcross: { fontSize: 13, ...fonts.regular, color: c.textSub },

    /* Section row */
    sectionRow: {
      marginTop: 20, marginHorizontal: 20,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    sectionLabel: { fontSize: 12, ...fonts.semiBold, color: c.textMuted, letterSpacing: 1 },

    /* List */
    listContent: { paddingHorizontal: 20, paddingBottom: 120 },

    /* FAB */
    fab: {
      position: 'absolute', right: 20, bottom: 32,
      flexDirection: 'row', alignItems: 'center', gap: 8,
      height: 52,
      paddingHorizontal: 22,
      borderRadius: 26,
      backgroundColor: c.primary,
      shadowColor: c.primary,
      shadowOpacity: 0.45,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
    },
    fabPlus: { fontSize: 22, ...fonts.semiBold, color: c.bg, lineHeight: 22 },
    fabText: { fontSize: 15, ...fonts.semiBold, color: c.bg },

    /* Demo banner */
    demoBanner: {
      marginHorizontal: 20,
      marginBottom: 6,
      paddingHorizontal: 14, paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: c.accentLight,
      borderWidth: 1, borderColor: c.accent,
      flexDirection: 'row', alignItems: 'center', gap: 10,
    },
    demoDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent },
    demoBannerText: { flex: 1, fontSize: 12.5, ...fonts.semiBold, color: c.accent },
    demoBannerExit: { fontSize: 12.5, ...fonts.semiBold, color: c.accent, textDecorationLine: 'underline' },

    /* Settings sheet */
    settingsSheet: {
      position: 'absolute',
      right: 20,
      top: 100,
      width: 240,
      backgroundColor: c.card,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 18,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 12,
    },
    settingsAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingsRow: { paddingVertical: 14 },
    settingsRowText: { fontSize: 14, ...fonts.semiBold, color: c.text },

    /* Empty state */
    emptyBlock: {
      flex: 1,
      paddingHorizontal: 28,
      paddingTop: 48,
      alignItems: 'center',
    },
    emptyStamp: {
      width: 84, height: 84, borderRadius: 42,
      backgroundColor: c.accentLight,
      borderWidth: 2, borderColor: c.accent,
      borderStyle: 'dashed',
      alignItems: 'center', justifyContent: 'center',
    },
    emptyStampGlyph: { fontSize: 32, ...fonts.bold, color: c.accent, lineHeight: 36 },
    emptyTitle: { marginTop: 20, fontSize: 28, ...fonts.bold, color: c.text, letterSpacing: -0.4 },
    emptySub: {
      marginTop: 8,
      fontSize: 14.5, lineHeight: 21,
      ...fonts.regular,
      color: c.textSub,
      textAlign: 'center',
      maxWidth: 280,
    },
    emptyPrimaryBtn: {
      marginTop: 32, width: '100%',
      backgroundColor: c.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
    },
    emptyPrimaryBtnText: { fontSize: 16, ...fonts.semiBold, color: c.bg },
  });
}
