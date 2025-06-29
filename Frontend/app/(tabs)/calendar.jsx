// screens/CalendarAgendaScreen.jsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  addDays,
  isSameDay,
  startOfMonth,
  endOfMonth,
  parseISO,
} from 'date-fns';
import { Calendar } from 'react-native-calendars';
import { router } from 'expo-router';
import { authAPI, calendarAPI, groupAPI } from '../services/api';

import AddEventModal from './components/addEvent';

export default function CalendarAgendaScreen() {
  const [groupId, setGroupId] = useState(null);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [itemsByDate, setItemsByDate] = useState({});
  const [visibleItems, setVisibleItems] = useState([]);
  const [viewMode, setViewMode] = useState('day');
  const [loading, setLoading] = useState(true);

  // modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get user profile
      const userRes = await authAPI.getProfile();
      if (userRes.error) {
        Alert.alert('Error', userRes.error);
        return;
      }
      
      const user = userRes.data;
      setGroupId(user.group_id);

      // Get group users and events
      const [groupRes, eventsRes] = await Promise.all([
        groupAPI.getUsers(user.group_id),
        calendarAPI.getGroupEvents(user.group_id)
      ]);

      if (groupRes.error) {
        Alert.alert('Error', 'Failed to fetch group data');
        return;
      }

      if (eventsRes.error) {
        Alert.alert('Error', 'Failed to fetch calendar events');
        return;
      }

      const group = groupRes.data;
      const events = eventsRes.data;

      // combine chores + events
      const formatted = {};
      
      // Process chores for all users
      if (group && group.chores) {
        group.chores.forEach(user => {
          if (user.chores && Array.isArray(user.chores)) {
            user.chores.forEach(chore => {
              if (chore.due_date) {
                // Extract base date without the pipe character
                const baseDate = chore.due_date.split('|')[0];
                
                // Initialize the date entry if it doesn't exist
                if (!formatted[baseDate]) {
                  formatted[baseDate] = [];
                }
                
                // Add to formatted items
                formatted[baseDate].push({
                  type: 'chore',
                  id: chore.id,
                  name: chore.name,
                  due_date: chore.due_date,
                  assigned_to: user.name,
                  status: chore.status,
                });
              }
            });
          }
        });
      }

      // Process events
      if (events && Array.isArray(events)) {
        events.forEach(evt => {
          if (evt.start_time) {
            const date = evt.start_time.split('T')[0];
            
            // Initialize the date entry if it doesn't exist
            if (!formatted[date]) {
              formatted[date] = [];
            }
            
            formatted[date].push({
              type: 'event',
              id: evt.id,
              name: evt.title,
              description: evt.description,
              is_reminder: evt.is_reminder,
              start_time: evt.start_time,
              end_time: evt.end_time,
            });
          }
        });
      }

      setItemsByDate(formatted);
      const todayKey = format(new Date(), 'yyyy-MM-dd');
      setVisibleItems(formatted[todayKey] || []);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to fetch calendar data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDaySelect = date => {
    setSelectedDate(date);
    const key = format(date, 'yyyy-MM-dd');
    setVisibleItems(itemsByDate[key] || []);
  };

  const handleWeekChange = dir => {
    setCurrentWeekStart(addDays(currentWeekStart, dir === 'prev' ? -7 : 7));
  };

  const handleMonthChange = dir => {
    const newMonth =
      dir === 'prev'
        ? subMonths(currentMonthDate, 1)
        : addMonths(currentMonthDate, 1);
    setCurrentMonthDate(newMonth);
    setCurrentWeekStart(
      startOfWeek(startOfMonth(newMonth), { weekStartsOn: 1 })
    );
  };

  const getItemsForRange = (startDate, endDate) => {
    const result = [];
    let day = startDate;
    while (day <= endDate) {
      const key = format(day, 'yyyy-MM-dd');
      if (itemsByDate[key]) result.push({ date: key, items: itemsByDate[key] });
      day = addDays(day, 1);
    }
    return result;
  };

  // handle Add Event from modal
  const handleAddEvent = async payload => {
    try {
      setCreating(true);
      
      // Validate required fields
      if (!payload.title || !payload.start_time) {
        Alert.alert('Error', 'Title and start time are required');
        setCreating(false);
        return;
      }
      
      // Validate ISO format for dates
      const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
      if (!dateRegex.test(payload.start_time)) {
        Alert.alert('Error', 'Start time must be in YYYY-MM-DDThh:mm:ss format');
        setCreating(false);
        return;
      }
      
      if (payload.end_time && !dateRegex.test(payload.end_time)) {
        Alert.alert('Error', 'End time must be in YYYY-MM-DDThh:mm:ss format');
        setCreating(false);
        return;
      }
      
      const response = await calendarAPI.createEvent({
        ...payload,
        group_id: groupId
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      Alert.alert('Success', response.data?.message || 'Event added successfully');
      setModalVisible(false);
      fetchData();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#4F46E5" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar</Text>
        
      </LinearGradient>

      <View style={styles.container}>
        {viewMode !== 'all' && (
          <>
            {/* Month slider + view toggle */}
            <View style={styles.monthSlider}>
              <TouchableOpacity
                onPress={() => handleMonthChange('prev')}
                style={styles.arrowButton}
              >
                <Ionicons name="chevron-back" size={24} color="#4F46E5" />
              </TouchableOpacity>
              <Text style={styles.monthText}>
                {format(currentMonthDate, 'MMMM yyyy')}
              </Text>
              <TouchableOpacity
                onPress={() => handleMonthChange('next')}
                style={styles.arrowButton}
              >
                <Ionicons name="chevron-forward" size={24} color="#4F46E5" />
              </TouchableOpacity>
            </View>

            <View style={styles.viewToggle}>
              {['day', 'week', 'month', 'all'].map(mode => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setViewMode(mode)}
                  style={[
                    styles.toggleButton,
                    viewMode === mode && styles.toggleButtonActive,
                  ]}
                >
                  <Text
                    style={
                      viewMode === mode
                        ? styles.toggleTextActive
                        : styles.toggleText
                    }
                  >
                    {mode.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Week slider */}
        {viewMode !== 'all' && (
          <View style={styles.weekSlider}>
            <TouchableOpacity
              onPress={() => handleWeekChange('prev')}
              style={styles.arrowButton}
            >
              <Ionicons name="chevron-back" size={24} color="#4F46E5" />
            </TouchableOpacity>

            {Array.from({ length: 7 }).map((_, i) => {
              const date = addDays(currentWeekStart, i);
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, new Date());
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleDaySelect(date)}
                  style={[
                    styles.day,
                    isSelected && styles.daySelected,
                    isToday && styles.dayToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      isToday && styles.dayTextToday,
                    ]}
                  >
                    {format(date, 'EEE')}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected && styles.dayTextSelected,
                      isToday && styles.dayTextToday,
                    ]}
                  >
                    {format(date, 'd')}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={() => handleWeekChange('next')}
              style={styles.arrowButton}
            >
              <Ionicons name="chevron-forward" size={24} color="#4F46E5" />
            </TouchableOpacity>
          </View>
        )}

        {/* Full calendar */}
        {viewMode === 'all' ? (
          <Calendar
            onDayPress={day => {
              const d = new Date(day.dateString);
              setSelectedDate(d);
              setVisibleItems(itemsByDate[day.dateString] || []);
              setViewMode('day');
            }}
            markedDates={{
              [format(selectedDate, 'yyyy-MM-dd')]: { selected: true },
              ...Object.fromEntries(
                Object.keys(itemsByDate).map(d => [d, { marked: true }])
              ),
            }}
            theme={{
              selectedDayBackgroundColor: '#4F46E5',
              todayTextColor: '#4F46E5',
              dotColor: '#4F46E5',
              arrowColor: '#4F46E5',
            }}
          />
        ) : viewMode === 'day' ? (
          <FlatList
            data={visibleItems}
            keyExtractor={(_, i) => i.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.choreCard,
                  item.type === 'chore'
                    ? styles.choreTypeChore
                    : styles.choreTypeEvent,
                ]}
              >
                <View style={styles.cardHeader}>
                  <Ionicons
                    name={
                      item.type === 'chore' ? 'checkbox-outline' : 'calendar'
                    }
                    size={24}
                    color={item.type === 'chore' ? '#4F46E5' : '#EC4899'}
                  />
                  <Text style={styles.choreTitle}>{item.name}</Text>
                </View>
                {item.type === 'chore' && (
                  <View style={styles.metaContainer}>
                    <Ionicons
                      name="person-outline"
                      size={16}
                      color="#6B7280"
                    />
                    <Text style={styles.choreMeta}>
                      {item.assigned_to}
                    </Text>
                  </View>
                )}
                {item.type === 'event' && item.description && (
                  <View style={styles.metaContainer}>
                    <Ionicons
                      name="document-text-outline"
                      size={16}
                      color="#6B7280"
                    />
                    <Text style={styles.choreMeta}>
                      {item.description}
                    </Text>
                  </View>
                )}
                {item.type === 'event' && item.start_time && (
                  <View style={styles.metaContainer}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color="#6B7280"
                    />
                    <Text style={styles.choreMeta}>
                      {format(parseISO(item.start_time), 'hh:mm a')}
                      {item.end_time &&
                        ` – ${format(parseISO(item.end_time), 'hh:mm a')}`}
                    </Text>
                  </View>
                )}
                {item.type === 'event' && item.is_reminder && (
                  <View style={styles.reminderBadge}>
                    <Ionicons
                      name="notifications-outline"
                      size={14}
                      color="#4F46E5"
                    />
                    <Text style={styles.reminderText}>Reminder</Text>
                  </View>
                )}
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
                <Text style={styles.noChores}>
                  Nothing scheduled for this day
                </Text>
              </View>
            }
          />
        ) : (
          /* WEEK / MONTH grouped scroll view */
          <ScrollView style={styles.scrollView}>
            {getItemsForRange(
              viewMode === 'week'
                ? currentWeekStart
                : startOfMonth(currentMonthDate),
              viewMode === 'week'
                ? addDays(currentWeekStart, 6)
                : endOfMonth(currentMonthDate)
            ).map(({ date, items }) => (
              <View key={date} style={styles.dayGroup}>
                <Text style={styles.dateLabel}>
                  {format(new Date(date), 'EEEE, MMM d')}
                </Text>
                {items.map((item, i) => (
                  <View
                    key={i}
                    style={[
                      styles.choreCard,
                      item.type === 'chore'
                        ? styles.choreTypeChore
                        : styles.choreTypeEvent,
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <Ionicons
                        name={
                          item.type === 'chore'
                            ? 'checkbox-outline'
                            : 'calendar'
                        }
                        size={24}
                        color={
                          item.type === 'chore' ? '#4F46E5' : '#EC4899'
                        }
                      />
                      <Text style={styles.choreTitle}>{item.name}</Text>
                    </View>

                    {item.type === 'chore' && (
                      <View style={styles.metaContainer}>
                        <Ionicons
                          name="person-outline"
                          size={16}
                          color="#6B7280"
                        />
                        <Text style={styles.choreMeta}>
                          {item.assigned_to}
                        </Text>
                      </View>
                    )}

                    {item.type === 'event' && item.description && (
                      <View style={styles.metaContainer}>
                        <Ionicons
                          name="document-text-outline"
                          size={16}
                          color="#6B7280"
                        />
                        <Text style={styles.choreMeta}>
                          {item.description}
                        </Text>
                      </View>
                    )}
                    {item.type === 'event' && item.start_time && (
                      <View style={styles.metaContainer}>
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color="#6B7280"
                        />
                        <Text style={styles.choreMeta}>
                          {format(parseISO(item.start_time), 'hh:mm a')}
                          {item.end_time &&
                            ` – ${format(
                              parseISO(item.end_time),
                              'hh:mm a'
                            )}`}
                        </Text>
                      </View>
                    )}
                    {item.type === 'event' && item.is_reminder && (
                      <View style={styles.reminderBadge}>
                        <Ionicons
                          name="notifications-outline"
                          size={14}
                          color="#4F46E5"
                        />
                        <Text style={styles.reminderText}>
                          Reminder
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Add Event FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#6366F1', '#4F46E5']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <AddEventModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleAddEvent}
        creating={creating}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  backButton: {
    padding: 8,
  },
  addButton: {
    padding: 8,
  },
  monthSlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  arrowButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  monthText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  weekSlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  day: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 2,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  daySelected: {
    backgroundColor: '#4F46E5',
  },
  dayToday: {
    borderColor: '#4F46E5',
    borderWidth: 1,
  },
  dayText: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  dayTextSelected: {
    color: '#fff',
  },
  dayTextToday: {
    color: '#4F46E5',
  },
  viewToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  toggleButtonActive: {
    backgroundColor: '#4F46E5',
  },
  toggleText: {
    color: '#4B5563',
    fontWeight: '500',
    fontSize: 13,
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  choreCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  choreTypeChore: {
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  choreTypeEvent: {
    borderLeftWidth: 4,
    borderLeftColor: '#EC4899',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  choreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
    flex: 1,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  choreMeta: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  reminderText: {
    fontSize: 12,
    color: '#4F46E5',
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  noChores: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  dayGroup: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  scrollView: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 999,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
