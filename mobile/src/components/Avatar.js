import { View, Text, Image, StyleSheet } from "react-native";
import { BASE_URL } from "../api";

export default function Avatar({ person, size = 40 }) {
  const src = person?.photo_path
    ? { uri: `${BASE_URL}/${person.photo_path}` }
    : person?.photo_url
    ? { uri: person.photo_url }
    : null;

  const initial = (person?.name || "?").charAt(0).toUpperCase();
  const radius = size / 2;

  if (src) {
    return (
      <Image
        source={src}
        style={{ width: size, height: size, borderRadius: radius }}
        defaultSource={require("../../assets/favicon.png")}
      />
    );
  }

  return (
    <View style={[s.placeholder, { width: size, height: size, borderRadius: radius }]}>
      <Text style={[s.initial, { fontSize: size * 0.38 }]}>{initial}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  placeholder: { backgroundColor: "#334155", justifyContent: "center", alignItems: "center" },
  initial: { color: "#94a3b8", fontWeight: "700" },
});
