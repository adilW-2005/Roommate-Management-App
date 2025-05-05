// screens/ExpensesHistoryScreen.jsx

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import ExpenseModal from './components/addExpense';

export default function ExpensesHistoryScreen() {
  const [expenses, setExpenses] = useState(null);
  const [users, setUsers] = useState([]);
  const [groupId, setGroupId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [payToUser, setPayToUser] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [payExpenseId, setPayExpenseId] = useState(null);


  let [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // load /me and group users + expense history
  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const meRes = await fetch('http://192.168.1.6:5001/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const me = await meRes.json();
      setGroupId(me.group_id);
      setCurrentUserId(me.id);

      // fetch users
      const grpRes = await fetch(
        `http://192.168.1.6:5001/groups/${me.group_id}/users`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const grp = await grpRes.json();
      setUsers(grp.chores.map(u => ({ id: u.id, name: u.name })));

      // fetch history
      const expRes = await fetch(
        `http://192.168.1.6:5001/expenses/history/${me.group_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const expJson = await expRes.json();
      setExpenses(expJson);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load expenses');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddExpense = async payload => {
    try {
      setCreating(true);
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('http://192.168.1.6:5001/expense/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...payload, group_id: groupId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add');
      Alert.alert('Success', data.message);
      setModalVisible(false);
      loadData();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message);
    } finally {
      setCreating(false);
    }
  };

  const handlePay = async (toUser, amount) => {
    const payload = { to_user: toUser, amount, group_id: groupId };
    console.log('→ PAY payload:', payload);
  
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('http://192.168.1.6:5001/expenses/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          expense_id: payExpenseId,
          to_user:   payToUser,
          amount:    parseFloat(payAmount),
          group_id:  groupId
        })
      });
      
      const json = await res.json();
      console.log('← PAY response:', res.status, json);
  
      if (!res.ok) throw new Error(json.error || 'Payment failed');
      Alert.alert('Success', 'Payment recorded');
      loadData();
    } catch (err) {
      console.error('PAY ERR', err);
      Alert.alert('Error', err.message);
    }
  };
  

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#E6F2FD', '#F2F2F7']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expenses History</Text>
      </LinearGradient>

      {expenses === null ? (
        <ActivityIndicator
          style={{ marginTop: 32 }}
          size="large"
          color="#4F46E5"
        />
      ) : (
        <ScrollView style={styles.content}>
          {expenses.length > 0 ? (
            expenses.map(exp => (
              <View key={exp.expense_id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="wallet-outline" size={24} color="#4F46E5" />
                  </View>
                  <View style={styles.headerText}>
                    <Text style={styles.description}>
                      {exp.description}
                    </Text>
                    <Text style={styles.amount}>
                      ${exp.total_amount.toFixed(2)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.paidBy}>
                  Paid by: {exp.paid_by.name}
                </Text>

                {exp.owes.length > 0 && (
                  <View style={styles.owesContainer}>
                    <Text style={styles.owesTitle}>Split Details:</Text>
                    {exp.owes.map((o, i) => (
                      <View key={i} style={styles.oweItem}>
                        <Ionicons
                          name="arrow-forward"
                          size={16}
                          color="#6B7280"
                        />
                        <Text style={styles.oweText}>
                          {o.from.name} → {o.to.name}:{' '}
                          ${o.amount.toFixed(2)}
                        </Text>
                        { /* only show pay button if it's you owing */ }
                        {o.from.user_id === currentUserId && (
                          <TouchableOpacity
                            style={styles.payButton}
                            onPress={() => {
                              setPayExpenseId(exp.expense_id);
                              setPayToUser(o.to.user_id);
                              setPayAmount(o.amount.toFixed(2));
                              setPayModalVisible(true);
                            }}
                          >
                            <Text style={styles.payText}>Pay</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>
                No expenses recorded yet
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <ExpenseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleAddExpense}
        users={users}
        creating={creating}
      />
      <Modal transparent visible={payModalVisible} animationType="slide">
  <View style={styles.modalOverlay}>
    <View style={styles.payModalContent}>
      <Text style={styles.payModalTitle}>Confirm Payment</Text>
      <TextInput
        style={styles.payInput}
        keyboardType="numeric"
        value={payAmount}
        onChangeText={setPayAmount}
      />
      <View style={styles.payModalButtons}>
        <TouchableOpacity
          onPress={() => setPayModalVisible(false)}
          style={styles.cancelButton}
        >
          <Text>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={async () => {
            await handlePay(payToUser, parseFloat(payAmount));
            setPayModalVisible(false);
          }}
          style={styles.confirmButton}
        >
          <Text style={{ color: '#fff' }}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  backButton: { padding: 8 },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#374151',
  },
  content: { padding: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', marginBottom: 12 },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: { flex: 1 },
  description: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  amount: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#4F46E5',
  },
  paidBy: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
    marginBottom: 12,
  },
  owesContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
  },
  owesTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  oweItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  oweText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#4B5563',
    flex: 1,
  },
  payButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  payText: {
    color: '#fff',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  emptyState: { alignItems: 'center', padding: 32 },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  payModalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  payModalTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 12
  },
  payInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 8,
    marginBottom: 16
  },
  payModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    padding: 10,
    marginRight: 8
  },
  confirmButton: {
    backgroundColor: '#4F46E5',
    padding: 10,
    borderRadius: 6
  }
  
});
