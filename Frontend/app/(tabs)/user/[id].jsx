import { Text, View } from 'react-native'
import React, { Component, useEffect, useState } from 'react'
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function UserDetailScreen() {

    const { id } = useLocalSearchParams();
    const[userData, setUserData] = useState(null)

    const fetchUserData  = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                if (!token) return;
            
                const userRes = await fetch('http://127.0.0.1:5001/me', {
                  headers: { Authorization: `Bearer ${token}` },
                });                
                 if (!userRes.ok) {
                  console.log('Failed to fetch user');
                  return;
                }
                const userData = await userRes.json();
                const groupId = userData.group_id

              const groupRes = await fetch(`http://127.0.0.1:5001/groups/${groupId}/users`);
              const groupJson = await groupRes.json();
            

              const matchedUser = groupJson.chores.find((u) => u.id === parseInt(id));
              setUserData(matchedUser);

            } catch (err) {
              console.error(err);
            }
          };
    
          useEffect(() => {
            fetchUserData();
          }, []);


  return (
      <View >
        <Text>Room Sync</Text>
  
        
        {userData?.chores?.length > 0 ? (
          userData.chores.map((chore) => (
            <Text key={chore.id}>
              • {chore.name} ({chore.status}) – {chore.due_date}, {chore.type}
            </Text>
          ))
        ) : (
          <Text>No chores assigned.</Text>
        )}
  
      </View>
    );
  }
