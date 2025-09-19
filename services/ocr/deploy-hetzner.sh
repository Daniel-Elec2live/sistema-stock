#!/bin/bash
# =========================================================
# SCRIPT DE DEPLOY AUTOMÁTICO EN HETZNER
# =========================================================

set -e

echo "🚀 Iniciando deploy del servicio OCR en Hetzner..."

# Variables
SERVER_IP=${1:-"YOUR_SERVER_IP"}
SERVER_USER=${2:-"root"}

if [ "$SERVER_IP" == "YOUR_SERVER_IP" ]; then
    echo "❌ Error: Proporciona la IP del servidor"
    echo "Uso: ./deploy-hetzner.sh SERVER_IP [USER]"
    echo "Ejemplo: ./deploy-hetzner.sh 192.168.1.100 root"
    exit 1
fi

echo "📡 Conectando a servidor: $SERVER_USER@$SERVER_IP"

# Verificar conectividad
ssh -o ConnectTimeout=10 $SERVER_USER@$SERVER_IP "echo '✅ Conexión SSH exitosa'"

# Crear directorio remoto y subir archivos
echo "📁 Creando directorio y subiendo archivos..."
ssh $SERVER_USER@$SERVER_IP "mkdir -p /opt/sistema-stock/ocr"

# Subir todos los archivos necesarios
echo "📤 Subiendo archivos del servicio OCR..."
scp -r . $SERVER_USER@$SERVER_IP:/opt/sistema-stock/ocr/ || {
    echo "❌ Error subiendo archivos. Intentando archivo por archivo..."
    scp main.py $SERVER_USER@$SERVER_IP:/opt/sistema-stock/ocr/
    scp requirements.txt $SERVER_USER@$SERVER_IP:/opt/sistema-stock/ocr/  
    scp Dockerfile $SERVER_USER@$SERVER_IP:/opt/sistema-stock/ocr/
    scp docker-compose.prod.yml $SERVER_USER@$SERVER_IP:/opt/sistema-stock/ocr/
    scp .env.example $SERVER_USER@$SERVER_IP:/opt/sistema-stock/ocr/
}

# Configurar variables de entorno
echo "⚙️ Preparando configuración..."
ssh $SERVER_USER@$SERVER_IP "cd /opt/sistema-stock/ocr && cp .env.example .env"

# Hacer script ejecutable y mostrar siguiente paso
ssh $SERVER_USER@$SERVER_IP "chmod +x /opt/sistema-stock/ocr/deploy-hetzner.sh" || true

echo ""
echo "✅ Archivos subidos exitosamente!"
echo ""
echo "🔧 PRÓXIMOS PASOS MANUALES:"
echo "1. Conectar por SSH:"
echo "   ssh $SERVER_USER@$SERVER_IP"
echo ""
echo "2. Configurar variables de entorno:"
echo "   cd /opt/sistema-stock/ocr"
echo "   nano .env"
echo ""
echo "3. Variables críticas a configurar:"
echo "   OCR_BASIC_AUTH_USER=ocr_production"
echo "   OCR_BASIC_AUTH_PASS=TU_PASSWORD_SUPER_SEGURO"
echo "   CALLBACK_BASE_URL=https://tu-backoffice.vercel.app"
echo "   CALLBACK_SECRET=TU_CALLBACK_SECRET"
echo ""
echo "4. Levantar el servicio:"
echo "   docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "5. Verificar que funciona:"
echo "   curl -u ocr_production:TU_PASSWORD http://$SERVER_IP:8000/health"
echo ""
echo "🎉 Deploy preparado! Continúa con los pasos manuales."