import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import { Calendar, Lock, Mail, User, Eye, EyeOff } from 'lucide-react-native';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Validate inputs
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên của bạn');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return;
    }
    if (!password) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/register`, {
        full_name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        role: 'Participant', // Default role
      });

      if (response.data && response.data.user) {
        console.log('✅ Đăng ký thành công:', response.data.user.email);
        Alert.alert(
          'Thành công', 
          'Đăng ký thành công! Vui lòng đăng nhập.',
          [
            { 
              text: 'OK', 
              onPress: () => navigation.navigate('Login') 
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Lỗi đăng ký:', error);
      let errorMessage = 'Đã xảy ra lỗi. Vui lòng thử lại.';
      
      if (error.response) {
        // Server responded with error
        if (error.response.status === 409) {
          errorMessage = 'Email đã được sử dụng. Vui lòng sử dụng email khác.';
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
      }
      
      Alert.alert('Lỗi đăng ký', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Calendar color="#ffffff" size={40} strokeWidth={2} />
            </View>
            <Text style={styles.logoText}>EventPulse</Text>
          </View>

          <Text style={styles.title}>Tạo tài khoản mới</Text>

          <View style={styles.form}>
            {/* Tên */}
            <View style={styles.inputContainer}>
              <User color="#6B7280" size={20} strokeWidth={2} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nhập tên của bạn"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Mail color="#6B7280" size={20} strokeWidth={2} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nhập email của bạn"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Mật khẩu */}
            <View style={styles.inputContainer}>
              <Lock color="#6B7280" size={20} strokeWidth={2} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Nhập mật khẩu của bạn"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}>
                {showPassword ? (
                  <EyeOff color="#6B7280" size={20} strokeWidth={2} />
                ) : (
                  <Eye color="#6B7280" size={20} strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>

            {/* Xác nhận mật khẩu */}
            <View style={styles.inputContainer}>
              <Lock color="#6B7280" size={20} strokeWidth={2} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Nhập lại mật khẩu của bạn"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}>
                {showConfirmPassword ? (
                  <EyeOff color="#6B7280" size={20} strokeWidth={2} />
                ) : (
                  <Eye color="#6B7280" size={20} strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>

            {/* Nút đăng ký */}
            <TouchableOpacity 
              style={[styles.registerButton, loading && styles.registerButtonDisabled]} 
              onPress={handleRegister}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.registerButtonText}>Đăng ký</Text>
              )}
            </TouchableOpacity>

            {/* Chuyển sang đăng nhập */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => navigation?.navigate('Login')}>
                <Text style={styles.loginLink}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5E7EB',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 72,
    height: 72,
    backgroundColor: '#D97706',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#D97706',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 24,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  registerButton: {
    backgroundColor: '#D97706',
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  registerButtonDisabled: {
    backgroundColor: '#FCA5A5',
    opacity: 0.7,
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginLink: {
    fontSize: 14,
    color: '#D97706',
    fontWeight: '600',
  },
});
