# ── Stage 1: build dependencies ───────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build deps for psycopg2 etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --prefix=/install --no-cache-dir -r requirements.txt

# ── Stage 2: runtime image ────────────────────────────────────────────────────
FROM python:3.12-slim

# SEC-29: create non-root user BEFORE copying files so --chown works correctly
RUN useradd -m appuser

WORKDIR /app

# Runtime system deps only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# SEC-29: copy source with correct ownership in one step (avoids chown -R after COPY)
COPY --chown=appuser:appuser . .

# Create media directory with correct ownership for avatar uploads
RUN mkdir -p /app/media && chown appuser:appuser /app/media

# Collect static files — SEC-27: dummy SECRET_KEY never baked into a named layer
RUN SECRET_KEY=collect-static-dummy \
    DB_NAME=dummy DB_USER=dummy DB_PASSWORD=dummy DB_HOST=localhost \
    python manage.py collectstatic --noinput

USER appuser

EXPOSE 8000

# B3: HEALTHCHECK so docker/k8s knows when the app is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/health/')" || exit 1

# Entrypoint: run migrations then start gunicorn
# B4: dynamic worker count based on CPU cores (2*CPU+1)
CMD ["sh", "-c", \
    "python manage.py migrate --noinput && \
     gunicorn core.wsgi:application \
       --bind 0.0.0.0:8000 \
       --workers $(( 2 * $(nproc) + 1 )) \
       --timeout 60 \
       --access-logfile - \
       --error-logfile -"]
