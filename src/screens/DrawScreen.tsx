import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ChittiGroup, DrawType, Member } from '../types';
import { getGroupById, upsertGroup } from '../storage';
import { getEligibleMembers, calculateDividend } from '../utils/chitti';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../lib/ThemeContext';
import { ThemeColors, fonts } from '../lib/theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Draw'>;
type Route = RouteProp<RootStackParamList, 'Draw'>;

interface AuctionBid { memberId: string; bid: string; }

const DRAW_OPTIONS: { type: DrawType; icon: string; label: string }[] = [
  { type: 'lottery',     icon: 'shuffle',   label: 'Lottery'     },
  { type: 'auction',     icon: 'hammer',    label: 'Auction'     },
  { type: 'self-assign', icon: 'hand-left', label: 'Self Assign' },
];

export default function DrawScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { groupId, cycleId } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [group, setGroup]       = useState<ChittiGroup | null>(null);
  const [eligible, setEligible] = useState<Member[]>([]);
  const [winner, setWinner]     = useState<Member | null>(null);
  const [bids, setBids]         = useState<AuctionBid[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [drawType, setDrawType] = useState<DrawType>('lottery');

  useEffect(() => {
    getGroupById(groupId).then(g => {
      if (!g) return;
      setGroup(g);
      const el = getEligibleMembers(g);
      setEligible(el);
      setBids(el.map(m => ({ memberId: m.id, bid: '' })));
      const cycle = g.cycles.find(c => c.id === cycleId);
      if (cycle) setDrawType(cycle.drawType);
    });
  }, [groupId, cycleId]);

  if (!group) return null;
  const cycle = group.cycles.find(c => c.id === cycleId);
  if (!cycle) return null;

  const totalPool    = group.amount * group.members.length;
  const isLottery    = drawType === 'lottery';
  const isSelfAssign = drawType === 'self-assign';

  const runLottery = () => {
    if (eligible.length === 0) { alert('All members have already received the pot.'); return; }
    setSpinning(true); setWinner(null);
    let count = 0;
    const interval = setInterval(() => {
      setWinner(eligible[Math.floor(Math.random() * eligible.length)]);
      if (++count >= 15) { clearInterval(interval); setSpinning(false); }
    }, 100);
  };

  const getAuctionWinner = () => {
    const valid = bids.filter(b => b.bid !== '' && !isNaN(parseInt(b.bid)));
    if (valid.length === 0) { alert('Enter at least one bid amount'); return; }
    const min = Math.min(...valid.map(b => parseInt(b.bid)));
    const w = group!.members.find(m => m.id === valid.find(b => parseInt(b.bid) === min)?.memberId);
    if (w) setWinner(w);
  };

  const confirmWinner = async () => {
    if (!winner) return;
    setConfirmed(true);
    const winAmount = (isLottery || isSelfAssign)
      ? totalPool
      : parseInt(bids.find(b => b.memberId === winner.id)?.bid ?? String(totalPool));
    const dividend = (!isLottery && !isSelfAssign && group!.members.length > 0)
      ? calculateDividend(totalPool, winAmount, group!.members.length) : 0;
    const updatedMembers = group!.members.map(m =>
      m.id === winner.id ? { ...m, hasReceived: true, cycleReceived: cycle.cycleNumber } : m
    );
    const updatedCycles = group!.cycles.map(c =>
      c.id === cycleId ? { ...c, winnerId: winner.id, winAmount, discount: totalPool - winAmount, dividendPerMember: dividend, conducted: true, drawType, date: new Date().toISOString() } : c
    );
    await upsertGroup({ ...group!, members: updatedMembers, cycles: updatedCycles });
  };

  const setBid = (memberId: string, val: string) =>
    setBids(prev => prev.map(b => b.memberId === memberId ? { ...b, bid: val } : b));

  const winnerBid = winner ? parseInt(bids.find(b => b.memberId === winner.id)?.bid ?? '0') : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Cycle {cycle.cycleNumber} Draw</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Total Pool</Text>
        <Text style={styles.infoVal}>₹{totalPool.toLocaleString()}</Text>
        <Text style={styles.infoEligible}>{eligible.length} eligible members</Text>
      </View>

      {!confirmed && (
        <View style={styles.switcherCard}>
          <Text style={styles.switcherLabel}>Draw Method</Text>
          <View style={styles.switcherRow}>
            {DRAW_OPTIONS.map(({ type, icon, label }) => (
              <TouchableOpacity
                key={type}
                style={[styles.switchBtn, drawType === type && styles.switchBtnActive]}
                onPress={() => { setDrawType(type); setWinner(null); }}
              >
                <Ionicons name={icon as any} size={15} color={drawType === type ? '#fff' : colors.textSub} />
                <Text style={[styles.switchText, drawType === type && styles.switchTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {!confirmed ? (
        <>
          {isSelfAssign && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select winner</Text>
              <Text style={styles.sectionSub}>Tap the member who receives the pot this cycle</Text>
              {eligible.map(m => (
                <TouchableOpacity key={m.id} style={[styles.memberRow, winner?.id === m.id && styles.memberRowSelected]} onPress={() => setWinner(m)} activeOpacity={0.8}>
                  <View style={[styles.avatar, winner?.id === m.id && styles.avatarSelected]}>
                    <Text style={[styles.avatarText, winner?.id === m.id && { color: '#fff' }]}>{m.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    <Text style={styles.memberPhone}>{m.phone}</Text>
                  </View>
                  {winner?.id === m.id && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                </TouchableOpacity>
              ))}
              {winner && (
                <TouchableOpacity style={styles.actionBtn} onPress={confirmWinner}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.actionBtnText}>Confirm {winner.name}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {isLottery && (
            <View style={styles.section}>
              <TouchableOpacity style={styles.actionBtn} onPress={runLottery} disabled={spinning}>
                <Ionicons name="shuffle" size={22} color="#fff" />
                <Text style={styles.actionBtnText}>{spinning ? 'Drawing...' : 'Pick Winner'}</Text>
              </TouchableOpacity>
              {winner && (
                <View style={styles.winnerCard}>
                  <View style={styles.winnerAvatar}>
                    <Text style={styles.winnerAvatarText}>{winner.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.winnerName}>{winner.name}</Text>
                  <Text style={styles.winnerPhone}>{winner.phone}</Text>
                  <Text style={styles.winnerAmount}>₹{totalPool.toLocaleString()}</Text>
                  {!spinning && (
                    <TouchableOpacity style={[styles.actionBtn, { marginTop: 16, alignSelf: 'stretch' }]} onPress={confirmWinner}>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.actionBtnText}>Confirm Winner</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          {!isLottery && !isSelfAssign && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Enter Bids (₹)</Text>
              <Text style={styles.sectionSub}>Lowest bid wins the pot at their bid amount</Text>
              {eligible.map(m => (
                <View key={m.id} style={styles.bidRow}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{m.name.charAt(0).toUpperCase()}</Text></View>
                  <Text style={[styles.memberName, { flex: 1 }]}>{m.name}</Text>
                  <TextInput style={styles.bidInput} placeholder="₹ Bid" keyboardType="numeric" value={bids.find(b => b.memberId === m.id)?.bid ?? ''} onChangeText={val => setBid(m.id, val)} placeholderTextColor={colors.textHint} />
                </View>
              ))}
              <TouchableOpacity style={styles.actionBtn} onPress={getAuctionWinner}>
                <Ionicons name="hammer" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Determine Winner</Text>
              </TouchableOpacity>
              {winner && (
                <View style={styles.winnerCard}>
                  <View style={styles.winnerAvatar}><Text style={styles.winnerAvatarText}>{winner.name.charAt(0).toUpperCase()}</Text></View>
                  <Text style={styles.winnerName}>{winner.name}</Text>
                  <Text style={styles.winnerAmount}>Wins ₹{winnerBid.toLocaleString()}</Text>
                  <Text style={styles.dividendText}>Dividend/member: ₹{calculateDividend(totalPool, winnerBid, group!.members.length).toLocaleString()}</Text>
                  <TouchableOpacity style={[styles.actionBtn, { marginTop: 16, alignSelf: 'stretch' }]} onPress={confirmWinner}>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>Confirm Winner</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </>
      ) : (
        <View style={styles.successCard}>
          <Ionicons name="trophy" size={56} color="#FFD700" />
          <Text style={styles.successTitle}>Draw Complete!</Text>
          <Text style={styles.successName}>{winner?.name}</Text>
          <Text style={styles.successSub}>has won this cycle's pot</Text>
          <TouchableOpacity style={[styles.actionBtn, { marginTop: 24, alignSelf: 'stretch' }]} onPress={() => navigation.goBack()}>
            <Text style={styles.actionBtnText}>Back to Group</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: 20, paddingBottom: 40 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 20, gap: 12 },
    title: { fontSize: 22, ...fonts.extraBold, color: c.text },
    infoCard: { backgroundColor: c.primary, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16 },
    infoLabel:    { fontSize: 13, ...fonts.medium, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
    infoVal:      { fontSize: 32, ...fonts.extraBold, color: '#fff' },
    infoEligible: { fontSize: 13, ...fonts.regular, color: 'rgba(255,255,255,0.75)', marginTop: 6 },
    switcherCard: {
      backgroundColor: c.card, borderRadius: 14, padding: 14, marginBottom: 16,
      shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    switcherLabel:   { fontSize: 12, ...fonts.semiBold, color: c.textMuted, marginBottom: 10 },
    switcherRow:     { flexDirection: 'row', gap: 8 },
    switchBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: c.inputBorder, backgroundColor: c.inputBg },
    switchBtnActive: { backgroundColor: c.primary, borderColor: c.primary },
    switchText:      { fontSize: 13, ...fonts.semiBold, color: c.textSub },
    switchTextActive:{ color: '#fff' },
    section:     { width: '100%' },
    sectionTitle:{ fontSize: 17, ...fonts.bold, color: c.text, marginBottom: 4 },
    sectionSub:  { fontSize: 13, ...fonts.regular, color: c.textMuted, marginBottom: 14 },
    memberRow: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: c.card,
      borderRadius: 12, padding: 14, marginBottom: 10, gap: 12,
      borderWidth: 1.5, borderColor: 'transparent',
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    },
    memberRowSelected: { borderColor: c.primary, backgroundColor: c.primaryLight },
    avatar:         { width: 42, height: 42, borderRadius: 21, backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' },
    avatarSelected: { backgroundColor: c.primary },
    avatarText:     { fontSize: 17, ...fonts.bold, color: c.primaryText },
    memberName:     { fontSize: 15, ...fonts.bold, color: c.text },
    memberPhone:    { fontSize: 12, ...fonts.regular, color: c.textMuted, marginTop: 2 },
    actionBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.primary, borderRadius: 14, paddingVertical: 15, marginTop: 8, marginBottom: 16 },
    actionBtnText: { color: '#fff', fontSize: 16, ...fonts.bold },
    winnerCard: {
      backgroundColor: c.card, borderRadius: 16, padding: 24, alignItems: 'center',
      shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
    },
    winnerAvatar:     { width: 70, height: 70, borderRadius: 35, backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    winnerAvatarText: { fontSize: 28, ...fonts.extraBold, color: c.primaryText },
    winnerName:       { fontSize: 20, ...fonts.extraBold, color: c.text },
    winnerPhone:      { fontSize: 14, ...fonts.regular, color: c.textMuted, marginTop: 4 },
    winnerAmount:     { fontSize: 24, ...fonts.extraBold, color: c.primaryText, marginTop: 10 },
    dividendText:     { fontSize: 14, ...fonts.medium, color: c.success, marginTop: 6 },
    bidRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderRadius: 12, padding: 12, marginBottom: 10, gap: 10 },
    bidInput: { width: 90, borderWidth: 1.5, borderColor: c.inputBorder, borderRadius: 8, padding: 8, fontSize: 15, ...fonts.medium, color: c.text, backgroundColor: c.inputBg, textAlign: 'right' },
    successCard: {
      backgroundColor: c.card, borderRadius: 20, padding: 40, alignItems: 'center',
      shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    },
    successTitle: { fontSize: 24, ...fonts.extraBold, color: c.text, marginTop: 16 },
    successName:  { fontSize: 22, ...fonts.extraBold, color: c.primaryText, marginTop: 8 },
    successSub:   { fontSize: 15, ...fonts.regular, color: c.textMuted, marginTop: 4 },
  });
}
