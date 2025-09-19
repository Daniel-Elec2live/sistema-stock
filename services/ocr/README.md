# 🔍 SERVICIO OCR - SISTEMA STOCK

Microservicio FastAPI para extracción automática de datos de albaranes y facturas usando PaddleOCR.

## 🏗️ ARQUITECTURA

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Backoffice    │───▶│   OCR Service    │───▶│   Supabase      │
│   (Vercel)      │    │   (Hetzner)      │    │   (Database)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Flujo de Procesamiento
1. **Upload**: Backoffice sube imagen a Supabase Storage
2. **URL firmada**: Genera URL temporalmente firmada  
3. **OCR Request**: Llama a `/extract` con la URL firmada
4. **Processing**: Servicio descarga, procesa y extrae datos
5. **Callback**: Envía resultado a `/api/ocr/callback` en Vercel
6. **Validation**: Backoffice valida y actualiza stock

## 🚀 DESPLIEGUE EN HETZNER

### 1. Crear Servidor
```bash
# Crear servidor Ubuntu 22.04 en Hetzner Cloud
# Mínimo recomendado: CX21 (2 vCPU, 4GB RAM)
```

### 2. Instalar Docker
```bash
# En el servidor Hetzner
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo systemctl enable docker
sudo systemctl start docker

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. Preparar Aplicación
```bash
# Clonar o subir código al servidor
git clone <repository-url>
cd sistema-stock/services/ocr

# Configurar variables de entorno
cp .env.example .env
nano .env
```

### 4. Configurar Variables de Entorno
```bash
# .env para producción
OCR_BASIC_AUTH_USER=ocr_production_user
OCR_BASIC_AUTH_PASS=super_secure_password_2024
CALLBACK_BASE_URL=https://tu-app.vercel.app
CALLBACK_SECRET=secure_callback_secret_key
PADDLE_OCR_LANG=es
MAX_IMAGE_SIZE_MB=15
```

### 5. Desplegar con Docker Compose
```bash
# Construir y levantar
docker-compose -f docker-compose.prod.yml up -d

# Ver logs
docker-compose logs -f ocr-service

# Verificar estado
curl -u ocr_production_user:super_secure_password_2024 \
  http://your-server-ip:8000/health
```

### 6. Configurar Nginx (Opcional pero recomendado)
```nginx
# /etc/nginx/sites-available/ocr-service
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout para OCR (puede tardar)
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```

### 7. SSL con Certbot (Recomendado)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 🖥️ DESARROLLO LOCAL

### Requisitos Previos
- Python 3.10+
- Docker (opcional)

### Instalación Directa
```bash
cd services/ocr

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables
cp .env.example .env

# Ejecutar
python main.py
```

### Instalación con Docker
```bash
cd services/ocr

# Desarrollo con Docker Compose
docker-compose up -d

# Ver logs
docker-compose logs -f

# Tests
docker-compose exec ocr-service pytest tests/
```

## 📡 API REFERENCE

### Authentication
Autenticación HTTP Basic requerida en todos los endpoints.

### `POST /extract`

Extrae datos de imagen de albarán/factura.

**Headers:**
```
Authorization: Basic base64(username:password)
Content-Type: application/json
```

**Request Body:**
```json
{
  "image_url": "https://supabase.co/storage/v1/object/sign/...",
  "callback_url": "https://your-app.vercel.app/api/ocr/callback",
  "processing_id": "optional-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "processing_id": "uuid-generated",
  "proveedor": {
    "nombre": "Huerta del Sur S.L.",
    "direccion": "Polígono Industrial Las Vegas",
    "telefono": "+34 952 123 456",
    "email": "pedidos@huertadelsur.com",
    "cif": "B-29123456",
    "confianza": 0.85
  },
  "documento": {
    "tipo": "factura",
    "numero": "HDS-2024-0891",
    "fecha": "2024-09-15",
    "total": 165.50
  },
  "productos": [
    {
      "nombre": "Tomate Cherry",
      "cantidad": 5.5,
      "unidad": "kg",
      "precio": 3.80,
      "precio_total": 20.90,
      "caducidad": null,
      "lote": null,
      "confianza": 0.92
    }
  ],
  "texto_completo": "Texto OCR completo...",
  "confianza_general": 0.87,
  "tiempo_procesamiento": 3.45,
  "error": null
}
```

### `GET /health`
Health check del servicio.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-09-12T10:30:00Z",
  "ocr_ready": true,
  "memory_info": "available"
}
```

## 🧪 TESTING

### Ejecutar Tests
```bash
# Con pytest directamente
pip install -r tests/requirements-test.txt
pytest tests/ -v

# Con Docker
docker-compose exec ocr-service pytest tests/ -v

# Test específico
pytest tests/test_ocr_parsing.py::TestSupplierParsing::test_parse_supplier_complete -v
```

### Test Manual con cURL
```bash
# Health check
curl -u ocr_user:ocr_pass http://localhost:8000/health

# Extraer datos (necesitas URL firmada real)
curl -X POST "http://localhost:8000/extract" \
  -u ocr_user:ocr_pass \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://your-signed-url-here",
    "callback_url": "http://localhost:3000/api/ocr/callback"
  }'
```

## 🔧 CONFIGURACIÓN

### Variables de Entorno

| Variable | Descripción | Default | Requerido |
|----------|-------------|---------|-----------|
| `OCR_BASIC_AUTH_USER` | Usuario para auth básica | `ocr_user` | ❌ |
| `OCR_BASIC_AUTH_PASS` | Contraseña para auth básica | `ocr_secret_2024` | ❌ |
| `CALLBACK_BASE_URL` | Base URL para callbacks | `https://sistema-stock.vercel.app` | ❌ |
| `CALLBACK_SECRET` | Secret para validar callbacks | `callback_secret_key` | ❌ |
| `MAX_IMAGE_SIZE_MB` | Tamaño máximo imagen | `10` | ❌ |
| `PADDLE_OCR_LANG` | Idioma OCR | `es` | ❌ |

### Optimización de Rendimiento

#### Para Servidores con GPU
```python
# En main.py, cambiar línea 75:
ocr_engine = paddleocr.PaddleOCR(
    use_angle_cls=True,
    lang=PADDLE_OCR_LANG,
    use_gpu=True,  # ✅ Cambiar a True
    gpu_mem=2000,  # MB de GPU a usar
    show_log=False
)
```

#### Para Más Workers
```bash
# En producción, usar múltiples workers
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 🐛 TROUBLESHOOTING

### Error: "Motor OCR no inicializado"
**Causa**: PaddleOCR no se pudo inicializar  
**Solución**: Verificar logs al inicio, instalar dependencias faltantes

### Error: "Imagen demasiado grande"
**Causa**: Imagen excede `MAX_IMAGE_SIZE_MB`  
**Solución**: Aumentar límite o redimensionar imagen

### Error: "No se pudo extraer texto"
**Causa**: Imagen de baja calidad o sin texto  
**Solución**: Mejorar calidad de imagen, verificar que contenga texto

### Timeout en OCR
**Causa**: Imagen muy compleja o servidor lento  
**Solución**: Aumentar timeout en Nginx, optimizar imagen

### Callback falló
**Causa**: URL de callback incorrecta o no accesible  
**Solución**: Verificar URL, secret, y conectividad

## 📊 MONITOREO

### Logs
```bash
# Logs en tiempo real
docker-compose logs -f ocr-service

# Logs del sistema
tail -f /tmp/ocr_service.log
```

### Métricas
- **Tiempo de procesamiento**: Incluido en respuesta
- **Rate de éxito**: Monitoring manual por ahora
- **Memoria/CPU**: `htop`, `docker stats`

### Health Checks
- **HTTP**: `GET /health` cada 30s
- **Docker**: Health check integrado
- **External**: Monitoreo desde Vercel

## 🔐 SEGURIDAD

### Buenas Prácticas Implementadas
✅ **Autenticación HTTP Basic**  
✅ **Usuario no-root en contenedor**  
✅ **Validación de tamaño de imagen**  
✅ **Timeout en requests HTTP**  
✅ **Sanitización de inputs**  
✅ **Logs de seguridad**  

### Recomendaciones Adicionales
- **Firewall**: Solo puerto 80/443 abierto
- **HTTPS**: SSL obligatorio en producción  
- **Rate limiting**: Implementar en Nginx
- **VPN**: Acceso restringido al servidor
- **Backups**: Configurar backups automáticos

## 📈 ROADMAP

### v1.1 (Próxima versión)
- [ ] Cache de resultados OCR
- [ ] Métricas con Prometheus
- [ ] Rate limiting integrado
- [ ] Soporte para múltiples idiomas

### v1.2 (Futuro)
- [ ] ML personalizado para facturas específicas
- [ ] API keys en lugar de Basic Auth
- [ ] Webhooks con retry automático
- [ ] Dashboard de monitoreo