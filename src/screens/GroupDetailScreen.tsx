import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChittiGroup, Member } from '../types';
import { getGroupById, upsertGroup, deleteGroup } from '../storage';
import {
  getCurrentCycle,
  getCompletedCycles,
  getPaidCount,
  syncCyclePayments,
  initializeCycles,
  getCycleMonth,
  getChitValue,
  getForemanCommission,
  calculateDividend,
} from '../utils/chitti';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../lib/ThemeContext';
import { ThemeColors, fonts, fmtINR, tnum } from '../lib/theme';
import {
  Avatar,
  Card,
  CycleDots,
  Kicker,
  MemberRow,
  NavHeader,
  Pill,
  PrimaryButton,
  RoleBadge,
} from '../components/chitti-ui';

type Nav = NativeStackNavigationProp<RootStackParamList, 'GroupDetail'>;
type Route = RouteProp<RootStackParamList, 'GroupDetail'>;
type Tab = 'overview' | 'members' | 'cycles' | 'activity';

export default function GroupDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { groupId } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [group, setGroup] = useState<ChittiGroup | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  /** Foreman-by-default in v1. Toggle exists so the member view can be visually
   *  audited; Phase 2 multi-user lights this up for real. */
  const [viewAs, setViewAs] = useState<'foreman' | 'member'>('foreman');

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

  const current = getCurrentCycle(group);
  const completed = getCompletedCycles(group);
  const chitValue = getChitValue(group);
  const commission = getForemanCommission(group);
  const paidCount = current ? getPaidCount(current) : 0;
  const totalMembers = group.members.length;
  const drawReady = totalMembers > 0 && current ? paidCount === totalMembers : false;

  const cycleNum = current?.cycleNumber ?? (completed.length || 0);
  const cycleMonth = current ? getCycleMonth(group, cycleNum) : '—';

  const lastDividend = (() => {
    const lastConducted = [...completed].reverse()[0];
    if (lastConducted?.dividendPerMember !== undefined) return lastConducted.dividendPerMember;
    if (!current || !current.discount) return 0;
    return calculateDividend(chitValue, chitValue - (current.discount ?? 0), totalMembers || 1, commission);
  })();
  const dueAmount = Math.max(0, group.amount - lastDividend);

  const handleDeleteGroup = () => {
    Alert.alert('Delete chit?', `"${group.name}" will be removed permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGroup(group.id).then(() => navigation.goBack()) },
    ]);
  };

  const handleArchive = () => {
    const archived = group.isActive === false;
    Alert.alert(
      archived ? 'Restore chit?' : 'Archive chit?',
      `"${group.name}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: archived ? 'Restore' : 'Archive', onPress: async () => {
          const updated = { ...group, isActive: archived };
          await upsertGroup(updated);
          setGroup(updated);
          if (!archived) navigation.goBack();
        } },
      ],
    );
  };

  /* ────── render ────── */
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <NavHeader
        onBack={() => navigation.goBack()}
        title={cycleMonth !== '—' ? `Cycle ${cycleNum} · ${group.name}` : group.name}
        right={
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <TouchableOpacity onPress={() => navigation.navigate('CreateGroup', { groupId })} hitSlop={8}>
              <Text style={styles.headerIcon}>✎</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleArchive} hitSlop={8}>
              <Text style={styles.headerIcon}>{group.isActive === false ? '↺' : '⌫'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteGroup} hitSlop={8}>
              <Text style={styles.headerIcon}>⌫</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.titleBlock}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <RoleBadge role={viewAs} />
          <TouchableOpacity onPress={() => setViewAs(v => v === 'foreman' ? 'member' : 'foreman')}>
            <Text style={styles.viewAsLink}>Switch view</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title} numberOfLines={2}>{group.name}</Text>
        <Text style={styles.subtitle}>
          Cycle <Text style={tnum}>{cycleNum || 0}</Text> of <Text style={tnum}>{group.durationMonths}</Text>
          <Text style={{ color: colors.divider2 }}>  ·  </Text>
          <Text style={tnum}>₹{fmtINR(chitValue)}</Text> pot
        </Text>
      </View>

      <Tabs value={tab} onChange={setTab} memberCount={totalMembers} cycleCount={group.durationMonths} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        {tab === 'overview' && totalMembers === 0 && <PreMembersState group={group} onAdd={() => navigation.navigate('AddMember', { groupId })} />}

        {tab === 'overview' && totalMembers > 0 && viewAs === 'foreman' && (
          <ForemanOverview
            group={group}
            paidCount={paidCount}
            totalMembers={totalMembers}
            drawReady={drawReady}
            dueAmount={dueAmount}
            lastDividend={lastDividend}
            onMarkPayments={() => current && navigation.navigate('PaymentTracking', { groupId, cycleId: current.id })}
            onConductDraw={() => current && navigation.navigate('Draw', { groupId, cycleId: current.id })}
            onSeeAllMembers={() => setTab('members')}
            onSeeActivity={() => setTab('activity')}
          />
        )}

        {tab === 'overview' && totalMembers > 0 && viewAs === 'member' && (
          <MemberOverview group={group} dueAmount={dueAmount} lastDividend={lastDividend} />
        )}

        {tab === 'members' && (
          <MembersList
            group={group}
            onAdd={() => navigation.navigate('AddMember', { groupId })}
            onMemberPress={(m) => navigation.navigate('MemberDetail', { groupId, memberId: m.id })}
          />
        )}

        {tab === 'cycles' && (
          <CyclesList group={group} onCyclePress={(cycleId, conducted) => {
            if (conducted) navigation.navigate('CycleReceipt', { groupId, cycleId });
            else navigation.navigate('PaymentTracking', { groupId, cycleId });
          }} />
        )}

        {tab === 'activity' && <ActivityList group={group} />}
      </ScrollView>
    </View>
  );
}

/* ───────────────────────── Sub-sections ───────────────────────── */

function Tabs({ value, onChange, memberCount, cycleCount }: { value: Tab; onChange: (t: Tab) => void; memberCount: number; cycleCount: number }) {
  const { colors } = useTheme();
  const items: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'members',  label: `Members · ${memberCount}` },
    { id: 'cycles',   label: `Cycles · ${cycleCount}` },
    { id: 'activity', label: 'Activity' },
  ];
  return (
    <View style={{
      flexDirection: 'row',
      borderBottomWidth: 1, borderBottomColor: colors.border,
      paddingHorizontal: 6,
    }}>
      {items.map(it => {
        const active = it.id === value;
        return (
          <TouchableOpacity
            key={it.id}
            onPress={() => onChange(it.id)}
            style={{
              paddingHorizontal: 12, paddingVertical: 12,
              borderBottomWidth: 2, borderBottomColor: active ? colors.primary : 'transparent',
              marginBottom: -1,
            }}
          >
            <Text style={{ fontSize: 13, ...fonts.semiBold, color: active ? colors.text : colors.textMuted }}>
              {it.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function PreMembersState({ group, onAdd }: { group: ChittiGroup; onAdd: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ padding: 20, gap: 14 }}>
      <View style={{
        backgroundColor: colors.accentLight,
        borderWidth: 1, borderColor: colors.accent, borderStyle: 'dashed',
        borderRadius: 16, padding: 18, alignItems: 'center',
      }}>
        <Kicker color={colors.accent}>NOT STARTED YET</Kicker>
        <Text style={{ fontSize: 22, ...fonts.bold, color: colors.text, marginTop: 8, textAlign: 'center', letterSpacing: -0.3 }}>
          Add your members to begin.
        </Text>
        <Text style={{ fontSize: 13.5, color: colors.textSub, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
          Once {group.durationMonths} people have joined, you can run the first cycle.
        </Text>
        <PrimaryButton label="Add members" trailingArrow onPress={onAdd} style={{ marginTop: 18, alignSelf: 'stretch' }} />
      </View>

      <Card>
        <Kicker>THE PLAN</Kicker>
        <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          <PlanStat label="Monthly subscription" value={`₹${fmtINR(group.amount)}`} />
          <PlanStat label="Members" value={String(group.totalMembers)} />
          <PlanStat label="Months" value={String(group.durationMonths)} />
          <PlanStat label="Your commission / cycle" value={`₹${fmtINR(getForemanCommission(group))}`} />
        </View>
      </Card>
    </View>
  );
}

function PlanStat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ minWidth: '45%' }}>
      <Kicker>{label.toUpperCase()}</Kicker>
      <Text style={[{ marginTop: 4, fontSize: 22, ...fonts.semiBold, color: colors.text, letterSpacing: -0.3 }, tnum]}>
        {value}
      </Text>
    </View>
  );
}

function ForemanOverview({
  group, paidCount, totalMembers, drawReady, dueAmount, lastDividend,
  onMarkPayments, onConductDraw, onSeeAllMembers, onSeeActivity,
}: {
  group: ChittiGroup;
  paidCount: number;
  totalMembers: number;
  drawReady: boolean;
  dueAmount: number;
  lastDividend: number;
  onMarkPayments: () => void;
  onConductDraw: () => void;
  onSeeAllMembers: () => void;
  onSeeActivity: () => void;
}) {
  const { colors } = useTheme();
  const current = getCurrentCycle(group);
  const cycleMonth = current ? getCycleMonth(group, current.cycleNumber) : '—';
  const pct = totalMembers > 0 ? Math.round((paidCount / totalMembers) * 100) : 0;
  const previewMembers = group.members.slice(0, 4);

  return (
    <View style={{ padding: 20, gap: 14 }}>
      {/* Current cycle card */}
      <Card stripe>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Kicker color={colors.primary}>CURRENT CYCLE · {cycleMonth.toUpperCase()}</Kicker>
            <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={[{ fontSize: 30, ...fonts.bold, color: colors.text, letterSpacing: -0.6 }, tnum]}>
                ₹{fmtINR(dueAmount)}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSub }}>per member</Text>
            </View>
            <Text style={{ marginTop: 4, fontSize: 12.5, color: colors.textMuted }}>
              <Text style={tnum}>₹{fmtINR(group.amount)}</Text> gross − <Text style={tnum}>₹{fmtINR(lastDividend)}</Text> dividend
            </Text>
          </View>
          <Pill tone={drawReady ? 'paid' : 'pending'}>{drawReady ? 'Ready to draw' : 'Collecting'}</Pill>
        </View>

        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 12.5, color: colors.textSub }}>
              <Text style={[{ ...fonts.semiBold, color: colors.text }, tnum]}>{paidCount}</Text>
              {' '}of <Text style={tnum}>{totalMembers}</Text> members paid
            </Text>
            <Text style={[{ fontSize: 12.5, color: colors.textSub }, tnum]}>{pct}%</Text>
          </View>
          <View style={{ height: 6, backgroundColor: colors.divider2, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ width: `${pct}%`, height: '100%', backgroundColor: drawReady ? colors.success : colors.primary, borderRadius: 3 }} />
          </View>
        </View>

        <PrimaryButton
          label={drawReady ? 'Conduct draw' : 'Mark payments'}
          trailingArrow
          onPress={drawReady ? onConductDraw : onMarkPayments}
          style={{ marginTop: 16 }}
        />
      </Card>

      {/* Members preview */}
      <Card style={{ paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 8 }}>
          <Kicker>MEMBERS · THIS CYCLE</Kicker>
          <TouchableOpacity onPress={onSeeAllMembers}>
            <Text style={{ fontSize: 13, ...fonts.semiBold, color: colors.primary }}>See all</Text>
          </TouchableOpacity>
        </View>
        {previewMembers.map((m, i) => {
          const cyc = current;
          const paid = cyc?.payments.find(p => p.memberId === m.id)?.paid ?? false;
          return (
            <View key={m.id} style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
              <MemberRow
                name={m.name}
                phone={m.phone}
                prizedCycle={m.cycleReceived}
                status={paid ? <Pill tone="paid">Paid</Pill> : <Pill tone="pending">Pending</Pill>}
              />
            </View>
          );
        })}
      </Card>

      {/* Recent activity */}
      <Card style={{ paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 8 }}>
          <Kicker>RECENT ACTIVITY</Kicker>
          <TouchableOpacity onPress={onSeeActivity}>
            <Text style={{ fontSize: 13, ...fonts.semiBold, color: colors.primary }}>See log</Text>
          </TouchableOpacity>
        </View>
        <ActivityPreview group={group} />
      </Card>
    </View>
  );
}

function ActivityPreview({ group }: { group: ChittiGroup }) {
  const { colors } = useTheme();
  // Derive a simple recent-activity list from the data we have.
  const events = useMemo(() => {
    const items: { when: string; text: string }[] = [];
    const conducted = group.cycles.filter(c => c.conducted).slice(-3).reverse();
    for (const c of conducted) {
      const winner = group.members.find(m => m.id === c.winnerId);
      items.push({
        when: c.date ? new Date(c.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—',
        text: `Cycle ${c.cycleNumber} drawn — ${winner?.name ?? 'Unknown'} won ₹${fmtINR(c.winAmount)}`,
      });
    }
    if (items.length === 0) {
      items.push({ when: '—', text: 'No activity yet. Mark a payment to get started.' });
    }
    return items;
  }, [group]);
  return (
    <View>
      {events.map((e, i) => (
        <View key={i} style={{ paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
          <Text style={{ fontSize: 13, color: colors.text, lineHeight: 19 }}>{e.text}</Text>
          <Text style={[{ marginTop: 2, fontSize: 11.5, color: colors.textMuted }, tnum]}>{e.when}</Text>
        </View>
      ))}
    </View>
  );
}

function MemberOverview({ group, dueAmount, lastDividend }: { group: ChittiGroup; dueAmount: number; lastDividend: number }) {
  const { colors } = useTheme();
  const current = getCurrentCycle(group);
  const cycleMonth = current ? getCycleMonth(group, current.cycleNumber) : '—';
  return (
    <View style={{ padding: 20, gap: 14 }}>
      <Card>
        <Kicker>YOUR STATUS · {cycleMonth.toUpperCase()}</Kicker>
        <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <View>
            <Text style={[{ fontSize: 30, ...fonts.bold, color: colors.text, letterSpacing: -0.5 }, tnum]}>
              ₹{fmtINR(dueAmount)}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSub, marginTop: 2 }}>due by {group.paymentDay} of the month</Text>
          </View>
          <Pill tone="pending">Not yet marked paid</Pill>
        </View>
        <View style={{ marginTop: 14, padding: 10, backgroundColor: colors.bg, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12.5, color: colors.textSub }}>You saved this cycle</Text>
          <Text style={[{ fontSize: 13, ...fonts.semiBold, color: colors.text }, tnum]}>
            ₹{fmtINR(lastDividend)} dividend
          </Text>
        </View>
      </Card>

      <Card>
        <Kicker>WHOLE-GROUP LEDGER</Kicker>
        <Text style={{ marginTop: 6, fontSize: 12.5, color: colors.textMuted }}>
          Same numbers the foreman sees. Read-only.
        </Text>
      </Card>
    </View>
  );
}

function MembersList({ group, onAdd, onMemberPress }: { group: ChittiGroup; onAdd: () => void; onMemberPress: (m: Member) => void }) {
  const { colors } = useTheme();
  if (group.members.length === 0) {
    return (
      <View style={{ padding: 30, alignItems: 'center' }}>
        <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 16 }}>No members yet.</Text>
        <PrimaryButton label="Add member" onPress={onAdd} />
      </View>
    );
  }
  return (
    <View style={{ padding: 20, gap: 4 }}>
      {group.members.map((m, i) => (
        <View key={m.id} style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: colors.border }}>
          <MemberRow
            name={m.name}
            phone={m.phone}
            prizedCycle={m.cycleReceived}
            status={m.hasReceived ? <Pill tone="accent">Won C{m.cycleReceived}</Pill> : <Pill tone="ghost">Eligible</Pill>}
            onPress={() => onMemberPress(m)}
          />
        </View>
      ))}
      <PrimaryButton label="+ Add member" onPress={onAdd} style={{ marginTop: 16 }} />
    </View>
  );
}

function CyclesList({ group, onCyclePress }: { group: ChittiGroup; onCyclePress: (cycleId: string, conducted: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ padding: 20, gap: 10 }}>
      {group.cycles.map(c => {
        const winner = group.members.find(m => m.id === c.winnerId);
        const paid = getPaidCount(c);
        return (
          <TouchableOpacity
            key={c.id}
            onPress={() => onCyclePress(c.id, c.conducted)}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              padding: 14, borderRadius: 12,
              backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
            }}
          >
            <View style={{
              width: 40, height: 40, borderRadius: 10,
              backgroundColor: c.conducted ? colors.successLight : colors.primaryLight,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={[{ fontSize: 14, ...fonts.bold, color: c.conducted ? colors.success : colors.primary }, tnum]}>
                {c.cycleNumber}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, ...fonts.semiBold, color: colors.text }}>
                Cycle {c.cycleNumber} · {getCycleMonth(group, c.cycleNumber)}
              </Text>
              {c.conducted
                ? <Text style={{ fontSize: 12, color: colors.success, marginTop: 2 }}>Won by {winner?.name ?? 'Unknown'} · ₹{fmtINR(c.winAmount)}</Text>
                : <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{paid} / {group.members.length} paid</Text>}
            </View>
            <Text style={{ fontSize: 18, color: colors.textMuted }}>›</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ActivityList({ group }: { group: ChittiGroup }) {
  const { colors } = useTheme();
  return (
    <View style={{ padding: 20 }}>
      <Card style={{ paddingHorizontal: 16 }}>
        <ActivityPreview group={group} />
      </Card>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    headerIcon: { fontSize: 20, color: c.textSub },
    titleBlock: { paddingHorizontal: 24, paddingBottom: 16 },
    viewAsLink: { fontSize: 12.5, ...fonts.medium, color: c.textMuted },
    title: { marginTop: 10, fontSize: 28, ...fonts.bold, color: c.text, letterSpacing: -0.5, lineHeight: 32 },
    subtitle: { marginTop: 6, fontSize: 13, color: c.textSub },
    scrollContent: { paddingBottom: 60 },
  });
}
