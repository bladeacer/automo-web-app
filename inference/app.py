import io
import base64
import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from ultralytics import YOLO
from PIL import Image, ImageFilter
import torch
from diffusers import StableDiffusionInpaintPipeline
from waitress import serve

app = Flask(__name__)
CORS(app)

# -------------------------
# Hardware Detection & Logging
# -------------------------
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
T_DTYPE = torch.float16 if DEVICE == "cuda" else torch.float32

print("\n" + "="*50)
print("INITIALIZING HARDWARE REPORT")
print(f"Primary Compute Device: {DEVICE.upper()}")

vram_gb = 0
if DEVICE == "cuda":
    gpu_name = torch.cuda.get_device_name(0)
    vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
    print(f"GPU Model: {gpu_name}")
    print(f"Total VRAM: {vram_gb:.2f} GB")
    print(f"Precision Mode: {T_DTYPE}")
else:
    print("Device: CPU detected. Optimization: Using float32 (Full Precision)")
print("="*50 + "\n")

PROMPT = "a realistic, clean, undamaged car surface, smooth paint, factory condition"
NEGATIVE_PROMPT = "scratches, dents, holes, cracks, damage, deformation, broken parts, unrealistic, warped, blurry, artifacts"

# -------------------------
# Classification Model (CPU/OpenVINO)
# -------------------------
MODEL_PATH = "models/best_int8_openvino_model"
clf_model = YOLO(MODEL_PATH, task="classify")
print(f"YOLO Classification: Loaded {MODEL_PATH}")
print(f"   Inference Device: CPU (OpenVINO optimized)")

# -------------------------
# Inpainting Pipeline (Lazy Loading)
# -------------------------
pipe = None

def get_inpaint_pipe():
    global pipe
    if pipe is None:
        print("\nLoading Stable Diffusion Inpainting Pipeline...")
        print(f"   Target Device: {DEVICE.upper()}")
        
        pipe = StableDiffusionInpaintPipeline.from_pretrained(
            "runwayml/stable-diffusion-inpainting",
            torch_dtype=T_DTYPE,
            variant="fp16" if DEVICE == "cuda" else None,
            use_safetensors=True
        )
        
        if DEVICE == "cuda":
            pipe.vae.enable_slicing() 
            
            if vram_gb < 3.0:
                print("   Warning: Very Low VRAM (<3GB). Enabling Sequential CPU Offload.")
                pipe.enable_sequential_cpu_offload()
            else:
                print("   System specs sufficient (3GB+). Enabling Model GPU-Accelerated Pipeline.")
                pipe.enable_model_cpu_offload()
                pipe.enable_attention_slicing()
        else:
            pipe.to("cpu")
            print("   Warning: Running Inpainter on CPU.")
            
        print(f"Inpainting pipeline ready on {DEVICE.upper()}.\n")
    return pipe

# -------------------------
# API Routes
# -------------------------

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "online", 
        "device": DEVICE,
        "vram_gb": round(vram_gb, 2),
        "inpainter_loaded": pipe is not None
    }), 200

@app.route("/predictImage", methods=["POST"])
def predictImage():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    try:
        image_bytes = request.files["file"].read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        results = clf_model.predict(image, device="cpu")
        r = results[0]
        response = []
        if r.probs is not None:
            for idx, score in zip(r.probs.top5[:3], r.probs.top5conf.tolist()[:3]):
                response.append({
                    "name": r.names[idx],
                    "score": float(score)
                })
        return jsonify({"result": response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/inpaint", methods=["POST"])
def inpaint():
    image_file = request.files.get("image")
    mask_file = request.files.get("mask")

    if not image_file or not mask_file:
        return jsonify({"error": "Image and mask required"}), 400

    try:
        inpainter = get_inpaint_pipe()
        
        if DEVICE == "cuda":
            torch.cuda.empty_cache()

        img = Image.open(io.BytesIO(image_file.read())).convert("RGB").resize((512, 512))
        msk = Image.open(io.BytesIO(mask_file.read())).convert("RGB").resize((512, 512))
        msk = msk.filter(ImageFilter.GaussianBlur(radius=2))

        print(f"Starting Inpaint Inference on {DEVICE.upper()}...")
        generator = torch.Generator(device=DEVICE).manual_seed(42)

        with torch.inference_mode():
            result = inpainter(
                prompt=PROMPT,
                negative_prompt=NEGATIVE_PROMPT,
                image=img,
                mask_image=msk,
                num_inference_steps=30,
                guidance_scale=7.5,
                strength=0.9,
                generator=generator
            ).images[0]

        buf = io.BytesIO()
        result.save(buf, format="PNG")
        print("Inpaint Complete.")
        
        return jsonify({"image": base64.b64encode(buf.getvalue()).decode("utf-8")})
    except Exception as e:
        print(f"Inpaint Error: {str(e)}")
        return jsonify({"error": f"Inpainting failed: {str(e)}"}), 500

if __name__ == "__main__":
    print("Starting Inference Service with Waitress on port 5001...")
    get_inpaint_pipe()
    serve(app, host="0.0.0.0", port=5001, threads=4)
