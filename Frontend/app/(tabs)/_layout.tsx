// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: Platform.select({
          ios: { position: 'absolute' },
          default: {},
        }),
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="getData" options={{ title: 'Group' }} />
      <Tabs.Screen name="chores" options={{ title: 'Chores' }} />
      <Tabs.Screen 
        name="roommates/[id]" 
        options={{
          // remove it from the tab bar entirely
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen 
        name="user/[id]" 
        options={{
          // remove it from the tab bar entirely
          tabBarButton: () => null,
        }}
      />
       <Tabs.Screen 
        name="components/addEvent" 
        options={{
          // remove it from the tab bar entirely
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen 
        name="components/addExpense" 
        options={{
          // remove it from the tab bar entirely
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen 
        name="components/addItem" 
        options={{
          // remove it from the tab bar entirely
          tabBarButton: () => null,
        }}
      />
       <Tabs.Screen 
        name="components/ChoreModal" 
        options={{
          // remove it from the tab bar entirely
          tabBarButton: () => null,
        }}
      />
    </Tabs>
    
    
  );
}

