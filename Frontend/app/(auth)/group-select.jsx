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
import { groupAPI } from '../services/api';

const notify = (title, message) => {
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
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const joinGroup = async () => {
    if (!inviteCode) {
      return Alert.alert('Missing info', 'Please enter an invite code');
    }
    
    try {
      setIsJoining(true);
      const response = await groupAPI.join(inviteCode);

      if (response.error) {
        notify('Error', response.error || 'Failed to join group');
        return;
      }

      notify('Joined group', response.data.message);
      router.replace('/(tabs)');
    } catch (err) {
      console.error(err);
      Alert.alert('Network error');
    } finally {
      setIsJoining(false);
    }
  };

  const createGroup = async () => {
    if (!groupName) {
      return Alert.alert('Missing info', 'Please enter a group name');
    }
    
    try {
      setIsCreating(true);
      const response = await groupAPI.create(groupName);

      if (response.error) {
        notify('Error', response.error || 'Failed to create group');
        return;
      }

      notify('Group Created', `Invite Code: ${response.data.invite_code}`);
      router.replace('/(tabs)');
    } catch (err) {
      console.error(err);
      Alert.alert('Network error');
    } finally {
      setIsCreating(false);
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
          <TouchableOpacity 
            style={styles.button} 
            onPress={joinGroup}
            disabled={isJoining}
          >
            <Text style={styles.buttonText}>
              {isJoining ? 'Joining...' : 'Join Group'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Or Create a Group</Text>
          <TextInput
            placeholder="Group Name"
            value={groupName}
            onChangeText={setGroupName}
            style={styles.input}
          />
          <TouchableOpacity 
            style={styles.button} 
            onPress={createGroup}
            disabled={isCreating}
          >
            <Text style={styles.buttonText}>
              {isCreating ? 'Creating...' : 'Create Group'}
            </Text>
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
