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

# Crear directorio remoto
ssh $SERVER_USER@$SERVER_IP "mkdir -p /opt/sistema-stock/ocr"

# Subir archivos necesarios
echo "📁 Subiendo archivos del servicio..."
scp main.py $SERVER_USER@$SERVER_IP:/opt/sistema-stock/ocr/
scp requirements.txt $SERVER_USER@$SERVER_IP:/opt/sistema-stock/ocr/
scp Dockerfile $SERVER_USER@$SERVER_IP:/opt/sistema-stock/ocr/
scp docker-compose.prod.yml $SERVER_USER@$SERVER_IP:/opt/sistema-stock/ocr/
scp .env.example $SERVER_USER@$SERVER_IP:/opt/sistema-stock/ocr/

# Crear configuración de producción
echo "⚙️ Configurando variables de entorno..."
ssh $SERVER_USER@$SERVER_IP "cd /opt/sistema-stock/ocr && cp .env.example .env"

echo "📝 IMPORTANTE: Configurar manualmente las variables en .env:"
echo "ssh $SERVER_USER@$SERVER_IP"
echo "cd /opt/sistema-stock/ocr"
echo "nano .env"
echo ""
echo "Variables a configurar:"
echo "- OCR_BASIC_AUTH_USER=ocr_production"
echo "- OCR_BASIC_AUTH_PASS=tu_password_super_seguro"
echo "- CALLBACK_BASE_URL=https://tu-backoffice.vercel.app"  
echo "- CALLBACK_SECRET=tu_callback_secret"
echo ""
echo "Después ejecutar:"
echo "docker-compose -f docker-compose.prod.yml up -d"

echo "✅ Archivos subidos exitosamente!"
echo "🔧 Continúa con la configuración manual en el servidor"