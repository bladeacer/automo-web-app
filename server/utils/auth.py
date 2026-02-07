from functools import wraps
from flask import request, jsonify, g, current_app
import jwt
from server.models.user import User

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=["HS256"])
            g.token_sub = data.get('sub')
            g.current_user = User.query.filter_by(username=g.token_sub).first()
            
            if not g.current_user and g.token_sub != 'internal_proxy':
                return jsonify({'error': 'User not found'}), 401
                
        except Exception as e:
            return jsonify({'error': f'Invalid token: {str(e)}'}), 401
            
        return f(*args, **kwargs)
    return decorated

def _get_proxy_token():
    return current_app.generate_token()
