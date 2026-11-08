FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential pkg-config libmariadb-dev libjpeg-dev zlib1g-dev libwebp-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements ./requirements
RUN pip install --no-cache-dir -r requirements/dev.txt
COPY . .
