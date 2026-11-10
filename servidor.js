/**
 * Servidor HTTP estático de desarrollo para el front-end del SGEDF.
 *
 * Usa únicamente módulos nativos de Node.js (sin dependencias externas).
 * Ejecución: npm start  →  http://localhost:3000
 *
 * Medidas de seguridad aplicadas:
 *  - Normalización de rutas para impedir el recorrido de directorios (path traversal).
 *  - Lista blanca de tipos MIME: solo se sirven extensiones conocidas.
 *  - Cabeceras de seguridad básicas (CSP, X-Content-Type-Options, X-Frame-Options).
 */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

/** Puerto de escucha; puede sobrescribirse con la variable de entorno PUERTO. */
const PUERTO = Number(process.env.PUERTO) || 3000;

/** Carpeta raíz desde la que se sirven los archivos. */
const RAIZ = path.resolve(__dirname);

/** Tipos MIME permitidos por extensión de archivo. */
const TIPOS_MIME = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
});

/** Cabeceras de seguridad que acompañan cada respuesta. */
const CABECERAS_SEGURIDAD = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'",
});

/**
 * Envía una respuesta de texto plano con el código de estado indicado.
 * @param {http.ServerResponse} respuesta
 * @param {number} codigo Código de estado HTTP.
 * @param {string} mensaje Texto del cuerpo.
 */
function responderTexto(respuesta, codigo, mensaje) {
  respuesta.writeHead(codigo, {
    'Content-Type': 'text/plain; charset=utf-8',
    ...CABECERAS_SEGURIDAD,
  });
  respuesta.end(mensaje);
}

/**
 * Resuelve de forma segura la ruta física solicitada dentro de la carpeta raíz.
 * @param {string} urlSolicitada URL recibida en la petición.
 * @returns {string|null} Ruta absoluta o null si intenta salir de la raíz.
 */
function resolverRutaSegura(urlSolicitada) {
  const rutaUrl = decodeURIComponent(new URL(urlSolicitada, 'http://localhost').pathname);
  const relativa = rutaUrl === '/' ? 'index.html' : rutaUrl.replace(/^\/+/, '');
  const absoluta = path.resolve(RAIZ, relativa);
  const dentroDeRaiz = absoluta === RAIZ || absoluta.startsWith(RAIZ + path.sep);
  const esOculto = relativa.split('/').some((segmento) => segmento.startsWith('.'));
  const esDependencia = relativa.startsWith('node_modules');
  return dentroDeRaiz && !esOculto && !esDependencia ? absoluta : null;
}

const servidor = http.createServer((peticion, respuesta) => {
  if (peticion.method !== 'GET' && peticion.method !== 'HEAD') {
    responderTexto(respuesta, 405, 'Método no permitido');
    return;
  }

  let rutaArchivo;
  try {
    rutaArchivo = resolverRutaSegura(peticion.url);
  } catch {
    responderTexto(respuesta, 400, 'Solicitud inválida');
    return;
  }

  const tipoMime = rutaArchivo ? TIPOS_MIME[path.extname(rutaArchivo).toLowerCase()] : undefined;
  if (!rutaArchivo || !tipoMime) {
    responderTexto(respuesta, 404, 'Recurso no encontrado');
    return;
  }

  fs.readFile(rutaArchivo, (error, contenido) => {
    if (error) {
      responderTexto(respuesta, 404, 'Recurso no encontrado');
      return;
    }
    respuesta.writeHead(200, { 'Content-Type': tipoMime, ...CABECERAS_SEGURIDAD });
    respuesta.end(peticion.method === 'HEAD' ? undefined : contenido);
  });
});

servidor.listen(PUERTO, () => {
  console.log(`SGEDF front-end disponible en http://localhost:${PUERTO}`);
});
