import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChittiGroup } from '../types';
import { getGroups, deleteGroup } from '../storage';
import GroupCard from '../components/GroupCard';
import { RootStackParamList } from '../navigation/types';
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

  const [groups, setGroups] = useState<ChittiGroup[]>([]);

  useFocusEffect(useCallback(() => { getGroups().then(setGroups); }, []));

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
          onPress: () => deleteGroup(group.id).then(() => setGroups(prev => prev.filter(g => g.id !== group.id))),
        },
      ],
    );
  };

  /* ───────────────────────── Header ───────────────────────── */
  const Header = (
    <View style={styles.header}>
      <Wordmark size={26} color={colors.text} dotColor={colors.accent} />
      <TouchableOpacity onPress={toggleTheme} style={styles.themeBtn} hitSlop={8}>
        <Text style={styles.themeBtnText}>{isDark ? '☀' : '☾'}</Text>
      </TouchableOpacity>
    </View>
  );

  /* ───────────────────────── Empty state ───────────────────────── */
  if (active.length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        {Header}
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
