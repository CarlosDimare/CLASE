# 🔧 Configuración de GitHub Pages - Guía Paso a Paso

## Después de Subir el Código

Una vez que hayas ejecutado los comandos de git push, sigue estos pasos:

## Paso 1: Acceder a Settings

1. **Ve a tu repositorio**: https://github.com/carlosdimare/CLASE
2. **Haz clic en "Settings"** (pestaña en la parte superior del repositorio)
3. **En el menú lateral izquierdo**, desplázate hasta encontrar **"Pages"**

## Paso 2: Configurar la Fuente

En la sección **"Source"**:
1. **Haz clic en el dropdown** que dice "None" o "Deploy from a branch"
2. **Selecciona "GitHub Actions"**
3. **No necesitas seleccionar branch** - GitHub Actions manejará esto automáticamente

## Paso 3: El Workflow se Ejecuta Automáticamente

Después de seleccionar "GitHub Actions":
1. **GitHub detectará automáticamente** el archivo `.github/workflows/deploy.yml`
2. **Se iniciará el workflow** de despliegue
3. **Verás un mensaje**: "Your site is being built..."

## Paso 4: Monitorear el Despliegue

### En la pestaña Actions:
1. **Haz clic en "Actions"** (pestaña en la parte superior)
2. **Busca el workflow "Deploy to GitHub Pages"**
3. **Verás un estado como**:
   - ⏳ **"In progress"** - Se está construyendo
   - ✅ **"Success"** - Se completó exitosamente
   - ❌ **"Failed"** - Hubo un error

### Estados esperados:
- **"Build and Deploy"** (en progreso)
- **"Deploy to GitHub Pages"** (completado)

## Paso 5: Verificar la URL

Una vez que el workflow sea exitoso:
1. **Tu sitio estará disponible en**: https://carlosdimare.github.io/CLASE/
2. **La URL también aparece en Settings → Pages** como "Your site is published at"

## Posibles Problemas y Soluciones

### 🔄 Workflow No Se Ejecuta
**Síntoma**: No aparece en Actions después del push
**Solución**: 
- Verifica que el archivo `.github/workflows/deploy.yml` esté en el repositorio
- Asegúrate de haber hecho push del branch correcto (main/master)

### ❌ Workflow Falla
**Síntoma**: Estado "Failed" en Actions
**Solución**:
1. **Haz clic en el workflow fallido**
2. **Revisa los logs** expandiendo los errores
3. **Problemas comunes**:
   - Errores de TypeScript
   - Dependencias faltantes
   - Archivos no encontrados

### 🕐 Sitio No Se Actualiza
**Síntoma**: Workflow exitoso pero sitio sigue mostrando versión anterior
**Solución**:
1. **Espera 2-5 minutos** adicionales
2. **Limpia la caché** del navegador (Ctrl+F5 o Cmd+Shift+R)
3. **Prueba en ventana incógnita**
4. **Verifica la URL**: https://carlosdimare.github.io/CLASE/

### 🌐 Error 404
**Síntoma**: Página no encontrada
**Solución**:
- **Verifica la configuración** en Settings → Pages
- **Asegúrate de que la base sea** "/" y no "/CLASE"
- **El workflow ya configuró esto automáticamente**

## Verificación Final

Cuando todo esté funcionando correctamente:
- ✅ **URL accesible**: https://carlosdimare.github.io/CLASE/
- ✅ **Cambios visibles**: Fecha/hora en navbar, sin Sala de Situación
- ✅ **Workflow exitoso** en Actions
- ✅ **GitHub Pages marcado** como "Published"

## Configuración Final del Proyecto

El proyecto ya está completamente configurado con:
- ✅ **Build automático** con GitHub Actions
- ✅ **Rutas correctas** para GitHub Pages
- ✅ **Optimización** de archivos
- ✅ **Despliegue continuo** en cada push