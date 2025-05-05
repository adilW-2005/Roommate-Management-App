// screens/InventoryScreen.jsx
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

import AddItemModal from './components/addItem';

function ItemCard({ item }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: getColorForCategory(item.category) },
          ]}
        >
          <Ionicons name="cube-outline" size={24} color="#4F46E5" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemCategory}>
            {item.category || 'Uncategorized'}
          </Text>
        </View>
      </View>
      <View style={styles.ownerInfo}>
        <Ionicons name="person-outline" size={16} color="#6B7280" />
        <Text style={styles.ownerText}>
          {item.owner_name || `User ID ${item.owner_id}`}
        </Text>
      </View>
    </View>
  );
}

function getColorForCategory(category) {
  const colors = {
    Kitchen: '#E8F5E9',
    Bathroom: '#E3F2FD',
    Living: '#FFF3E0',
    Other: '#F3E8FF',
  };
  return colors[category] || '#F3F4F6';
}

export default function InventoryScreen() {
  const [items, setItems] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});

  let [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // fetch /me and inventory
  const loadInventory = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const meRes = await fetch('http://127.0.0.1:5001/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const me = await meRes.json();
      setGroupId(me.group_id);

      const invRes = await fetch(
        `http://127.0.0.1:5001/inventory/group/${me.group_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const invJson = await invRes.json();
      setItems(invJson);
      // initialize all categories collapsed
      const groups = groupByCategory(invJson);
      const init = {};
      Object.keys(groups).forEach(cat => {
        init[cat] = false;
      });
      setExpandedCategories(init);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load inventory');
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleAddItem = async data => {
    try {
      setCreating(true);
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('http://127.0.0.1:5001/inventory/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...data, group_id: groupId }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to add');
      Alert.alert('Success', 'Item added');
      setModalVisible(false);
      loadInventory();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleCategory = cat => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const groupByCategory = list =>
    list.reduce((acc, item) => {
      const cat = item.category || 'Uncategorized';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});

  if (!fontsLoaded) return null;

  const grouped = items ? groupByCategory(items) : {};

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#E6F2FD', '#F2F2F7']}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Inventory</Text>
      </LinearGradient>

      {items === null ? (
        <ActivityIndicator
          style={{ marginTop: 32 }}
          size="large"
          color="#4F46E5"
        />
      ) : (
        <ScrollView style={styles.content}>
          {Object.keys(grouped).length > 0 ? (
            Object.keys(grouped).map(cat => (
              <View key={cat} style={styles.categorySection}>
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => toggleCategory(cat)}
                >
                  <Text style={styles.categoryTitle}>{cat}</Text>
                  <Ionicons
                    name={
                      expandedCategories[cat]
                        ? 'chevron-up'
                        : 'chevron-down'
                    }
                    size={20}
                    color="#4F46E5"
                  />
                </TouchableOpacity>
                {expandedCategories[cat] &&
                  grouped[cat].map(item => (
                    <ItemCard key={item.id} item={item} />
                  ))}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No items in inventory</Text>
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

      <AddItemModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleAddItem}
        groupId={groupId}
        creating={creating}
      />
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
  categorySection: { marginBottom: 16 },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#111827',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', marginBottom: 12 },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: { flex: 1, justifyContent: 'center' },
  itemName: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#6B7280',
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 8,
  },
  ownerText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#4B5563',
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
});
