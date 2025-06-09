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
import { authAPI, inventoryAPI } from '../services/api';

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
      // Get user profile
      const profileResponse = await authAPI.getProfile();
      if (profileResponse.error) {
        Alert.alert('Error', profileResponse.error);
        return;
      }
      
      const me = profileResponse.data;
      setGroupId(me.group_id);

      // Get inventory items
      const inventoryResponse = await inventoryAPI.getGroupItems(me.group_id);
      if (inventoryResponse.error) {
        Alert.alert('Error', 'Failed to load inventory');
        return;
      }
      
      setItems(inventoryResponse.data);
      
      // initialize all categories collapsed
      const groups = groupByCategory(inventoryResponse.data);
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
      const response = await inventoryAPI.addItem({
        ...data,
        group_id: groupId
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      Alert.alert('Success', response.data?.message || 'Item added successfully');
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
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={['#6366F1', '#4F46E5']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </LinearGradient>
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
    height: 156,
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
