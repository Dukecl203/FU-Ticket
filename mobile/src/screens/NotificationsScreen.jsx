
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import {
  Calendar,
  Ticket,
  RefreshCw,
  Bell,
  Gift,
  Mail,
} from "lucide-react-native";

/* ==============================
   🧩 NotificationTabs Component
   ============================== */
const NotificationTabs = ({ activeTab, onTabChange, unreadCount }) => {
  const tabs = [
    { key: "all", label: "Tất cả" },
    { key: "unread", label: "Sự kiện" },
    { key: "promotions", label: "Khuyến mãi" },
    { key: "help", label: "Hỗ trợ" },
  ];

  return (
    <View style={styles.tabsContainer}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.activeTab]}
          onPress={() => onTabChange(tab.key)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText,
            ]}
          >
            {tab.label}
          </Text>
          {tab.key === "unread" && unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

/* ==============================
   🧩 NotificationItem Component
   ============================== */
const iconMap = {
  calendar: Calendar,
  ticket: Ticket,
  "refresh-cw": RefreshCw,
  bell: Bell,
  gift: Gift,
  mail: Mail,
};

const NotificationItem = ({ notification, onPress }) => {
  const IconComponent = iconMap[notification.icon];

  return (
    <TouchableOpacity
      style={[styles.itemContainer, !notification.isRead && styles.unreadItem]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: `${notification.iconColor}15` },
        ]}
      >
        <IconComponent size={20} color={notification.iconColor} />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {notification.title}
          </Text>
          <Text style={styles.time}>{notification.time}</Text>
        </View>
        <Text style={styles.description} numberOfLines={3}>
          {notification.description}
        </Text>
      </View>

      {!notification.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

/* ==============================
   🧩 NotificationsScreen Main
   ============================== */
export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState("all");

  const [notifications, setNotifications] = useState([
    {
      id: "1",
      type: "new_arrival",
      title: "Sự kiện mới: Lễ hội Âm nhạc Mùa hè",
      description:
        "Sự kiện Lễ hội Âm nhạc Mùa hè tại Công viên Thống Nhất. Đừng bỏ lỡ cơ hội này!",
      time: "1 phút trước",
      isRead: false,
      icon: "calendar",
      iconColor: "#FF6B35",
    },
    {
      id: "2",
      type: "promo",
      title: "Ưu đãi độc quyền! Giảm 20% cho đơn từ 500k",
      description:
        "Giảm giá 20% khi mua vé tham dự Lễ hội Âm nhạc Mùa hè tháng này. Sử dụng mã EARLYBIRD.",
      time: "30 phút trước",
      isRead: false,
      icon: "ticket",
      iconColor: "#FF6B35",
    },
    {
      id: "3",
      type: "stock_update",
      title: "Cập nhật hệ thống: Cải thiện hiệu suất",
      description:
        "Chúng tôi vừa triển khai bản cập nhật mới giúp tốc độ nhanh hơn. Vui lòng khởi động lại ứng dụng.",
      time: "1 giờ trước",
      isRead: false,
      icon: "refresh-cw",
      iconColor: "#4CAF50",
    },
    {
      id: "4",
      type: "reminder",
      title: "Lời nhắc: Hội thảo Phát triển kỹ năng",
      description:
        "Hãy tham gia hội thảo ngày 15/12 với các diễn giả tài năng. Đăng ký ngay để giữ chỗ!",
      time: "Hôm qua",
      isRead: true,
      icon: "bell",
      iconColor: "#2196F3",
    },
    {
      id: "5",
      type: "order",
      title: "Quà tặng đặc biệt dành cho bạn",
      description:
        "Nhân dịp lễ, chúng tôi tặng bạn mã giảm 15% cho lần mua vé tiếp theo.",
      time: "2 ngày trước",
      isRead: true,
      icon: "gift",
      iconColor: "#FF6B35",
    },
    {
      id: "6",
      type: "email_confirm",
      title: "Xác minh email của bạn",
      description: "Email của bạn đã được xác minh thành công!",
      time: "3 ngày trước",
      isRead: true,
      icon: "mail",
      iconColor: "#9C27B0",
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !n.isRead;
    if (activeTab === "promotions") return n.type === "promo";
    if (activeTab === "help") return n.type === "reminder";
    return true;
  });

  const handleNotificationPress = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerMain}>
        <Text style={styles.headerTitle}>Thông báo</Text>
        {/* <TouchableOpacity style={styles.iconButton}>
          <Bell size={24} color="#1a1a1a" />
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity> */}
      </View>

      {/* Tabs */}
      <NotificationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadCount={unreadCount}
      />

      {/* List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={() => handleNotificationPress(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Không có thông báo nào</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

/* ==============================
   🎨 Styles
   ============================== */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  headerMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  iconButton: {
    padding: 8,
    position: "relative",
  },
  headerBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#FF6B35",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  headerBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  listContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  /* Tabs */
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    flexDirection: "row",
  },
  activeTab: {
    borderBottomColor: "#FF6B35",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#FF6B35",
    fontWeight: "600",
  },
  badge: {
    backgroundColor: "#FF6B35",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  /* Item */
  itemContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    alignItems: "flex-start",
  },
  unreadItem: {
    backgroundColor: "#fef7f5",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
    marginRight: 8,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    color: "#999",
  },
  description: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B35",
    marginTop: 6,
  },
});
