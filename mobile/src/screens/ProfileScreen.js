import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { profile as profileApi } from "../api";
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
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    profileApi.get().then((p) => setForm({
      ...p,
      education: p.education || [],
      work_history: p.work_history || [],
    }));
  }, []);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileApi.update(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      Alert.alert("Error", "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <View style={s.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <Avatar person={{ name: form.name, photo_path: form.photo_path }} size={72} />
          <Text style={s.name}>{form.name || "Your Profile"}</Text>
          {(form.title || form.company) && (
            <Text style={s.sub}>{form.title}{form.title && form.company ? " · " : ""}{form.company}</Text>
          )}
        </View>

        <Text style={s.section}>Contact Information</Text>
        <Field label="Full Name" value={form.name} onChangeText={set("name")} placeholder="Your name" />
        <Field label="Email" value={form.email} onChangeText={set("email")} placeholder="you@example.com" />
        <Field label="Phone" value={form.phone} onChangeText={set("phone")} placeholder="+1 (555) 000-0000" />
        <Field label="Location" value={form.location} onChangeText={set("location")} placeholder="City, State" />
        <Field label="LinkedIn URL" value={form.linkedin_url} onChangeText={set("linkedin_url")} placeholder="https://linkedin.com/in/..." />
        <Field label="Current Title" value={form.title} onChangeText={set("title")} placeholder="Software Engineer" />
        <Field label="Current Company" value={form.company} onChangeText={set("company")} placeholder="Acme Corp" />

        <Text style={s.section}>About</Text>
        <Field label="Bio" value={form.bio} onChangeText={set("bio")} multiline placeholder="A short summary about yourself..." />
        <Field label="Skills" value={form.skills} onChangeText={set("skills")} placeholder="Python, Product Management, ML (comma-separated)" />

        {form.education.length > 0 && (
          <>
            <Text style={s.section}>Education</Text>
            {form.education.map((edu, i) => (
              <View key={i} style={s.card}>
                <Text style={s.cardTitle}>{edu.school}</Text>
                <Text style={s.cardSub}>{edu.degree}{edu.field ? ` in ${edu.field}` : ""}{edu.graduation_year ? ` · ${edu.graduation_year}` : ""}</Text>
              </View>
            ))}
          </>
        )}

        {form.work_history.length > 0 && (
          <>
            <Text style={s.section}>Work History</Text>
            {form.work_history.map((job, i) => (
              <View key={i} style={s.card}>
                <Text style={s.cardTitle}>{job.title} at {job.company}</Text>
                <Text style={s.cardSub}>{job.start}{job.end ? ` – ${job.end}` : ""}</Text>
                {job.description ? <Text style={s.cardDesc}>{job.description}</Text> : null}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View style={s.bar}>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.saveTxt}>{saved ? "Saved ✓" : "Save Profile"}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, paddingBottom: 100 },
  header: { alignItems: "center", paddingVertical: 20 },
  name: { color: "#f1f5f9", fontSize: 20, fontWeight: "700", marginTop: 12 },
  sub: { color: "#94a3b8", fontSize: 14, marginTop: 4 },
  section: { color: "#64748b", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 24, marginBottom: 8 },
  field: { marginBottom: 12 },
  label: { color: "#94a3b8", fontSize: 12, marginBottom: 4 },
  input: { backgroundColor: "#1e293b", color: "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, borderWidth: 1, borderColor: "#334155" },
  multiline: { height: 80 },
  card: { backgroundColor: "#1e293b", borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#334155" },
  cardTitle: { color: "#f1f5f9", fontSize: 14, fontWeight: "600" },
  cardSub: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  cardDesc: { color: "#64748b", fontSize: 12, marginTop: 4 },
  bar: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: "#0f172a", borderTopWidth: 1, borderTopColor: "#1e293b" },
  saveBtn: { backgroundColor: "#3b82f6", borderRadius: 10, padding: 14, alignItems: "center" },
  saveTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
