import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Check, Zap } from "lucide-react-native";
import { useRoute } from "@react-navigation/native";
import axios from "axios";
import { CameraView, useCameraPermissions } from "expo-camera";

export default function OEventDetail() {
  const [checkins, setCheckins] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const route = useRoute();
  const { eventId } = route.params || {};

  // ✅ Dữ liệu mô phỏng
  useEffect(() => {
    setCheckins([
      {
        id: "1",
        user_name: "Nguyễn Văn A",
        user_avatar: "https://randomuser.me/api/portraits/men/32.jpg",
        checked_in_at: "2025-11-05T14:30:00",
      },
    ]);
  }, []);

  // ✅ Xin quyền khi bắt đầu quét
  useEffect(() => {
    if (scanning && !permission?.granted) {
      requestPermission();
    }
  }, [scanning]);

  const formatTime = (ts) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  const renderCheckInItem = ({ item }) => (
    <View style={styles.checkInItem}>
      <Image source={{ uri: item.user_avatar }} style={styles.avatar} />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.user_name}</Text>
        <Text style={styles.time}>{formatTime(item.checked_in_at)}</Text>
      </View>
      <View style={styles.checkIcon}>
        <Check size={18} color="#FF6B35" strokeWidth={3} />
      </View>
    </View>
  );

  const handleScanPress = async () => {
    if (!permission?.granted) await requestPermission();
    setScanned(false);
    setScanning(true);
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setScanning(false);

    try {
      const params = new URLSearchParams(data.replace(/\s/g, ""));
      const itemId = params.get("Item");
      const orderEventId = params.get("Order");

      if (!itemId || !orderEventId)
        return Alert.alert("Lỗi", "Mã QR không hợp lệ!");

      if (orderEventId !== eventId)
        return Alert.alert("Sai sự kiện", "Vé này không thuộc sự kiện hiện tại!");

      const res = await axios.get(
        `https://ticketfu.vercel.app/api/order/item/detail/${itemId}`
      );
      const ticket = res.data;

      if (!ticket) return Alert.alert("Lỗi", "Không tìm thấy vé này!");
      if (ticket.status === "Scanned")
        return Alert.alert("Vé đã quét", "Vé này đã được sử dụng!");

      Alert.alert(
        "Xác nhận Check-in",
        `Xác nhận check-in cho vé của ${ticket.user_name || "người dùng"}?`,
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Đồng ý",
            onPress: async () => {
              await axios.put(
                `https://ticketfu.vercel.app/api/order/item/detail/${ticket._id}`,
                { status: "Scanned" }
              );

              setCheckins((prev) => [
                {
                  id: ticket._id,
                  user_name: ticket.user_name || "Khách tham dự",
                  user_avatar:
                    ticket.user_avatar ||
                    "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                  checked_in_at: new Date().toISOString(),
                },
                ...prev,
              ]);

              Alert.alert("✅ Thành công", "Check-in thành công!");
            },
          },
        ]
      );
    } catch (err) {
      console.error(err);
      Alert.alert("Lỗi", "Không thể xử lý mã QR này.");
    } finally {
      setTimeout(() => setScanned(false), 2000);
    }
  };

  // ✅ Giao diện quét QR
  if (scanning) {
    if (!permission?.granted) {
      return (
        <View style={styles.permissionContainer}>
          <Text>Đang xin quyền truy cập camera...</Text>
        </View>
      );
    }

    return (
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={handleBarCodeScanned}
      >
        <View style={styles.cameraOverlay}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setScanning(false)}
          >
            <Text style={{ color: "#FFF", fontSize: 16 }}>Hủy quét</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    );
  }

  // ✅ Giao diện chính
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Check-in</Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.heroCard}
        onPress={handleScanPress}
      >
        <Image
          source={{
            uri: "https://images.pexels.com/photos/699122/pexels-photo-699122.jpeg?auto=compress&cs=tinysrgb&w=800",
          }}
          style={styles.heroImage}
        />
        <View style={styles.heroOverlay}>
          <Text style={styles.heroText}>Quét mã QR để Check-in</Text>
        </View>
        <View style={styles.boltIcon}>
          <Zap size={18} color="#FFF" fill="#FFF" />
        </View>
      </TouchableOpacity>

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Người tham dự đã Check-in</Text>
        <FlatList
          data={checkins}
          renderItem={renderCheckInItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F7F7" },
  header: { paddingTop: 60, paddingBottom: 16, backgroundColor: "#FFF" },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    color: "#1A1A1A",
  },
  heroCard: {
    margin: 16,
    borderRadius: 16,
    overflow: "hidden",
    height: 180,
    position: "relative",
  },
  heroImage: { width: "100%", height: "100%" },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    padding: 12,
  },
  heroText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
    backgroundColor: "rgba(0,0,0,0.6)",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  boltIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    flex: 1,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  listContent: { paddingBottom: 20 },
  checkInItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: "600", color: "#1A1A1A" },
  time: { fontSize: 13, color: "#888" },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
