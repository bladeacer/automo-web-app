import io
import json
import requests
import imagehash
from PIL import Image
from flask import Blueprint, current_app, jsonify, request
from server.utils.auth import token_required

obj_det_bp = Blueprint('obj_det', __name__)

def get_image_hash(file_bytes):
    """Generates a perceptual hash for a given image byte stream."""
    img = Image.open(io.BytesIO(file_bytes))
    return str(imagehash.phash(img))

@obj_det_bp.route('/predictImage', methods=["POST"])
@token_required
def predict_image():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    file_data = file.read()
    
    # 1. Generate Cache Key using Image Hash
    img_hash = get_image_hash(file_data)
    cache_key = current_app.generate_cache_key(f"pred:{img_hash}")

    # 2. Check KeyDB Cache
    cached_res = current_app.cache.get(cache_key)
    if cached_res:
        return jsonify(json.loads(cached_res)), 200

    inf_url = current_app.config['INFERENCE_URL']
    
    try:
        # Cache Miss - Call Inference
        files = {'file': (file.filename, file_data, file.content_type)}
        response = requests.post(f"{inf_url}/predictImage", files=files, timeout=30)
        response.raise_for_status()
        data = response.json()

        current_app.cache.setex(cache_key, 3600, json.dumps(data))

        return jsonify(data), 200
    
    except Exception as e:
        return jsonify({"error": f"Inference service error: {str(e)}"}), 503

@obj_det_bp.route("/inpaint", methods=["POST"])
@token_required
def inpaint():
    image_file = request.files.get("image")
    mask_file = request.files.get("mask")

    if not image_file or not mask_file:
        return jsonify({"error": "Image and mask required"}), 400

    image_data = image_file.read()
    mask_data = mask_file.read()

    # Generate Combined Hash (Image + Mask)
    # We combine them so a different mask for the same image results in a different cache key
    combined_hash = f"{get_image_hash(image_data)}_{get_image_hash(mask_data)}"
    cache_key = current_app.generate_cache_key(f"inpaint:{combined_hash}")

    # Check Cache
    cached_res = current_app.cache.get(cache_key)
    if cached_res:
        return jsonify(json.loads(cached_res)), 200

    inf_url = current_app.config['INFERENCE_URL']
    print(f"DEBUG: Calling Inference at {inf_url}/inpaint")

    try:
        # Cache Miss
        files = {
            'image': (image_file.filename, image_data, image_file.content_type),
            'mask': (mask_file.filename, mask_data, mask_file.content_type)
        }
        
        response = requests.post(f"{inf_url}/inpaint", files=files, timeout=120)
        response.raise_for_status()
        data = response.json()

        # Save to KeyDB (Inpainting is expensive, so we cache it)
        current_app.cache.setex(cache_key, 3600, json.dumps(data))

        return jsonify(data), 200

    except Exception as e:
        return jsonify({"error": f"Inpainting service error: {str(e)}"}), 503

@obj_det_bp.route('/health', methods=['GET'])
@token_required
def proxy_health():
    inf_url = current_app.config['INFERENCE_URL']
    try:
        r = requests.get(f"{inf_url}/health", timeout=5)
        return jsonify(r.json()), r.status_code
    except Exception as e:
        return jsonify({"status": "offline", "error": str(e)}), 503
