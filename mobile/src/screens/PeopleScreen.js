import { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { people as peopleApi } from "../api";
import Avatar from "../components/Avatar";

export default function PeopleScreen({ navigation }) {
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await peopleApi.list();
      setData(rows);
      setFiltered(rows);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onSearch = (text) => {
    setSearch(text);
    const q = text.toLowerCase();
    setFiltered(data.filter((p) =>
      p.name?.toLowerCase().includes(q) ||
      p.company?.toLowerCase().includes(q) ||
      p.title?.toLowerCase().includes(q)
    ));
  };

  if (loading) return <View style={s.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;

  return (
    <View style={s.container}>
      <View style={s.searchRow}>
        <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
        <TextInput
          style={s.search}
          placeholder="Search people..."
          placeholderTextColor="#475569"
          value={search}
          onChangeText={onSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#3b82f6" />}
        contentContainerStyle={filtered.length === 0 ? s.center : { paddingBottom: 16 }}
        ListEmptyComponent={<Text style={s.empty}>No people yet. Tap + to add someone.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.row} onPress={() => navigation.navigate("PersonDetail", { person: item })}>
            <Avatar person={item} size={44} />
            <View style={s.info}>
              <Text style={s.name}>{item.name}</Text>
              {(item.title || item.company) && (
                <Text style={s.sub} numberOfLines={1}>
                  {item.title}{item.title && item.company ? " · " : ""}{item.company}
                </Text>
              )}
              {item.location && <Text style={s.loc} numberOfLines={1}>{item.location}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={18} color="#475569" />
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={s.fab} onPress={() => navigation.navigate("AddPerson")}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchRow: { flexDirection: "row", alignItems: "center", margin: 12, paddingHorizontal: 12, backgroundColor: "#1e293b", borderRadius: 10, borderWidth: 1, borderColor: "#334155" },
  search: { flex: 1, height: 40, color: "#e2e8f0", fontSize: 15 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  info: { flex: 1, marginLeft: 12 },
  name: { color: "#f1f5f9", fontSize: 15, fontWeight: "600" },
  sub: { color: "#94a3b8", fontSize: 13, marginTop: 1 },
  loc: { color: "#64748b", fontSize: 12, marginTop: 1 },
  empty: { color: "#475569", textAlign: "center", marginTop: 60, fontSize: 15 },
  fab: { position: "absolute", bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: "#3b82f6", justifyContent: "center", alignItems: "center", elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
});
