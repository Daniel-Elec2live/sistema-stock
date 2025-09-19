# =========================================================
# DOCKERFILE PARA SERVICIO OCR - SISTEMA STOCK
# =========================================================
# Imagen optimizada para PaddleOCR en producción

FROM python:3.10-slim

# Información del mantenedor
LABEL maintainer="sistema-stock@company.com"
LABEL description="Servicio OCR para extracción de datos de albaranes y facturas"

# Variables de entorno
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependencias del sistema necesarias para OpenCV y PaddleOCR
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgcc-s1 \
    libstdc++6 \
    libfontconfig1 \
    libice6 \
    libjpeg62-turbo \
    libpng16-16 \
    libtiff5 \
    libwebp6 \
    libopenjp2-7 \
    libopencv-dev \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Crear usuario no-root para seguridad
RUN groupadd -r ocruser && useradd -r -g ocruser ocruser

# Crear directorio de trabajo
WORKDIR /app

# Copiar requirements primero (para aprovechar cache de Docker)
COPY requirements.txt .

# Instalar dependencias Python
RUN pip install --no-cache-dir --upgrade pip==23.3.1
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fuente
COPY main.py .

# Crear directorio para logs
RUN mkdir -p /tmp && chown -R ocruser:ocruser /tmp

# Crear directorio para modelos de PaddleOCR (se descargan automáticamente)
RUN mkdir -p /home/ocruser/.paddleocr && chown -R ocruser:ocruser /home/ocruser

# Cambiar a usuario no-root
USER ocruser

# Exponer puerto
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Comando por defecto
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

# =========================================================
# INFORMACIÓN ADICIONAL
# =========================================================
# 
# Para construir la imagen:
# docker build -t sistema-stock-ocr:latest .
#
# Para ejecutar en desarrollo:
# docker run -p 8000:8000 \
#   -e OCR_BASIC_AUTH_USER=ocr_user \
#   -e OCR_BASIC_AUTH_PASS=your_secret_pass \
#   -e CALLBACK_BASE_URL=https://your-vercel-app.vercel.app \
#   -e CALLBACK_SECRET=your_callback_secret \
#   sistema-stock-ocr:latest
#
# Volumen recomendado para persistir modelos OCR (opcional):
# docker run -p 8000:8000 \
#   -v ocr-models:/home/ocruser/.paddleocr \
#   sistema-stock-ocr:latest
#
# =========================================================