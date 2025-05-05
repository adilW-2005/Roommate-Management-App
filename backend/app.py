from flask import Flask
from flask_cors import CORS
from extensions import db
from flask_migrate import Migrate 
from flask_jwt_extended import JWTManager
import os

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL", "postgresql://postgres:Adil2125@localhost:5432/RoomSync")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# JWT configuration - use a strong secret key in production!
app.config['JWT_SECRET_KEY'] = 'new-super-secret-key-12'


db.init_app(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)

from models import *
from routes import routes
from expense_routes import expense_routes
app.register_blueprint(expense_routes)
app.register_blueprint(routes)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host="0.0.0.0", port=5001)


