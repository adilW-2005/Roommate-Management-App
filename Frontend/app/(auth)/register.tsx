import React from 'react';
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
  Platform
} from 'react-native';
import { useState } from 'react';
import { router, Router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function RegisterScreen() {

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleRegsister = async () => {
    try{
      const response = await fetch("http://127.0.0.1:5001/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });
  
      const data = await response.json();
  
      if (response.ok) {
        console.log("Registration successful", data);
        Alert.alert("Success", "Registered successfully!");
        await AsyncStorage.setItem('token', data.access_token);
        router.replace('/group-select')
      } else {
        console.log("Error:", data);
        Alert.alert("Registration failed", data.error || "Something went wrong.");
      }
    } catch (error) {
      console.error("Network error:", error);
      Alert.alert("Error", "Network error occurred.");
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
            <Text style={styles.title}>Roomsync Register</Text>

      <Text>Name</Text>
      <TextInput
        value={name}
        style = {styles.input}
        onChangeText={setName}
        placeholder="name"
        autoCapitalize="none"
      />

      <Text>Email</Text>
      <TextInput
        value={email}
        style = {styles.input}
        onChangeText={setEmail}
        placeholder="email@example.com"
        autoCapitalize="none"
      />

    <Text>Password</Text>
    <TextInput
    
      value={password}
      style = {styles.input}
      onChangeText={setPassword}
      placeholder="Enter your password"
      secureTextEntry
      />

    <TouchableOpacity style={styles.button} onPress={handleRegsister}>
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>

        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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