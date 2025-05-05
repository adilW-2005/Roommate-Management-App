// components/ChoreModal.jsx
import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const FULL_DAYS = [
  'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'
];

export default function ChoreModal({
  visible,
  onClose,
  onSubmit,
  users = [],
  selectedUser,
  onSelectUser,
  choreName,
  onChoreNameChange,
  choreType,
  onChoreTypeChange,
  repeatType,
  onRepeatTypeChange,
  recurringDays,
  onToggleDay,
  customDays,
  onCustomDaysChange,
  dueDate,
  onDueDateChange,
  creating
}) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.container}>

          {/* Header */}
          <LinearGradient
            colors={['#E6F2FD','#F2F2F7']}
            style={styles.header}
          >
            <Text style={styles.title}>New Chore</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Body */}
          <ScrollView style={styles.content}>

            {/* ASSIGN USER INLINE */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Assign To</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
              >
                {users.map(u => (
                  <TouchableOpacity
                    key={u.id}
                    style={[
                      styles.userPill,
                      selectedUser?.id === u.id && styles.userPillActive,
                    ]}
                    onPress={() => onSelectUser(u)}
                  >
                    <Text
                      style={[
                        styles.userPillText,
                        selectedUser?.id === u.id && styles.userPillTextActive,
                      ]}
                    >
                      {u.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Chore Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Chore Name</Text>
              <TextInput
                style={styles.input}
                value={choreName}
                onChangeText={onChoreNameChange}
                placeholder="e.g. Take out trash"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeButtons}>
                {['as_needed','recurring'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      choreType === type && styles.typeButtonActive
                    ]}
                    onPress={() => onChoreTypeChange(type)}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        choreType === type && styles.typeButtonTextActive
                      ]}
                    >
                      {type === 'as_needed' ? 'One-Time' : 'Recurring'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Recurrence */}
            {choreType === 'recurring' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Repeat</Text>
                <View style={styles.typeButtons}>
                  {['daily','weekly','custom'].map(rt => (
                    <TouchableOpacity
                      key={rt}
                      style={[
                        styles.typeButton,
                        repeatType === rt && styles.typeButtonActive
                      ]}
                      onPress={() => onRepeatTypeChange(rt)}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          repeatType === rt && styles.typeButtonTextActive
                        ]}
                      >
                        {rt.charAt(0).toUpperCase() + rt.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Weekly grid */}
                {repeatType === 'weekly' && (
                  <View style={styles.daysGrid}>
                    {DAYS.map((d,i) => (
                      <TouchableOpacity
                        key={d}
                        style={[
                          styles.dayButton,
                          recurringDays.includes(FULL_DAYS[i]) &&
                            styles.dayButtonActive
                        ]}
                        onPress={() => onToggleDay(FULL_DAYS[i])}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            recurringDays.includes(FULL_DAYS[i]) &&
                              styles.dayTextActive
                          ]}
                        >
                          {d}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Custom interval */}
                {repeatType === 'custom' && (
                  <TextInput
                    style={styles.input}
                    value={customDays}
                    onChangeText={onCustomDaysChange}
                    placeholder="Number of days"
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                )}
              </View>
            )}

            {/* Due Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Due Date</Text>
              <TextInput
                style={styles.input}
                value={dueDate}
                onChangeText={onDueDateChange}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSubmit}
              style={styles.submitButton}
              disabled={creating}
            >
              <LinearGradient
                colors={['#4F46E5','#4338CA']}
                style={styles.submitGradient}
              >
                <Text style={styles.submitText}>
                  {creating ? 'Adding...' : 'Add Chore'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex:1,
    backgroundColor:'rgba(0,0,0,0.4)',
    justifyContent:'center',
    alignItems:'center'
  },
  container:{
    width:'90%',
    maxHeight:'85%',
    backgroundColor:'#fff',
    borderRadius:16,
    overflow:'hidden'
  },
  // header
  header:{
    flexDirection:'row',
    justifyContent:'space-between',
    alignItems:'center',
    padding:16,
    borderBottomWidth:1,
    borderBottomColor:'#E5E7EB'
  },
  title:{ fontSize:20, fontFamily:'Poppins_600SemiBold', color:'#111827' },
  closeButton:{ padding:4 },

  // body
  content:{ padding:16 },

  // inline user pills
  userPill:{
    paddingVertical:6,
    paddingHorizontal:12,
    backgroundColor:'#F3F4F6',
    borderRadius:20,
    marginRight:8
  },
  userPillActive:{ backgroundColor:'#4F46E5' },
  userPillText:{
    fontFamily:'Poppins_400Regular',
    color:'#374151'
  },
  userPillTextActive:{ color:'#fff' },

  // form groups
  inputGroup:{ marginBottom:20 },
  label:{ fontSize:14, fontFamily:'Poppins_600SemiBold', color:'#374151', marginBottom:8 },
  input:{
    borderWidth:1,
    borderColor:'#D1D5DB',
    borderRadius:8,
    padding:10,
    fontSize:14,
    fontFamily:'Poppins_400Regular',
    color:'#111827'
  },

  // type picker
  typeButtons:{ flexDirection:'row', marginBottom:12 },
  typeButton:{
    flex:1, padding:10, marginRight:8,
    borderRadius:8, backgroundColor:'#F3F4F6', alignItems:'center'
  },
  typeButtonActive:{ backgroundColor:'#EEF2FF' },
  typeButtonText:{
    fontFamily:'Poppins_600SemiBold', fontSize:14, color:'#6B7280'
  },
  typeButtonTextActive:{ color:'#4F46E5' },

  // weekly days
  daysGrid:{ flexDirection:'row', flexWrap:'wrap', marginTop:8 },
  dayButton:{
    paddingVertical:6, paddingHorizontal:10,
    borderRadius:6, backgroundColor:'#F3F4F6',
    marginRight:6, marginBottom:6
  },
  dayButtonActive:{ backgroundColor:'#EEF2FF' },
  dayText:{ fontFamily:'Poppins_600SemiBold', fontSize:13, color:'#6B7280' },
  dayTextActive:{ color:'#4F46E5' },

  // footer
  footer:{
    flexDirection:'row',
    borderTopWidth:1, borderTopColor:'#E5E7EB',
    padding:16
  },
  cancelButton:{
    flex:1,
    padding:12,
    borderWidth:1, borderColor:'#D1D5DB',
    borderRadius:8, alignItems:'center'
  },
  cancelText:{
    fontFamily:'Poppins_600SemiBold', fontSize:14, color:'#6B7280'
  },
  submitButton:{ flex:1, marginLeft:12, borderRadius:8, overflow:'hidden' },
  submitGradient:{ padding:12, alignItems:'center' },
  submitText:{
    fontFamily:'Poppins_600SemiBold', fontSize:14, color:'#fff'
  },
});
