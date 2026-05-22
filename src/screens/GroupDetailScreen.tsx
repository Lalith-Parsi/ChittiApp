import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ChittiGroup, Member, Cycle } from '../types';
import { getGroupById, upsertGroup, deleteGroup } from '../storage';
import { getCurrentCycle, getCompletedCycles, getPaidCount, syncCyclePayments, initializeCycles, getCycleMonth } from '../utils/chitti';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../lib/ThemeContext';
import { ThemeColors, fonts } from '../lib/theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'GroupDetail'>;
type Route = RouteProp<RootStackParamList, 'GroupDetail'>;

export default function GroupDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { groupId } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [group, setGroup] = useState<ChittiGroup | null>(null);
  const [tab, setTab]     = useState<'members' | 'cycles'>('members');

  useFocusEffect(useCallback(() => {
    getGroupById(groupId).then(g => {
      if (!g) return;
      if (g.cycles.length !== g.durationMonths && g.members.length > 0) {
        const cycles = initializeCycles(g).map((c, i) => {
          const existing = g.cycles[i];
          return existing ? syncCyclePayments(existing, g.members) : c;
        });
        const updated = { ...g, totalMembers: g.members.length, cycles };
        upsertGroup(updated);
        setGroup(updated);
      } else {
        setGroup(g);
      }
    });
  }, [groupId]));

  if (!group) return null;

  const currentCycle    = getCurrentCycle(group);
  const completedCycles = getCompletedCycles(group);
  const isArchived      = group.isActive === false;

  const handleDeleteGroup = () => {
    const ok = typeof window !== 'undefined' ? window.confirm(`Delete "${group.name}"? This cannot be undone.`) : true;
    if (!ok) return;
    deleteGroup(group.id).then(() => navigation.goBack());
  };

  const handleArchive = () => {
    const action = isArchived ? 'Restore' : 'Archive';
    const ok = typeof window !== 'undefined' ? window.confirm(`${action} "${group.name}"?`) : true;
    if (!ok) return;
    const updated = { ...group, isActive: isArchived };
    upsertGroup(updated).then(() => { setGroup(updated); if (!isArchived) navigation.goBack(); });
  };

  const handleDeleteMember = (member: Member) => {
    const ok = typeof window !== 'undefined' ? window.confirm(`Remove ${member.name} from this group?`) : true;
    if (!ok) return;
    const updatedMembers = group.members.filter(m => m.id !== member.id);
    const updatedCycles  = group.cycles.map(c => syncCyclePayments(c, updatedMembers));
    const updated = { ...group, members: updatedMembers, totalMembers: updatedMembers.length, cycles: updatedCycles };
    upsertGroup(updated).then(() => setGroup(updated));
  };

  const renderMember = ({ item }: { item: Member }) => (
    <TouchableOpacity
      style={styles.memberRow}
      onPress={() => navigation.navigate('MemberDetail', { groupId: group.id, memberId: item.id })}
      activeOpacity={0.8}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        <Text style={styles.memberPhone}>{item.phone}</Text>
      </View>
      {item.hasReceived && (
        <View style={styles.receivedBadge}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={styles.receivedText}>Cycle {item.cycleReceived}</Text>
        </View>
      )}
      <TouchableOpacity onPress={() => handleDeleteMember(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="person-remove-outline" size={17} color={colors.danger} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderCycle = ({ item }: { item: Cycle }) => {
    const winner = group.members.find(m => m.id === item.winnerId);
    const paid   = getPaidCount(item);
    return (
      <TouchableOpacity
        style={styles.cycleRow}
        onPress={() => navigation.navigate('PaymentTracking', { groupId: group.id, cycleId: item.id })}
        activeOpacity={0.8}
      >
        <View style={[styles.cycleNumBox, item.conducted && styles.cycleNumBoxDone]}>
          <Text style={[styles.cycleNum, item.conducted && styles.cycleNumDone]}>{item.cycleNumber}</Text>
        </View>
        <View style={styles.cycleInfo}>
          <Text style={styles.cycleName}>Cycle {item.cycleNumber} · {getCycleMonth(group, item.cycleNumber)}</Text>
          {item.conducted
            ? <Text style={styles.cycleWinner}>Won by {winner?.name ?? 'Unknown'} · ₹{item.winAmount.toLocaleString()}</Text>
            : <Text style={styles.cyclePending}>{item.cycleNumber === currentCycle?.cycleNumber ? `${paid}/${group.members.length} paid` : 'Upcoming'}</Text>
          }
        </View>
        {!item.conducted && item.cycleNumber === currentCycle?.cycleNumber && (
          <TouchableOpacity style={styles.drawBtn} onPress={() => navigation.navigate('Draw', { groupId: group.id, cycleId: item.id })}>
            <Text style={styles.drawBtnText}>Draw</Text>
          </TouchableOpacity>
        )}
        {item.conducted && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{group.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('CreateGroup', { groupId: group.id })} style={styles.iconBtn}>
            <Ionicons name="create-outline" size={22} color={colors.primaryText} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleArchive} style={styles.iconBtn}>
            <Ionicons name={isArchived ? 'refresh-outline' : 'archive-outline'} size={22} color={isArchived ? colors.success : colors.warning} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteGroup} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {isArchived && (
        <View style={styles.archiveBanner}>
          <Ionicons name="archive-outline" size={14} color={colors.warning} />
          <Text style={styles.archiveBannerText}>This group is archived</Text>
        </View>
      )}

      {group.description ? (
        <View style={styles.descBar}>
          <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
          <Text style={styles.descText}>{group.description}</Text>
        </View>
      ) : null}

      <View style={styles.summary}>
        {[
          { val: `₹${group.amount.toLocaleString()}`, label: 'Per month' },
          { val: `${group.members.length}/${group.durationMonths}`, label: 'Members' },
          { val: `${completedCycles.length}/${group.durationMonths}`, label: 'Cycles done' },
          { val: `₹${(completedCycles.length * group.amount * group.members.length).toLocaleString()}`, label: 'Collected', color: colors.primaryText },
        ].map(({ val, label, color }) => (
          <View key={label} style={styles.summaryItem}>
            <Text style={[styles.summaryVal, color ? { color } : undefined]}>{val}</Text>
            <Text style={styles.summaryLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'members' && styles.tabActive]} onPress={() => setTab('members')}>
          <Text style={[styles.tabText, tab === 'members' && styles.tabTextActive]}>Members ({group.members.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'cycles' && styles.tabActive]} onPress={() => setTab('cycles')}>
          <Text style={[styles.tabText, tab === 'cycles' && styles.tabTextActive]}>Cycles ({group.durationMonths})</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tab === 'members' ? group.members : group.cycles}
        keyExtractor={item => (item as any).id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <Text style={styles.emptyText}>{tab === 'members' ? 'No members yet.' : 'Add a member to generate cycles.'}</Text>
          </View>
        }
        renderItem={tab === 'members' ? renderMember : renderCycle}
      />

      {tab === 'members' && !isArchived && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddMember', { groupId: group.id })}>
          <Ionicons name="person-add" size={22} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14,
      backgroundColor: c.header, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    title: { flex: 1, fontSize: 19, ...fonts.extraBold, color: c.text },
    headerActions: { flexDirection: 'row', gap: 6 },
    iconBtn: { padding: 4 },
    archiveBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: c.warningLight, paddingHorizontal: 16, paddingVertical: 8,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    archiveBannerText: { fontSize: 13, ...fonts.semiBold, color: c.warning },
    descBar: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 6,
      backgroundColor: c.card, paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    descText: { flex: 1, fontSize: 13, ...fonts.regular, color: c.textSub, lineHeight: 18 },
    summary: {
      flexDirection: 'row', backgroundColor: c.card,
      paddingVertical: 14, paddingHorizontal: 8,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryVal:   { fontSize: 15, ...fonts.bold, color: c.text },
    summaryLabel: { fontSize: 11, ...fonts.regular, color: c.textMuted, marginTop: 2 },
    tabs: {
      flexDirection: 'row', backgroundColor: c.card,
      borderBottomWidth: 1, borderBottomColor: c.border, marginBottom: 4,
    },
    tab:           { flex: 1, paddingVertical: 12, alignItems: 'center' },
    tabActive:     { borderBottomWidth: 2, borderBottomColor: c.primary },
    tabText:       { fontSize: 14, ...fonts.semiBold, color: c.textMuted },
    tabTextActive: { color: c.primary },
    list: { padding: 14, paddingBottom: 90 },
    memberRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.card, borderRadius: 12, padding: 14, marginBottom: 10,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    avatar: {
      width: 42, height: 42, borderRadius: 21, backgroundColor: c.primaryLight,
      alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    avatarText:    { fontSize: 17, ...fonts.bold, color: c.primaryText },
    memberInfo:    { flex: 1 },
    memberName:    { fontSize: 15, ...fonts.bold, color: c.text },
    memberPhone:   { fontSize: 13, ...fonts.regular, color: c.textMuted, marginTop: 2 },
    receivedBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: c.successLight, borderRadius: 8, padding: 6, marginRight: 8,
    },
    receivedText:  { fontSize: 12, ...fonts.semiBold, color: c.success },
    cycleRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.card, borderRadius: 12, padding: 14, marginBottom: 10,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    cycleNumBox:     { width: 38, height: 38, borderRadius: 10, backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' },
    cycleNumBoxDone: { backgroundColor: c.successLight },
    cycleNum:        { fontSize: 15, ...fonts.extraBold, color: c.primaryText },
    cycleNumDone:    { color: c.success },
    cycleInfo:       { flex: 1 },
    cycleName:       { fontSize: 14, ...fonts.bold, color: c.text },
    cycleWinner:     { fontSize: 12, ...fonts.medium, color: c.success, marginTop: 2 },
    cyclePending:    { fontSize: 12, ...fonts.regular, color: c.textMuted, marginTop: 2 },
    drawBtn:         { backgroundColor: c.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
    drawBtnText:     { color: '#fff', fontSize: 13, ...fonts.bold },
    emptyInner:      { padding: 30, alignItems: 'center' },
    emptyText:       { fontSize: 14, ...fonts.regular, color: c.textMuted, textAlign: 'center' },
    fab: {
      position: 'absolute', bottom: 32, right: 24,
      width: 56, height: 56, borderRadius: 28, backgroundColor: c.primary,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: c.primary, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
    },
  });
}
