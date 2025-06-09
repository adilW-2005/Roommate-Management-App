#!/bin/bash

# RoomSync Quick Setup Script - Copy and paste this entire script

echo "🚀 Setting up RoomSync..."

# Install system dependencies
sudo apt-get update
sudo apt-get install -y curl git python3 python3-pip python3-venv nodejs npm

# Install Expo CLI globally
sudo npm install -g @expo/cli

# Setup Frontend
echo "📱 Setting up Frontend..."
cd Frontend
npm install
cd ..

# Setup Backend
echo "🔧 Setting up Backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install flask flask-sqlalchemy flask-cors werkzeug python-dotenv pyjwt
python3 -c "
try:
    from app import app
    from extensions import db
    with app.app_context():
        db.create_all()
    print('✅ Database initialized')
except:
    print('⚠️  Database setup skipped (may already exist)')
"
cd ..

# Create start scripts
echo '#!/bin/bash
cd Frontend && npm start' > start_frontend.sh

echo '#!/bin/bash
cd backend && source venv/bin/activate && python3 app.py' > start_backend.sh

chmod +x start_frontend.sh start_backend.sh

echo "✅ Setup complete!"
echo "📝 Don't forget to update the IP address in Frontend/app/services/api.js"
echo "🚀 Start backend: ./start_backend.sh"
echo "📱 Start frontend: ./start_frontend.sh" 