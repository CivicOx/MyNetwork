import { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { connections as connsApi, edgeTypes as etApi, people as peopleApi } from "../api";

export default function AddConnectionScreen({ navigation }) {
  const [people, setPeople] = useState([]);
  const [edgeTypes, setEdgeTypes] = useState([]);
  const [personA, setPersonA] = useState("self");
  const [personB, setPersonB] = useState("");
  const [edgeTypeId, setEdgeTypeId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([peopleApi.list(), etApi.list()]).then(([ps, ets]) => {
      setPeople(ps);
      setEdgeTypes(ets);
      setEdgeTypeId(String(ets[0]?.id || ""));
      setPersonB(String(ps[0]?.id || ""));
    });
  }, []);

  const handleSave = async () => {
    if (!personB || !edgeTypeId) return;
    setSaving(true);
    try {
      await connsApi.create({
        person_a_id: personA === "self" ? 0 : parseInt(personA),
        person_b_id: parseInt(personB),
        edge_type_id: parseInt(edgeTypeId),
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.detail || "Failed to create connection.");
    } finally {
      setSaving(false);
    }
  };

  const selectedType = edgeTypes.find((e) => String(e.id) === edgeTypeId);

  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.label}>From</Text>
        <View style={s.pickerWrap}>
          <Picker selectedValue={personA} onValueChange={setPersonA} style={s.picker} dropdownIconColor="#94a3b8">
            <Picker.Item label="You" value="self" color="#e2e8f0" />
            {people.map((p) => <Picker.Item key={p.id} label={p.name} value={String(p.id)} color="#e2e8f0" />)}
          </Picker>
        </View>

        <Text style={s.label}>To</Text>
        <View style={s.pickerWrap}>
          <Picker selectedValue={personB} onValueChange={setPersonB} style={s.picker} dropdownIconColor="#94a3b8">
            {people.filter((p) => String(p.id) !== personA).map((p) => (
              <Picker.Item key={p.id} label={p.name} value={String(p.id)} color="#e2e8f0" />
            ))}
          </Picker>
        </View>

        <Text style={s.label}>Relationship Type</Text>
        <View style={s.pickerWrap}>
          <Picker selectedValue={edgeTypeId} onValueChange={setEdgeTypeId} style={s.picker} dropdownIconColor="#94a3b8">
            {edgeTypes.map((et) => <Picker.Item key={et.id} label={et.name} value={String(et.id)} color="#e2e8f0" />)}
          </Picker>
        </View>
        {selectedType && (
          <View style={[s.colorDot, { backgroundColor: selectedType.color }]} />
        )}

        <TouchableOpacity
          style={[s.btn, (!personB || !edgeTypeId || saving) && s.disabled]}
          onPress={handleSave}
          disabled={!personB || !edgeTypeId || saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Add Connection</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  scroll: { padding: 16 },
  label: { color: "#94a3b8", fontSize: 12, fontWeight: "600", marginBottom: 4, marginTop: 16 },
  pickerWrap: { backgroundColor: "#1e293b", borderRadius: 8, borderWidth: 1, borderColor: "#334155", overflow: "hidden" },
  picker: { color: "#e2e8f0", backgroundColor: "#1e293b" },
  colorDot: { width: 14, height: 14, borderRadius: 7, marginTop: 8, marginLeft: 4 },
  btn: { backgroundColor: "#3b82f6", borderRadius: 10, padding: 14, alignItems: "center", marginTop: 32 },
  disabled: { opacity: 0.5 },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
