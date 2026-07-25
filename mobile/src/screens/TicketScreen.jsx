import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Ticket } from "lucide-react-native";
import { DeliveryCard } from "./card/DeliveryCard";

export default function TicketScreen() {
  const [activeTab, setActiveTab] = useState("all");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Gọi API lấy userId từ local và fetch dữ liệu vé
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        // Lấy userId từ local storage
        const userId = await AsyncStorage.getItem("userId");
        if (!userId) {
          console.warn("Không tìm thấy userId trong AsyncStorage!");
          setLoading(false);
          return;
        }

        const response = await axios.get(`https://ticketfu.vercel.app/api/user/order/item/detail/${userId}`);
        const data = response.data;

        if (Array.isArray(data)) {
          setTickets(data);
        } else {
          console.warn("Dữ liệu không hợp lệ:", data);
        }
      } catch (error) {
        console.error("Lỗi khi gọi API:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  // ✅ Hàm lọc vé theo trạng thái
  const filteredTickets = tickets.filter((item) => {
    if (activeTab === "all") return true;
    if (activeTab === "scanned") return item.status === "Scanned";
    if (activeTab === "pending") return item.status === "Pending" || item.status === "Waiting";
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vé của tôi</Text>
        <TouchableOpacity>
          <Ticket size={24} color="#FF6B00" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "all" && styles.activeTab]}
          onPress={() => setActiveTab("all")}
        >
          <Text style={[styles.tabText, activeTab === "all" && styles.activeTabText]}>
            Tất cả ({tickets.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "scanned" && styles.activeTab]}
          onPress={() => setActiveTab("scanned")}
        >
          <Text style={[styles.tabText, activeTab === "scanned" && styles.activeTabText]}>
            Đã quét (
            {tickets.filter((t) => t.status === "Scanned").length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "pending" && styles.activeTab]}
          onPress={() => setActiveTab("pending")}
        >
          <Text style={[styles.tabText, activeTab === "pending" && styles.activeTabText]}>
            Chờ xử lý (
            {tickets.filter((t) => t.status !== "Scanned").length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Nội dung */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text>Đang tải vé...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {filteredTickets.length === 0 ? (
            <Text style={{ textAlign: "center", marginTop: 50, color: "#888" }}>
              Không có vé nào.
            </Text>
          ) : (
            filteredTickets.map((ticket) => (
              <DeliveryCard
                key={ticket._id}
                delivery={{
                  id: ticket._id,
                  eventId: ticket.product_id?.event_id?._id || "N/A",
                  title: ticket.product_id?.name || "Vé không xác định",
                  orderId: ticket.order_id?.order_id || "N/A",
                  status: ticket.status,
                  image: ticket.product_id?.image_url
                    ? `https://ticketfu.vercel.app${ticket.product_id.image_url}`
                    : null,
                  hasWarning: ticket.status === "Pending",
                  warningText:
                    ticket.status === "Pending"
                      ? "Vé đang chờ xử lý, vui lòng quay lại sau."
                      : null,
                }}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingBottom: 75,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000000",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  activeTab: {
    backgroundColor: "#FFF4ED",
  },
  tabText: {
    fontSize: 14,
    color: "#666666",
  },
  activeTabText: {
    color: "#FF6B00",
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 12,
  },
});
