import os
import sys
import datetime
import jwt
import redis
from functools import wraps
from pathlib import Path
from flask import Flask, request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
from waitress import serve
from dotenv import load_dotenv
from flask_cors import CORS
from server.extensions import db
from server.models.user import User
from server.utils.auth import token_required

# Pathing
project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))
load_dotenv(project_root / ".env")

app = Flask(__name__)

# Cors configuration
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5111", "http://127.0.0.1:5111", "http://localhost:8081", "http://127.0.0.1:8081", "http://127.0.0.1:5001", "http://localhost:5001"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
        "expose_headers": ["Content-Type", "Authorization", "Content-Disposition"]
    }
})

# App configuration, can be passed to child routes
app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "dev-secret-key")

app.config['MODEL_API_URL'] = os.getenv("MODEL_API_URL", "http://ts-model-api:5000")
app.config['INFERENCE_URL'] = os.getenv("INFERENCE_API_URL", "http://inference-api:5001")
app.config['KEYDB_URL'] = os.getenv("KEYDB_URL", "redis://cache-db:6379/0")

app.config['GEMINI_API_KEY'] = os.getenv('GEMINI_API_KEY')
app.config['OPENAI_API_KEY'] = os.getenv('OPENAI_API_KEY')

db_path = Path(__file__).parent / "users.db"
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{db_path}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
os.environ["ULTRALYTICS_NO_AUTOUPDATE"] = "1"

db.init_app(app)

with app.app_context():
    db.create_all()

# KeyDB cache
cache = redis.Redis.from_url(
    app.config['KEYDB_URL'], 
    decode_responses=True
)
app.cache = cache

# Global cache key helper
def generate_cache_key(prefix="view", *args):
    """
    Constructs a unique cache key.
    Usage: generate_cache_key("forecast", steps)
    Result: "view:/ts-model/forecast:12"
    """
    key_parts = [prefix, request.path]
    
    for arg in args:
        key_parts.append(str(arg))
        
    return ":".join(key_parts)

app.generate_cache_key = generate_cache_key

@app.route('/health/cache', methods=['GET'])
def cache_health():
    try:
        # ping() returns True if KeyDB is alive
        status = app.cache.ping()
        return jsonify({'cache_status': 'connected' if status else 'down'}), 200
    except Exception as e:
        return jsonify({'cache_status': 'error', 'message': str(e)}), 500

def generate_token():
    """Generates a token for this server to talk to the Model API."""
    return jwt.encode({
        'sub': 'internal_proxy',
        'iat': datetime.datetime.now(datetime.timezone.utc),
        'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=5)
    }, app.config['SECRET_KEY'], algorithm='HS256')

# Attach to app object so Blueprints can access via current_app
app.generate_token = generate_token

# --- ROUTES ---
@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for Makefile/Tests"""
    return jsonify({'status': 'alive'}), 200

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400

    user = User.query.filter_by(username=data.get('username')).first()
    
    if user and check_password_hash(user.password, data.get('password')):
        token = jwt.encode({
            'sub': user.username,
            'iat': datetime.datetime.now(datetime.timezone.utc),
            'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)
        }, app.config['SECRET_KEY'], algorithm='HS256')

        return jsonify({
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'fullName': user.name,
            'authority': [''],
            'access_token': token
        })
    
    # Use generic message to prevent username enumeration
    return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not all(k in data for k in ('username', 'email', 'password')):
        return jsonify({"error": "Required fields missing"}), 400

    if User.query.filter_by(username=data.get('username')).first():
        return jsonify({"error": "Username already exists"}), 400
    
    hashed_password = generate_password_hash(data['password'], method='scrypt')
    
    new_user = User(
        username=data.get('username'), 
        email=data.get('email'), 
        name=data.get('name'), 
        password=hashed_password
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"message": "User created"}), 201


# --- ROUTES ---

@app.route('/update-user', methods=['PUT'])
@token_required
def update_user():
    # Use g.current_user instead of an argument
    if not g.current_user:
        return jsonify({"error": "Admin/Proxy cannot update profiles"}), 403

    data = request.get_json()
    identifier = data.get('currentUsername')
    user = User.query.filter_by(name=identifier).first()

    if not user or user.username != g.current_user.username:
        return jsonify({"error": "Unauthorized or User not found"}), 403

    if 'fullName' in data: user.name = data.get('fullName')
    if 'email' in data: user.email = data.get('email')

    db.session.commit()
    return jsonify({"message": "Profile updated"}), 200

@app.route('/delete-user', methods=['DELETE'])
@token_required
def delete_user():
    data = request.get_json()
    identifier = data.get('username')
    user = User.query.filter_by(name=identifier).first()
    
    if not user:
        return jsonify({"error": "User not found"}), 404

    is_self = g.current_user and user.username == g.current_user.username
    is_proxy = g.token_sub == 'internal_proxy'

    if not (is_self or is_proxy):
        return jsonify({"error": "Unauthorized"}), 403

    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "Account deleted"}), 200

# Blueprints: Sub-routes
from server.routes.bladeacer_sarima_ts import sarima_web_bp
from server.routes.ft_obj_det import obj_det_bp
from server.routes.aaa import order_bp

app.register_blueprint(sarima_web_bp, url_prefix='/ts-model')
app.register_blueprint(obj_det_bp, url_prefix='/obj-det')
app.register_blueprint(order_bp, url_prefix='/order-model')

if __name__ == "__main__":
    host = '0.0.0.0'
    port = int(os.environ.get("PORT", 8080))
    is_dev = os.getenv("FLASK_ENV", "production").lower() == "development"

    if is_dev:
        print(f"--- Running in DEVELOPMENT mode ---")
        app.run(host=host, port=port, debug=True, threaded=True)
    else:
        print(f"--- Running in PRODUCTION mode with Waitress ---")
        serve(app, host=host, port=port, threads=8)
