import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert 
} from 'react-native';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const categories = [
  { id: 1, name: 'Âm nhạc', key: 'Music', color: '#4A148C' },
  { id: 2, name: 'Công nghệ', key: 'Technology', color: '#00695C' },
  { id: 3, name: 'Nghệ thuật', key: 'Workshop', color: '#F57F17' },
  { id: 4, name: 'Thể thao', key: 'Sports', color: '#1B5E20' },
  { id: 5, name: 'Nghề Nghiệp', key: 'Career', color: '#BF360C' },
  { id: 6, name: 'Giáo dục', key: 'Academic', color: '#4E342E' },
];

export default function OnboardingScreen({ navigation }) {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const router = useRouter();

  const toggleCategory = (categoryId) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  const handleContinue = async () => {
    if (selectedCategories.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một danh mục');
      return;
    }

    const firstSelected = categories.find(
      c => c.id === selectedCategories[0]
    );

    if (firstSelected) {
      try {
        await AsyncStorage.setItem('suggest', firstSelected.key);
        console.log('✅ Saved suggest:', firstSelected.key);
      } catch (err) {
        console.error('❌ Lỗi lưu AsyncStorage:', err);
      }
    }

    navigation.navigate("Onboarding3");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.divider} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Bạn thích gì?</Text>
        <Text style={styles.subtitle}>
          Chọn một hoặc nhiều danh mục sự kiện để cá{'\n'}nhân hóa gợi ý.
        </Text>

        <View style={styles.grid}>
          {categories.map((category, index) => {
            const isSelected = selectedCategories.includes(category.id);
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.card,
                  { backgroundColor: category.color },
                  isSelected && styles.cardSelected
                ]}
                onPress={() => toggleCategory(category.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.cardText}>{category.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            selectedCategories.length === 0 && { opacity: 0.5 }
          ]}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Tiếp tục</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingTop: 60, alignItems: 'center' },
  divider: { width: 60, height: 4, backgroundColor: '#333', borderRadius: 2 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48%',
    height: 140,
    borderRadius: 16,
    marginBottom: 15,
    justifyContent: 'flex-end',
    padding: 16,
  },
  cardSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  footer: { paddingHorizontal: 20, paddingBottom: 40 },
  continueButton: {
    backgroundColor: '#fa7013',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  continueButtonText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
});
