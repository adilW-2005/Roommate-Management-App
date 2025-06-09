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
import api, { authAPI, groupAPI, expenseAPI, inventoryAPI } from '../../services/api';

// Helper function to format due dates
const formatDueDate = (dateStr) => {
  if (!dateStr) return 'Not set';
  
  try {
    // For recurring chores with pipe-separated format
    if (dateStr.includes('|')) {
      const parts = dateStr.split('|');
      dateStr = parts[0]; // Get just the date part
      
      // Add recurrence info if available
      if (parts.length > 1) {
        const recurrenceInfo = parts[1].includes(',') 
          ? 'Weekly' // Weekly recurring (days list)
          : `Every ${parts[1]} days`; // Custom interval
        
        return `${formatDateString(dateStr)} (${recurrenceInfo})`;
      }
    }
    
    return formatDateString(dateStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateStr; // Return original if there's an error
  }
};

// Format date string to a more readable format
const formatDateString = (dateStr) => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // Invalid date
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return dateStr;
  }
};

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
  const params = useLocalSearchParams();
  const id = params?.id;
  const [roommate, setRoommate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
    if (!id) {
      console.error('No roommate ID provided');
      setError('No roommate ID provided');
      setLoading(false);
      return;
    }

    const fetchRoommate = async () => {
      try {
        console.log(`Fetching data for roommate ID: ${id}`);
        
        // Get user profile to get group ID
        const profileResponse = await authAPI.getProfile();
        if (profileResponse.error) {
          console.error('Error fetching profile:', profileResponse.error);
          setError('Could not fetch user profile. Please try logging in again.');
          setLoading(false);
          return;
        }

        const userData = profileResponse.data;
        const groupId = userData.group_id;
        console.log(`User's group ID: ${groupId}`);
        
        if (!groupId) {
          console.error('User is not in a group');
          setError('You are not in a group yet');
          setLoading(false);
          return;
        }
          
        // Get group users
        const groupResponse = await groupAPI.getUsers(groupId);
        if (groupResponse.error) {
          console.error('Error fetching group data:', groupResponse.error);
          setError('Could not fetch roommate data');
          setLoading(false);
          return;
        }

        const groupData = groupResponse.data;
        console.log(`Group users fetched. Total: ${groupData.chores?.length || 0}`);
        
        const target = groupData.chores?.find(
          (u) => String(u.id) === String(id)
        );
        
        if (!target) {
          console.error(`Roommate with ID ${id} not found in group data`);
          setError('Roommate not found');
          setLoading(false);
          return;
        }
        
        console.log(`Found roommate: ${target.name}`);
        setRoommate(target);

        // Get expenses history
        const expensesResponse = await expenseAPI.getHistory(groupId);
        if (expensesResponse.error) {
          console.error('Error fetching expenses:', expensesResponse.error);
          // Continue anyway, this is not critical
        } else {
          const allExpenses = expensesResponse.data;
          console.log(`Expenses fetched. Total: ${allExpenses?.length || 0}`);
          
          let paid = 0,
            owes = 0,
            owed_by = 0;

          if (allExpenses && Array.isArray(allExpenses)) {
            allExpenses.forEach((exp) => {
              if (exp.paid_by?.user_id == id) {
                paid += exp.total_amount || 0;
                if (exp.owes && Array.isArray(exp.owes)) {
                  exp.owes.forEach((o) => {
                    owed_by += o.amount || 0;
                  });
                }
              }
              if (exp.owes && Array.isArray(exp.owes)) {
                exp.owes.forEach((o) => {
                  if (o.from?.user_id == id) {
                    owes += o.amount || 0;
                  }
                });
              }
            });
          }
          
          console.log(`Expense summary: paid=${paid}, owes=${owes}, owed_by=${owed_by}`);
          setExpenseSummary({ paid, owes, owed_by });
        }

        // Get inventory items
        const inventoryResponse = await inventoryAPI.getGroupItems(groupId);
        if (inventoryResponse.error) {
          console.error('Error fetching inventory:', inventoryResponse.error);
          // Continue anyway, this is not critical
        } else {
          const items = inventoryResponse.data;
          console.log(`Inventory items fetched. Total: ${items?.length || 0}`);
          
          const userItems = items ? items.filter((item) => String(item.owner_id) === String(id)) : [];
          console.log(`Filtered inventory items for user: ${userItems.length}`);
          setInventoryItems(userItems);
        }

        setError(null);
      } catch (err) {
        console.error('Error loading roommate data:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRoommate();
  }, [id]);

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#E6F2FD', '#F2F2F7']} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={[styles.emptyText, {marginTop: 20}]}>Loading roommate data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !roommate) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#E6F2FD', '#F2F2F7']} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={[styles.emptyText, {marginTop: 20, fontSize: 16, color: '#EF4444'}]}>
            {error || 'Roommate not found'}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
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
          {!roommate?.chores || roommate.chores.length === 0 ? (
            <Text style={styles.emptyText}>No chores assigned</Text>
          ) : (
            roommate.chores.map((chore) => (
              <View key={chore.id || `chore-${Math.random()}`} style={styles.itemCard}>
                <Text style={styles.itemTitle}>{chore.name}</Text>
                <Text style={styles.itemDetail}>
                  Due: {formatDueDate(chore.due_date)}
                </Text>
                <View style={[
                  styles.badge,
                  { backgroundColor: chore.status === 'completed' ? '#E8F5E9' : '#EEF2FF' }
                ]}>
                  <Text style={[
                    styles.badgeText, 
                    { color: chore.status === 'completed' ? '#2E7D32' : '#4F46E5' }
                  ]}>
                    {chore.status === 'completed' ? 'Completed' : chore.status || 'Pending'}
                  </Text>
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
  retryButton: {
    padding: 16,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    marginTop: 20,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#FFFFFF',
  },
});
