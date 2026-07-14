import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  people as peopleApi,
  connections as connsApi,
  edgeTypes as edgeTypesApi,
  profile as profileApi,
} from '../api';
import GraphCanvas from '../components/graph/GraphCanvas';
import EdgeTypePickerModal from '../components/graph/EdgeTypePickerModal';
import EdgeEditModal from '../components/graph/EdgeEditModal';

const CX = 300;
const CY = 250;
const LAYOUT_R = 190;

function buildLayout(rawNodes) {
  const unpositioned = rawNodes.filter((n) => n.graphX === 0 && n.graphY === 0);
  if (unpositioned.length === 0) return rawNodes;
  const nonSelfUnpos = unpositioned.filter((n) => !n.isSelf);
  const count = Math.max(nonSelfUnpos.length, 1);
  return rawNodes.map((n) => {
    if (n.graphX !== 0 || n.graphY !== 0) return n;
    if (n.isSelf) return { ...n, graphX: CX, graphY: CY };
    const idx = nonSelfUnpos.indexOf(n);
    const angle = (2 * Math.PI * idx) / count - Math.PI / 2;
    return { ...n, graphX: CX + LAYOUT_R * Math.cos(angle), graphY: CY + LAYOUT_R * Math.sin(angle) };
  });
}

// Connection mode:
//   null           → normal mode
//   'source'       → waiting for user to tap the source node
//   'target'       → source selected, waiting for user to tap the target node
const CONN_IDLE = null;
const CONN_SOURCE = 'source';
const CONN_TARGET = 'target';

export default function NetworkGraphScreen({ navigation }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edgeTypes, setEdgeTypes] = useState([]);

  // Connection creation state
  const [connMode, setConnMode] = useState(CONN_IDLE);
  const [connSource, setConnSource] = useState(null);
  const [connTarget, setConnTarget] = useState(null);
  const [showEdgePicker, setShowEdgePicker] = useState(false);

  // Edge editing state
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [showEdgeEdit, setShowEdgeEdit] = useState(false);

  const graphRef = useRef(null);

  useEffect(() => {
    edgeTypesApi.list().then(setEdgeTypes).catch(() => {});
  }, []);

  const loadGraph = useCallback(async () => {
    try {
      const [ps, conns, prof] = await Promise.all([
        peopleApi.list(),
        connsApi.list(),
        profileApi.get(),
      ]);

      const raw = [
        {
          id: 'self',
          isSelf: true,
          label: prof.name || 'You',
          sub: prof.title || '',
          graphX: prof.node_x || 0,
          graphY: prof.node_y || 0,
          data: prof,
        },
        ...ps.map((p) => ({
          id: String(p.id),
          isSelf: false,
          label: p.name,
          sub: p.title || p.company || '',
          graphX: p.node_x || 0,
          graphY: p.node_y || 0,
          data: p,
        })),
      ];

      setNodes(buildLayout(raw));
      setEdges(
        conns.map((c) => ({
          id: String(c.id),
          sourceId: c.person_a_id === 0 ? 'self' : String(c.person_a_id),
          targetId: c.person_b_id === 0 ? 'self' : String(c.person_b_id),
          color: c.edge_type?.color || '#475569',
          label: c.edge_type?.name || '',
          notes: c.notes,
          edgeTypeId: c.edge_type?.id ?? null,
          personAName: c.person_a?.name ?? (c.person_a_id === 0 ? 'You' : `Person ${c.person_a_id}`),
          personBName: c.person_b?.name ?? (c.person_b_id === 0 ? 'You' : `Person ${c.person_b_id}`),
        })),
      );
    } catch {
      Alert.alert('Error', 'Could not load network data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadGraph();
    }, [loadGraph]),
  );

  const cancelConn = useCallback(() => {
    setConnMode(CONN_IDLE);
    setConnSource(null);
    setConnTarget(null);
  }, []);

  // Tap a node: behaviour depends on current connection mode
  const handleNodePress = useCallback((node) => {
    if (connMode === CONN_SOURCE) {
      setConnSource(node);
      setConnMode(CONN_TARGET);
      return;
    }

    if (connMode === CONN_TARGET) {
      if (node.id === connSource?.id) {
        // Tapped the source again — treat as cancel
        cancelConn();
        return;
      }
      setConnTarget(node);
      setShowEdgePicker(true);
      return;
    }

    // Normal mode: navigate
    if (node.isSelf) {
      navigation.getParent?.()?.navigate('Profile');
    } else {
      navigation.navigate('PersonDetail', { person: node.data });
    }
  }, [connMode, connSource, cancelConn, navigation]);

  // Edge type chosen → create connection
  const handleEdgeTypeSelected = useCallback(async (edgeType) => {
    setShowEdgePicker(false);
    const src = connSource;
    const tgt = connTarget;
    cancelConn();

    if (!src || !tgt) return;

    const personAId = src.isSelf ? 0 : parseInt(src.id, 10);
    const personBId = tgt.isSelf ? 0 : parseInt(tgt.id, 10);

    try {
      await connsApi.create({ person_a_id: personAId, person_b_id: personBId, edge_type_id: edgeType.id });
      loadGraph();
    } catch {
      Alert.alert('Error', 'Could not create connection.');
    }
  }, [connSource, connTarget, cancelConn, loadGraph]);

  // Edge editing
  const handleEdgePress = useCallback((edge) => {
    setSelectedEdge(edge);
    setShowEdgeEdit(true);
  }, []);

  const handleEdgeSave = useCallback(async (edgeId, data) => {
    setShowEdgeEdit(false);
    try {
      await connsApi.update(parseInt(edgeId, 10), data);
      loadGraph();
    } catch {
      Alert.alert('Error', 'Could not update connection.');
    }
  }, [loadGraph]);

  const handleEdgeDelete = useCallback(async (edgeId) => {
    setShowEdgeEdit(false);
    try {
      await connsApi.delete(parseInt(edgeId, 10));
      loadGraph();
    } catch {
      Alert.alert('Error', 'Could not delete connection.');
    }
  }, [loadGraph]);

  const handleDragEnd = useCallback(async (nodeId, x, y) => {
    const rounded = { node_x: Math.round(x), node_y: Math.round(y) };
    setNodes((prev) =>
      prev.map((n) => n.id === nodeId ? { ...n, graphX: rounded.node_x, graphY: rounded.node_y } : n),
    );
    try {
      if (nodeId === 'self') {
        await profileApi.update(rounded);
      } else {
        await peopleApi.update(parseInt(nodeId, 10), rounded);
      }
    } catch { /* position held in memory */ }
  }, []);

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color="#3b82f6" size="large" />
        <Text style={s.loadingText}>Loading network…</Text>
      </View>
    );
  }

  // Banner text changes as user moves through the connection steps
  const bannerText = connMode === CONN_SOURCE
    ? 'Tap the first person'
    : connMode === CONN_TARGET
      ? `Connecting from ${connSource?.label ?? '…'} — tap the second person`
      : null;

  return (
    <View style={s.container}>
      <GraphCanvas
        ref={graphRef}
        nodes={nodes}
        edges={edges}
        onNodePress={handleNodePress}
        onDragEnd={handleDragEnd}
        onEdgePress={handleEdgePress}
        edgeCreatingSourceId={connMode === CONN_TARGET ? connSource?.id : null}
      />

      {/* Connection-mode banner */}
      {bannerText && (
        <View style={s.banner}>
          <Ionicons name="git-network-outline" size={14} color="#22d3ee" />
          <Text style={s.bannerText} numberOfLines={1}>{bannerText}</Text>
          <TouchableOpacity onPress={cancelConn} style={s.bannerCancel}>
            <Ionicons name="close" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      )}

      {/* FABs */}
      <View style={s.fabs}>
        <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('Discover')}>
          <Ionicons name="sparkles" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('AddPerson')}>
          <Ionicons name="person-add" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Make Connection — toggles connection mode */}
        <TouchableOpacity
          style={[s.fab, s.fabAlt, connMode !== CONN_IDLE && s.fabActive]}
          onPress={() => {
            if (connMode !== CONN_IDLE) {
              cancelConn();
            } else {
              setConnMode(CONN_SOURCE);
            }
          }}
        >
          <Ionicons name="git-network-outline" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={[s.fab, s.fabAlt]} onPress={() => graphRef.current?.fitToScreen()}>
          <Ionicons name="scan-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Info badge */}
      <View style={s.badge}>
        <Text style={s.badgeText}>{nodes.length} nodes · {edges.length} edges</Text>
      </View>

      {/* Edge type picker (shown after both nodes are selected) */}
      <EdgeTypePickerModal
        visible={showEdgePicker}
        edgeTypes={edgeTypes}
        onSelect={handleEdgeTypeSelected}
        onClose={() => { setShowEdgePicker(false); cancelConn(); }}
      />

      {/* Edge edit modal */}
      <EdgeEditModal
        visible={showEdgeEdit}
        edge={selectedEdge}
        edgeTypes={edgeTypes}
        onSave={handleEdgeSave}
        onDelete={handleEdgeDelete}
        onClose={() => setShowEdgeEdit(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  loading: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#0f172a', gap: 12,
  },
  loadingText: { color: '#64748b', fontSize: 14 },
  banner: {
    position: 'absolute',
    top: 16, left: 16, right: 16,
    backgroundColor: '#1e293bee',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#22d3ee44',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  bannerText: { flex: 1, color: '#94a3b8', fontSize: 13 },
  bannerCancel: { padding: 4 },
  fabs: {
    position: 'absolute', bottom: 28, right: 16,
    gap: 10, alignItems: 'center',
  },
  fab: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#3b82f6',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 8,
  },
  fabAlt: { backgroundColor: '#475569' },
  fabActive: { backgroundColor: '#22d3ee', },
  badge: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: '#1e293bcc', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  badgeText: { color: '#64748b', fontSize: 11 },
});
