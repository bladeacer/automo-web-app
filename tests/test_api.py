import pytest
import requests
import jwt
import datetime
import os
import time
import redis
import io
from PIL import Image

# --- Configuration ---
BASE_URL = os.getenv("BASE_URL", "http://automo_web_app:8080")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")

TEST_USER = {
    "username": "tester_bot",
    "password": "password123",
    "email": "test@test.com",
    "fullName": "Tester Bot Integration"
}

SECONDARY_USER = {
    "username": "intruder_bot",
    "password": "password123",
    "email": "intruder@test.com",
    "fullName": "Intruder User"
}

# --- Fixtures ---

@pytest.fixture
def dummy_image():
    """Generates a fresh small valid RGB image for testing."""
    file = io.BytesIO()
    image = Image.new('RGB', (100, 100), color='red')
    image.save(file, 'jpeg')
    file.seek(0)
    return file

@pytest.fixture(scope="module")
def api_session():
    """Setup authenticated session for TEST_USER and secondary setup."""
    admin_token = jwt.encode({
        'sub': 'internal_proxy',
        'iat': datetime.datetime.now(datetime.timezone.utc),
        'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=5)
    }, SECRET_KEY, algorithm='HS256')
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Cleanup & Register users
    for user in [TEST_USER, SECONDARY_USER]:
        # Logic matches app.py: lookup by name=identifier
        requests.delete(f"{BASE_URL}/delete-user", json={"username": user["fullName"]}, headers=admin_headers)
        requests.post(f"{BASE_URL}/register", json={
            "username": user["username"],
            "email": user["email"],
            "password": user["password"],
            "name": user["fullName"]
        })

    # Login as TEST_USER
    login_resp = requests.post(f"{BASE_URL}/login", json={
        "username": TEST_USER["username"],
        "password": TEST_USER["password"]
    })
    token = login_resp.json().get('access_token')

    session = requests.Session()
    session.headers.update({"Authorization": f"Bearer {token}"})
    
    yield session

    # Teardown
    for user in [TEST_USER, SECONDARY_USER]:
        requests.delete(f"{BASE_URL}/delete-user", json={"username": user["fullName"]}, headers=admin_headers)

@pytest.fixture(scope="module")
def cache_conn():
    return redis.Redis(host='cache-db', port=6379, db=0, decode_responses=True)

# --- Utility: Performance Benchmarking ---

def run_cache_benchmark(api_session, cache_conn, endpoint, cache_key, label):
    url = f"{BASE_URL}{endpoint}"
    cache_conn.delete(cache_key)

    t1 = time.perf_counter()
    r1 = api_session.get(url)
    duration_miss = time.perf_counter() - t1
    assert r1.status_code == 200

    t2 = time.perf_counter()
    r2 = api_session.get(url)
    duration_hit = time.perf_counter() - t2
    assert r2.status_code == 200
    assert r1.json() == r2.json()

    # Log results to console
    print(f"\nCACHE REPORT: {label} | Miss: {duration_miss:.4f}s | Hit: {duration_hit:.4f}s")
    assert duration_hit < 0.01 or duration_hit < (duration_miss / 2)

# --- 1. Security & Auth Tests ---

def test_unauthorized_access_rejected():
    resp = requests.get(f"{BASE_URL}/ts-model/forecast")
    assert resp.status_code == 401

def test_user_profile_update_success(api_session):
    payload = {
        "currentUsername": TEST_USER["fullName"],
        "fullName": "Updated Tester Name",
        "email": "updated_bot@test.com"
    }
    resp = api_session.put(f"{BASE_URL}/update-user", json=payload)
    assert resp.status_code == 200
    # Revert
    api_session.put(f"{BASE_URL}/update-user", json={
        "currentUsername": "Updated Tester Name",
        "fullName": TEST_USER["fullName"],
        "email": TEST_USER["email"]
    })

def test_update_other_user_fails(api_session):
    payload = {"currentUsername": SECONDARY_USER["fullName"], "fullName": "Hacked"}
    resp = api_session.put(f"{BASE_URL}/update-user", json=payload)
    assert resp.status_code == 403

def test_delete_other_user_fails(api_session):
    resp = api_session.delete(f"{BASE_URL}/delete-user", json={"username": SECONDARY_USER["fullName"]})
    assert resp.status_code == 403

# --- 2. Data Integrity ---

@pytest.mark.parametrize("endpoint, expected_key", [
    ("/ts-model/forecast?steps=5", "forecast"),
    ("/ts-model/history", "history"),
    ("/ts-model/metrics", "metrics"),
    ("/health/cache", "cache_status"),
    ("/health", "status")
])
def test_endpoints_integrity(api_session, endpoint, expected_key):
    resp = api_session.get(f"{BASE_URL}{endpoint}")
    assert resp.status_code == 200
    assert expected_key in resp.json()

# --- 3. Cache Benchmarking ---

@pytest.mark.parametrize("steps", [6, 12, 24])
def test_forecast_caching_performance(api_session, cache_conn, steps):
    run_cache_benchmark(
        api_session, cache_conn,
        endpoint=f"/ts-model/forecast?steps={steps}",
        cache_key=f"view:/ts-model/forecast:{steps}",
        label=f"FORECAST {steps}M"
    )

# --- 4. AI Inference Tests ---

def test_predict_image_success(api_session, dummy_image):
    files = {'file': ('test.jpg', dummy_image, 'image/jpeg')}
    resp = api_session.post(f"{BASE_URL}/obj-det/predictImage", files=files)
    assert resp.status_code == 200
    assert "result" in resp.json()

def test_inpaint_success(api_session, dummy_image):
    mask = io.BytesIO()
    Image.new('RGB', (100, 100), color='white').save(mask, 'jpeg')
    mask.seek(0)
    
    files = {
        'image': ('base.jpg', dummy_image, 'image/jpeg'),
        'mask': ('mask.jpg', mask, 'image/jpeg')
    }
    resp = api_session.post(f"{BASE_URL}/obj-det/inpaint", files=files, timeout=60)
    assert resp.status_code == 200
    assert "image" in resp.json()

def test_root_health_is_alive():
    resp = requests.get(f"{BASE_URL}/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "alive"
