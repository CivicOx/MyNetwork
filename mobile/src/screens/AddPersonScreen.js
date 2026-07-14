import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { people as peopleApi, ai } from "../api";

export default function AddPersonScreen({ navigation }) {
  const [name, setName] = useState("");
  const [hints, setHints] = useState("");
  const [enriched, setEnriched] = useState(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSearch = async () => {
    if (!name.trim()) return;
    setSearching(true);
    try {
      const result = await ai.enrich(name.trim(), hints.trim() || undefined);
      setEnriched(result);
    } catch {
      setEnriched({ name: name.trim() });
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    const data = enriched || { name: name.trim() };
    if (!data.name) return;
    setSaving(true);
    try {
      await peopleApi.create(data);
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", "Failed to add person. Is the backend running?");
    } finally {
      setSaving(false);
    }
  };

  const set = (k) => (v) => setEnriched((f) => ({ ...f, [k]: v }));

  if (!enriched) {
    return (
      <View style={s.container}>
        <ScrollView contentContainerStyle={s.scroll}>
          <Text style={s.hint}>Enter a name to search and auto-fill their info, or add manually.</Text>

          <Text style={s.label}>Full Name *</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Jane Smith"
            placeholderTextColor="#475569"
            autoFocus
            returnKeyType="next"
          />

          <Text style={s.label}>Hints (optional)</Text>
          <TextInput
            style={s.input}
            value={hints}
            onChangeText={setHints}
            placeholder="e.g. CTO at Acme, based in Austin"
            placeholderTextColor="#475569"
          />

          <TouchableOpacity
            style={[s.btn, s.primary, (!name.trim() || searching) && s.disabled]}
            onPress={handleSearch}
            disabled={!name.trim() || searching}
          >
            {searching
              ? <ActivityIndicator color="#fff" />
              : <><Ionicons name="search" size={16} color="#fff" /><Text style={s.btnTxt}>  Search & Enrich</Text></>
            }
          </TouchableOpacity>

          <TouchableOpacity style={[s.btn, s.secondary]} onPress={() => setEnriched({ name: name.trim() })}>
            <Text style={[s.btnTxt, { color: "#94a3b8" }]}>Add Manually</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: 100 }]}>
        {enriched.confidence && (
          <Text style={[s.confidence, { color: enriched.confidence === "high" ? "#22c55e" : enriched.confidence === "medium" ? "#f59e0b" : "#94a3b8" }]}>
            Confidence: {enriched.confidence}
          </Text>
        )}

        {[
          ["Name", "name", "Full name"],
          ["Email", "email", "email@example.com"],
          ["Phone", "phone", "+1 (555) 000-0000"],
          ["Location", "location", "City, State"],
          ["Company", "company", "Acme Corp"],
          ["Title", "title", "Software Engineer"],
          ["LinkedIn", "linkedin_url", "https://linkedin.com/in/..."],
        ].map(([label, key, placeholder]) => (
          <View key={key} style={s.fieldRow}>
            <Text style={s.label}>{label}</Text>
            <TextInput
              style={s.input}
              value={enriched[key] || ""}
              onChangeText={set(key)}
              placeholder={placeholder}
              placeholderTextColor="#475569"
            />
          </View>
        ))}

        {enriched.ai_bio && (
          <View style={s.fieldRow}>
            <Text style={s.label}>AI Bio</Text>
            <TextInput style={[s.input, { height: 80, textAlignVertical: "top" }]} value={enriched.ai_bio} onChangeText={set("ai_bio")} multiline />
          </View>
        )}
      </ScrollView>

      <View style={s.bar}>
        <TouchableOpacity style={[s.btn, s.secondary, { flex: 1, marginRight: 8 }]} onPress={() => setEnriched(null)}>
          <Text style={[s.btnTxt, { color: "#94a3b8" }]}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, s.primary, { flex: 2 }]} onPress={handleSave} disabled={saving || !enriched.name}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Add to Network</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  scroll: { padding: 16 },
  hint: { color: "#64748b", fontSize: 13, marginBottom: 20, lineHeight: 18 },
  confidence: { fontSize: 13, marginBottom: 16, fontWeight: "600" },
  fieldRow: { marginBottom: 12 },
  label: { color: "#94a3b8", fontSize: 12, marginBottom: 4 },
  input: { backgroundColor: "#1e293b", color: "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, borderWidth: 1, borderColor: "#334155" },
  btn: { flexDirection: "row", borderRadius: 10, padding: 14, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  primary: { backgroundColor: "#3b82f6" },
  secondary: { backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155" },
  disabled: { opacity: 0.5 },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
  bar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", padding: 16, backgroundColor: "#0f172a", borderTopWidth: 1, borderTopColor: "#1e293b" },
});
