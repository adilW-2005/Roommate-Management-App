from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
import random, string, json, calendar
from extensions import db
from models import User, Group, Chore, CalendarEvent
from flask_jwt_extended import (
    jwt_required, get_jwt_identity, create_access_token
)

routes = Blueprint('routes', __name__)

# Utility function to generate a random invite code.
def generate_invite_code(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

# Calculate the next due date based on the repeat_type and options.
def calculate_next_due_date(current_date, repeat_type, recurring_days=None, custom_days=None):
    if repeat_type == 'daily':
        return (current_date + timedelta(days=1)).strftime('%Y-%m-%d')
    elif repeat_type == 'weekly':
        if recurring_days:
            # Convert day names to indices (0=Monday,...,6=Sunday)
            day_indices = [list(calendar.day_name).index(day) for day in recurring_days]
            day_indices.sort()
            today_index = current_date.weekday()
            for i in range(1, 8):
                next_day = (today_index + i) % 7
                if next_day in day_indices:
                    return (current_date + timedelta(days=i)).strftime('%Y-%m-%d')
        return (current_date + timedelta(days=7)).strftime('%Y-%m-%d')
    elif repeat_type == 'monthly':
        return (current_date + timedelta(days=30)).strftime('%Y-%m-%d')
    elif repeat_type == 'custom':
        if custom_days:
            return (current_date + timedelta(days=custom_days)).strftime('%Y-%m-%d')
        else:
            return (current_date + timedelta(days=7)).strftime('%Y-%m-%d')
    else:
        return None

### AUTHENTICATION ENDPOINTS

@routes.route('/auth/register', methods=['POST'])
def register():
    data = request.json
    # Validate required fields.
    if not data.get('name') or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Name, email, and password are required"}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({"error": "User with this email already exists"}), 400

    user = User(name=data['name'], email=data['email'])
    user.set_password(data['password'])  # Hash and set the password.
    db.session.add(user)
    db.session.commit()

    # Create a JWT token with the user's id as the identity.
    access_token = create_access_token(identity=user.id)
    return jsonify({
        "message": "User registered",
        "user_id": user.id,
        "access_token": access_token
    }), 201

@routes.route('/auth/login', methods=['POST'])
def login():
    data = request.json
    if not data.get('email') or not data.get('password'):
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=data['email']).first()
    if user is None or not user.check_password(data['password']):
        return jsonify({"error": "Invalid email or password"}), 401

    access_token = create_access_token(identity=user.id)
    return jsonify({
        "message": "Login successful",
        "user_id": user.id,
        "access_token": access_token
    }), 200

### USER & GROUP ROUTES

@routes.route('/groups/create', methods=['POST'])
@jwt_required()
def create_group():
    data = request.json
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    invite_code = generate_invite_code()
    group = Group(name=data['name'], invite_code=invite_code)

    db.session.add(group)
    db.session.flush()

    user.group_id = group.id
    db.session.commit()
    return jsonify({'message': 'Group created', 'invite_code': group.invite_code, 'group_id': group.id})

@routes.route('/groups/join', methods=['POST'])
@jwt_required()
def join_group():
    data = request.json
    invite_code = data.get('invite_code')
    if not invite_code:
        return jsonify({"error": "Invite code is required"}), 400
    
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    group = Group.query.filter_by(invite_code = invite_code).first()
   
    if not group:
        return jsonify({"error": "Invalid invite code"}), 400
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    user.group_id = group.id
    db.session.commit()
    return jsonify({"message": f"{user.name} joined group {group.name}", "group_id": group.id}), 200


@routes.route('/groups/<int:group_id>/users', methods=['GET'])
def list_group_users_with_chores(group_id):
    
    group = Group.query.get(group_id)
    if not group:
        return jsonify({'error': 'Group not found'}), 404
    
    users = User.query.filter_by(group_id=group_id).all()
    result = []
    for user in users:
        chores = Chore.query.filter_by(assigned_to=user.id).all()
        user_data = {
            'id': user.id,
            'name': user.name,
            'email': user.email,
            'status': user.status,
            'chores': [{
                'id': c.id,
                'name': c.name,
                'group_id': c.group_id,
                'assigned_to': c.assigned_to,
                'created_by': c.created_by,
                'last_updated_by': c.last_updated_by,
                'type': c.type,
                'repeat_type': c.repeat_type,
                'recurring_days': c.recurring_days,
                'custom_days': c.custom_days,
                'due_date': c.due_date,
                'status': c.status,
                'completed': c.completed,
                'created_at': c.created_at.isoformat() if c.created_at else None,
                'completed_at': c.completed_at.isoformat() if c.completed_at else None
            } for c in chores]
        }
        result.append(user_data)
        
    return jsonify({
        'group_id': group.id,
        'group_name': group.name,
        'invite_code': group.invite_code,
        'chores' : result
    })

### CHORE ROUTES

@routes.route('/chores/create', methods=['POST'])
@jwt_required()
def create_chore():
    data = request.json
    current_user_id = get_jwt_identity()
    chore = Chore(
        name=data['name'],
        group_id=data['group_id'],
        created_by=current_user_id,
        assigned_to=data.get('assigned_to'),
        last_updated_by=current_user_id,
        type=data['type'],
        repeat_type=data.get('repeat_type'),
        due_date=data.get('due_date'),
        recurring_days=json.dumps(data.get('recurring_days')) if data.get('recurring_days') else None,
        custom_days=data.get('custom_days'),
        status=data.get('status', 'active')
    )
    db.session.add(chore)
    db.session.commit()
    return jsonify({'message': 'Chore created', 'chore_id': chore.id})

@routes.route('/chores/<int:chore_id>/update', methods=['POST'])
@jwt_required()
def update_chore(chore_id):
    data = request.json
    chore = Chore.query.get(chore_id)
    if not chore:
        return jsonify({'error': 'Chore not found'}), 404

    current_user_id = get_jwt_identity()
    if current_user_id != chore.created_by and current_user_id != chore.assigned_to:
        return jsonify({'error': 'Not authorized'}), 403

    if 'name' in data:
        return jsonify({'error': 'Chore name cannot be changed'}), 400

    allowed_fields = ['assigned_to', 'due_date', 'recurring_days', 'type', 'repeat_type', 'custom_days', 'status']
    for field in allowed_fields:
        if field in data:
            if field == 'recurring_days':
                setattr(chore, field, json.dumps(data[field]))
            else:
                setattr(chore, field, data[field])
    chore.last_updated_by = current_user_id
    db.session.commit()
    return jsonify({'message': 'Chore updated'})

@routes.route('/chores/<int:chore_id>/complete', methods=['POST'])
@jwt_required()
def complete_chore(chore_id):
    data = request.json
    chore = Chore.query.get(chore_id)
    if not chore:
        return jsonify({'error': 'Chore not found'}), 404

    current_user_id = get_jwt_identity()
    if current_user_id != chore.assigned_to:
        return jsonify({'error': 'Only the assignee can complete this chore'}), 403

    chore.completed = True
    chore.completed_at = datetime.utcnow()

    # Handle recurring logic: use the current due_date as base.
    if chore.type == 'recurring':
        try:
            base_date = datetime.strptime(chore.due_date, '%Y-%m-%d') if chore.due_date else datetime.utcnow()
            next_due = calculate_next_due_date(
                base_date,
                repeat_type=chore.repeat_type,
                recurring_days=json.loads(chore.recurring_days) if chore.recurring_days else None,
                custom_days=chore.custom_days
            )
            if next_due:
                chore.due_date = next_due
                chore.completed = False  # Reset for next cycle.
                chore.status = 'active'
        except Exception as e:
            print("Recurring date error:", e)
    elif chore.type == 'as_needed':
        chore.status = 'inactive'

    db.session.commit()
    return jsonify({'message': 'Chore marked as complete (and rescheduled if recurring)'})

@routes.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    return jsonify({
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "group_id": user.group_id
    })

@routes.route('/calendar/create', methods=['POST'])
@jwt_required()
def create_calendar():
    user_id = get_jwt_identity()
    data = request.get_json()

    required_fields = ['title', 'group_id', 'start_time']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400

    try:
        start_time = datetime.fromisoformat(data['start_time'])
        end_time = datetime.fromisoformat(data['end_time']) if data.get('end_time') else None
    except Exception:
        return jsonify({'error': 'Invalid date format, use ISO 8601 format like 2025-05-01T13:00:00'}), 400

    event = CalendarEvent(
        title=data['title'],
        description=data.get('description'),
        group_id=data['group_id'],
        created_by=user_id,
        start_time=start_time,
        end_time=end_time,
        is_all_day=data.get('is_all_day', False),
        is_reminder=data.get('is_reminder', False),
        created_at=datetime.utcnow()
    )

    db.session.add(event)
    db.session.commit()

    return jsonify({'message': 'Calendar event created', 'event_id': event.id}), 201

@routes.route('/calendar/group/<int:group_id>', methods=['GET'])
@jwt_required()
def get_group_events(group_id):
    events = CalendarEvent.query.filter_by(group_id=group_id).order_by(CalendarEvent.start_time).all()
    return jsonify([{
        'id': e.id,
        'title': e.title,
        'description': e.description,
        'created_by': e.created_by,
        'start_time': e.start_time.isoformat(),
        'end_time': e.end_time.isoformat() if e.end_time else None,
        'is_reminder': e.is_reminder
    } for e in events])

@routes.route('/user/status', methods=['PATCH'])
@jwt_required()
def update_status():
    user_id = get_jwt_identity()
    data = request.get_json()
    status = data.get('status')

    if status not in ['home', 'busy', 'away', 'dnd']:
        return jsonify({'error': 'Invalid status'}), 400

    user = User.query.get(user_id)
    user.status = status
    db.session.commit()
    return jsonify({'message': 'Status updated'}), 200





# import React, { useEffect, useState, useRef } from 'react';
# import {
#   View,
#   Text,
#   TouchableOpacity,
#   ScrollView,
#   StyleSheet,
#   SafeAreaView,
#   Alert,
# } from 'react-native';
# import AsyncStorage from '@react-native-async-storage/async-storage';
# import { router } from 'expo-router';
# import { Ionicons } from '@expo/vector-icons';

# export default function DashboardScreen() {
#   const [user, setUser] = useState({});
#   const [groupData, setGroupData] = useState({});
#   const [events, setEvents] = useState([]);
#   const [expenses, setExpenses] = useState(null);

#   const scrollRef = useRef(null);
#   const roommatesRef = useRef(null);
#   const choresRef = useRef(null);
#   const eventsRef = useRef(null);
#   const expensesRef = useRef(null);

#   const scrollToSection = (ref) => {
#     ref?.current?.measureLayout(scrollRef.current.getScrollResponder(), (x, y) => {
#       scrollRef.current.scrollTo({ y: y - 10, animated: true });
#     });
#   };

#   useEffect(() => {
#     const fetchData = async () => {
#       try {
#         const token = await AsyncStorage.getItem('token');
#         const meRes = await fetch('http://127.0.0.1:5001/me', {
#           headers: { Authorization: `Bearer ${token}` },
#         });
#         const me = await meRes.json();
#         setUser(me);

#         const groupRes = await fetch(`http://127.0.0.1:5001/groups/${me.group_id}/users`);
#         const group = await groupRes.json();
#         setGroupData(group);

#         const eventRes = await fetch(`http://127.0.0.1:5001/calendar/group/${me.group_id}`, {
#           headers: { Authorization: `Bearer ${token}` },
#         });
#         setEvents(await eventRes.json());

#         const expRes = await fetch('http://127.0.0.1:5001/expenses/me', {
#           headers: { Authorization: `Bearer ${token}` },
#         });
#         setExpenses(await expRes.json());
#       } catch (err) {
#         console.error(err);
#         Alert.alert('Error loading dashboard');
#       }
#     };
#     fetchData();
#   }, []);

#   const handleLogout = async () => {
#     await AsyncStorage.removeItem('token');
#     router.replace('/(auth)/login');
#     Alert.alert('Logged out');
#   };

#   const roommates = groupData?.chores || [];

#   return (
#     <SafeAreaView style={styles.container}>
#       <View style={styles.topBar}>
#         <Text style={styles.logo}>RoomSync</Text>
#         <TouchableOpacity onPress={handleLogout}>
#           <Ionicons name="log-out-outline" size={22} color="#1F2937" />
#         </TouchableOpacity>
#       </View>

#       <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
#         <Text style={styles.greeting}>Hi {user?.name || 'User'} 👋</Text>

#         {/* Top Feature Pills */}
#         <View style={styles.featureRow}>
#           <FeaturePill
#             icon="people"
#             label="Roommates"
#             color="#DBEAFE"
#             iconColor="#1D4ED8"
#             onPress={() => scrollToSection(roommatesRef)}
#           />
#           <FeaturePill
#             icon="checkmark-done"
#             label="Chores"
#             color="#FFF7ED"
#             iconColor="#EA580C"
#             onPress={() => scrollToSection(choresRef)}
#           />
#           <FeaturePill
#             icon="calendar-outline"
#             label="Events"
#             color="#EDE9FE"
#             iconColor="#7C3AED"
#             onPress={() => scrollToSection(eventsRef)}
#           />
#           <FeaturePill
#             icon="cash-outline"
#             label="Expenses"
#             color="#DCFCE7"
#             iconColor="#15803D"
#             onPress={() => scrollToSection(expensesRef)}
#           />
#         </View>

#         <View ref={roommatesRef}>
#           <MiniSection title="Roommates" theme={{ color: '#1D4ED8', icon: 'people' }} pillColor="#DBEAFE">
#             <View style={styles.roommateGrid}>
#               {roommates.slice(0, 4).map((roommate) => (
#                 <TouchableOpacity
#                   key={roommate.id}
#                   onPress={() => router.push(`/roommates/${roommate.id}`)}
#                   style={styles.roommateCard}
#                 >
#                   <Text style={styles.roommateName}>{roommate.name}</Text>
#                   <Text style={styles.roommateStatus}>{roommate.status || '—'}</Text>
#                 </TouchableOpacity>
#               ))}
#             </View>
#           </MiniSection>
#         </View>

#         <View ref={choresRef}>
#           <MiniSection title="My Chores" theme={{ color: '#EA580C', icon: 'checkmark-done' }} pillColor="#FFEEDD">
#             {groupData?.chores?.find(u => u.id === user.id)?.chores?.slice(0, 2).map((chore) => (
#               <View key={chore.id} style={[styles.pillCard, { backgroundColor: '#FFF7ED' }]}>
#                 <Text style={styles.pillLabel}>🧽 {chore.name}</Text>
#                 <Text style={styles.pillSub}>Due: {chore.due_date}</Text>
#               </View>
#             )) || <Text style={styles.empty}>No chores assigned.</Text>}
#           </MiniSection>
#         </View>

#         <View ref={eventsRef}>
#           <MiniSection title="Upcoming Events" theme={{ color: '#7C3AED', icon: 'calendar-outline' }} pillColor="#EDE9FE">
#             {events?.slice(0, 2).map(event => (
#               <View key={event.id} style={[styles.pillCard, { backgroundColor: '#F3E8FF' }]}>
#                 <Text style={styles.pillLabel}>🎊 {event.title}</Text>
#                 <Text style={styles.pillSub}>{event.start_time.slice(0, 16).replace('T', ' ')}</Text>
#               </View>
#             ))}
#           </MiniSection>
#         </View>

#         <View ref={expensesRef}>
#           <MiniSection title="Expenses" theme={{ color: '#15803D', icon: 'cash-outline' }} pillColor="#DCFCE7">
#             {expenses && (
#               <TouchableOpacity
#                 style={[styles.pillCard, { backgroundColor: '#D1FAE5' }]}
#                 onPress={() => router.push('/expenses')}
#               >
#                 <Text style={styles.pillLabel}>🧾 Overview</Text>
#                 <Text style={styles.pillSub}>Paid: ${expenses.total_paid}</Text>
#                 <Text style={[styles.pillSub, { color: '#DC2626' }]}>
#                   Owe: ${expenses.total_owed_to_others}
#                 </Text>
#                 <Text style={[styles.pillSub, { color: '#16A34A' }]}>
#                   Owed: ${expenses.total_others_owe_me}
#                 </Text>
#               </TouchableOpacity>
#             )}
#           </MiniSection>
#         </View>
#       </ScrollView>
#     </SafeAreaView>
#   );
# }

# function FeaturePill({ icon, label, color, iconColor, onPress }) {
#   return (
#     <TouchableOpacity style={[styles.featurePill, { backgroundColor: color }]} onPress={onPress}>
#       <Ionicons name={icon} size={18} color={iconColor} />
#       <Text style={[styles.featureText, { color: iconColor }]}>{label}</Text>
#     </TouchableOpacity>
#   );
# }

# function MiniSection({ title, children, theme, pillColor }) {
#   return (
#     <View style={styles.section}>
#       <View style={[styles.sectionHeaderWrap, { backgroundColor: pillColor }]}>
#         <Ionicons name={theme.icon} size={16} color={theme.color} />
#         <Text style={[styles.sectionTitle, { color: theme.color }]}>{title}</Text>
#       </View>
#       {children}
#     </View>
#   );
# }

# const styles = StyleSheet.create({
#   container: { flex: 1, backgroundColor: '#F9FAFB' },
#   topBar: {
#     flexDirection: 'row',
#     justifyContent: 'space-between',
#     padding: 20,
#     backgroundColor: '#FFFFFF',
#     borderBottomColor: '#F3F4F6',
#     borderBottomWidth: 1,
#   },
#   logo: { fontSize: 22, fontWeight: '700', color: '#1E3A8A' },
#   greeting: {
#     fontSize: 24,
#     fontWeight: '700',
#     color: '#111827',
#     marginBottom: 16,
#     paddingLeft: 20,
#   },
#   content: { paddingBottom: 40 },
#   featureRow: {
#     flexDirection: 'row',
#     flexWrap: 'wrap',
#     justifyContent: 'space-around',
#     marginBottom: 20,
#     paddingHorizontal: 12,
#   },
#   featurePill: {
#     flexDirection: 'row',
#     alignItems: 'center',
#     paddingHorizontal: 12,
#     paddingVertical: 8,
#     borderRadius: 20,
#     marginVertical: 6,
#     gap: 6,
#   },
#   featureText: {
#     fontWeight: '600',
#     fontSize: 14,
#   },
#   section: {
#     marginBottom: 28,
#     paddingHorizontal: 20,
#   },
#   sectionHeaderWrap: {
#     flexDirection: 'row',
#     alignItems: 'center',
#     alignSelf: 'flex-start',
#     paddingHorizontal: 12,
#     paddingVertical: 6,
#     borderRadius: 20,
#     marginBottom: 14,
#     gap: 8,
#   },
#   sectionTitle: {
#     fontSize: 15,
#     fontWeight: '600',
#   },
#   roommateGrid: {
#     flexDirection: 'row',
#     flexWrap: 'wrap',
#     gap: 12,
#     justifyContent: 'space-between',
#   },
#   roommateCard: {
#     backgroundColor: '#E0F2FE',
#     width: '48%',
#     borderRadius: 14,
#     padding: 14,
#   },
#   roommateName: {
#     fontSize: 16,
#     fontWeight: '600',
#     color: '#1E40AF',
#   },
#   roommateStatus: {
#     fontSize: 12,
#     color: '#475569',
#     marginTop: 4,
#   },
#   pillCard: {
#     borderRadius: 20,
#     paddingVertical: 14,
#     paddingHorizontal: 16,
#     marginBottom: 12,
#     shadowColor: '#000',
#     shadowOffset: { width: 0, height: 1 },
#     shadowOpacity: 0.05,
#     shadowRadius: 4,
#     elevation: 1,
#   },
#   pillLabel: {
#     fontSize: 15,
#     fontWeight: '600',
#     color: '#111827',
#   },
#   pillSub: {
#     fontSize: 13,
#     color: '#6B7280',
#     marginTop: 4,
#   },
#   empty: {
#     fontSize: 14,
#     color: '#9CA3AF',
#     fontStyle: 'italic',
#   },
# });

