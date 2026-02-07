import torch
import sys

def run_test():
    print("Checking CUDA connectivity...")
    if not torch.cuda.is_available():
        print("❌ ERROR: PyTorch cannot see the GPU. Check NVIDIA Container Toolkit.")
        sys.exit(1)

    device_name = torch.cuda.get_device_name(0)
    total_vram = torch.cuda.get_device_properties(0).total_memory / 1e9
    
    print(f"✅ Found: {device_name}")
    print(f"📊 Total VRAM: {total_vram:.2f} GB")

    # Perform a small math operation on GPU to verify it's working
    try:
        print("Running dummy tensor calculation...")
        x = torch.rand((1000, 1000), device="cuda")
        y = x @ x
        print("✅ GPU Math Success.")
    except Exception as e:
        print(f"❌ Math Failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_test()
