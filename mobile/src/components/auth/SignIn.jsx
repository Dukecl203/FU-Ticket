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
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import { Calendar, Lock, Mail, Eye, EyeOff } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);


  const handleLogin = async () => {
    // Validate inputs
    if (!email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return;
    }
    if (!password) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        email: email.trim(),
        password,
      });

      if (response.data && response.data.accessToken) {
        // Save user data and token to AsyncStorage
        await AsyncStorage.setItem('userToken', response.data.accessToken);
        await AsyncStorage.setItem('userId', response.data.user.id);
        await AsyncStorage.setItem('userEmail', response.data.user.email);
        await AsyncStorage.setItem('userName', response.data.user.full_name);
        await AsyncStorage.setItem('userRole', response.data.user.role);
        
        console.log('✅ Đăng nhập thành công:', response.data.user.email);
        Alert.alert('Thành công', 'Đăng nhập thành công!', [
          { text: 'OK', onPress: () => navigation.replace('MainTabs') }
        ]);
      }
    } catch (error) {
      console.error('❌ Lỗi đăng nhập:', error);
      let errorMessage = 'Đã xảy ra lỗi. Vui lòng thử lại.';
      
      if (error.response) {
        // Server responded with error
        if (error.response.status === 401) {
          errorMessage = 'Email hoặc mật khẩu không đúng.';
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
      }
      
      Alert.alert('Lỗi đăng nhập', errorMessage);
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

          <Text style={styles.title}>Đăng nhập</Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Mail
                color="#6B7280"
                size={20}
                strokeWidth={2}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email hoặc Tên người dùng"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock
                color="#6B7280"
                size={20}
                strokeWidth={2}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Mật khẩu"
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

            <TouchableOpacity style={styles.forgotPassword} onPress={() => navigation.navigate("ForgotPassword")}>
              <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]} 
              onPress={handleLogin}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginButtonText}>Đăng nhập</Text>
              )}
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Chưa có tài khoản? </Text>
              <TouchableOpacity onPress={()=>navigation.replace('Register')}>
                <Text style={styles.signupLink}>Đăng ký ngay</Text>
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    fontSize: 24,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#D97706',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#D97706',
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonDisabled: {
    backgroundColor: '#FCA5A5',
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signupLink: {
    fontSize: 14,
    color: '#D97706',
    fontWeight: '600',
  },
});
