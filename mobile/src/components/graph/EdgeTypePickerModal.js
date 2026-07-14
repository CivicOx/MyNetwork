import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';

export default function EdgeTypePickerModal({ visible, edgeTypes, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet}>
          <Text style={s.title}>Select Edge Type</Text>
          <Text style={s.subtitle}>Then tap a node to connect</Text>

          {edgeTypes.map((et) => (
            <TouchableOpacity key={et.id} style={s.row} onPress={() => onSelect(et)}>
              <View style={[s.dot, { backgroundColor: et.color }]} />
              <Text style={s.rowLabel}>{et.name}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 4,
  },
  title: { color: '#f1f5f9', fontSize: 17, fontWeight: '700', marginBottom: 2 },
  subtitle: { color: '#64748b', fontSize: 13, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 12,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  rowLabel: { color: '#f1f5f9', fontSize: 15 },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#334155',
    borderRadius: 12,
  },
  cancelText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
});
