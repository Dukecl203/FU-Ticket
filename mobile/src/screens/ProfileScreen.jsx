import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Bell, ChevronDown, Edit2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    avatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png', // ảnh mặc định
  });

  // 🔹 Lấy dữ liệu user từ AsyncStorage
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const name = await AsyncStorage.getItem('userName');
        const email = await AsyncStorage.getItem('userEmail');
        const avatar = await AsyncStorage.getItem('userAvatar'); // nếu bạn có lưu ảnh
        setUserData({
          name: name || 'Người dùng',
          email: email || 'example@gmail.com',
          avatar: avatar || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
        });
      } catch (e) {
        console.log('❌ Lỗi khi lấy dữ liệu user:', e);
      }
    };
    fetchUserData();
  }, []);

  // 🔹 Hàm đăng xuất
  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.multiRemove([
              'userToken',
              'userId',
              'userEmail',
              'userName',
              'userRole',
              'userAvatar',
            ]);
            navigation.replace('Login');
          } catch (e) {
            Alert.alert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hồ sơ cá nhân</Text>
        <TouchableOpacity style={styles.bellButton}>
          <Bell size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Image
            source={{ uri: userData.avatar }}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{userData.name}</Text>
            <Text style={styles.email}>{userData.email}</Text>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Edit2 size={20} color="#FF6B35" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('OMainTabs')}>
          <Text style={styles.menuText}>Sự kiện của tôi</Text>
          <ChevronDown size={20} color="#6B7280" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  bellButton: { padding: 8 },
  profileCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E5E7EB' },
  profileInfo: { flex: 1, marginLeft: 12 },
  name: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  email: { fontSize: 14, color: '#6B7280' },
  editButton: { padding: 8 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  menuText: { fontSize: 16, color: '#1F2937', fontWeight: '500' },
  logoutButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
