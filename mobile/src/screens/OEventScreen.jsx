import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Search,
  Bell,
  MapPin,
  Calendar,
  Users,
  Heart,
  ChevronDown,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import axios from "axios";

export default function OEventScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Bộ lọc ---
  const [activeFilter, setActiveFilter] = useState("price");
  const [selectedPrice, setSelectedPrice] = useState("Tất cả");
  const [selectedCategory, setSelectedCategory] = useState("Danh mục");
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");

  const categories = [
    "All",
    "Music",
    "Sports",
    "Career",
    "Festival",
    "Technology",
    "Workshop",
    "Academic",
    "Club",
    "Other",
  ];

  const priceOptions = ["Tất cả", "Miễn phí", "Mất phí"];

  
  useEffect(() => {
    axios
      .get("https://ticketfu.vercel.app/api/binh/events/category?category=All")
      .then((res) => {
        if (res.data?.data) {
          setEvents(res.data.data);
          setFilteredEvents(res.data.data);
        }
      })
      .catch((err) => console.error("❌ Lỗi tải sự kiện:", err.message))
      .finally(() => setLoading(false));
  }, []);

  // --- Chuẩn hóa ngày ---
  const normalizeDate = (dateStr) => {
    if (!dateStr) return null;

    const monthMap = {
      January: 0,
      February: 1,
      March: 2,
      April: 3,
      May: 4,
      June: 5,
      July: 6,
      August: 7,
      September: 8,
      October: 9,
      November: 10,
      December: 11,
    };

    // dd/mm/yyyy
    if (dateStr.includes("/")) {
      const [day, month, year] = dateStr.split("/");
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    // November 14, 2025
    const parts = dateStr.split(" ");
    if (parts.length === 3) {
      const [monthName, dayWithComma, year] = parts;
      const day = parseInt(dayWithComma.replace(",", ""));
      const month = monthMap[monthName];
      if (month !== undefined) {
        return new Date(Number(year), month, day);
      }
    }

    return new Date(dateStr);
  };

  // --- Lọc dữ liệu ---
  useEffect(() => {
    let filtered = [...events];

    // 🔍 Lọc theo tìm kiếm
    if (searchText.trim() !== "") {
      filtered = filtered.filter((e) =>
        e.title.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // 💰 Lọc theo giá
    if (selectedPrice === "Miễn phí") {
      filtered = filtered.filter((e) => e.price === 0);
    } else if (selectedPrice === "Có vé") {
      filtered = filtered.filter((e) => e.price > 0);
    }

    // 🏷️ Lọc theo danh mục
    if (selectedCategory !== "Danh mục" && selectedCategory !== "All") {
      filtered = filtered.filter((e) => e.category === selectedCategory);
    }

    // 📅 Lọc theo ngày
    if (selectedDate) {
      filtered = filtered.filter((e) => {
        const eventStart = normalizeDate(e.date);
        const eventEnd = normalizeDate(e.date_end);
        return (
          eventStart &&
          eventEnd &&
          selectedDate >= eventStart &&
          selectedDate <= eventEnd
        );
      });
    }

    setFilteredEvents(filtered);
  }, [searchText, selectedPrice, selectedCategory, selectedDate, events]);

  // --- Chọn option trong modal ---
  const [currentModalType, setCurrentModalType] = useState(null);
  const openModal = (type) => {
    setCurrentModalType(type);
    setModalVisible(true);
  };

  const selectOption = (option) => {
    if (currentModalType === "price") setSelectedPrice(option);
    if (currentModalType === "category") setSelectedCategory(option);
    setActiveFilter(currentModalType);
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* --- Header --- */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.logo}>Tất cả sự kiện</Text>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.iconButton}>
                <Bell size={24} color="#1a1a1a" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Text style={styles.avatar}>😊</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* --- Thanh tìm kiếm --- */}
          <View style={styles.searchContainer}>
            <Search size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm sự kiện..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          {/* --- Bộ lọc --- */}
          <View style={styles.filterRow}>
            {/* 💰 Giá */}
            <TouchableOpacity
              style={[
                styles.filterButton,
                activeFilter === "price" && styles.filterButtonActive,
              ]}
              onPress={() => openModal("price")}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === "price" && styles.filterTextActive,
                ]}
              >
                {selectedPrice}
              </Text>
              <ChevronDown
                size={16}
                color={activeFilter === "price" ? "#fff" : "#333"}
              />
            </TouchableOpacity>

            {/* 🏷️ Danh mục */}
            <TouchableOpacity
              style={[
                styles.filterButton,
                activeFilter === "category" && styles.filterButtonActive,
              ]}
              onPress={() => openModal("category")}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === "category" && styles.filterTextActive,
                ]}
              >
                {selectedCategory}
              </Text>
              <ChevronDown
                size={16}
                color={activeFilter === "category" ? "#fff" : "#333"}
              />
            </TouchableOpacity>

            {/* 📅 Thời gian */}
            <TouchableOpacity
              style={[
                styles.filterButton,
                activeFilter === "time" && styles.filterButtonActive,
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === "time" && styles.filterTextActive,
                ]}
              >
                {selectedDate
                  ? selectedDate.toLocaleDateString("vi-VN")
                  : "Thời gian"}
              </Text>
              <ChevronDown
                size={16}
                color={activeFilter === "time" ? "#fff" : "#333"}
              />
            </TouchableOpacity>
          </View>

          {/* --- Date Picker --- */}
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) {
                  setSelectedDate(date);
                  setActiveFilter("time");
                }
              }}
            />
          )}

          {/* --- Modal chọn filter --- */}
          <Modal visible={modalVisible} transparent animationType="fade">
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setModalVisible(false)}
            >
              <View style={styles.modalBox}>
                <FlatList
                  data={
                    currentModalType === "price" ? priceOptions : categories
                  }
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.optionItem}
                      onPress={() => selectOption(item)}
                    >
                      <Text style={styles.optionText}>{item}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        </View>

        {/* --- Danh sách sự kiện --- */}
        <View style={styles.eventsContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#ff6b35" />
          ) : filteredEvents.length === 0 ? (
            <Text style={{ textAlign: "center", marginTop: 40 }}>
              Không có sự kiện nào phù hợp 😢
            </Text>
          ) : (
            filteredEvents.map((event) => (
              <View key={event._id || event.id} style={styles.eventCard}>
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: event.image }}
                    style={styles.eventImage}
                  />
                  <TouchableOpacity style={styles.favoriteButton}>
                    <Heart size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.eventContent}>
                  <Text style={styles.eventTitle}>{event.title}</Text>

                  <View style={styles.eventDetail}>
                    <Users size={14} color="#666" />
                    <Text style={styles.eventDetailText}>
                      {event.attendees} người tham gia
                    </Text>
                  </View>

                  <View style={styles.eventDetail}>
                    <Calendar size={14} color="#666" />
                    <Text style={styles.eventDetailText}>
                      {event.date} - {event.date_end}
                    </Text>
                  </View>

                  <View style={styles.eventDetail}>
                    <MapPin size={14} color="#666" />
                    <Text style={styles.eventDetailText}>{event.location}</Text>
                  </View>

                  <View style={styles.eventFooter}>
                    <TouchableOpacity style={styles.bookButton}>
                      <Text style={styles.bookButtonText}>{event.price}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.detailButton}
                      onPress={() =>
                         navigation.navigate("OEventCheck", { eventId: event.id })
                      }
                    >
                      <Text style={styles.detailButtonText}>Chi tiết</Text>
                      <Text style={styles.arrow}>→</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingBottom: 45 },
  scrollView: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  logo: { fontSize: 18, fontWeight: "600", color: "#1a1a1a" },
  headerIcons: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconButton: { padding: 4 },
  avatar: { fontSize: 24 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: "#1a1a1a" },
  filterRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  filterButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingVertical: 8,
    backgroundColor: "#fff",
    gap: 4,
  },
  filterButtonActive: { backgroundColor: "#ff6b35", borderColor: "#ff6b35" },
  filterText: { fontSize: 14, color: "#333", fontWeight: "500" },
  filterTextActive: { color: "#fff", fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  optionItem: { paddingVertical: 12, paddingHorizontal: 20 },
  optionText: { fontSize: 15, color: "#333" },
  eventsContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  eventCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  imageContainer: { position: "relative", width: "100%", height: 200 },
  eventImage: { width: "100%", height: "100%" },
  favoriteButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  eventContent: { padding: 16 },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  eventDetail: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  eventDetailText: { fontSize: 13, color: "#666" },
  eventFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  bookButton: {
    backgroundColor: "#ff6b35",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bookButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  detailButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  detailButtonText: { color: "#ff6b35", fontSize: 13, fontWeight: "500" },
  arrow: { color: "#ff6b35", fontSize: 16 },
});
