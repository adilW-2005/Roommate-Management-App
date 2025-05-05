from extensions import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

class Group(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    invite_code = db.Column(db.String(10), unique=True, nullable=False)
    # One-to-many relationship: a group has many users.
    users = db.relationship('User', backref='group', lazy=True)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey('group.id'), nullable=True)
    status = db.Column(db.String(50), default='home')  # options: 'home', 'busy', 'away', 'dnd', etc.

    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Chore(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    
    group_id = db.Column(db.Integer, db.ForeignKey('group.id'))
    assigned_to = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    last_updated_by = db.Column(db.Integer, db.ForeignKey('user.id'))
    
    type = db.Column(db.String(20), nullable=False)  # 'recurring', 'as_needed', 'one_time'
    # New fields for recurring options:
    repeat_type = db.Column(db.String(20), nullable=True)  # 'daily', 'weekly', 'monthly', 'custom'
    recurring_days = db.Column(db.Text, nullable=True)  # For weekly: JSON list of days (e.g. '["Monday", "Thursday"]')
    custom_days = db.Column(db.Integer, nullable=True)  # For custom: number of days between occurrences
    
    due_date = db.Column(db.String(100), nullable=True)  # ISO string (YYYY-MM-DD)
    status = db.Column(db.String(50), default='inactive')  # 'inactive', 'active', 'needed_now'
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)

    group_id = db.Column(db.Integer, db.ForeignKey('group.id'), nullable=False)
    paid_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    splits = db.relationship('ExpenseSplit', backref='expense', lazy=True, cascade='all, delete-orphan')

    is_recurring = db.Column(db.Boolean, default=False)
    recurrence_type = db.Column(db.String(20))  # 'monthly', 'weekly', etc.
    next_due_date = db.Column(db.Date)  # when the next one should auto-generate

class ExpenseSplit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey('expense.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)  # how much they owe

class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey('expense.id'), nullable=False)
    from_user = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    to_user = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey('group.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class InventoryItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)

    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey('group.id'), nullable=False)

    category = db.Column(db.String(50))  # Optional, like "Kitchen"
    custom_type = db.Column(db.String(50))  # Optional, like "Snacks I Don't Share"

    quantity = db.Column(db.Integer, default=1)
    is_shared = db.Column(db.Boolean, default=False)
    notes = db.Column(db.Text)  # Optional: "Don’t touch, this expires soon"
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class CalendarEvent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    group_id = db.Column(db.Integer, db.ForeignKey('group.id'), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime)
    is_all_day = db.Column(db.Boolean, default=False)
    is_reminder = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
