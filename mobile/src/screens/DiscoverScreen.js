import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ai as aiApi, outreach as outreachApi } from '../api';

const STATUSES = [
  { key: 'pending',   label: 'Pending',   color: '#64748b' },
  { key: 'contacted', label: 'Contacted', color: '#f59e0b' },
  { key: 'connected', label: 'Connected', color: '#22c55e' },
  { key: 'archived',  label: 'Archived',  color: '#475569' },
];

function statusColor(s) {
  return STATUSES.find((x) => x.key === s)?.color ?? '#64748b';
}

function openLinkedIn(searchQuery) {
  const q = encodeURIComponent(searchQuery);
  Linking.openURL(`https://www.linkedin.com/search/results/people/?keywords=${q}`);
}

// ── Suggestion card ──────────────────────────────────────────────────────────
function SuggestionCard({ item, alreadySaved, onSave }) {
  const [expanded, setExpanded] = useState(false);

  // Support both old format (name/title/company) and new archetype format (label/role/company_type)
  const headline = item.label || item.name || 'Connection';
  const subline = [item.role || item.title, item.company_type || item.company]
    .filter(Boolean).join(' · ');

  return (
    <View style={c.card}>
      {/* Header */}
      <View style={c.cardHeader}>
        <View style={c.cardInfo}>
          <Text style={c.cardName}>{headline}</Text>
          {subline ? <Text style={c.cardSub} numberOfLines={2}>{subline}</Text> : null}
          {item.location ? <Text style={c.cardLocation}>{item.location}</Text> : null}
        </View>
        <View style={c.cardActions}>
          <TouchableOpacity style={c.infoBtn} onPress={() => setExpanded((v) => !v)}>
            <Ionicons
              name={expanded ? 'information-circle' : 'information-circle-outline'}
              size={22}
              color={expanded ? '#3b82f6' : '#475569'}
            />
          </TouchableOpacity>
          {alreadySaved ? (
            <View style={c.savedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
              <Text style={c.savedText}>Saved</Text>
            </View>
          ) : (
            <TouchableOpacity style={c.saveBtn} onPress={onSave}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={c.saveBtnText}>Save</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* One-line reason always visible */}
      {item.reason ? <Text style={c.cardReason}>{item.reason}</Text> : null}

      {/* LinkedIn search button */}
      {item.linkedin_search ? (
        <TouchableOpacity
          style={c.linkedInBtn}
          onPress={() => openLinkedIn(item.linkedin_search)}
        >
          <Ionicons name="logo-linkedin" size={14} color="#0a66c2" />
          <Text style={c.linkedInText}>Search LinkedIn: {item.linkedin_search}</Text>
        </TouchableOpacity>
      ) : null}

      {/* Expanded info panel */}
      {expanded && (
        <View style={c.infoPanel}>
          {item.bio ? (
            <View style={c.infoSection}>
              <Text style={c.infoLabel}>Archetype background</Text>
              <Text style={c.infoText}>{item.bio}</Text>
            </View>
          ) : null}
          {item.relevance ? (
            <View style={c.infoSection}>
              <Text style={c.infoLabel}>Why relevant to you</Text>
              <Text style={c.infoText}>{item.relevance}</Text>
            </View>
          ) : null}
          <Text style={c.archetypeNote}>
            These are connection archetypes, not specific individuals. Use the LinkedIn search above to find real people matching this profile.
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Outreach item ─────────────────────────────────────────────────────────────
function OutreachItem({ item, onStatusChange, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(item.notes || '');
  const [saving, setSaving] = useState(false);

  const saveNotes = async () => {
    setSaving(true);
    await outreachApi.update(item.id, { notes: notes.trim() }).catch(() => {});
    setSaving(false);
  };

  return (
    <View style={c.outreachCard}>
      <TouchableOpacity style={c.outreachHeader} onPress={() => setExpanded((v) => !v)}>
        <View style={c.cardInfo}>
          <Text style={c.cardName}>{item.name}</Text>
          <Text style={c.cardSub} numberOfLines={1}>
            {item.title}{item.company ? ` · ${item.company}` : ''}
          </Text>
        </View>
        <View style={c.outreachRight}>
          <View style={[c.statusDot, { backgroundColor: statusColor(item.status) }]} />
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#64748b" />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={c.outreachBody}>
          {/* Status chips */}
          <View style={c.statusRow}>
            {STATUSES.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[c.statusChip, item.status === s.key && { backgroundColor: s.color + '33', borderColor: s.color }]}
                onPress={() => onStatusChange(item.id, s.key)}
              >
                <Text style={[c.statusChipText, item.status === s.key && { color: s.color }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {item.reason ? <Text style={c.outreachReason}>{item.reason}</Text> : null}

          <TextInput
            style={c.notesInput}
            value={notes}
            onChangeText={setNotes}
            onBlur={saveNotes}
            placeholder="Add notes…"
            placeholderTextColor="#475569"
            multiline
          />

          <TouchableOpacity style={c.deleteBtn} onPress={() => onDelete(item.id)}>
            {saving
              ? <ActivityIndicator size="small" color="#ef4444" />
              : <Text style={c.deleteBtnText}>Remove from list</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function DiscoverScreen() {
  const [tab, setTab] = useState('discover');   // 'discover' | 'outreach'

  // Discover tab state
  const [loading, setLoading] = useState(false);
  const [criteria, setCriteria] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [savedNames, setSavedNames] = useState(new Set());

  // Outreach tab state
  const [outreachList, setOutreachList] = useState([]);
  const [outreachLoading, setOutreachLoading] = useState(false);

  const loadOutreach = useCallback(async () => {
    setOutreachLoading(true);
    try {
      const data = await outreachApi.list();
      setOutreachList(data);
      setSavedNames(new Set(data.map((t) => t.name)));
    } catch {
      Alert.alert('Error', 'Could not load outreach list.');
    } finally {
      setOutreachLoading(false);
    }
  }, []);

  useEffect(() => { loadOutreach(); }, [loadOutreach]);

  const findConnections = async () => {
    setLoading(true);
    try {
      const excludeNames = suggestions.map((s) => s.label || s.name).filter(Boolean);
      const data = await aiApi.discover(excludeNames);
      setCriteria(data.criteria || '');
      setSuggestions(data.suggestions || []);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || 'AI request failed. Check that the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const saveSuggestion = async (item) => {
    const displayName = item.label || item.name || 'Connection';
    try {
      await outreachApi.add({
        name: displayName,
        title: item.role || item.title || '',
        company: item.company_type || item.company || '',
        reason: item.reason || '',
      });
      setSavedNames((prev) => new Set([...prev, displayName]));
      await loadOutreach();
    } catch {
      Alert.alert('Error', 'Could not save to outreach list.');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await outreachApi.update(id, { status });
      setOutreachList((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
    } catch {
      Alert.alert('Error', 'Could not update status.');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Remove', 'Remove this person from your outreach list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await outreachApi.delete(id);
            await loadOutreach();
          } catch {
            Alert.alert('Error', 'Could not remove.');
          }
        },
      },
    ]);
  };

  return (
    <View style={c.container}>
      {/* Segment control */}
      <View style={c.segmentRow}>
        <TouchableOpacity
          style={[c.segment, tab === 'discover' && c.segmentActive]}
          onPress={() => setTab('discover')}
        >
          <Text style={[c.segmentText, tab === 'discover' && c.segmentTextActive]}>AI Suggestions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[c.segment, tab === 'outreach' && c.segmentActive]}
          onPress={() => { setTab('outreach'); loadOutreach(); }}
        >
          <Text style={[c.segmentText, tab === 'outreach' && c.segmentTextActive]}>
            Outreach List{outreachList.length > 0 ? ` (${outreachList.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Discover tab ── */}
      {tab === 'discover' && (
        <ScrollView style={c.scroll} contentContainerStyle={c.scrollContent}>
          <TouchableOpacity
            style={[c.findBtn, loading && c.findBtnDisabled]}
            onPress={findConnections}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="sparkles" size={18} color="#fff" />
            )}
            <Text style={c.findBtnText}>
              {loading ? 'Finding connections…' : suggestions.length > 0 ? 'Find 10 More' : 'Find Connections'}
            </Text>
          </TouchableOpacity>

          {loading && (
            <Text style={c.loadingHint}>Running two AI prompts — this takes a few seconds…</Text>
          )}

          {criteria ? (
            <View style={c.criteriaBox}>
              <Text style={c.criteriaLabel}>AI Search Criteria</Text>
              <Text style={c.criteriaText}>{criteria}</Text>
            </View>
          ) : null}

          {suggestions.length > 0 && (
            <>
              <Text style={c.sectionLabel}>Suggested Connections</Text>
              {suggestions.map((item, i) => {
                const key = item.label || item.name || String(i);
                return (
                  <SuggestionCard
                    key={`${key}-${i}`}
                    item={item}
                    alreadySaved={savedNames.has(key)}
                    onSave={() => saveSuggestion(item)}
                  />
                );
              })}
            </>
          )}

          {!loading && suggestions.length === 0 && (
            <View style={c.emptyState}>
              <Ionicons name="people-outline" size={48} color="#334155" />
              <Text style={c.emptyText}>Tap "Find Connections" to let AI suggest people to reach out to based on your profile and network.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Outreach list tab ── */}
      {tab === 'outreach' && (
        <ScrollView style={c.scroll} contentContainerStyle={c.scrollContent}>
          {outreachLoading ? (
            <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />
          ) : outreachList.length === 0 ? (
            <View style={c.emptyState}>
              <Ionicons name="list-outline" size={48} color="#334155" />
              <Text style={c.emptyText}>No saved targets yet. Use AI Suggestions to find people and save them here.</Text>
            </View>
          ) : (
            <>
              <Text style={c.sectionLabel}>{outreachList.length} people to reach out to</Text>
              {outreachList.map((item) => (
                <OutreachItem
                  key={item.id}
                  item={item}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const c = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },

  segmentRow: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: '#3b82f6' },
  segmentText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  segmentTextActive: { color: '#fff' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 0, paddingBottom: 40 },

  findBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#3b82f6', borderRadius: 12,
    paddingVertical: 14, marginBottom: 12,
  },
  findBtnDisabled: { opacity: 0.6 },
  findBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  loadingHint: { color: '#475569', fontSize: 12, textAlign: 'center', marginBottom: 16 },

  criteriaBox: {
    backgroundColor: '#1e293b', borderRadius: 10,
    borderLeftWidth: 3, borderLeftColor: '#3b82f6',
    padding: 12, marginBottom: 20,
  },
  criteriaLabel: { color: '#3b82f6', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  criteriaText: { color: '#94a3b8', fontSize: 13, lineHeight: 18 },

  sectionLabel: { color: '#475569', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },

  card: {
    backgroundColor: '#1e293b', borderRadius: 12,
    borderWidth: 1, borderColor: '#334155',
    padding: 14, marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardInfo: { flex: 1 },
  cardName: { color: '#f1f5f9', fontSize: 14, fontWeight: '700' },
  cardSub: { color: '#64748b', fontSize: 12, marginTop: 2 },
  cardLocation: { color: '#475569', fontSize: 11, marginTop: 2 },
  cardReason: { color: '#94a3b8', fontSize: 12, marginTop: 8, lineHeight: 17 },

  linkedInBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginTop: 8, paddingVertical: 6, paddingHorizontal: 10,
    backgroundColor: '#0a66c211', borderRadius: 8,
    borderWidth: 1, borderColor: '#0a66c233',
  },
  linkedInText: { color: '#0a66c2', fontSize: 11, flex: 1 },

  archetypeNote: {
    color: '#475569', fontSize: 11, fontStyle: 'italic',
    lineHeight: 16, textAlign: 'center',
    paddingTop: 6, borderTopWidth: 1, borderTopColor: '#1e293b',
  },

  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoBtn: { padding: 2 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#3b82f6', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  saveBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  savedText: { color: '#22c55e', fontSize: 12, fontWeight: '600' },

  infoPanel: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 10,
  },
  infoSection: { gap: 3 },
  infoLabel: {
    color: '#3b82f6', fontSize: 10, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.7,
  },
  infoText: { color: '#94a3b8', fontSize: 13, lineHeight: 18 },

  outreachCard: {
    backgroundColor: '#1e293b', borderRadius: 12,
    borderWidth: 1, borderColor: '#334155',
    marginBottom: 10, overflow: 'hidden',
  },
  outreachHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
  },
  outreachRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  outreachBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },

  statusRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  statusChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: '#334155',
  },
  statusChipText: { color: '#64748b', fontSize: 12, fontWeight: '600' },

  outreachReason: { color: '#64748b', fontSize: 12, lineHeight: 17, fontStyle: 'italic' },

  notesInput: {
    backgroundColor: '#0f172a', borderRadius: 8,
    borderWidth: 1, borderColor: '#334155',
    color: '#f1f5f9', padding: 10, fontSize: 13,
    minHeight: 60, textAlignVertical: 'top',
  },
  deleteBtn: { alignItems: 'center', paddingVertical: 6 },
  deleteBtnText: { color: '#ef444488', fontSize: 13 },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 14 },
  emptyText: { color: '#475569', fontSize: 13, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
});
