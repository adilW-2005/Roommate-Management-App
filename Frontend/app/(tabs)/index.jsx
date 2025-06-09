import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import * as Notifications from 'expo-notifications';
import { authAPI, groupAPI, expenseAPI, calendarAPI } from '../services/api';

import logo from '../assets/logo.png';

const screenWidth = Dimensions.get('window').width;

function FeatureCard({ title, value, subtitle, icon, color, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.card, { flex: 1 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="#000" />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      {value && <Text style={styles.cardValue}>${value}</Text>}
      {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
      <Ionicons
        name="chevron-forward"
        size={20}
        color="#C7C7CC"
        style={styles.cardArrow}
      />
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const [user, setUser] = useState({});
  const [groupData, setGroupData] = useState({});
  const [events, setEvents] = useState([]);
  const [expenses, setExpenses] = useState(null);
  const [pushToken, setPushToken] = useState(null);

  const scrollRef = useRef(null);

  let [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get user profile
        const profileResponse = await authAPI.getProfile();
        if (profileResponse.error) {
          Alert.alert('Error', 'Failed to fetch user profile');
          return;
        }
        const me = profileResponse.data;
        setUser(me);

        // Get group data
        const groupResponse = await groupAPI.getUsers(me.group_id);
        if (groupResponse.error) {
          Alert.alert('Error', 'Failed to fetch group data');
          return;
        }
        setGroupData(groupResponse.data);

        // Get events
        const eventResponse = await calendarAPI.getGroupEvents(me.group_id);
        if (eventResponse.error) {
          console.error('Failed to fetch events:', eventResponse.error);
        } else {
          setEvents(eventResponse.data);
        }

        // Get expenses
        const expenseResponse = await expenseAPI.getUserExpenses();
        if (expenseResponse.error) {
          console.error('Failed to fetch expenses:', expenseResponse.error);
        } else {
          setExpenses(expenseResponse.data);
        }
      } catch (err) {
        console.error(err);
        Alert.alert('Error loading dashboard');
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    router.replace('/(auth)/login');
    Alert.alert('Logged out');
  };

  const roommates = groupData?.chores || [];
  const nextChore = groupData?.chores?.find((c) => c.user_id === user.id && !c.completed);
  const nextEvent = events?.find((e) => new Date(e.date) > new Date());
  const youOwe = expenses?.total_i_owe || 0;
  const owedToYou = expenses?.total_others_owe_me || 0;

  async function sendRemoteTest() {
    const msg = {
      to: 'ExponentPushToken[h9toIUBPFHysy4E61E1-p1]',
      sound: 'default',
      title: 'Remote Test',
      body: 'Remote notification received!',
      data: { test: true },
    };
  
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      });
      const json = await res.json();
      console.log('Push API response:', json);
    } catch (err) {
      console.error('Error sending push:', err);
    }
  }
  
  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <LinearGradient colors={['#E6F2FD', '#F2F2F7']} style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.profileButton}>
          <Ionicons name="person-circle-outline" size={32} color="#000" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.pillsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity style={[styles.pill, { backgroundColor: '#DCEEFB' }]} onPress={() => router.push('/expenses/expenses')}>
              <Ionicons name="wallet-outline" size={16} color="#007AFF" />
              <Text style={styles.pillText}>Expenses</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pill, { backgroundColor: '#FCEEDB' }]} onPress={() => router.push('/getData')}>
              <Ionicons name="checkmark-outline" size={16} color="#EF6C00" />
              <Text style={styles.pillText}>Chores</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pill, { backgroundColor: '#E6F4EA' }]} onPress={() => router.push('/inventory/inventory')}>
              <Ionicons name="cube-outline" size={16} color="#2E7D32" />
              <Text style={styles.pillText}>Inventory</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <Text style={styles.sectionLabel}>Roommates</Text>
        <ScrollView horizontal pagingEnabled snapToInterval={screenWidth - 32} decelerationRate="fast" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roommatesScroll}>
          {roommates.slice(0, 4).map((roommate) => (
            <TouchableOpacity key={roommate.id} onPress={() => router.push(`/roommates/${roommate.id}`)} style={[styles.balanceCard, { width: screenWidth - 32 }]} activeOpacity={0.85}>
              <View style={styles.roommateIconContainer}>
                <Ionicons name="person" size={24} color="#2563EB" />
              </View>
              <Text style={styles.balanceAmount}>{roommate.name}</Text>
              <Text style={styles.actionButtons}>{roommate.status || 'Available'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.gridContainer}>
          <FeatureCard title="Expenses" value={youOwe} subtitle={`Owed to You: $${owedToYou}`} icon="cash-outline" color="#E8F5E9" onPress={() => router.push('/expenses/expenses')} />
          <FeatureCard title="Chores" subtitle={`Next: ${nextChore?.title || 'None'}`} icon="checkmark-circle-outline" color="#E3F2FD" onPress={() => router.push('/getData')} />
        </View>
        <View style={styles.gridContainer}>
          <FeatureCard title="Calendar" subtitle={`Next: ${nextEvent?.title || 'None'}`} icon="calendar-outline" color="#F3E5F5" onPress={() => router.push('/calendar/calendar')} />
          <FeatureCard title="Inventory" subtitle="View Items" icon="cube-outline" color="#FFF3E0" onPress={() => router.push('/inventory')} />
        </View>
        <TouchableOpacity
          style={styles.testButton}
          onPressIn={sendRemoteTest}
        >
          <Ionicons name="notifications-outline" size={20} color="#fff" />
          <Text style={styles.testButtonText}>Send Test Notification</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,   // new
    paddingBottom: 0, // new (replaces vertical: 0)
  },
  
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  logo: {
    width: 180,
    height: 180,
  },
  profileButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  pillsContainer: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    marginRight: 10,
    elevation: 2,
  },
  pillText: {
    fontSize: 14,
    marginLeft: 6,
    fontFamily: 'Poppins_600SemiBold',
    color: '#000',
  },
  sectionLabel: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#374151',
    marginBottom: 12,
    marginLeft: 4,
  },
  roommatesScroll: {
    paddingBottom: 24,
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    elevation: 3,
  },
  roommateIconContainer: {
    width: 44,
    height: 30,
    borderRadius: 32,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceAmount: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
    color: '#000',
    marginBottom: 8,
  },
  actionButtons: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#555',
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#000',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: '#000',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#8E8E93',
  },
  cardArrow: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    padding: 12,
    marginTop: 24,
    borderRadius: 8,
    justifyContent: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontFamily: 'Poppins_600SemiBold',
    marginLeft: 8,
    fontSize: 16,
  }
});
