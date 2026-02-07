FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS builder
WORKDIR /app

ENV UV_LINK_MODE=copy
ENV VIRTUAL_ENV=/opt/venv

COPY pyproject.toml .

RUN --mount=type=cache,target=/root/.cache/uv \
    uv venv $VIRTUAL_ENV && \
    uv pip install -r pyproject.toml

FROM python:3.12-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH"

COPY . .

ENV PYTHONUNBUFFERED=1
ENV ULTRALYTICS_NO_AUTOUPDATE=1
ENV YOLO_DEVICE=0

EXPOSE 5001

CMD ["python", "app.py"]
