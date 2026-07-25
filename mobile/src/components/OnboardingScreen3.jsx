import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 🧠 Thêm import

export default function OnboardingScreen({ navigation }) {
  const handleGetStarted = async () => {
    try {
      // 🔹 Lưu biến tutorialTKB = true lên local
      await AsyncStorage.setItem('tutorialTKB', 'true');
      console.log('✅ Đã lưu tutorialTKB: true');
      // 👉 Ở đây bạn có thể chuyển sang màn hình tiếp theo, ví dụ:
       navigation.replace('Login');
    } catch (error) {
      console.error('❌ Lỗi khi lưu tutorialTKB:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.emoji}>📱</Text>
        </View>

        <Text style={styles.title}>Chào mừng đến với EventPulse!</Text>

        <Text style={styles.description}>
          Chúng tôi sẽ giúp bạn khám phá các sự kiện phù hợp nhất với sở thích của bạn,
          được cá nhân hóa bằng trí tuệ nhân tạo tiên tiến.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
          <Text style={styles.buttonText}>Bắt đầu ngay</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    width: 200,
    height: 200,
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    width: '100%',
    backgroundColor: '#ea580c',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
