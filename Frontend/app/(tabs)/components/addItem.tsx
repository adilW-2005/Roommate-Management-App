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

export default function AddItemModal({
  visible,
  onClose,
  onSubmit,
  groupId,
  creating = false,
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [customType, setCustomType] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [isShared, setIsShared] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible) {
      setName('');
      setCategory('');
      setCustomType('');
      setQuantity('1');
      setIsShared(false);
      setNotes('');
    }
  }, [visible]);

  const handleAdd = () => {
    onSubmit({
      name,
      group_id: groupId,
      category: category || null,
      custom_type: customType || null,
      quantity: parseInt(quantity, 10) || 1,
      is_shared: isShared,
      notes: notes || null,
    });
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.container}>

          {/* Header */}
          <LinearGradient
            colors={['#E6F2FD','#F2F2F7']}
            style={styles.header}
          >
            <Text style={styles.title}>Add Inventory Item</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Body */}
          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">

            {/* Item Name */}
            <View style={styles.section}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Item name"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Category */}
            <View style={styles.section}>
              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Kitchen, Bathroom"
                value={category}
                onChangeText={setCategory}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Custom Type */}
            <View style={styles.section}>
              <Text style={styles.label}>Custom Type</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Electronics"
                value={customType}
                onChangeText={setCustomType}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Quantity */}
            <View style={styles.section}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Shared Toggle */}
            <View style={styles.sectionInline}>
              <Text style={styles.label}>Shared?</Text>
              <Switch
                value={isShared}
                onValueChange={setIsShared}
              />
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notes]}
                placeholder="Optional notes"
                value={notes}
                onChangeText={setNotes}
                multiline
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
              onPress={handleAdd}
              style={styles.submitButton}
              disabled={creating}
            >
              <LinearGradient
                colors={['#4F46E5','#4338CA']}
                style={styles.submitGradient}
              >
                <Text style={styles.submitText}>
                  {creating ? 'Adding...' : 'Add Item'}
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
  notes:{ height:80, textAlignVertical:'top' },

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
