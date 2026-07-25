import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { ChevronLeft, Plus, Minus, ChevronDown } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Linking } from "react-native";

export default function TicketPurchase({ route, navigation }) {
  const { eventId } = route.params;
  const [tickets, setTickets] = useState([]);
  const [discounts, setDiscounts] = useState([]); // danh sách mã
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleMomoPayment = async () => {
    const total = calculateTotal();
    if (total === 0) {
      Alert.alert("Lỗi", "Vui lòng chọn ít nhất 1 vé để thanh toán.");
      return;
    }

    if (!userId) {
      Alert.alert("Lỗi", "Không tìm thấy thông tin người dùng.");
      return;
    }

    // Chuẩn bị dữ liệu gửi lên backend
    const selectedTickets = tickets
      .filter((t) => t.quantity > 0)
      .map((t) => ({
        id: t.id,
        name: t.name,
        price: t.price,
        quantity: t.quantity,
      }));

    const payload = {
      amount: total,
      event: eventId,
      discount: selectedDiscount,
      selected: selectedTickets,
      userId,
    };

    try {
      setLoading(true);

      const response = await axios.post(
        "https://ticketfu.vercel.app/api/payment",
        payload
      );

      const data = response.data;

      if (data?.payUrl) {
        // ✅ Điều hướng người dùng đến trang thanh toán MoMo
        Alert.alert("Đang chuyển đến MoMo...");
        setTimeout(() => {
          Linking.openURL(data.payUrl);
        }, 800);
      } else {
        console.error("❌ Không có payUrl:", data);
        Alert.alert("Lỗi", "Không thể tạo thanh toán MoMo.");
      }
    } catch (error) {
      console.error(
        "❌ Lỗi thanh toán:",
        error.response?.data || error.message
      );
      Alert.alert("Lỗi", "Không thể kết nối đến hệ thống thanh toán.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem("userId").then((id) => {
      if (id) setUserId(id);
    });
  }, []);
  // 🔄 Lấy dữ liệu vé từ API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketRes, discountRes] = await Promise.all([
          fetch(`https://ticketfu.vercel.app/api/binh/tickets/${eventId}`),
          fetch(`https://ticketfu.vercel.app/api/users/discounts/${eventId}`),
        ]);

        const ticketData = await ticketRes.json();
        const discountData = await discountRes.json();

        // Vé
        if (ticketData.success && ticketData.data.length > 0) {
          const formattedTickets = ticketData.data.map((item) => ({
            id: item.id,
            name: item.name,
            price: parseInt(item.price.replace(/\D/g, "")),
            description: item.description,
            quantity_total: item.quantity_total,
            quantity_sold: item.quantity_sold,
            quantity: 0,
          }));
          setTickets(formattedTickets);
        }

        // Mã giảm giá
        if (discountData.success && discountData.data) {
          setDiscounts(discountData.data);
        }
      } catch (err) {
        console.error("❌ Lỗi tải dữ liệu:", err);
        Alert.alert("Không thể tải dữ liệu.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  // 🧮 Tính tổng tiền
  const calculateTotal = () => {
    const total = tickets.reduce((sum, t) => sum + t.price * t.quantity, 0);
    if (selectedDiscount)
      return total - (total * selectedDiscount.percentage) / 100;
    return total;
  };

  const formatPrice = (price) => `${price.toLocaleString("vi-VN")} ₫`;

  // 🏷️ Dùng mã giảm giá
  const applyDiscount = async (discount) => {
    if (!userId) {
      Alert.alert("Lỗi", "Không tìm thấy thông tin người dùng.");
      return;
    }

    // 🔍 Nếu người dùng đã có trong danh sách => chỉ áp dụng giảm giá
    if (discount.usedUsers.includes(userId)) {
      setSelectedDiscount(discount);
      Alert.alert(
        "✅ Đã áp dụng mã",
        `Bạn đã từng sử dụng mã này — vẫn được giảm ${discount.percentage}% cho đơn hàng này.`
      );
      return;
    }

    // ❌ Nếu mã đã hết lượt
    if (discount.usedUsers.length >= discount.maxUsers) {
      Alert.alert("Hết lượt", "Mã giảm giá này đã hết lượt sử dụng.");
      return;
    }

    // ✅ Nếu user chưa dùng => gọi PUT để cập nhật server
    try {
      await axios.put(
        `https://ticketfu.vercel.app/api/discounts/${discount.id}/use`,
        { userId }
      );

      // Cập nhật local list
      setDiscounts((prev) =>
        prev.map((d) =>
          d.id === discount.id
            ? { ...d, usedUsers: [...d.usedUsers, userId] }
            : d
        )
      );

      setSelectedDiscount(discount);
      Alert.alert(
        "✅ Áp dụng thành công",
        `Bạn được giảm ${discount.percentage}% cho đơn hàng này.`
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Lỗi", "Không thể áp dụng mã giảm giá.");
    }
  };

  const updateQuantity = (id, increment) => {
    setTickets((prev) =>
      prev.map((ticket) => {
        if (ticket.id === id) {
          const available = ticket.quantity_total - ticket.quantity_sold;
          const newQuantity = increment
            ? Math.min(ticket.quantity + 1, available)
            : Math.max(0, ticket.quantity - 1);
          return { ...ticket, quantity: newQuantity };
        }
        return ticket;
      })
    );
  };

  // 💰 Tính tổng tiền

  // 📦 Xử lý thanh toán (giả lập)
  const handleCheckout = () => {
    const total = calculateTotal();
    if (total === 0) {
      Alert.alert("Vui lòng chọn ít nhất 1 vé để thanh toán.");
      return;
    }
    Alert.alert("✅ Thanh toán thành công", `Tổng tiền: ${formatPrice(total)}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff8c42" />
        <Text style={{ marginTop: 10 }}>Đang tải vé...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mua Vé</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Chọn Loại Vé</Text>

        {tickets.map((ticket) => {
          const available = ticket.quantity_total - ticket.quantity_sold;
          return (
            <View key={ticket.id} style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <View style={styles.ticketInfo}>
                  <Text style={styles.ticketName}>{ticket.name}</Text>
                  <View style={styles.priceContainer}>
                    <Text style={styles.ticketPrice}>
                      {formatPrice(ticket.price)}
                    </Text>
                    <ChevronDown size={16} color="#666" />
                  </View>
                </View>
              </View>

              <Text style={styles.ticketDescription}>{ticket.description}</Text>
              <Text style={styles.availableText}>Còn lại: {available} vé</Text>

              <View style={styles.quantityContainer}>
                <Text style={styles.quantityLabel}>Số lượng:</Text>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(ticket.id, false)}
                  >
                    <Minus size={16} color="#666" />
                  </TouchableOpacity>
                  <Text style={styles.quantityValue}>{ticket.quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(ticket.id, true)}
                  >
                    <Plus size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {/* 🎟️ Danh sách mã giảm giá */}
        <Text style={styles.sectionTitle}>Mã Giảm Giá Khả Dụng</Text>
        {discounts.length === 0 ? (
          <Text style={{ color: "#999" }}>Không có mã giảm giá nào.</Text>
        ) : (
          discounts.map((discount) => (
            <View key={discount.id} style={styles.discountCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.discountCode}>{discount.code}</Text>
                <Text style={styles.discountDesc}>{discount.description}</Text>
                <Text style={styles.discountPercent}>
                  Giảm {discount.percentage}% • Đã dùng:{" "}
                  {discount.usedUsers.length}/{discount.maxUsers}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.useButton,
                  selectedDiscount?.id === discount.id && {
                    backgroundColor: "#ccc",
                  },
                ]}
                disabled={selectedDiscount?.id === discount.id}
                onPress={() => applyDiscount(discount)}
              >
                <Text style={styles.useButtonText}>
                  {selectedDiscount?.id === discount.id
                    ? "Đã Dùng"
                    : "Dùng Ngay"}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Tổng kết */}
        <Text style={styles.sectionTitle}>Tóm Tắt Đơn Hàng</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tổng cộng</Text>
            <Text style={styles.summaryValue}>
              {formatPrice(calculateTotal())}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleMomoPayment}
        >
          <Text style={styles.checkoutButtonText}>Tiến Hành Thanh Toán</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#000" },
  content: { flex: 1, padding: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginTop: 16,
    marginBottom: 12,
  },
  ticketCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  ticketInfo: { flex: 1 },
  ticketName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  priceContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
  ticketPrice: { fontSize: 14, color: "#666", fontWeight: "500" },
  ticketDescription: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginBottom: 6,
  },
  availableText: { fontSize: 12, color: "#ff8c42", marginBottom: 10 },
  quantityContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityLabel: { fontSize: 14, color: "#000" },
  quantityControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    minWidth: 20,
    textAlign: "center",
  },
  promoContainer: { flexDirection: "row", gap: 8, marginBottom: 16 },
  promoInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#000",
  },
  promoButton: {
    backgroundColor: "#ff8c42",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
  },
  promoButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 15, fontWeight: "600", color: "#000" },
  summaryValue: { fontSize: 15, fontWeight: "600", color: "#000" },
  checkoutButton: {
    backgroundColor: "#ff8c42",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 32,
  },
  checkoutButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  discountCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  discountCode: { fontSize: 16, fontWeight: "700", color: "#ff8c42" },
  discountDesc: { fontSize: 13, color: "#555", marginTop: 2 },
  discountPercent: { fontSize: 12, color: "#888", marginTop: 4 },
  useButton: {
    backgroundColor: "#ff8c42",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  useButtonText: { color: "#fff", fontWeight: "600" },
});
