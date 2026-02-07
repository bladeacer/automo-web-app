FROM python:3.12-slim

# Pandoc with Weasyprint for markdown to PDF functionality
RUN apt-get update && apt-get install -y --no-install-recommends \
    pandoc \
    libpango-1.0-0 \
    libharfbuzz0b \
    libpangoft2-1.0-0 \
    libpangocairo-1.0-0 \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/

WORKDIR /app
COPY pyproject.toml .
RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip install --system -r pyproject.toml

COPY . .
EXPOSE 8080

# Now running directly via the script
CMD ["python", "-m", "server.app"]
