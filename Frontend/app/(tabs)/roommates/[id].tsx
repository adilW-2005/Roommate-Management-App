
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { Ionicons } from '@expo/vector-icons';

function StatCard({ title, value, icon, color }) {
  return (
    <View style={[styles.statCard, { backgroundColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={20} color="#374151" />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>${value.toFixed(2)}</Text>
    </View>
  );
}

function SectionHeader({ icon, title, color, backgroundColor }) {
  return (
    <View style={[styles.sectionHeader, { backgroundColor }]}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
    </View>
  );
}

export default function RoommateSummaryScreen() {
  const { id } = useLocalSearchParams();
  const [roommate, setRoommate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [expenseSummary, setExpenseSummary] = useState({
    paid: 0,
    owes: 0,
    owed_by: 0,
  });

  let [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    // ... keep existing code (fetchRoommate function and API calls)
    const fetchRoommate = async () => {
        try {
          const token = await AsyncStorage.getItem('token');
          const meRes = await fetch('http://192.168.1.20:5001/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const me = await meRes.json();
  
          const groupRes = await fetch(
            `http://192.168.1.20:5001/groups/${me.group_id}/users`
          );
          const groupData = await groupRes.json();
          const target = groupData.chores.find(
            (u) => String(u.id) === String(id)
          );
          setRoommate(target);
  
          const allExpensesRes = await fetch(
            `http://192.168.1.20:5001/expenses/history/${me.group_id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const allExpenses = await allExpensesRes.json();
          let paid = 0,
            owes = 0,
            owed_by = 0;
  
          allExpenses.forEach((exp) => {
            if (exp.paid_by.user_id == id) {
              paid += exp.total_amount;
              exp.owes.forEach((o) => {
                owed_by += o.amount;
              });
            }
            exp.owes.forEach((o) => {
              if (o.from.user_id == id) {
                owes += o.amount;
              }
            });
          });
          setExpenseSummary({ paid, owes, owed_by });
  
          const invRes = await fetch(
            `http://192.168.1.20:5001/inventory/group/${me.group_id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const items = await invRes.json();
          setInventoryItems(
            items.filter((item) => String(item.owner_id) === String(id))
          );
        } catch (err) {
          console.error('Error loading roommate data:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchRoommate();
  }, [id]);

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!roommate) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Roommate not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#E6F2FD', '#F2F2F7']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{roommate.name}</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={32} color="#2563EB" />
          </View>
          <Text style={styles.name}>{roommate.name}</Text>
          <Text style={styles.status}>{roommate.status || 'Available'}</Text>
          <Text style={styles.email}>{roommate.email}</Text>
        </View>

        <View style={styles.statsContainer}>
          <StatCard
            title="Total Paid"
            value={expenseSummary.paid}
            icon="wallet-outline"
            color="#E8F5E9"
          />
          <StatCard
            title="Owes"
            value={expenseSummary.owes}
            icon="arrow-up-outline"
            color="#FEE2E2"
          />
          <StatCard
            title="Owed"
            value={expenseSummary.owed_by}
            icon="arrow-down-outline"
            color="#DBEAFE"
          />
        </View>

        <View style={styles.section}>
          <SectionHeader
            icon="checkmark-circle-outline"
            title="Assigned Chores"
            color="#4F46E5"
            backgroundColor="#EEF2FF"
          />
          {roommate.chores?.length === 0 ? (
            <Text style={styles.emptyText}>No chores assigned</Text>
          ) : (
            roommate.chores?.map((chore) => (
              <View key={chore.id} style={styles.itemCard}>
                <Text style={styles.itemTitle}>{chore.name}</Text>
                <Text style={styles.itemDetail}>Due: {chore.due_date}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{chore.status}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <SectionHeader
            icon="cube-outline"
            title="Inventory Items"
            color="#2E7D32"
            backgroundColor="#E6F4EA"
          />
          {inventoryItems.length === 0 ? (
            <Text style={styles.emptyText}>No items owned</Text>
          ) : (
            inventoryItems.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemDetail}>Quantity: {item.quantity}</Text>
                {item.is_shared && (
                  <View style={[styles.badge, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={[styles.badgeText, { color: '#2E7D32' }]}>Shared</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#374151',
  },
  backButton: {
    padding: 8,
  },
  content: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
    marginBottom: 4,
  },
  status: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#9CA3AF',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: '#374151',
    marginLeft: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    marginLeft: 8,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: '#4F46E5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});
