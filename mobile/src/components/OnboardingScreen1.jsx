import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ScrollView } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen1({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={styles.content}>
        <Image
          source={{ uri: 'https://images.pexels.com/photos/6853596/pexels-photo-6853596.jpeg' }}
          style={styles.image}
          resizeMode="cover"
        />

        <View style={styles.textContainer}>
          <Text style={styles.title}>Khám Phá Thế Giới Sự Kiện</Text>
          <Text style={styles.description}>
            EventPulse giúp bạn tìm kiếm, đăng ký và trải nghiệm các sự kiện tuyệt vời nhất xung quanh bạn. 
            Từ âm nhạc, hội thảo đến thể thao, mọi thứ đều nằm trong tầm tay.
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => navigation.navigate("Onboarding2")}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Tiếp tục</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    alignItems: 'center',
    paddingTop: height * 0.08,
    paddingHorizontal: 20,
  },
  image: {
    width: width * 0.9,
    height: height * 0.35, // Giữ ảnh cân đối cho mọi tỷ lệ màn hình
    borderRadius: 10,
    marginBottom: 32,
  },
  textContainer: {
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666666',
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: "auto",
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  continueButton: {
    backgroundColor: '#D97706',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#D97706',
  },
});
