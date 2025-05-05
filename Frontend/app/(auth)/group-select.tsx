import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const notify = (title: string, message?: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}${message ? `: ${message}` : ''}`);
    } else {
      Alert.alert(title, message);
    }
  };
  

const { width } = Dimensions.get('window');

export default function GroupSelectScreen() {
  const [inviteCode, setInviteCode] = useState('');
  const [groupName, setGroupName] = useState('');

  const joinGroup = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return Alert.alert('Not logged in');

    try {
      const res = await fetch('http://127.0.0.1:5001/groups/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invite_code: inviteCode }),
      });

      const data = await res.json();

      if (res.ok) {
        notify('Joined group', data.message);
        console.log(data)
        router.replace('/(tabs)');
      } else {
        notify('Error', data.error || 'Failed to join group');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Network error');
    }
  };

  const createGroup = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return Alert.alert('Not logged in');

    try {
      const res = await fetch('http://192.168.1.8:5001/groups/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: groupName }),
      });

      const data = await res.json();

      if (res.ok) {
        notify('Group Created', `Invite Code: ${data.invite_code}`);
        console.log(data)
        router.replace('/(tabs)');
      } else {
        notify('Error', data.error || 'Failed to create group');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Network error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.inner}>
          <Text style={styles.title}>Select Group</Text>

          <Text style={styles.label}>Join a Group</Text>
          <TextInput
            placeholder="Enter Invite Code"
            value={inviteCode}
            onChangeText={setInviteCode}
            style={styles.input}
          />
          <TouchableOpacity style={styles.button} onPress={joinGroup}>
            <Text style={styles.buttonText}>Join Group</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Or Create a Group</Text>
          <TextInput
            placeholder="Group Name"
            value={groupName}
            onChangeText={setGroupName}
            style={styles.input}
          />
          <TouchableOpacity style={styles.button} onPress={createGroup}>
            <Text style={styles.buttonText}>Create Group</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    width: width * 0.9,
    alignSelf: 'center',
    gap: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    alignSelf: 'flex-start',
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
    width: '100%',
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '500',
  },
});
