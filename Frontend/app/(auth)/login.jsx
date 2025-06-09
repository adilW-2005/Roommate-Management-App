import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      return Alert.alert('Missing fields', 'Please enter email and password.');
    }

    try {
      setIsLoading(true);
      const response = await authAPI.login(email, password);

      if (response.error) {
        console.log("Error:", response.error);
        Alert.alert("Login failed", response.error || "Something went wrong.");
        return;
      }

      console.log("Login successful", response.data);
      Alert.alert("Success", "Logged in!");
      await AsyncStorage.setItem('token', response.data.access_token);
      router.replace('/(tabs)');
    } catch (error) {
      console.error("Network error:", error);
      Alert.alert("Error", "Network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            <Text style={styles.title}>Roomsync Login</Text>

            <Text>Email</Text>
            <TextInput
              value={email}
              style={styles.input}
              onChangeText={setEmail}
              placeholder="email@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text>Password</Text>
            <TextInput
              value={password}
              style={styles.input}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
            />

            <TouchableOpacity 
              style={styles.button} 
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? "Logging in..." : "Log In"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/register')}>
              <Text style={styles.buttonText}>New User? Register here</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: width * 0.8,
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    marginTop: 16,
    width: '100%',
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '500',
  },
});



