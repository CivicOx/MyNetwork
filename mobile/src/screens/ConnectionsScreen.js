import { useCallback, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { connections as connsApi, edgeTypes as etApi, people as peopleApi } from "../api";

export default function ConnectionsScreen({ navigation }) {
  const [conns, setConns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await connsApi.list();
      setConns(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (conn) => {
    Alert.alert("Delete Connection", `Remove this ${conn.edge_type.name} connection?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await connsApi.delete(conn.id); load(); } },
    ]);
  };

  if (loading) return <View style={s.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;

  return (
    <View style={s.container}>
      <FlatList
        data={conns}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#3b82f6" />}
        contentContainerStyle={conns.length === 0 ? s.center : { paddingBottom: 16 }}
        ListEmptyComponent={<Text style={s.empty}>No connections yet. Add people and connect them.</Text>}
        renderItem={({ item }) => (
          <View style={s.row}>
            <View style={[s.dot, { backgroundColor: item.edge_type.color }]} />
            <View style={s.info}>
              <Text style={s.names}>
                {item.person_a?.name || "You"} <Text style={s.arrow}>↔</Text> {item.person_b?.name || "You"}
              </Text>
              <Text style={[s.type, { color: item.edge_type.color }]}>{item.edge_type.name}</Text>
              {item.notes ? <Text style={s.notes} numberOfLines={1}>{item.notes}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="trash-outline" size={18} color="#475569" />
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={s.fab} onPress={() => navigation.navigate("AddConnection")}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12, flexShrink: 0 },
  info: { flex: 1 },
  names: { color: "#f1f5f9", fontSize: 15, fontWeight: "600" },
  arrow: { color: "#475569" },
  type: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  notes: { color: "#64748b", fontSize: 12, marginTop: 2, fontStyle: "italic" },
  empty: { color: "#475569", textAlign: "center", marginTop: 60, fontSize: 15, paddingHorizontal: 32 },
  fab: { position: "absolute", bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: "#3b82f6", justifyContent: "center", alignItems: "center", elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
});
