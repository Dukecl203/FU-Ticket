import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Bell,
  Heart,
  MapPin,
  Calendar,
  Tag,
} from "lucide-react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useEffect, useState } from "react";
import { SplashScreen } from "expo-router";
import { useRoute } from "@react-navigation/native";

SplashScreen.preventAutoHideAsync();

export default function EventDetailScreen({ navigation }) {
  const route = useRoute();
  const { eventId } = route.params;
  console.log("📦 Event ID:", eventId);

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  const [fontsLoaded, fontError] = useFonts({
    "Inter-Regular": Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    "Inter-SemiBold": Inter_600SemiBold,
    "Inter-Bold": Inter_700Bold,
  });

  // 🎯 Gọi API để lấy chi tiết sự kiện
  useEffect(() => {
    const fetchEventDetail = async () => {
      try {
        const res = await fetch(
          `https://ticketfu.vercel.app/api/binh/events/${eventId}`
        );
        const data = await res.json();
        if (data.success) {
          setEvent(data.data);
        }
      } catch (err) {
        console.error("❌ Lỗi khi tải sự kiện:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetail();
  }, [eventId]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;
  if (loading)
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={{ marginTop: 10, color: "#666" }}>
          Đang tải chi tiết sự kiện...
        </Text>
      </SafeAreaView>
    );

  if (!event)
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ color: "#666" }}>Không tìm thấy sự kiện.</Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết sự kiện</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerButton}>
              <Bell size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.avatar}>
              <View style={styles.avatarCircle} />
            </View>
          </View>
        </View>

        {/* Hình ảnh & tên sự kiện */}
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri:
                event.image ||
                "https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg",
            }}
            style={styles.eventImage}
            resizeMode="cover"
          />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{event.category}</Text>
          </View>
        </View>

        {/* Nội dung */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{event.title}</Text>
            <TouchableOpacity style={styles.favoriteButton}>
              <Heart size={24} color="#FF6B00" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Tổ chức bởi: {event.seller?.full_name || "Đang cập nhật"}
          </Text>

          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Text key={star}>⭐</Text>
              ))}
            </View>
            <Text style={styles.ratingText}>
              {event.attendees} người tham dự
            </Text>
          </View>

          {/* Mô tả */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mô tả sự kiện</Text>
            <Text style={styles.description}>
              Hãy sẵn sàng cho một sự kiện đầy cảm xúc và năng lượng, nơi bạn có
              thể hòa mình vào không khí sôi động, gặp gỡ những người cùng đam
              mê và tận hưởng những khoảnh khắc đáng nhớ. Chương trình hứa hẹn
              mang đến trải nghiệm giải trí, kết nối và truyền cảm hứng — một dấu
              ấn khó quên trong hành trình khám phá và tận hưởng cuộc sống của
              bạn.
            </Text>
          </View>

          {/* Chi tiết lịch trình */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chi tiết lịch trình</Text>

            <View style={styles.detailRow}>
              <Calendar size={20} color="#FF6B00" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Thời gian</Text>
                <Text style={styles.detailValue}>
                  {event.date} - {event.time}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <MapPin size={20} color="#FF6B00" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Địa điểm</Text>
                <Text style={styles.detailValue}>{event.location}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Tag size={20} color="#FF6B00" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Thể loại</Text>
                <Text style={styles.detailValue}>{event.category}</Text>
              </View>
            </View>
          </View>

          {/* Giá vé */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Giá vé</Text>
            <View style={styles.ticketRow}>
              <View style={styles.ticketInfo}>
                <Text style={styles.ticketType}>Vé thường</Text>
                <Text style={styles.ticketPrice}>
                  {event.price?.toLocaleString("vi-VN")} VNĐ
                </Text>
              </View>
              <View style={styles.ticketRight}>
                <Text style={styles.ticketLabel}>Trạng thái</Text>
                <Text style={styles.ticketStatus}>Còn vé</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.addToWishlistButton}>
          <Text style={styles.addToWishlistText}>Thêm vào yêu thích</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bookButton} onPress={()=>navigation.navigate("TicketChoose", { eventId: event.id })}>
          <Text style={styles.bookButtonText}>Mua vé</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// -------------------- STYLES -------------------- //
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  scrollView: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Inter-SemiBold",
    color: "#000",
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, overflow: "hidden" },
  avatarCircle: { width: 32, height: 32, backgroundColor: "#FFE5D3" },
  imageContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  eventImage: { width: "100%", height: 200, backgroundColor: "#F0F0F0" },
  badge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: { color: "#FFF", fontSize: 12, fontFamily: "Inter-Medium" },
  content: { paddingHorizontal: 16 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter-Bold",
    color: "#000",
    flex: 1,
    marginRight: 12,
    lineHeight: 28,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter-Regular",
    color: "#666",
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  stars: { flexDirection: "row", marginRight: 8 },
  ratingText: { fontSize: 12, fontFamily: "Inter-Regular", color: "#666" },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter-Bold",
    color: "#000",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter-Regular",
    color: "#666",
    lineHeight: 22,
  },
  detailRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  detailContent: { marginLeft: 12, flex: 1 },
  detailLabel: {
    fontSize: 12,
    fontFamily: "Inter-Regular",
    color: "#999",
    marginBottom: 4,
  },
  detailValue: { fontSize: 14, fontFamily: "Inter-Medium", color: "#000" },
  ticketRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  ticketInfo: { flex: 1 },
  ticketType: {
    fontSize: 14,
    fontFamily: "Inter-Regular",
    color: "#666",
    marginBottom: 4,
  },
  ticketPrice: { fontSize: 16, fontFamily: "Inter-Bold", color: "#000" },
  ticketRight: { alignItems: "flex-end" },
  ticketLabel: {
    fontSize: 12,
    fontFamily: "Inter-Regular",
    color: "#999",
    marginBottom: 4,
  },
  ticketStatus: { fontSize: 14, fontFamily: "Inter-SemiBold", color: "#00C853" },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    gap: 12,
  },
  addToWishlistButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#FF6B00",
    alignItems: "center",
    justifyContent: "center",
  },
  addToWishlistText: {
    fontSize: 14,
    fontFamily: "Inter-SemiBold",
    color: "#FF6B00",
  },
  bookButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#FF6B00",
    alignItems: "center",
    justifyContent: "center",
  },
  bookButtonText: {
    fontSize: 14,
    fontFamily: "Inter-SemiBold",
    color: "#FFF",
  },
});
