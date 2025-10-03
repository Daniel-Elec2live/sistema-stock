# Configuración de Gemini API para OCR

## Problema Actual

La API key proporcionada no tiene acceso a ningún modelo de Gemini. Todos los modelos devuelven error 404.

## Solución: Generar nueva API key

### Opción 1: Google AI Studio (MÁS FÁCIL - Recomendado)

1. **Ve a Google AI Studio:**
   - URL: https://aistudio.google.com/
   - Inicia sesión con tu cuenta de Google

2. **Obtener API Key:**
   - Click en "Get API Key" (botón arriba a la derecha)
   - Click en "Create API key in new project" o selecciona un proyecto existente
   - **COPIA LA API KEY** (empieza con `AIza...`)

3. **Verificar que funciona:**
   - En la misma página de AI Studio, deberías poder probar el modelo
   - Prueba escribiendo algo y verificando que responde

4. **Actualizar .env.local:**
   ```bash
   GEMINI_API_KEY=tu_nueva_api_key_aqui
   ```

5. **Reiniciar servidor:**
   ```bash
   # Ctrl+C para parar
   npm run dev
   ```

### Opción 2: Google Cloud Console (Más complejo)

Si la Opción 1 no funciona, necesitarás crear una API key desde Google Cloud Console:

1. **Ve a Google Cloud Console:**
   - URL: https://console.cloud.google.com/

2. **Crear o seleccionar proyecto:**
   - Menú hamburguesa → "Select a project" → "New Project"
   - Nombre: "Sistema Stock OCR" (o el que prefieras)
   - Click "Create"

3. **Habilitar la API de Generative Language:**
   - Menú → "APIs & Services" → "Library"
   - Buscar: "Generative Language API"
   - Click en el resultado
   - Click "Enable"

4. **Crear API Key:**
   - Menú → "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS" → "API key"
   - **COPIA LA API KEY**

5. **Configurar restricciones (opcional pero recomendado):**
   - Click en la API key recién creada
   - En "API restrictions": seleccionar "Restrict key"
   - Marcar solo: "Generative Language API"
   - Click "Save"

6. **Actualizar .env.local y reiniciar**

## Verificar que funciona

Después de actualizar la API key, prueba:

1. **Endpoint de test:**
   ```
   http://localhost:3002/api/gemini-test
   ```

   Deberías ver algo como:
   ```json
   {
     "success": true,
     "model": "gemini-1.5-flash",
     "response": "..."
   }
   ```

2. **Probar OCR:**
   - Ve a http://localhost:3002/entradas
   - Sube una imagen o PDF
   - Debería procesarse correctamente

## Límites Gratuitos

- **Google AI Studio**: 15 requests/minuto, gratis
- **Google Cloud**: Según el plan (puede requerir tarjeta de crédito)

Para tu caso (10 entradas/día aprox), Google AI Studio es más que suficiente.

## Modelos Disponibles

Con la nueva API key deberías tener acceso a:
- `gemini-1.5-flash` (rápido, recomendado para OCR)
- `gemini-1.5-pro` (más preciso pero más lento y limitado)
- `gemini-pro-vision` (versión anterior, menos preciso)

## Troubleshooting

### Error: "API key not valid"
- La API key está mal copiada (revisa espacios al inicio/final)
- La API key fue revocada o eliminada
- Genera una nueva

### Error: "Quota exceeded"
- Has superado el límite gratuito (15 req/min)
- Espera 1 minuto y vuelve a intentar
- Considera Google Cloud con billing

### Error: "Permission denied"
- La API de Generative Language no está habilitada
- Ve a Google Cloud Console y habilítala (Opción 2, paso 3)

### Sigo teniendo errores 404
- Verifica que estás en https://aistudio.google.com/ (NO Google Cloud)
- Usa "Create API key in new project" en vez de proyecto existente
- Prueba la API key directamente en AI Studio antes de usarla en el código

## Contacto

Si sigues teniendo problemas:
1. Verifica que puedes usar Gemini en https://aistudio.google.com/ directamente
2. Captura pantalla del error en AI Studio
3. Comprueba que la API key empieza con `AIza`
