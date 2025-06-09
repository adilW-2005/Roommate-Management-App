#!/bin/bash

# This script automates the setup of the RoomSync project for development or analysis by a coding agent.
# It is designed to be run on a Debian/Ubuntu-based Linux environment (like the one used by Codex).

echo "--- RoomSync Project Setup Script (for Linux) ---"

# Ensure the script is run as root
if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root. Please use sudo." >&2
  exit 1
fi

# Step 1: Update package lists and install base dependencies
echo "--- Step 1: Installing base dependencies ---"
apt-get update
apt-get install -y curl git python3 python3-pip python3-venv build-essential

# Step 2: Install Node.js (v20.x via NodeSource)
echo "--- Step 2: Installing Node.js v20.x ---"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
echo "Node.js installed."

# Step 3: Verify Node.js and npm installation
echo "--- Step 3: Verifying Node.js and npm versions ---"
node -v
npm -v

# Step 4: Install Expo CLI globally
echo "--- Step 4: Installing Expo CLI ---"
npm install -g @expo/cli
echo "Expo CLI installed."

# Step 5: Install project dependencies
echo "--- Step 5: Setting up project dependencies ---"

# Frontend setup
echo "Setting up React Native frontend..."
cd Frontend || { echo "Frontend directory not found"; exit 1; }
npm install --unsafe-perm
echo "Frontend dependencies installed."

# Backend setup
echo "Setting up Python Flask backend..."
cd ../backend || { echo "Backend directory not found"; exit 1; }

# Create Python virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies (assuming requirements.txt exists or install common Flask deps)
echo "Installing Python dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    # Install common Flask dependencies
    pip install flask flask-sqlalchemy flask-cors werkzeug python-dotenv
fi

echo "Backend dependencies installed."

# Step 6: Create environment configuration
echo "--- Step 6: Setting up environment configuration ---"
cd ..

# Create .env file for backend if it doesn't exist
if [ ! -f "backend/.env" ]; then
    echo "Creating backend .env file..."
    cat > backend/.env << EOF
FLASK_APP=app.py
FLASK_ENV=development
DATABASE_URL=sqlite:///roomsync.db
SECRET_KEY=your-secret-key-here
EOF
fi

# Step 7: Initialize database (if needed)
echo "--- Step 7: Initializing database ---"
cd backend
source venv/bin/activate
python3 -c "
import sys
sys.path.append('.')
try:
    from app import app
    from extensions import db
    with app.app_context():
        db.create_all()
    print('Database initialized successfully.')
except Exception as e:
    print(f'Database initialization failed: {e}')
    print('This is normal if the database already exists.')
"

# Step 8: Create startup scripts
echo "--- Step 8: Creating startup scripts ---"
cd ..

# Create frontend startup script
cat > start_frontend.sh << 'EOF'
#!/bin/bash
cd Frontend
echo "Starting React Native development server..."
npm start
EOF

# Create backend startup script
cat > start_backend.sh << 'EOF'
#!/bin/bash
cd backend
source venv/bin/activate
echo "Starting Flask development server..."
python3 app.py
EOF

# Make scripts executable
chmod +x start_frontend.sh start_backend.sh

# Step 9: Display network information
echo "--- Step 9: Network Configuration ---"
echo "Current IP addresses:"
hostname -I
echo ""
echo "Make sure to update the API_BASE_URL in Frontend/app/services/api.js"
echo "Current setting should be updated to match your network IP."

# Step 10: Create project documentation for the agent
echo "--- Step 10: Creating agent documentation ---"
cat > AGENT_README.md << 'EOF'
# RoomSync - Agent Development Guide

## Quick Start
1. Start backend: `./start_backend.sh`
2. Start frontend: `./start_frontend.sh`
3. Update IP in `Frontend/app/services/api.js` if needed

## Project Structure
- `Frontend/`: React Native app with Expo
- `backend/`: Python Flask API
- `Frontend/app/services/api.js`: API configuration (update IP here)

## Key Commands
```bash
# Frontend
cd Frontend && npm start              # Start Expo dev server
cd Frontend && npm run android        # Run on Android
cd Frontend && npm run ios           # Run on iOS

# Backend
cd backend && source venv/bin/activate && python3 app.py

# Database
cd backend && source venv/bin/activate && python3 -c "from app import app; from extensions import db; app.app_context().push(); db.create_all()"
```

## API Endpoints
- Auth: `/auth/login`, `/auth/register`, `/me`
- Groups: `/groups/create`, `/groups/join`, `/groups/{id}/users`
- Chores: `/chores/create`, `/chores/user/{id}`, `/chores/group/{id}`
- Expenses: `/expense/create`, `/expenses/history/{id}`, `/expenses/pay`
- Calendar: `/calendar/create`, `/calendar/group/{id}`
- Inventory: `/inventory/add`, `/inventory/group/{id}`

## Development Notes
- Backend runs on port 5001
- Frontend connects via IP address (not localhost)
- Database is SQLite (file: backend/roomsync.db)
- Authentication uses JWT tokens
- All API calls go through Frontend/app/services/api.js

## Common Issues
1. **Connection errors**: Update IP in api.js
2. **Database errors**: Reinitialize with command above
3. **Port conflicts**: Change port in backend/app.py
4. **Dependencies**: Reinstall with npm/pip commands

## Testing
- Test API: Use the testConnection() function in api.js
- Test auth: Login with any email/password to see if backend responds
- Test network: Check that mobile device can reach backend IP
EOF

echo "--- Setup Complete! ---"
echo ""
echo "🎉 RoomSync is now ready for development!"
echo ""
echo "Next steps:"
echo "1. Update the IP address in Frontend/app/services/api.js to match your network"
echo "2. Start the backend server: ./start_backend.sh"
echo "3. Start the frontend server: ./start_frontend.sh"
echo "4. Check AGENT_README.md for detailed development information"
echo ""
echo "The project is now ready for analysis or development by your coding agent." 