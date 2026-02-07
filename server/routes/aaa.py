from flask import Blueprint, request, jsonify, current_app
import pandas as pd
import numpy as np
import pickle
import json
import hashlib
from io import BytesIO
from openai import OpenAI
from server.utils.auth import token_required

order_bp = Blueprint('order_model', __name__)

SAFETY_STOCK = 10
TARGET_DAYS = 30
DEFAULT_LEAD_TIME = 14
REQUIRED_COLUMNS = {'supersedeno', 'description', 'qty'}

MODEL_PATH = "server/models/auto_reorder_model.pkl"
try:
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
except FileNotFoundError:
    model = None

def get_genai_client():
    api_key = current_app.config.get('OPENAI_API_KEY')
    return OpenAI(api_key=api_key) if api_key else None

def call_genai_explanation(client, record):
    """Encapsulated GenAI call with error handling."""
    try:
        prompt = (
            f"Explain why part {record['part_name']} needs {record['reorder_qty']} units. "
            f"Current stock: {record['stock']}, daily demand: {record['avg_daily_demand']:.2f}."
        )
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a supply chain expert. Be brief."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=100
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return "Manual review suggested: Stock below safety threshold."

@order_bp.route("/predict-reorder", methods=["POST"])
@token_required
def predict_reorder():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files["file"]
    if not file.filename.lower().endswith('.csv'):
        return jsonify({"error": "Only CSV files are allowed"}), 415

    try:
        file_content = file.read()
        
        file_hash = hashlib.md5(file_content).hexdigest()
        cache_key = f"reorder_v1_{file_hash}"
        cached_data = current_app.cache.get(cache_key)
        if cached_data:
            return jsonify(json.loads(cached_data)), 200

        df = pd.read_csv(BytesIO(file_content))
        df.columns = df.columns.str.lower()
        
        missing = REQUIRED_COLUMNS - set(df.columns)
        if missing:
            return jsonify({"error": f"Missing columns: {', '.join(missing)}"}), 400

        df['stock'] = pd.to_numeric(df['qty'], errors='coerce').fillna(0)
        df['sold'] = pd.to_numeric(df.get('total_units_sold', 0), errors='coerce').fillna(0)
        
        df['avg_daily_demand'] = df['sold'] / 30
        df['lead_time'] = DEFAULT_LEAD_TIME
        
        if model is None:
            return jsonify({"error": "Prediction model not initialized"}), 500
            
        X = df[['stock', 'avg_daily_demand', 'lead_time']]
        df['prediction'] = model.predict(X)

        df['target_stock'] = (df['avg_daily_demand'] * TARGET_DAYS) + SAFETY_STOCK
        df['reorder_qty'] = (df['target_stock'] - df['stock']).clip(lower=0).round().astype(int)

        client = get_genai_client()
        final_results = []
        
        for record in df.to_dict(orient="records"):
            res = {
                "partno": str(record.get("supersedeno")),
                "part_name": record.get("description"),
                "stock": record["stock"],
                "reorder_qty": record["reorder_qty"],
                "prediction": int(record["prediction"])
            }
            
            if res["reorder_qty"] > 0:
                res["genai_message"] = call_genai_explanation(client, record) if client else "Reorder recommended."
            else:
                res["genai_message"] = "Inventory sufficient."
                
            final_results.append(res)

        current_app.cache.setex(cache_key, 86400, json.dumps(final_results))
        
        return jsonify(final_results), 200

    except Exception as e:
        return jsonify({"error": f"Server Error: {str(e)}"}), 500
