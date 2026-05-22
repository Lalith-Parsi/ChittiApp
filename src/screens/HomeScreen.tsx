import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, TextInput } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ChittiGroup } from '../types';
import { getGroups, deleteGroup } from '../storage';
import GroupCard from '../components/GroupCard';
import { RootStackParamList } from '../navigation/types';
import { useTheme } from '../lib/ThemeContext';
import { ThemeColors, fonts } from '../lib/theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [groups, setGroups]             = useState<ChittiGroup[]>([]);
  const [query, setQuery]               = useState('');
  const [showArchived, setShowArchived] = useState(false);

  useFocusEffect(useCallback(() => { getGroups().then(setGroups); }, []));

  const handleDelete = (group: ChittiGroup) => {
    const ok = typeof window !== 'undefined'
      ? window.confirm(`Delete "${group.name}"? This cannot be undone.`)
      : true;
    if (!ok) return;
    deleteGroup(group.id).then(() => setGroups(prev => prev.filter(g => g.id !== group.id)));
  };

  const active   = groups.filter(g => g.isActive !== false);
  const archived = groups.filter(g => g.isActive === false);

  const applyQuery = (list: ChittiGroup[]) =>
    query.trim() ? list.filter(g => g.name.toLowerCase().includes(query.toLowerCase().trim())) : list;

  const visible       = applyQuery(showArchived ? archived : active);
  const archivedCount = archived.length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Chitti Manager</Text>
          <Text style={styles.subtitle}>
            {active.length} active{archivedCount > 0 ? ` · ${archivedCount} archived` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={toggleTheme} style={styles.themeBtn}>
          <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search groups..."
            value={query}
            onChangeText={setQuery}
            placeholderTextColor={colors.textHint}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        {archivedCount > 0 && (
          <TouchableOpacity
            style={[styles.archiveBtn, showArchived && styles.archiveBtnActive]}
            onPress={() => setShowArchived(v => !v)}
          >
            <Ionicons name="archive-outline" size={15} color={showArchived ? '#fff' : colors.primary} />
            <Text style={[styles.archiveBtnText, showArchived && { color: '#fff' }]}>
              {showArchived ? 'Active' : String(archivedCount)}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {visible.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={72} color={colors.border} />
          <Text style={styles.emptyTitle}>
            {query ? 'No groups found' : showArchived ? 'No archived groups' : 'No groups yet'}
          </Text>
          {!query && !showArchived && (
            <Text style={styles.emptyText}>Tap + to create your first chitti group</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={g => g.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <GroupCard
              group={item}
              onPress={() => navigation.navigate('GroupDetail', { groupId: item.id })}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}

      {!showArchived && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateGroup', {})} activeOpacity={0.85}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
      backgroundColor: c.header, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    title: { fontSize: 26, ...fonts.extraBold, color: c.text },
    subtitle: { fontSize: 14, ...fonts.regular, color: c.textMuted, marginTop: 2 },
    themeBtn: { padding: 6 },
    searchRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 16, paddingVertical: 10,
      backgroundColor: c.header, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    searchBox: {
      flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: c.inputBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    },
    searchInput: { flex: 1, fontSize: 14, ...fonts.regular, color: c.text },
    archiveBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: c.primaryLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    },
    archiveBtnActive: { backgroundColor: c.primary },
    archiveBtnText: { fontSize: 13, ...fonts.semiBold, color: c.primaryText },
    list: { padding: 16, paddingBottom: 100 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyTitle: { fontSize: 20, ...fonts.bold, color: c.text, marginTop: 16 },
    emptyText: { fontSize: 14, ...fonts.regular, color: c.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
    fab: {
      position: 'absolute', bottom: 32, right: 24,
      width: 60, height: 60, borderRadius: 30, backgroundColor: c.primary,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: c.primary, shadowOpacity: 0.4, shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 }, elevation: 8,
    },
  });
}
