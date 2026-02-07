import time
import io
import markdown
import os
import requests
import json
import subprocess
from flask import Blueprint, jsonify, request, current_app, Response, stream_with_context, send_file
from google import genai
from google.genai import types
from weasyprint import HTML
from server.utils.auth import token_required, _get_proxy_token

sarima_web_bp = Blueprint('ts_model', __name__)
DEFAULT_REPORT_CONFIG = {
    "temperature": 0.1,
    "top_p": 0.95,
    "max_output_tokens": 2500,
    "system_prompt": """### Role & Objective
You are a Senior Data Scientist. Transform SARIMA model outputs into a deep-dive Executive Summary for non-technical stakeholders.

### Contextual Parameters
- Dataset: New Car Registrations by Make (Jan 2016 – May 2025) from data.gov.sg.
- Analysis: Compare 12-month (short-term) vs 48-month (long-term) projections.
- Language: Formal British English. 

### Writing Style (Critical for Length)
- To reach the length requirement, provide deep qualitative analysis. 
- For every statistical trend identified, explain the potential economic "why" behind it.
- Use analogies to explain the SARIMA process (e.g., "The model acts as a predictor looking at both the immediate patterns and long term trends").
- Analogies should be sufficiently professional in the context of the report.

### Structural Requirements (Markdown)
1. Executive Context: Elaborate on the dataset's history and the v4 iteration of this model.
2. Historical Performance: Detail at least three distinct historical phases. Pre-Covid growth, Lockdown era and current recovery phase.
3. Model Integrity: Discuss RMSE, Thiel's U and MAE in depth; explain what these values mean for business risk.
4. Forecast Projections: A high-detail walkthrough of predicted peaks and troughs.
5. Strategic Business Impact: Provide 3 expanded, actionable strategic pillars.

### Formatting Constraints
- Sentence Structure: Maximum of TWO commas per sentence (slightly relaxed to allow for more descriptive flow).
- Paragraphs: 4-5 sentences per paragraph.
- Total Word Count: MUST BE BETWEEN 800 AND 1000 WORDS. If you are under, expand on the 'Strategic Business Impact' section.

### Mandatory Disclaimer
Append at the very bottom: 
'DISCLAIMER: This analysis is AI-generated for informational purposes. Cross-reference these findings with secondary market sources before finalising significant business decisions.'
"""
}

@sarima_web_bp.route('/forecast', methods=['GET'])
@token_required
def get_forecast():
    # We call the decorator and pass the actual handler
    # The decorator returns a function, which we then call with ()
    steps = request.args.get('steps', default=12, type=int)

    # Request.path gives clean url, e.g. /ts-model/forecast
    cache_key = current_app.generate_cache_key("forecast", steps)

    cached_response = current_app.cache.get(cache_key)
    if cached_response:
        return jsonify(json.loads(cached_response)), 200

    # If cache fails
    api_url = current_app.config.get('MODEL_API_URL')
    internal_token = _get_proxy_token()

    try:
        r = requests.get(
            f"{api_url}/forecast",
            params={'steps': steps},
            headers={'Authorization': f'Bearer {internal_token}'},
            timeout=15
        )

        data = r.json()

        # Save to KeyDB (1 hour expiry)
        current_app.cache.setex(cache_key, 3600, json.dumps(data))

        return jsonify(data), r.status_code
    except Exception as e:
        return jsonify({"error": f"Upstream API failure: {str(e)}"}), 502

@sarima_web_bp.route('/history', methods=['GET'])
@token_required
def get_history():
    cache_key = current_app.generate_cache_key("history")

    cached_response = current_app.cache.get(cache_key)
    if cached_response:
        return jsonify(json.loads(cached_response)), 200

    # 3. Cache Miss - Call Upstream
    api_url = current_app.config.get('MODEL_API_URL')
    internal_token = _get_proxy_token()

    try:
        r = requests.get(
            f"{api_url}/history",
            headers={'Authorization': f'Bearer {internal_token}'},
            timeout=10
        )
        r.raise_for_status()
        data = r.json()

        # 4. Save to KeyDB (Set for 24 hours / 86400 seconds)
        # History is static until the next data load, so long TTL is safe.
        current_app.cache.setex(cache_key, 86400, json.dumps(data))

        return jsonify(data), r.status_code

    except Exception as e:
        return jsonify({"error": f"Upstream API failure: {str(e)}"}), 502

@sarima_web_bp.route('/metrics', methods=['GET'])
@token_required
def get_metrics():
    api_url = current_app.config.get('MODEL_API_URL')
    internal_token = _get_proxy_token()
    try:
        r = requests.get(
            f"{api_url}/metrics",
            headers={'Authorization': f'Bearer {internal_token}'},
            timeout=10
        )
        return jsonify(r.json()), r.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 502

@sarima_web_bp.route('/health', methods=['GET'])
def health_check():
    api_url = current_app.config.get('MODEL_API_URL')
    health_data = {'status': 'alive', 'model_api': 'inactive'}
    try:
        r = requests.get(f"{api_url}/health", timeout=2)
        if r.status_code == 200 and r.json().get("status") == "ready":
            health_data['model_api'] = 'active'
    except:
        pass

    return jsonify(health_data), 200

@token_required
@sarima_web_bp.route('/report-defaults', methods=['GET'])
def get_report_defaults():
    return jsonify(DEFAULT_REPORT_CONFIG), 200

@token_required
@sarima_web_bp.route('/report-stream', methods=['GET'])
def stream_ai_report():
    force_refresh = request.args.get('refresh', default='false').lower() == 'true'
    cache_key = current_app.generate_cache_key("report")

    if not force_refresh:
        cached_report = current_app.cache.get(cache_key)
        if cached_report:
            return Response(cached_report, mimetype='text/markdown')

    def generate():
        api_url = current_app.config.get('MODEL_API_URL')
        token = _get_proxy_token()

        headers = {'Authorization': f'Bearer {token}'}
        full_response_text = []

        system_prompt = request.args.get('system_prompt') or DEFAULT_REPORT_CONFIG['system_prompt']
        temperature = request.args.get('temperature', 
                                       default=DEFAULT_REPORT_CONFIG['temperature'], 
                                       type=float)
        top_p = request.args.get('top_p', 
                                 default=DEFAULT_REPORT_CONFIG['top_p'], 
                                 type=float)

        try:
            metrics = requests.get(f"{api_url}/metrics", headers=headers).json()
            forecast_12 = requests.get(f"{api_url}/forecast", params={'steps': 12}, headers=headers).json()
            forecast_48 = requests.get(f"{api_url}/forecast", params={'steps': 48}, headers=headers).json()
        except Exception as e:
            yield f"Error gathering data: {str(e)}"
            return

        client = genai.Client(api_key=current_app.config.get('GEMINI_API_KEY'))

        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=temperature, 
            top_p=top_p,
            max_output_tokens=DEFAULT_REPORT_CONFIG['max_output_tokens']
        )

        user_input = (
            f"Detailed Analysis Request for the following data:\n"
            f"METRICS: {metrics}\n"
            f"SHORT-TERM FORECAST: {forecast_12}\n"
            f"LONG-TERM FORECAST: {forecast_48}\n"
        )

        max_retries = 3
        for attempt in range(max_retries):
            try:
                full_response_text = [] 
                response = client.models.generate_content_stream(
                    model="gemini-2.5-flash-lite",
                    contents=user_input,
                    config=config
                )

                for chunk in response:
                    if chunk.text:
                        full_response_text.append(chunk.text)
                        yield chunk.text
                break 

            except Exception as e:
                if "503" in str(e) and attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue
                else:
                    yield f"\n\n[Model Busy: Please try again.]"
                    return

        if full_response_text:
            current_app.cache.setex(cache_key, 86400, "".join(full_response_text))

    return Response(stream_with_context(generate()), mimetype='text/markdown')

@sarima_web_bp.route('/generate-pdf', methods=['POST'])
@token_required
def generate_pdf():
    data = request.get_json() or {}
    md_content = data.get('markdown', "Markdown content was found to be empty")
    cache_key = current_app.generate_cache_key("report_pdf_binary")

    # Attempt to serve cached PDF binary
    cached_pdf = current_app.cache.get(cache_key)
    if cached_pdf and not md_content:
        # We call this pdf_bytes here safely
        pdf_bytes = cached_pdf if isinstance(cached_pdf, bytes) else cached_pdf.encode('latin-1')
        return send_file(
            io.BytesIO(pdf_bytes), 
            mimetype='application/pdf',
            as_attachment=True,
            download_name="Forecast_Analysis.pdf"
        )

    if not md_content:
        return jsonify({"error": "No content to generate PDF"}), 400

    try:
        # Convert Markdown to HTML
        html_content = markdown.markdown(md_content, extensions=['extra', 'codehilite'])

        styled_html = f"""
<html>
            <head>
                <style>
                    @page {{ margin: 2cm; }}
                    body {{ font-family: "Liberation Sans", Arial, sans-serif; line-height: 1.6; color: #000; }}
                    h1 {{ color: #000; border-bottom: 2px solid #000; padding-bottom: 10px; }}
                    h2 {{ color: #333; margin-top: 1.5em; }}
                    table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
                    th, td {{ border: 1px solid #dee2e6; padding: 12px; text-align: left; }}
                    th {{ background-color: #f8f9fa; }}
                </style>
            </head>
            <body>{html_content}</body>
        </html>
        """

        # Generate PDF in memory
        pdf_io = io.BytesIO()
        HTML(string=styled_html).write_pdf(pdf_io)

        # Cache the binary data
        pdf_data = pdf_io.getvalue()
        current_app.cache.setex(cache_key, 3600, pdf_data.decode('latin-1'))

        # Return the file
        pdf_io.seek(0)

        return send_file(
            pdf_io,
            mimetype='application/pdf',
            as_attachment=True,
            download_name="Forecast_Analysis.pdf"
        )

    except Exception as e:
        current_app.logger.error(f"PDF Error: {str(e)}")
        return jsonify({"error": str(e)}), 500
