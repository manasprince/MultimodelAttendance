# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend Runtime
FROM python:3.11-slim

# System dependencies for OpenCV and audio processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend and root files
COPY backend/ ./backend/
COPY run.py .

# Copy pre-built frontend static assets from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Default port (7860 is standard for Hugging Face Spaces; Render/Railway provide dynamic $PORT)
ENV PORT=7860
ENV HOST=0.0.0.0

EXPOSE 7860

CMD ["python", "run.py"]

