import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Heart, MapPin, Calendar, Star, Bell } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import axios from "axios";
export default function HomeScreen({ navigation }) {
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingEventsuggest, setLoadingEventsuggest] = useState(true);
  const [events, setEvents] = useState([]);
  const [trendings, setTrendings] = useState([]);
  const [eventsuggest, setEventSuggest] = useState([]);

  useEffect(() => {
    axios
      .get("https://ticketfu.vercel.app/api/binh/banners")
      .then((res) => {
        if (res.data.data && res.data.data.length > 0) {
          setBanner(res.data.data[0]);
        } else {
          setBanner({
            _id: "default-banner",
            title: "FPTU Career Fair 2026",
            description: "Ngày hội việc làm 'Shaping the Sustainable Journey'",
            start_time: "2025-10-14T17:00:00.000+00:00",
            end_time: "2026-10-30T17:00:00.000+00:00",
            location: "FPT University Hanoi Campus",
            status: "approved",
            image:
              "https://international.fpt.edu.vn/web/image/image.gallery/1359/image",
            seller_id: "68c97bf55ebda7befe4cfdb1",
            category_id: "68c97d5f5ebda7befe4cfdb3",
          });
        }
      })
      .catch((err) => console.error("❌ Lỗi tải banner:", err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    axios
      .get("https://ticketfu.vercel.app/api/binh/events?mode=month")
      .then((res) => setEvents(res.data.data || []))
      .catch((err) => console.error("❌ Lỗi tải sự kiện:", err.message))
      .finally(() => setLoadingEvents(false));

    axios
      .get("https://ticketfu.vercel.app/api/binh/trendings")
      .then((res) => setTrendings(res.data.data || []))
      .catch((err) => console.error("❌ Lỗi tải trendings:", err.message));
  }, []);

  useEffect(() => {
    const fetchSuggestEvents = async () => {
      try {
        const suggest = (await AsyncStorage.getItem("suggest")) || "Career";
        const res = await axios.get(
          `https://ticketfu.vercel.app/api/binh/events/category?category=${suggest}`
        );
        if (res.data.data && Array.isArray(res.data.data)) {
          setEventSuggest(res.data.data);
        } else {
          setEventSuggest([]);
        }
      } catch (err) {
        console.error("❌ Lỗi tải gợi ý:", err.message);
      } finally {
        setLoadingEventsuggest(false);
      }
    };
    fetchSuggestEvents();
  }, []);

  // ✅ return luôn sau khi tất cả hook đã định nghĩa
  if (loading || !banner) {
    return (
      <ActivityIndicator
        size="large"
        color="#000"
        style={{ flex: 1, justifyContent: "center" }}
      />
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>FUEvent</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Bell size={22} color="#918888ff" strokeWidth={2.2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Image
              source={{
                uri: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100",
              }}
              style={styles.avatar}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.banner}>
        <Image source={{ uri: banner.image }} style={styles.bannerImage} />
        <View style={styles.bannerOverlay}>
          <Text style={styles.bannerTitle}>{banner.title}</Text>
          <Text style={styles.bannerSubtitle}>{banner.description}</Text>
          <TouchableOpacity
            style={styles.bannerButton}
            onPress={() =>
              navigation.navigate("EventDetail", { eventId: banner.id })
            }
          >
            <Text style={styles.bannerButtonText}>Đăng ký ngay</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hội Thảo Sắp Tới</Text>

        {loadingEvents ? (
          <ActivityIndicator color="#FF6B00" />
        ) : events.length === 0 ? (
          <Text style={{ paddingLeft: 16, color: "#666" }}>
            Không có sự kiện sắp tới.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.horizontalScroll}
          >
            {events.map((event) => (
              <TouchableOpacity
                key={event._id || event.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate("EventDetail", {
                    eventId: event._id || event.id,
                  })
                }
              >
                <Image source={{ uri: event.img }} style={styles.cardImage} />
                <TouchableOpacity style={styles.favoriteButton}>
                  <Heart size={20} color="#fff" />
                </TouchableOpacity>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Sắp diễn ra</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{event.title}</Text>

                  <View style={styles.cardDetail}>
                    <Calendar size={14} color="#666" />
                    <Text style={styles.cardDetailText}>
                      {new Date(event.start_time).toLocaleDateString("vi-VN")}
                    </Text>
                  </View>

                  <View style={styles.cardDetail}>
                    <MapPin size={14} color="#666" />
                    <Text style={styles.cardDetailText} numberOfLines={1}>
                      {event.location || "Địa điểm cập nhật sau"}
                    </Text>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.price}>
                      {event.price
                        ? `${event.price.toLocaleString()} VNĐ`
                        : "Miễn phí"}
                    </Text>
                    <View style={styles.rating}>
                      <Star size={14} color="#FF6B00" fill="#FF6B00" />
                      <Text style={styles.ratingText}>5.0</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Buổi Biểu Diễn Nổi Bật</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
        >
          {trendings.length > 0 ? (
            trendings.map((item) => (
              <TouchableOpacity
                style={styles.card}
                key={item._id || item.id}
                onPress={() =>
                  navigation.navigate("EventDetail", {
                    eventId: item._id || item.id,
                  })
                }
              >
                <Image source={{ uri: item.image }} style={styles.cardImage} />
                <TouchableOpacity style={styles.favoriteButton}>
                  <Heart size={20} color="#fff" />
                </TouchableOpacity>

                <View style={[styles.badge, styles.badgeFeatured]}>
                  <Text style={styles.badgeText}>Nổi Bật</Text>
                </View>

                <View style={styles.cardContent}>
                  <Text numberOfLines={2} style={styles.cardTitle}>
                    {item.title}
                  </Text>

                  <View style={styles.cardDetail}>
                    <Calendar size={14} color="#666" />
                    <Text style={styles.cardDetailText}>{item.date}</Text>
                  </View>

                  <View style={styles.cardDetail}>
                    <MapPin size={14} color="#666" />
                    <Text style={styles.cardDetailText}>{item.location}</Text>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.price}>
                      {Math.round(
                        (item.quantity_sold / item.quantity_total) * 100
                      )}
                      % vé đã bán
                    </Text>
                    <View style={styles.rating}>
                      <Star size={14} color="#FF6B00" fill="#FF6B00" />
                      <Text style={styles.ratingText}>🔥</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={{ padding: 16, color: "#999" }}>
              Không có sự kiện nổi bật
            </Text>
          )}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gợi Ý Dành Riêng Cho Bạn</Text>

        {loadingEventsuggest ? (
          <ActivityIndicator
            size="large"
            color="#fa7013"
            style={{ marginTop: 20 }}
          />
        ) : eventsuggest.length === 0 ? (
          <Text style={{ textAlign: "center", color: "#666", marginTop: 10 }}>
            Không có sự kiện phù hợp.
          </Text>
        ) : (
          eventsuggest.map((item) => (
            <View style={styles.listItem} key={item._id || item.id}>
              <Image source={{ uri: item.image }} style={styles.listImage} />
              <View style={styles.listContent}>
                <Text style={styles.listTitle}>{item.title}</Text>
                <Text style={styles.listSubtitle}>{item.location}</Text>
                <Text style={styles.listDescription}>
                  {item.date} • {item.time}
                </Text>
                <TouchableOpacity
                  style={styles.listButton}
                  onPress={() =>
                    navigation.navigate("EventDetail", { eventId: item.id })
                  }
                >
                  <Text style={styles.listButtonText}>Xem Chi Tiết</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingBottom: 42,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 50,
    backgroundColor: "#fff",
  },
  logo: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fc801bff",
  },
  headerIcons: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: {
    fontSize: 20,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  banner: {
    height: 200,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    overflow: "hidden",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    padding: 20,
    justifyContent: "center",
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: "#fff",
    marginBottom: 16,
  },
  bannerButton: {
    backgroundColor: "#FF6B00",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  bannerButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    marginBottom: 64,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  horizontalScroll: {
    paddingLeft: 16,
  },
  card: {
    width: 200,
    marginRight: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImage: {
    width: "100%",
    height: 120,
  },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#FF6B00",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  badgeFeatured: {
    backgroundColor: "#4CAF50",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  cardDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  cardDetailText: {
    fontSize: 12,
    color: "#666",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF6B00",
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
  },
  listItem: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  listImage: {
    width: 100,
    height: 120,
  },
  listContent: {
    flex: 1,
    padding: 12,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  listSubtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  listDescription: {
    fontSize: 11,
    color: "#999",
    marginBottom: 8,
  },
  listButton: {
    backgroundColor: "#FF6B00",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  listButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
