import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Pressable, ScrollView, Alert,
} from 'react-native';

export default function EdgeEditModal({ visible, edge, edgeTypes, onSave, onDelete, onClose }) {
  const [notes, setNotes] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState(null);

  useEffect(() => {
    if (edge) {
      setNotes(edge.notes || '');
      setSelectedTypeId(edge.edgeTypeId ?? null);
    }
  }, [edge]);

  if (!edge) return null;

  const handleSave = () => {
    onSave(edge.id, { notes: notes.trim(), edge_type_id: selectedTypeId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Connection',
      `Remove the connection between ${edge.personAName} and ${edge.personBName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(edge.id) },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet}>
          <Text style={s.title}>{edge.personAName}</Text>
          <Text style={s.subtitle}>↔  {edge.personBName}</Text>

          <Text style={s.label}>Edge Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.typeRow}>
            {edgeTypes.map((et) => {
              const selected = selectedTypeId === et.id;
              return (
                <TouchableOpacity
                  key={et.id}
                  style={[s.chip, selected && { borderColor: et.color, backgroundColor: et.color + '22' }]}
                  onPress={() => setSelectedTypeId(et.id)}
                >
                  <View style={[s.dot, { backgroundColor: et.color }]} />
                  <Text style={[s.chipLabel, selected && { color: et.color }]}>{et.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={s.label}>Notes</Text>
          <TextInput
            style={s.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes…"
            placeholderTextColor="#475569"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={s.actions}>
            <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
              <Text style={s.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
              <Text style={s.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 4,
  },
  title: { color: '#f1f5f9', fontSize: 17, fontWeight: '700' },
  subtitle: { color: '#64748b', fontSize: 14, marginBottom: 16 },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  typeRow: { flexDirection: 'row', marginBottom: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#334155',
    marginRight: 8,
    backgroundColor: '#0f172a',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  chipLabel: { color: '#94a3b8', fontSize: 13 },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f1f5f9',
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    marginBottom: 16,
  },
  actions: { flexDirection: 'row', gap: 10 },
  deleteBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    alignItems: 'center',
  },
  deleteBtnText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
  saveBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
