import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";

const categories = [
  { name: "Academic", color: "#4F46E5" },
  { name: "Music", color: "#EC4899" },
  { name: "Workshop", color: "#10B981" },
  { name: "Club", color: "#F59E0B" },
  { name: "Sports", color: "#EF4444" },
  { name: "Career", color: "#10B981" },
  { name: "Festival", color: "#F59E0B" },
  { name: "Technology", color: "#3B82F6" },
];

export default function EventSuggestions({ onInputSuccess }) {
  const [formData, setFormData] = useState({
    category: "",
    people: "",
    detail: "",
  });

  const handleSubmit = () => {
    if (!formData.category || !formData.people || !formData.detail) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập đầy đủ các trường!");
      return;
    }
    onInputSuccess(formData);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🎉 Gợi Ý Sự Kiện</Text>
      <Text style={styles.subtitle}>
        Nhập thông tin để AI gợi ý 3 sự kiện phù hợp
      </Text>

      <Text style={styles.label}>Thể loại sự kiện</Text>
      <View style={styles.categoryContainer}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.name}
            style={[
              styles.categoryItem,
              formData.category === cat.name && {
                borderColor: cat.color,
                backgroundColor: "#f3f4f6",
              },
            ]}
            onPress={() => setFormData({ ...formData, category: cat.name })}
          >
            <Text
              style={[
                styles.categoryText,
                formData.category === cat.name && { color: cat.color },
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Số người tham dự</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="VD: 50"
        value={formData.people}
        onChangeText={(val) => setFormData({ ...formData, people: val })}
      />

      <Text style={styles.label}>Chi tiết mô tả</Text>
      <TextInput
        style={[styles.input, { height: 100, textAlignVertical: "top" }]}
        multiline
        placeholder="VD: Sự kiện âm nhạc ngoài trời cho sinh viên yêu thích EDM..."
        value={formData.detail}
        onChangeText={(val) => setFormData({ ...formData, detail: val })}
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>🔮 Xem 3 Gợi Ý Sự Kiện</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  subtitle: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 20,
  },
  label: { fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    fontSize: 14,
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  categoryItem: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    margin: 4,
  },
  categoryText: { fontSize: 14, color: "#333" },
  button: {
    backgroundColor: "#6366F1",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "600" },
});
