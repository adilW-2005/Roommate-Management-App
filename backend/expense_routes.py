from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Expense, ExpenseSplit, Payment, User, Group, InventoryItem
from datetime import datetime
from sqlalchemy import func


expense_routes = Blueprint('expense_routes', __name__)

@expense_routes.route('/expense/create', methods=['POST'])
@jwt_required()
def create_expense():
    data = request.json
    current_user_id = get_jwt_identity()

    required_fields = ['description', 'amount', 'group_id']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
        
    expense = Expense(
        description=data['description'],
        amount = data['amount'],
        group_id = data['group_id'],
        paid_by = current_user_id,
        created_at = datetime.utcnow()
    )
    db.session.add(expense)
    db.session.flush()
    
    split_type = data.get('split_type', 'equal')  # 'equal' or 'custom'
    splits_data = data.get('splits')  # For custom: list of {'user_id': ..., 'amount': ...}

    if split_type == 'equal':
        users = User.query.filter_by(group_id=data['group_id']).all()
        if not users:
            return jsonify({'error': 'No users in group to split with'}), 400
        
        split_amount = round(data['amount'] / len(users), 2)

        for user in users:
            split = ExpenseSplit(
                expense_id=expense.id,
                user_id=user.id,
                amount=split_amount
            )
            db.session.add(split)

    elif split_type == 'custom':
        if not splits_data or not isinstance(splits_data, list):
            return jsonify({'error': 'Custom splits must be a list of user_id and amount'}), 400

        total_split = sum([s['amount'] for s in splits_data])
        if round(total_split, 2) != round(data['amount'], 2):
            return jsonify({'error': 'Split amounts must equal total amount'}), 400

        for s in splits_data:
            split = ExpenseSplit(
                expense_id=expense.id,
                user_id=s['user_id'],
                amount=s['amount']
            )
            db.session.add(split)

    else:
        return jsonify({'error': 'Invalid split_type'}), 400

    db.session.commit()
    return jsonify({'message': 'Expense created with splits', 'expense_id': expense.id}), 201

@expense_routes.route('/expenses/balances/<int:group_id>', methods=['GET'])
@jwt_required()
def get_balances(group_id):
    users = User.query.filter_by(group_id=group_id).all()
    balances = {user.id: 0 for user in users}

    expenses = Expense.query.filter_by(group_id=group_id).all()
    for exp in expenses:
        paid_by = exp.paid_by
        splits = ExpenseSplit.query.filter_by(expense_id=exp.id).all()
        for split in splits:
            balances[split.user_id] -= split.amount
        balances[paid_by] += exp.amount

    payments = Payment.query.filter_by(group_id=group_id).all()
    for pay in payments:
        balances[pay.from_user] += pay.amount
        balances[pay.to_user] -= pay.amount

    # convert to a list with user info
    result = []
    for user in users:
        result.append({
            'user_id': user.id,
            'name': user.name,
            'balance': round(balances[user.id], 2)
        })
    return jsonify(result)

@expense_routes.route('/expenses/pay', methods=['POST'])
@jwt_required()
def record_payment():
    data = request.get_json(force=True) or {}

    # ensure required fields are present
    missing = [k for k in ('to_user','amount','group_id') if k not in data]
    if missing:
        return jsonify({
            'error': f'Missing parameter(s): {", ".join(missing)}'
        }), 400

    from_user = get_jwt_identity()

    payment = Payment(
        expense_id = data['expense_id'],
        from_user=from_user,
        to_user=data['to_user'],
        amount=data['amount'],
        group_id=data['group_id'],
        created_at=datetime.utcnow()
    )
    db.session.add(payment)
    db.session.commit()
    return jsonify({'message': 'Payment recorded'}), 201


@expense_routes.route('/expenses/history/<int:group_id>')
@jwt_required()
def expense_history(group_id):
    current_user = get_jwt_identity()
    expenses = Expense.query.filter_by(group_id=group_id).order_by(Expense.created_at.desc()).all()
    results = []

    for e in expenses:
        payer = User.query.get(e.paid_by)
        splits = ExpenseSplit.query.filter_by(expense_id=e.id).all()

        owes = []
        for s in splits:
            if s.user_id == e.paid_by:
                continue

            # how much has already been paid back on this split?
            paid_back = db.session.query(func.coalesce(func.sum(Payment.amount),0)) \
                .filter_by(
                  expense_id=e.id,
                  from_user=s.user_id,
                  to_user=payer.id
                ).scalar()

            remaining = round(s.amount - paid_back, 2)
            if remaining > 0:
                debtor = User.query.get(s.user_id)
                owes.append({
                  "from": {"user_id": debtor.id, "name": debtor.name},
                  "to":   {"user_id": payer.id,  "name": payer.name},
                  "amount": remaining
                })

        if owes:
            results.append({
              'expense_id':   e.id,
              'description':  e.description,
              'total_amount': e.amount,
              'paid_by':      {"user_id": payer.id, "name": payer.name},
              'created_at':   e.created_at.isoformat(),
              'owes': owes
            })

    return jsonify(results)

@expense_routes.route('/expenses/me', methods=['GET'])
@jwt_required()
def my_expense_history():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    paid = 0
    owed = 0
    owed_by = 0
    owes_to = []
    owed_by_list = []

    # Expenses I paid
    expenses_paid = Expense.query.filter_by(paid_by=current_user_id).all()
    for e in expenses_paid:
        paid += e.amount
        splits = ExpenseSplit.query.filter_by(expense_id=e.id).all()
        for s in splits:
            if s.user_id != current_user_id:
                owed_by += s.amount
                debtor = User.query.get(s.user_id)
                owed_by_list.append({
                    'user_id': debtor.id,
                    'name': debtor.name,
                    'amount': round(s.amount, 2),
                    'expense': {
                        'id': e.id,
                        'description': e.description,
                        'total': e.amount
                    }
                })

    # Expenses I owe (not paid by me)
    my_splits = ExpenseSplit.query.filter_by(user_id=current_user_id).all()
    for s in my_splits:
        e = Expense.query.get(s.expense_id)
        if e.paid_by != current_user_id:
            owed += s.amount
            creditor = User.query.get(e.paid_by)
            owes_to.append({
                'user_id': creditor.id,
                'name': creditor.name,
                'amount': round(s.amount, 2),
                'expense': {
                    'id': e.id,
                    'description': e.description,
                    'total': e.amount
                }
            })

    payments_made = Payment.query.filter_by(from_user=current_user_id).all()
    payments_received = Payment.query.filter_by(to_user=current_user_id).all()

    paid_back = sum([p.amount for p in payments_made])
    received = sum([p.amount for p in payments_received])

    return jsonify({
        'user_id': current_user_id,
        'name': user.name,
        'total_paid': round(paid, 2),
        'total_owed_to_others': round(owed - paid_back, 2),
        'total_others_owe_me': round(owed_by - received, 2),
        'payments_made': round(paid_back, 2),
        'payments_received': round(received, 2),
        'details': {
            'owes_to': owes_to,
            'owed_by': owed_by_list
        }
    })


@expense_routes.route('/expenses/summary/<int:group_id>', methods=['GET'])
@jwt_required()
def group_summary(group_id):
    users = User.query.filter_by(group_id=group_id).all()
    user_map = {u.id: u.name for u in users}
    balances = {u.id: 0 for u in users}

    # Compute net balance
    expenses = Expense.query.filter_by(group_id=group_id).all()
    for exp in expenses:
        splits = ExpenseSplit.query.filter_by(expense_id=exp.id).all()
        for s in splits:
            balances[s.user_id] -= s.amount
        balances[exp.paid_by] += exp.amount

    payments = Payment.query.filter_by(group_id=group_id).all()
    for p in payments:
        balances[p.from_user] += p.amount
        balances[p.to_user] -= p.amount

    # Minimize cash flow
    creditors = [(uid, bal) for uid, bal in balances.items() if bal > 0]
    debtors = [(uid, -bal) for uid, bal in balances.items() if bal < 0]

    summary = []
    i, j = 0, 0
    while i < len(debtors) and j < len(creditors):
        debtor_id, debt = debtors[i]
        creditor_id, credit = creditors[j]
        paid = min(debt, credit)

        summary.append({
            'from': {'user_id': debtor_id, 'name': user_map[debtor_id]},
            'to': {'user_id': creditor_id, 'name': user_map[creditor_id]},
            'amount': round(paid, 2)
        })

        debtors[i] = (debtor_id, debt - paid)
        creditors[j] = (creditor_id, credit - paid)
        if debtors[i][1] == 0: i += 1
        if creditors[j][1] == 0: j += 1

    return jsonify(summary)

@expense_routes.route('/inventory/add', methods=['POST'])
@jwt_required()
def inventory_add():
    data = request.get_json()
    owner_id = get_jwt_identity()

    required_fields = ['name', 'group_id']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400
        
    item = InventoryItem(
        name = data['name'],
        owner_id = owner_id,
        group_id = data['group_id'],
        category = data.get('category'),       # optional
        custom_type = data.get('custom_type'), # optional
        quantity = data.get('quantity', 1),
        is_shared = data.get('is_shared', False),
        notes = data.get('notes'),
        created_at = datetime.utcnow()
    )

    db.session.add(item)
    db.session.commit()

    return jsonify({'message': 'Item added to inventory', 'item_id': item.id}), 201


@expense_routes.route('/inventory/me', methods=['GET'])
@jwt_required()
def get_my_inventory():
    current_user_id = get_jwt_identity()
    items = InventoryItem.query.filter_by(owner_id=current_user_id).all()

    results = [{
        "id": item.id,
        "name": item.name,
        "quantity": item.quantity,
        "category": item.category,
        "custom_type": item.custom_type,
        "is_shared": item.is_shared,
        "notes": item.notes,
        "created_at": item.created_at.isoformat()
    } for item in items]

    return jsonify(results), 200

@expense_routes.route('/inventory/group/<int:group_id>', methods=['GET'])
@jwt_required()
def get_group_inventory(group_id):
    items = InventoryItem.query.filter_by(group_id=group_id).all()

    results = [{
        "id": item.id,
        "name": item.name,
        "owner_id": item.owner_id,
        "owner_name": User.query.get(item.owner_id).name,
        "quantity": item.quantity,
        "category": item.category,
        "custom_type": item.custom_type,
        "is_shared": item.is_shared,
        "notes": item.notes,
        "created_at": item.created_at.isoformat()
    } for item in items]

    return jsonify(results), 200

@expense_routes.route('/expenses/recurring/create', methods=['POST'])
@jwt_required()
def create_recurring_expense():
    data = request.get_json()
    current_user_id = get_jwt_identity()

    required_fields = ['description', 'amount', 'group_id']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'{field} is required'}), 400

    # Optional recurrence details
    is_recurring = data.get('is_recurring', True)
    recurrence_type = data.get('recurrence_type', 'monthly')  # only 'monthly' for now
    next_due_date = data.get('next_due_date')
    if not next_due_date:
        next_due_date = (datetime.utcnow().date().replace(day=1) + timedelta(days=32)).replace(day=1)

    expense = Expense(
        description=data['description'],
        amount=data['amount'],
        group_id=data['group_id'],
        paid_by=current_user_id,
        created_at=datetime.utcnow(),
        is_recurring=is_recurring,
        recurrence_type=recurrence_type,
        next_due_date=next_due_date
    )
    db.session.add(expense)
    db.session.flush()

    # Splitting logic
    split_type = data.get('split_type', 'equal')
    splits_data = data.get('splits')

    if split_type == 'equal':
        users = User.query.filter_by(group_id=data['group_id']).all()
        if not users:
            return jsonify({'error': 'No users in group to split with'}), 400
        
        split_amount = round(data['amount'] / len(users), 2)
        for user in users:
            db.session.add(ExpenseSplit(
                expense_id=expense.id,
                user_id=user.id,
                amount=split_amount
            ))
    elif split_type == 'custom':
        if not splits_data or not isinstance(splits_data, list):
            return jsonify({'error': 'Custom splits must be a list of user_id and amount'}), 400

        total_split = sum([s['amount'] for s in splits_data])
        if round(total_split, 2) != round(data['amount'], 2):
            return jsonify({'error': 'Split amounts must equal total amount'}), 400

        for s in splits_data:
            db.session.add(ExpenseSplit(
                expense_id=expense.id,
                user_id=s['user_id'],
                amount=s['amount']
            ))
    else:
        return jsonify({'error': 'Invalid split_type'}), 400

    db.session.commit()

    return jsonify({
        'message': 'Recurring expense created',
        'expense_id': expense.id,
        'next_due_date': str(next_due_date)
    }), 201

from dateutil.relativedelta import relativedelta

@expense_routes.route('/expenses/recurring/generate', methods=['POST'])
def generate_recurring_expenses():
    today = datetime.utcnow().date()
    recurring_expenses = Expense.query.filter(
        Expense.is_recurring == True,
        Expense.next_due_date <= today
    ).all()

    for old_exp in recurring_expenses:
        # Clone the original expense
        new_exp = Expense(
            description=old_exp.description,
            amount=old_exp.amount,
            group_id=old_exp.group_id,
            paid_by=old_exp.paid_by,
            is_recurring=True,
            recurrence_type='monthly',
            created_at=datetime.utcnow(),
            next_due_date=(old_exp.next_due_date + relativedelta(months=1))
        )
        db.session.add(new_exp)
        db.session.flush()

        # Clone splits
        splits = ExpenseSplit.query.filter_by(expense_id=old_exp.id).all()
        for s in splits:
            db.session.add(ExpenseSplit(
                expense_id=new_exp.id,
                user_id=s.user_id,
                amount=s.amount
            ))

        # Update old expense
        old_exp.next_due_date += relativedelta(months=1)

    db.session.commit()
    return jsonify({'message': 'Recurring expenses generated successfully'}), 200

