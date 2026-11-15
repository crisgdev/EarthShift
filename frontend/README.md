# Piura Watch — Observatorio Climático y Satelital NASA (Piura, Perú)

Aplicación web full-stack en tiempo real enfocada en las 6 subcuencas de **Piura** y conectada directamente con APIs oficiales de la **NASA**:

- **NASA POWER v2** (Temperatura a 2 m, precipitación, irradiancia solar y viento en vivo por coordenada).
- **NASA GIBS WMTS** (Mosaicos satelitales MODIS Terra, VIIRS Suomi NPP, LST térmica, GPM IMERG lluvia y NDVI).
- **NASA EONET v3** (Alertas ambientales activas en el corredor Pacífico–Andes).

---

## Cómo abrir y ejecutar este proyecto en tu PC

> **Nota importante:** Este proyecto es una aplicación web React + Node.js (Express + Vite), no un archivo HTML estático suelto; al hacer doble clic en `index.html` no cargarán los módulos ni el servidor NASA. Sigue estos 4 pasos sencillos:

### 1. Descargar e instalar Node.js (solo la primera vez)
1. Entra a [https://nodejs.org](https://nodejs.org) y descarga la versión **LTS** (recomendada).
2. Instálala dejando todas las opciones por defecto.

### 2. Descomprimir el archivo descargado
1. Haz clic derecho sobre el `.zip` descargado y selecciona **Extraer todo...** (en Windows) o haz doble clic (en Mac).
2. Abre la carpeta extraída.

### 3. Abrir una terminal dentro de la carpeta del proyecto
- **En Windows:** Abre la carpeta en el Explorador de archivos, haz clic en la barra de dirección arriba, escribe `cmd` y presiona **Enter** (o abre la carpeta en **VS Code** y presiona `Ctrl + Ñ`).
- **En Mac:** Abre Terminal, escribe `cd ` (con un espacio), arrastra la carpeta hacia la terminal y presiona **Enter**.

### 4. Instalar dependencias y arrancar el observatorio
Ejecuta estos dos comandos uno después del otro:

```bash
npm install
npm run dev
```

Cuando veas el mensaje:
`Piura Watch NASA Observatory server running at http://0.0.0.0:3000`

Abre tu navegador (Chrome, Edge, Safari o Firefox) y entra a:

**http://localhost:3000**

> Las APIs de la NASA (`POWER`, `GIBS` y `EONET`) son abiertas y funcionan de inmediato sin necesidad de configurar claves secretas.
