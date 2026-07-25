import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import axios from 'axios';
import API_BASE_URL from '../../config/api';
import { Mail } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const handleReset = async () => {
    // Validate email
    if (!email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email của bạn');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/forgot-password`, {
        email: email.trim(),
      });

      if (response.data) {
        console.log('✅ Gửi email thành công:', email);
        Alert.alert(
          'Thành công',
          'Đã gửi liên kết đặt lại mật khẩu tới email của bạn. Vui lòng kiểm tra hòm thư của bạn.',
          [
            {
              text: 'OK',
              onPress: () => navigation.replace('Login')
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Lỗi gửi email:', error);
      let errorMessage = 'Đã xảy ra lỗi. Vui lòng thử lại.';
      
      if (error.response) {
        // Server responded with error
        if (error.response.status === 404) {
          errorMessage = 'Không tìm thấy người dùng với email này.';
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
      }
      
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <Text style={styles.title}>Quên Mật Khẩu</Text>
        <Text style={styles.subtitle}>
          Vui lòng nhập địa chỉ email của bạn để nhận liên kết đặt lại mật khẩu.
        </Text>

        <View style={styles.inputContainer}>
          <Mail color="#6B7280" size={20} strokeWidth={2} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="email@example.com"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleReset}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Gửi Liên Kết Đặt Lại</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.replace("Login")}
        >
          <Text style={styles.backLinkText}>Quay Lại Đăng Nhập</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  content: {
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    height: 52,
    paddingHorizontal: 16,
    marginBottom: 20,
    width: "100%",
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  button: {
    backgroundColor: "#D97706",
    borderRadius: 8,
    width: "100%",
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#FCA5A5',
    opacity: 0.7,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  backLink: {
    marginTop: 8,
  },
  backLinkText: {
    color: "#D97706",
    fontSize: 14,
    fontWeight: "600",
  },
});
