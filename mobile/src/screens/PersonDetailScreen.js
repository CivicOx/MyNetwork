import { useState } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { people as peopleApi } from "../api";
import Avatar from "../components/Avatar";

function Field({ label, value, onChangeText, multiline, placeholder }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={[s.input, multiline && s.multiline]}
        value={value || ""}
        onChangeText={onChangeText}
        placeholder={placeholder || ""}
        placeholderTextColor="#475569"
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

export default function PersonDetailScreen({ route, navigation }) {
  const [form, setForm] = useState({ ...route.params.person });
  const [saving, setSaving] = useState(false);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await peopleApi.update(form.id, form);
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Person", `Remove ${form.name} from your network?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await peopleApi.delete(form.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <Avatar person={form} size={72} />
          <Text style={s.name}>{form.name}</Text>
          {(form.title || form.company) && (
            <Text style={s.sub}>{form.title}{form.title && form.company ? " · " : ""}{form.company}</Text>
          )}
        </View>

        <Text style={s.section}>Contact</Text>
        <Field label="Name" value={form.name} onChangeText={set("name")} />
        <Field label="Email" value={form.email} onChangeText={set("email")} placeholder="you@example.com" />
        <Field label="Phone" value={form.phone} onChangeText={set("phone")} placeholder="+1 (555) 000-0000" />
        <Field label="LinkedIn" value={form.linkedin_url} onChangeText={set("linkedin_url")} placeholder="https://linkedin.com/in/..." />
        <Field label="Location" value={form.location} onChangeText={set("location")} placeholder="City, State" />

        <Text style={s.section}>Work</Text>
        <Field label="Title" value={form.title} onChangeText={set("title")} placeholder="Software Engineer" />
        <Field label="Company" value={form.company} onChangeText={set("company")} placeholder="Acme Corp" />

        <Text style={s.section}>Notes</Text>
        <Field label="Notes" value={form.notes} onChangeText={set("notes")} multiline placeholder="How you met, topics to follow up on..." />

        {form.ai_bio ? (
          <>
            <Text style={s.section}>AI Bio</Text>
            <View style={s.bioBox}>
              <Text style={s.bioText}>{form.ai_bio}</Text>
            </View>
          </>
        ) : null}

        <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
          <Text style={s.deleteText}>Remove from Network</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={s.bar}>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveTxt}>Save Changes</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  scroll: { padding: 16, paddingBottom: 100 },
  header: { alignItems: "center", paddingVertical: 20 },
  name: { color: "#f1f5f9", fontSize: 20, fontWeight: "700", marginTop: 12 },
  sub: { color: "#94a3b8", fontSize: 14, marginTop: 4 },
  section: { color: "#64748b", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 24, marginBottom: 8 },
  field: { marginBottom: 12 },
  label: { color: "#94a3b8", fontSize: 12, marginBottom: 4 },
  input: { backgroundColor: "#1e293b", color: "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, borderWidth: 1, borderColor: "#334155" },
  multiline: { height: 80, textAlignVertical: "top" },
  bioBox: { backgroundColor: "#1e293b", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#334155" },
  bioText: { color: "#94a3b8", fontSize: 14, lineHeight: 20 },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 32, gap: 6 },
  deleteText: { color: "#ef4444", fontSize: 14 },
  bar: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: "#0f172a", borderTopWidth: 1, borderTopColor: "#1e293b" },
  saveBtn: { backgroundColor: "#3b82f6", borderRadius: 10, padding: 14, alignItems: "center" },
  saveTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
