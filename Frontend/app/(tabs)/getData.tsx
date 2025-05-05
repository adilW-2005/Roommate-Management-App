
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import ChoreModal from './components/ChoreModal';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ChoreStatus = {
  COMPLETE: 'complete',
  INCOMPLETE: 'incomplete',
  UPCOMING: 'upcoming'
};

interface Chore {
  id: string;
  name: string;
  due_date: string;
  status: string;
  icon?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  chores?: Chore[];
}

interface GroupData {
  group_name: string;
  invite_code: string;
  users?: User[];
}

function WeeklyChoreView({ chores, name }: { chores: Chore[]; name: string }) {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const today = new Date();
  
  // Calculate start of week based on the current week offset
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + (currentWeekOffset * 7));

  const weekDays = DAYS.map((day, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    return date;
  });

  const getChoreStatus = (chore: Chore, date: Date) => {
    const choreDate = new Date(chore.due_date);
    if (choreDate.toDateString() !== date.toDateString()) return null;
    
    if (chore.status === 'completed') return ChoreStatus.COMPLETE;
    if (date < today) return ChoreStatus.INCOMPLETE;
    return ChoreStatus.UPCOMING;
  };

  const formatWeekRange = () => {
    const start = weekDays[0];
    const end = weekDays[6];
    return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
  };

  return (
    <View style={styles.weeklyChoreContainer}>
      <View style={styles.weekNavigator}>
        <TouchableOpacity 
          onPress={() => setCurrentWeekOffset(prev => prev - 1)}
          style={styles.weekNavButton}
        >
          <Ionicons name="chevron-back" size={20} color="#6366F1" />
        </TouchableOpacity>
        
        <Text style={styles.weekRangeText}>{formatWeekRange()}</Text>
        
        <TouchableOpacity 
          onPress={() => setCurrentWeekOffset(prev => prev + 1)}
          style={styles.weekNavButton}
        >
          <Ionicons name="chevron-forward" size={20} color="#6366F1" />
        </TouchableOpacity>
      </View>
      <View style={styles.daysHeader}>
        {DAYS.map(day => (
          <Text key={day} style={styles.dayLabel}>{day}</Text>
        ))}
      </View>
      <View style={styles.choreGrid}>
        {chores && chores.length > 0 ? (
          chores.map(chore => (
            <View key={chore.id} style={styles.choreRow}>
              <View style={styles.choreIconContainer}>
                <Ionicons name={chore.icon as any || "home-outline"} size={20} color="#6366F1" />
              </View>
              <Text style={styles.choreName} numberOfLines={1}>
                {chore.name}
              </Text>
              <View style={styles.statusDots}>
                {weekDays.map((date, index) => {
                  const status = getChoreStatus(chore, date);
                  return (
                    <View
                      key={index}
                      style={[
                        styles.statusDot,
                        status === ChoreStatus.COMPLETE && styles.completeDot,
                        status === ChoreStatus.INCOMPLETE && styles.incompleteDot,
                        status === ChoreStatus.UPCOMING && styles.upcomingDot,
                        !status && styles.emptyDot
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No chores assigned</Text>
        )}
      </View>
    </View>
  );
}

function UserDetailModal({ visible, user, onClose }: { visible: boolean; user: User | null; onClose: () => void }) {
  if (!user) return null;
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <LinearGradient 
            colors={['#EEF2FF', '#E0E7FF']} 
            style={styles.modalHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.userInfoModal}>
              <View style={styles.avatarContainerLarge}>
                <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.modalTitle}>{user.name}'s Chores</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#4F46E5" />
            </TouchableOpacity>
          </LinearGradient>
          
          <ScrollView style={styles.choresList} contentContainerStyle={{paddingBottom: 20}}>
            {user.chores && user.chores.length > 0 ? (
              user.chores.map(chore => (
                <View key={chore.id} style={styles.choreItemDetailed}>
                  <View style={[styles.choreStatusIndicator, chore.status === 'completed' ? styles.completedIndicator : styles.pendingIndicator]} />
                  <View style={styles.choreItemContent}>
                    <View style={styles.choreItemHeader}>
                      <Text style={styles.choreItemName}>{chore.name}</Text>
                      <View style={styles.choreStatusBadge}>
                        <Text style={styles.choreStatusText}>{chore.status === 'completed' ? 'Done' : 'Pending'}</Text>
                      </View>
                    </View>
                    <View style={styles.choreMetaContainer}>
                      <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                      <Text style={styles.choreItemDate}>{new Date(chore.due_date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="checkmark-done-circle-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No chores assigned</Text>
                <Text style={styles.emptySubText}>When chores are assigned, they'll appear here</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function GroupInfoScreen() {
  const [groupData, setGroupData] = useState<GroupData>({ group_name: '', invite_code: '' });
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  
  const [choreName, setChoreName] = useState('');
  const [choreType, setChoreType] = useState('');
  const [repeatType, setRepeatType] = useState('');
  const [recurringDays, setRecurringDays] = useState<string[]>([]);
  const [customDays, setCustomDays] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);

  let [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const fetchGroupInfo = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return Alert.alert('Error', 'Not logged in');

      const userRes = await fetch('http://192.168.1.6:5001/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!userRes.ok) return Alert.alert('Error', 'Failed to fetch user info');

      const userData = await userRes.json();
      const fetchedGroupId = userData.group_id;
      setGroupId(fetchedGroupId);
      
      if (!fetchedGroupId) return Alert.alert('You are not in a group');

      const groupRes = await fetch(`http://192.168.1.6:5001/groups/${fetchedGroupId}/users`);
      const groupJson = await groupRes.json();
      
      // backend returns users under `chores` 
      setGroupData({
        group_name: groupJson.group_name,
        invite_code: groupJson.invite_code,
        users: groupJson.chores
      });
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupInfo();
  }, []);

  const toggleDay = (day: string) => {
    setRecurringDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleUserPress = (user: User) => {
    setSelectedUser(user);
    setDetailModalVisible(true);
  };

  const handleCreateChore = async () => {
    if (!choreName || !selectedUser || !dueDate || !groupId) {
      return Alert.alert(
        'Missing fields',
        'Be sure to choose a roommate, name, and due date.'
      );
    }

    try {
      setCreating(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Not logged in');
        return;
      }
      
      const res = await fetch('http://192.168.1.6:5001/chores/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: choreName,
          group_id: groupId,
          assigned_to: selectedUser.id,
          type: choreType || 'as_needed',
          repeat_type: choreType === 'recurring' ? repeatType : null,
          recurring_days:
            repeatType === 'weekly' ? recurringDays : null,
          custom_days:
            repeatType === 'custom' ? parseInt(customDays, 10) : null,
          due_date: dueDate,
          status: 'active',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      Alert.alert('Success', 'Chore created');
      setModalVisible(false);
      // reset form
      setChoreName('');
      setChoreType('');
      setRepeatType('');
      setRecurringDays([]);
      setCustomDays('');
      setDueDate('');
      setSelectedUser(null);
      fetchGroupInfo();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setCreating(false);
    }
  };

  if (!fontsLoaded) return null;
  if (loading)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient 
        colors={['#EEF2FF', '#F9FAFB']} 
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#4F46E5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Details</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#EEF2FF', '#E0E7FF']} 
          style={styles.groupInfo}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <Text style={styles.groupName}>{groupData.group_name}</Text>
          <View style={styles.inviteCode}>
            <Text style={styles.inviteLabel}>Invite Code:</Text>
            <View style={styles.inviteValueContainer}>
              <Text style={styles.inviteValue}>{groupData.invite_code}</Text>
              <TouchableOpacity style={styles.copyButton}>
                <Ionicons name="copy-outline" size={16} color="#4F46E5" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.membersTitle}>
          <Ionicons name="people" size={20} color="#4F46E5" />
          <Text style={styles.membersTitleText}>Roommates</Text>
        </View>

        <View style={styles.membersSection}>
          {groupData.users && groupData.users.length > 0 ? (
            groupData.users.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={styles.memberCard}
                onPress={() => handleUserPress(user)}
                activeOpacity={0.8}
              >
                <View style={styles.memberHeader}>
                  <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.memberName}>{user.name}</Text>
                </View>
                <WeeklyChoreView chores={user.chores || []} name={user.name} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="people-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No roommates found</Text>
              <Text style={styles.emptySubText}>Invite roommates using the code above</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#6366F1', '#4F46E5']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <ChoreModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleCreateChore}
        selectedUser={selectedUser}
        onSelectUser={setSelectedUser}             
        choreName={choreName}
        onChoreNameChange={setChoreName}
        choreType={choreType}
        onChoreTypeChange={setChoreType}
        repeatType={repeatType}
        onRepeatTypeChange={setRepeatType}
        recurringDays={recurringDays}
        onToggleDay={toggleDay}
        customDays={customDays}
        onCustomDaysChange={setCustomDays}
        dueDate={dueDate}
        onDueDateChange={setDueDate}
        creating={creating}
      />
      <UserDetailModal
        visible={detailModalVisible}
        user={selectedUser}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedUser(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#111827',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  groupInfo: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  groupName: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    color: '#111827',
    marginBottom: 16,
  },
  inviteCode: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'column',
  },
  inviteLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#4F46E5',
    marginBottom: 8,
  },
  inviteValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteValue: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#111827',
    letterSpacing: 1,
  },
  copyButton: {
    padding: 8,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderRadius: 8,
  },
  membersTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  membersTitleText: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#111827',
    marginLeft: 8,
  },
  membersSection: {
    gap: 16,
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#C7D2FE',
  },
  avatarContainerLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#C7D2FE',
  },
  avatarText: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#4F46E5',
  },
  memberName: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#111827',
  },
  weeklyChoreContainer: {
    marginTop: 8,
  },
  weekNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  weekNavButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  weekRangeText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#4B5563',
  },
  daysHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingRight: 16,
    marginBottom: 12,
  },
  dayLabel: {
    width: 40,
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Poppins_400Regular',
  },
  choreGrid: {
    gap: 14,
  },
  choreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
  },
  choreIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  choreName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#4B5563',
  },
  statusDots: {
    flexDirection: 'row',
    gap: 8,
  },
  statusDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  completeDot: {
    backgroundColor: '#6366F1',
    borderWidth: 0,
  },
  incompleteDot: {
    backgroundColor: '#EF4444',
    borderWidth: 0,
  },
  upcomingDot: {
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#9CA3AF',
  },
  emptyDot: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  userInfoModal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#111827',
    marginLeft: 12,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  choresList: {
    padding: 16,
  },
  choreItemDetailed: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  choreStatusIndicator: {
    width: 6,
    borderRadius: 3,
    marginRight: 12,
  },
  completedIndicator: {
    backgroundColor: '#10B981',
  },
  pendingIndicator: {
    backgroundColor: '#F59E0B',
  },
  choreItemContent: {
    flex: 1,
  },
  choreItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  choreStatusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  choreStatusText: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
  },
  choreMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  choreItemName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#111827',
    flex: 1,
  },
  choreItemDate: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    marginLeft: 4,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#9CA3AF',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  }
});
