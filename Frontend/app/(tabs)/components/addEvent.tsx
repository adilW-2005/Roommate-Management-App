import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function AddEventModal({
  visible,
  onClose,
  onSubmit,
  groupId,
  creating = false,
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isReminder, setIsReminder] = useState(false);
  const [isAllDay, setIsAllDay] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle('');
      setDescription('');
      setStartTime('');
      setEndTime('');
      setIsReminder(false);
      setIsAllDay(false);
    }
  }, [visible]);

  const handleAdd = () => {
    onSubmit({
      title,
      description,
      start_time: startTime,
      end_time: endTime || null,
      is_reminder: isReminder,
      is_all_day: isAllDay,
      group_id: groupId,
    });
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.container}>

          <LinearGradient colors={["#E6F2FD","#F2F2F7"]} style={styles.header}>
            <Text style={styles.title}>New Event</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">

            <View style={styles.section}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Event title"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Event description"
                value={description}
                onChangeText={setDescription}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Start Time (ISO)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DDThh:mm:ss"
                value={startTime}
                onChangeText={setStartTime}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>End Time (optional)           </Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DDThh:mm:ss"
                value={endTime}
                onChangeText={setEndTime}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.sectionInline}>
              <Text style={styles.label}>Reminder?</Text>
              <Switch
                value={isReminder}
                onValueChange={setIsReminder}
              />
            </View>

            <View style={styles.sectionInline}>
              <Text style={styles.label}>All Day?</Text>
              <Switch
                value={isAllDay}
                onValueChange={setIsAllDay}
              />
            </View>

          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAdd}
              style={styles.submitButton}
              disabled={creating}
            >
              <LinearGradient
                colors={["#4F46E5","#4338CA"]}
                style={styles.submitGradient}
              >
                <Text style={styles.submitText}>
                  {creating ? 'Adding...' : 'Add Event'}
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
  content:{ padding:16 },
  section:{ marginBottom:16 },
  sectionInline:{
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
    marginBottom:16
  },
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
  footer:{
    flexDirection:'row',
    borderTopWidth:1,
    borderTopColor:'#E5E7EB',
    padding:16
  },
  cancelButton:{
    flex:1,
    padding:12,
    borderWidth:1,
    borderColor:'#D1D5DB',
    borderRadius:8,
    alignItems:'center'
  },
  cancelText:{ fontFamily:'Poppins_600SemiBold', fontSize:14, color:'#6B7280' },
  submitButton:{ flex:1, marginLeft:12, borderRadius:8, overflow:'hidden' },
  submitGradient:{ padding:12, alignItems:'center' },
  submitText:{ fontFamily:'Poppins_600SemiBold', fontSize:14, color:'#fff' },
});