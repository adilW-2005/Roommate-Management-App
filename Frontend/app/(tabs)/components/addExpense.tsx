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

export default function ExpenseModal({
  visible,
  onClose,
  onSubmit,
  users = [],
  creating = false,
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [customSplits, setCustomSplits] = useState([]);

  useEffect(() => {
    if (visible) {
      setDescription('');
      setAmount('');
      setSplitType('equal');
      setCustomSplits(users.map(u => ({ id: u.id, amount: '' })));  
    }
  }, [visible]);

  const handleAdd = () => {
    const payload = {
      description,
      amount: parseFloat(amount) || 0,
      split_type: splitType,
    };
    if (splitType === 'custom') {
      payload.splits = customSplits
        .filter(s => s.amount)
        .map(s => ({ user_id: s.id, amount: parseFloat(s.amount) }));
    }
    onSubmit(payload);
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.container}>

          <LinearGradient colors={['#E6F2FD','#F2F2F7']} style={styles.header}>
            <Text style={styles.title}>New Expense</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">

            <View style={styles.section}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. April Rent"
                value={description}
                onChangeText={setDescription}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="1200"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.sectionInline}>
              <Text style={styles.label}>Split Type</Text>
              <View style={styles.splitRow}>
                {['equal','custom'].map(type => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setSplitType(type)}
                  >
                    <Text style={[
                      styles.splitText,
                      splitType===type && styles.splitTextActive
                    ]}>
                      {type.charAt(0).toUpperCase()+type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {splitType==='custom' && (
              <View style={styles.section}>
                <Text style={styles.label}>Custom Splits</Text>
                {users.map((u,i)=>(
                  <View key={u.id} style={styles.splitItem}>
                    <Text style={styles.userName}>{u.name}</Text>
                    <TextInput
                      style={styles.splitInput}
                      placeholder="Amount"
                      keyboardType="numeric"
                      value={customSplits[i].amount}
                      onChangeText={val=>{
                        const arr=[...customSplits]; arr[i].amount=val; setCustomSplits(arr);
                      }}
                    />
                  </View>
                ))}
              </View>
            )}

          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleAdd} style={styles.submitBtn} disabled={creating}>
              <LinearGradient colors={['#4F46E5','#4338CA']} style={styles.submitGradient}>
                <Text style={styles.submitText}>{creating?'Adding...':'Add Expense'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:{flex:1,backgroundColor:'rgba(0,0,0,0.4)',justifyContent:'center',alignItems:'center'},
  container:{width:'90%',maxHeight:'85%',backgroundColor:'#fff',borderRadius:16,overflow:'hidden'},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:16,borderBottomWidth:1,borderBottomColor:'#E5E7EB'},
  title:{fontSize:18,fontFamily:'Poppins_600SemiBold'},
  content:{padding:16},
  section:{marginBottom:16},
  sectionInline:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16},
  label:{fontSize:14,fontFamily:'Poppins_600SemiBold',marginBottom:8},
  input:{borderWidth:1,borderColor:'#D1D5DB',borderRadius:8,padding:10,fontSize:14,fontFamily:'Poppins_400Regular',color:'#111827'},
  splitRow:{flexDirection:'row',gap:12},
  splitText:{fontSize:14,fontFamily:'Poppins_400Regular',color:'#6B7280'},
  splitTextActive:{color:'#4F46E5',fontFamily:'Poppins_600SemiBold'},
  splitItem:{flexDirection:'row',alignItems:'center',marginBottom:12},
  userName:{flex:1,fontSize:14,fontFamily:'Poppins_400Regular'},
  splitInput:{width:80,borderWidth:1,borderColor:'#D1D5DB',borderRadius:8,padding:8,fontSize:14,fontFamily:'Poppins_400Regular',color:'#111827'},
  footer:{flexDirection:'row',borderTopWidth:1,borderTopColor:'#E5E7EB',padding:16},
  cancelBtn:{flex:1,padding:12,alignItems:'center',borderRadius:8,borderWidth:1,borderColor:'#D1D5DB'},
  cancelText:{fontFamily:'Poppins_600SemiBold',color:'#6B7280'},
  submitBtn:{flex:1,marginLeft:12,borderRadius:8,overflow:'hidden'},
  submitGradient:{padding:12,alignItems:'center'},
  submitText:{fontFamily:'Poppins_600SemiBold',color:'#fff'}
});
