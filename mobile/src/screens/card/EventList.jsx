import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import axios from "axios";

export default function EventList({ formData, onReset }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await axios.post(
          "http://localhost:9999/api/suggest-event",
          formData
        );
        setData(res.data);
      } catch (err) {
        Alert.alert("Lỗi", "Không thể lấy gợi ý sự kiện.");
        console.log(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSuggestions();
  }, []);

  if (loading)
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text>Đang tải gợi ý sự kiện...</Text>
      </View>
    );

  if (!data || !data.suggestions)
    return (
      <View style={styles.empty}>
        <Text>Không có gợi ý phù hợp.</Text>
        <TouchableOpacity onPress={onReset} style={styles.backButton}>
          <Text>← Quay lại nhập thông tin</Text>
        </TouchableOpacity>
      </View>
    );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>✨ Gợi Ý Sự Kiện Dành Cho Bạn</Text>
      <Text style={styles.date}>Ngày: {data.date}</Text>

      {data.suggestions.map((event, index) => (
        <View key={index} style={styles.card}>
          <Text style={styles.eventName}>{event.event_name}</Text>
          <Text style={styles.badge}>👥 {event.expected_attendees} người</Text>
          <Text style={styles.desc}>{event.description}</Text>

          <Text style={styles.sectionTitle}>🎯 Hoạt động</Text>
          {event.activities.map((a, i) => (
            <Text key={i} style={styles.item}>• {a}</Text>
          ))}

          <Text style={styles.sectionTitle}>💡 Lợi ích</Text>
          {event.benefits.map((b, i) => (
            <Text key={i} style={styles.item}>• {b}</Text>
          ))}
        </View>
      ))}

      <TouchableOpacity onPress={onReset} style={styles.backButton}>
        <Text style={{ fontWeight: "600" }}>← Quay lại nhập thông tin</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fafafa" },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  date: { textAlign: "center", color: "#666", marginBottom: 10 },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  eventName: { fontSize: 16, fontWeight: "600", color: "#111" },
  badge: { fontSize: 13, color: "#4F46E5", marginBottom: 8 },
  desc: { fontSize: 13, color: "#555", marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: "600", marginTop: 6 },
  item: { fontSize: 13, color: "#444", marginLeft: 10 },
  backButton: {
    backgroundColor: "#f3f4f6",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 20,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
});
