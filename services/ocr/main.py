"""
🔍 SERVICIO OCR PARA SISTEMA-STOCK
FastAPI + PaddleOCR/docTR para extracción de datos de albaranes/facturas
Desplegable en Hetzner con Docker
"""

import os
import logging
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
import httpx
import uuid

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Request
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl, Field, validator

import paddleocr
import cv2
import numpy as np
import re
from PIL import Image
import io

# =========================================================
# CONFIGURACIÓN Y LOGGING
# =========================================================

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/tmp/ocr_service.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Variables de entorno
OCR_BASIC_AUTH_USER = os.getenv('OCR_BASIC_AUTH_USER', 'ocr_user')
OCR_BASIC_AUTH_PASS = os.getenv('OCR_BASIC_AUTH_PASS', 'ocr_secret_2024')
CALLBACK_BASE_URL = os.getenv('CALLBACK_BASE_URL', 'https://sistema-stock.vercel.app')
CALLBACK_SECRET = os.getenv('CALLBACK_SECRET', 'callback_secret_key')
MAX_IMAGE_SIZE_MB = int(os.getenv('MAX_IMAGE_SIZE_MB', '10'))
PADDLE_OCR_LANG = os.getenv('PADDLE_OCR_LANG', 'es')

# =========================================================
# INICIALIZACIÓN DE FASTAPI Y OCR
# =========================================================

app = FastAPI(
    title="OCR Service - Sistema Stock",
    description="Servicio de OCR para extracción de datos de albaranes y facturas",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Autenticación básica
security = HTTPBasic()

# Inicializar PaddleOCR (se carga al iniciar el servicio)
ocr_engine = None

@app.on_event("startup")
async def startup_event():
    global ocr_engine
    try:
        logger.info("Inicializando PaddleOCR...")
        ocr_engine = paddleocr.PaddleOCR(
            use_angle_cls=True,
            lang=PADDLE_OCR_LANG,
            use_gpu=False,  # Cambiar a True si hay GPU disponible
            show_log=False
        )
        logger.info("PaddleOCR inicializado correctamente")
    except Exception as e:
        logger.error(f"Error inicializando PaddleOCR: {e}")
        raise

# =========================================================
# MODELOS DE DATOS
# =========================================================

class ProductoDetectado(BaseModel):
    nombre: str = Field(..., description="Nombre del producto detectado")
    cantidad: float = Field(..., gt=0, description="Cantidad numérica")
    unidad: str = Field(default="kg", description="Unidad de medida")
    precio: Optional[float] = Field(None, ge=0, description="Precio unitario")
    precio_total: Optional[float] = Field(None, ge=0, description="Precio total de la línea")
    caducidad: Optional[str] = Field(None, description="Fecha de caducidad (YYYY-MM-DD)")
    lote: Optional[str] = Field(None, description="Número de lote")
    confianza: float = Field(..., ge=0, le=1, description="Nivel de confianza OCR (0-1)")

class ProveedorDetectado(BaseModel):
    nombre: str = Field(..., description="Nombre del proveedor")
    direccion: Optional[str] = Field(None, description="Dirección")
    telefono: Optional[str] = Field(None, description="Teléfono")
    email: Optional[str] = Field(None, description="Email")
    cif: Optional[str] = Field(None, description="CIF/NIF")
    confianza: float = Field(..., ge=0, le=1, description="Nivel de confianza")

class DocumentoDetectado(BaseModel):
    tipo: str = Field(..., description="Tipo de documento: albarán, factura")
    numero: Optional[str] = Field(None, description="Número de documento")
    fecha: Optional[str] = Field(None, description="Fecha del documento (YYYY-MM-DD)")
    total: Optional[float] = Field(None, ge=0, description="Total del documento")

class OCRRequest(BaseModel):
    image_url: HttpUrl = Field(..., description="URL firmada de la imagen en Supabase Storage")
    callback_url: Optional[HttpUrl] = Field(None, description="URL de callback (opcional)")
    processing_id: Optional[str] = Field(None, description="ID único para tracking")

    @validator('processing_id', pre=True, always=True)
    def set_processing_id(cls, v):
        return v or str(uuid.uuid4())

class OCRResponse(BaseModel):
    success: bool
    processing_id: str
    proveedor: Optional[ProveedorDetectado] = None
    documento: Optional[DocumentoDetectado] = None
    productos: List[ProductoDetectado] = []
    texto_completo: str = ""
    confianza_general: float = Field(..., ge=0, le=1)
    tiempo_procesamiento: float = Field(..., description="Tiempo en segundos")
    error: Optional[str] = None

# =========================================================
# AUTENTICACIÓN
# =========================================================

def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    """Verificar credenciales de autenticación básica"""
    if (
        credentials.username != OCR_BASIC_AUTH_USER or 
        credentials.password != OCR_BASIC_AUTH_PASS
    ):
        raise HTTPException(
            status_code=401,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials

# =========================================================
# FUNCIONES DE PROCESAMIENTO OCR
# =========================================================

async def download_image(image_url: str) -> bytes:
    """Descargar imagen desde URL firmada"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(str(image_url))
            response.raise_for_status()
            
            # Verificar tamaño
            content_length = len(response.content)
            if content_length > MAX_IMAGE_SIZE_MB * 1024 * 1024:
                raise HTTPException(
                    status_code=413,
                    detail=f"Imagen demasiado grande: {content_length/1024/1024:.1f}MB (máx: {MAX_IMAGE_SIZE_MB}MB)"
                )
            
            return response.content
            
        except httpx.HTTPError as e:
            logger.error(f"Error descargando imagen: {e}")
            raise HTTPException(status_code=400, detail=f"Error descargando imagen: {str(e)}")

def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """Preprocesar imagen para mejorar OCR"""
    try:
        # Convertir bytes a imagen PIL
        pil_image = Image.open(io.BytesIO(image_bytes))
        
        # Convertir a RGB si es necesario
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        
        # Convertir a numpy array para OpenCV
        cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        # Redimensionar si es muy grande (max 2000px en cualquier dimensión)
        height, width = cv_image.shape[:2]
        if max(height, width) > 2000:
            scale = 2000 / max(height, width)
            new_width = int(width * scale)
            new_height = int(height * scale)
            cv_image = cv2.resize(cv_image, (new_width, new_height))
        
        # Mejoras de imagen
        # Convertir a escala de grises
        gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
        
        # Reducir ruido
        denoised = cv2.medianBlur(gray, 3)
        
        # Aumentar contraste
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(denoised)
        
        return enhanced
        
    except Exception as e:
        logger.error(f"Error preprocesando imagen: {e}")
        # Fallback: convertir directamente sin preprocesamiento
        pil_image = Image.open(io.BytesIO(image_bytes))
        return np.array(pil_image.convert('RGB'))

def extract_text_with_ocr(image_array: np.ndarray) -> tuple[str, float]:
    """Extraer texto usando PaddleOCR"""
    try:
        if ocr_engine is None:
            raise Exception("Motor OCR no inicializado")
        
        # Ejecutar OCR
        result = ocr_engine.ocr(image_array, cls=True)
        
        if not result or not result[0]:
            return "", 0.0
        
        # Extraer texto y confianza
        extracted_lines = []
        confidences = []
        
        for line in result[0]:
            text = line[1][0]  # Texto detectado
            confidence = line[1][1]  # Confianza
            
            extracted_lines.append(text)
            confidences.append(confidence)
        
        full_text = '\n'.join(extracted_lines)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
        
        logger.info(f"OCR completado. Líneas: {len(extracted_lines)}, Confianza: {avg_confidence:.2f}")
        
        return full_text, avg_confidence
        
    except Exception as e:
        logger.error(f"Error en OCR: {e}")
        return "", 0.0

def parse_supplier_info(text: str) -> Optional[ProveedorDetectado]:
    """Extraer información del proveedor"""
    lines = text.upper().split('\n')
    
    # Patrones para detectar información de proveedor
    supplier_patterns = {
        'cif': re.compile(r'[B-Z]\d{8}|[B-Z]-?\d{7}-?[A-Z0-9]'),
        'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
        'phone': re.compile(r'(\+34|0034)?\s*[6-9]\d{8}|\d{9}'),
    }
    
    supplier_name = None
    direccion = None
    cif = None
    email = None
    telefono = None
    
    # Buscar nombre del proveedor (normalmente en las primeras líneas)
    for i, line in enumerate(lines[:5]):
        line_clean = line.strip()
        if len(line_clean) > 5 and not any(c.isdigit() for c in line_clean[:3]):
            if 'FACTURA' not in line_clean and 'ALBARÁN' not in line_clean:
                supplier_name = line_clean.title()
                break
    
    # Buscar patrones en todo el texto
    full_text_upper = text.upper()
    
    cif_match = supplier_patterns['cif'].search(full_text_upper)
    if cif_match:
        cif = cif_match.group(0)
    
    email_match = supplier_patterns['email'].search(text)  # Case sensitive para email
    if email_match:
        email = email_match.group(0).lower()
    
    phone_match = supplier_patterns['phone'].search(full_text_upper)
    if phone_match:
        telefono = phone_match.group(0)
    
    # Buscar dirección (líneas con números y palabras como calle, av, etc)
    address_keywords = ['CALLE', 'C/', 'AV', 'AVENIDA', 'PLAZA', 'POL', 'POLIGONO']
    for line in lines:
        line_upper = line.upper()
        if any(keyword in line_upper for keyword in address_keywords) and any(c.isdigit() for c in line):
            direccion = line.strip().title()
            break
    
    if supplier_name or cif or email:
        return ProveedorDetectado(
            nombre=supplier_name or "Proveedor desconocido",
            direccion=direccion,
            telefono=telefono,
            email=email,
            cif=cif,
            confianza=0.8 if supplier_name and cif else 0.6
        )
    
    return None

def parse_document_info(text: str) -> Optional[DocumentoDetectado]:
    """Extraer información del documento"""
    lines = text.upper().split('\n')
    
    doc_type = "factura"
    doc_number = None
    doc_date = None
    doc_total = None
    
    # Detectar tipo de documento
    if any('ALBARÁN' in line or 'ALBARAN' in line for line in lines):
        doc_type = "albarán"
    
    # Buscar número de documento
    number_patterns = [
        re.compile(r'(?:FACTURA|ALBARAN|ALBARÁN|N[ºª°]?)\s*:?\s*([A-Z0-9\-/]+)', re.IGNORECASE),
        re.compile(r'([A-Z]{2,4}-?\d{4,8})', re.IGNORECASE)
    ]
    
    for pattern in number_patterns:
        for line in lines:
            match = pattern.search(line)
            if match:
                doc_number = match.group(1)
                break
        if doc_number:
            break
    
    # Buscar fecha
    date_patterns = [
        re.compile(r'(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})'),
        re.compile(r'(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})'),
    ]
    
    for pattern in date_patterns:
        match = pattern.search(text)
        if match:
            try:
                if len(match.group(1)) == 4:  # Formato YYYY-MM-DD
                    doc_date = f"{match.group(1)}-{match.group(2).zfill(2)}-{match.group(3).zfill(2)}"
                else:  # Formato DD/MM/YYYY
                    doc_date = f"{match.group(3)}-{match.group(2).zfill(2)}-{match.group(1).zfill(2)}"
            except:
                continue
            break
    
    # Buscar total
    total_patterns = [
        re.compile(r'TOTAL[:\s]*(\d+[,.]?\d*)', re.IGNORECASE),
        re.compile(r'(\d+[,.]?\d*)\s*€?\s*$', re.MULTILINE)
    ]
    
    for pattern in total_patterns:
        matches = pattern.findall(text)
        if matches:
            try:
                # Tomar el valor más alto como total probable
                amounts = [float(match.replace(',', '.')) for match in matches if float(match.replace(',', '.')) > 10]
                if amounts:
                    doc_total = max(amounts)
                    break
            except:
                continue
    
    return DocumentoDetectado(
        tipo=doc_type,
        numero=doc_number,
        fecha=doc_date,
        total=doc_total
    )

def parse_products(text: str) -> List[ProductoDetectado]:
    """Extraer productos del texto OCR"""
    lines = text.split('\n')
    products = []
    
    # Patrones para detectar líneas de productos
    quantity_patterns = [
        re.compile(r'(\d+[,.]?\d*)\s*(kg|g|l|ml|ud|pz|caja|bolsa)', re.IGNORECASE),
        re.compile(r'(\d+[,.]?\d*)', re.IGNORECASE)
    ]
    
    price_pattern = re.compile(r'(\d+[,.]?\d*)\s*€?')
    
    # Palabras clave que indican productos alimentarios
    food_keywords = [
        'tomate', 'lechuga', 'cebolla', 'patata', 'zanahoria', 'calabacin', 'pimiento',
        'pollo', 'ternera', 'cerdo', 'salmon', 'merluza', 'dorada',
        'queso', 'yogur', 'leche', 'nata', 'mantequilla', 'mozzarella',
        'pan', 'pasta', 'arroz', 'harina', 'aceite', 'vinagre',
        'manzana', 'naranja', 'platano', 'fresa', 'melon'
    ]
    
    for i, line in enumerate(lines):
        line_clean = line.strip()
        if len(line_clean) < 3:
            continue
        
        # Verificar si la línea contiene posibles productos
        line_lower = line_clean.lower()
        has_food_keyword = any(keyword in line_lower for keyword in food_keywords)
        has_quantity = any(pattern.search(line_clean) for pattern in quantity_patterns)
        
        if has_food_keyword or has_quantity:
            # Extraer nombre del producto
            product_name = line_clean
            
            # Limpiar el nombre del producto
            for pattern in quantity_patterns + [price_pattern]:
                product_name = pattern.sub('', product_name).strip()
            
            if len(product_name) < 2:
                continue
            
            # Extraer cantidad
            cantidad = 1.0
            unidad = "ud"
            for pattern in quantity_patterns:
                match = pattern.search(line_clean)
                if match:
                    try:
                        cantidad = float(match.group(1).replace(',', '.'))
                        if len(match.groups()) > 1:
                            unidad = match.group(2).lower()
                    except:
                        continue
                    break
            
            # Extraer precio
            precio = None
            # Buscar precio en la misma línea o líneas adyacentes
            for check_line in lines[max(0, i-1):i+2]:
                price_matches = price_pattern.findall(check_line)
                if price_matches:
                    try:
                        # Tomar el precio más plausible
                        prices = [float(p.replace(',', '.')) for p in price_matches]
                        precio = min([p for p in prices if p > 0.1 and p < 1000], default=None)
                        if precio:
                            break
                    except:
                        continue
            
            # Confianza basada en la calidad de la detección
            confianza = 0.5
            if has_food_keyword:
                confianza += 0.3
            if precio:
                confianza += 0.2
            
            confianza = min(confianza, 0.95)
            
            products.append(ProductoDetectado(
                nombre=product_name.title(),
                cantidad=cantidad,
                unidad=unidad,
                precio=precio,
                confianza=confianza
            ))
    
    # Eliminar duplicados similares
    unique_products = []
    for product in products:
        is_duplicate = False
        for existing in unique_products:
            if (
                existing.nombre.lower() in product.nombre.lower() or
                product.nombre.lower() in existing.nombre.lower()
            ):
                # Mantener el que tenga mejor confianza
                if product.confianza > existing.confianza:
                    unique_products.remove(existing)
                    unique_products.append(product)
                is_duplicate = True
                break
        
        if not is_duplicate:
            unique_products.append(product)
    
    # Ordenar por confianza descendente
    unique_products.sort(key=lambda x: x.confianza, reverse=True)
    
    return unique_products[:20]  # Máximo 20 productos

async def send_callback(callback_url: str, result: OCRResponse):
    """Enviar resultado via callback"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Content-Type": "application/json",
                "X-Callback-Secret": CALLBACK_SECRET
            }
            
            response = await client.post(
                str(callback_url),
                json=result.dict(),
                headers=headers
            )
            response.raise_for_status()
            logger.info(f"Callback enviado exitosamente a {callback_url}")
            
    except Exception as e:
        logger.error(f"Error enviando callback a {callback_url}: {e}")

# =========================================================
# ENDPOINTS
# =========================================================

@app.get("/")
async def root():
    """Endpoint de salud básico"""
    return {
        "service": "OCR Sistema Stock",
        "version": "1.0.0", 
        "status": "running",
        "ocr_engine": "PaddleOCR" if ocr_engine else "not_initialized"
    }

@app.get("/health")
async def health_check():
    """Health check completo"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "ocr_ready": ocr_engine is not None,
        "memory_info": "available"  # Se puede extender con psutil
    }

@app.post("/extract", response_model=OCRResponse)
async def extract_data(
    request: OCRRequest,
    background_tasks: BackgroundTasks,
    credentials: HTTPBasicCredentials = Depends(verify_credentials)
):
    """
    Extraer datos de imagen de albarán/factura
    
    - **image_url**: URL firmada de la imagen en Supabase Storage
    - **callback_url**: URL opcional para recibir resultado asíncrono
    - **processing_id**: ID único para tracking (se genera automáticamente si no se proporciona)
    """
    start_time = datetime.now()
    processing_id = request.processing_id
    
    logger.info(f"Iniciando procesamiento OCR - ID: {processing_id}")
    
    try:
        # Descargar imagen
        logger.info(f"Descargando imagen desde: {request.image_url}")
        image_bytes = await download_image(str(request.image_url))
        
        # Preprocesar imagen
        logger.info("Preprocesando imagen...")
        processed_image = preprocess_image(image_bytes)
        
        # Extraer texto con OCR
        logger.info("Ejecutando OCR...")
        full_text, confidence = extract_text_with_ocr(processed_image)
        
        if not full_text:
            raise HTTPException(
                status_code=422,
                detail="No se pudo extraer texto de la imagen"
            )
        
        # Parsear información
        logger.info("Parseando información extraída...")
        supplier_info = parse_supplier_info(full_text)
        document_info = parse_document_info(full_text)
        products = parse_products(full_text)
        
        # Calcular tiempo de procesamiento
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Crear respuesta
        result = OCRResponse(
            success=True,
            processing_id=processing_id,
            proveedor=supplier_info,
            documento=document_info,
            productos=products,
            texto_completo=full_text,
            confianza_general=confidence,
            tiempo_procesamiento=processing_time
        )
        
        logger.info(
            f"OCR completado - ID: {processing_id}, "
            f"Productos: {len(products)}, "
            f"Tiempo: {processing_time:.2f}s, "
            f"Confianza: {confidence:.2f}"
        )
        
        # Enviar callback si se proporciona
        if request.callback_url:
            background_tasks.add_task(send_callback, str(request.callback_url), result)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error procesando OCR - ID: {processing_id}: {e}")
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return OCRResponse(
            success=False,
            processing_id=processing_id,
            productos=[],
            texto_completo="",
            confianza_general=0.0,
            tiempo_procesamiento=processing_time,
            error=str(e)
        )

# =========================================================
# MANEJO DE ERRORES
# =========================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error(f"HTTP Exception: {exc.status_code} - {exc.detail}")
    return {
        "success": False,
        "error": exc.detail,
        "status_code": exc.status_code
    }

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return {
        "success": False,
        "error": "Error interno del servidor",
        "status_code": 500
    }

if __name__ == "__main__":
    import uvicorn
    
    # Configuración para desarrollo local
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )