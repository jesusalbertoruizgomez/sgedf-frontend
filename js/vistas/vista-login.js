/**
 * @file Vista de inicio de sesión (caso de uso "Iniciar sesión").
 * @description Captura las credenciales y el rol, delega la verificación al
 * servicio de autenticación y notifica a la aplicación cuando el ingreso es exitoso.
 */
(function (SGEDF) {
  'use strict';

  const { Autenticacion } = SGEDF;

  /** Referencias a los elementos de la pantalla (se resuelven al inicializar). */
  const elementos = {};

  /**
   * Muestra un mensaje en el recuadro de la pantalla de ingreso.
   * @param {string} texto
   */
  function mostrarMensaje(texto) {
    elementos.mensaje.textContent = texto;
    elementos.mensaje.hidden = !texto;
  }

  /**
   * Procesa el envío del formulario de ingreso.
   * @param {SubmitEvent} evento
   * @param {Function} alIngresar Función que se ejecuta tras un ingreso exitoso.
   */
  function procesarIngreso(evento, alIngresar) {
    evento.preventDefault();
    const datos = new FormData(elementos.formulario);
    const resultado = Autenticacion.iniciarSesion(
      datos.get('usuario'),
      datos.get('contrasena'),
      datos.get('rol')
    );

    // La contraseña nunca permanece en el campo después de un intento.
    elementos.formulario.elements.contrasena.value = '';

    if (!resultado.exito) {
      mostrarMensaje(resultado.mensaje);
      elementos.formulario.elements.contrasena.focus();
      return;
    }
    mostrarMensaje('');
    elementos.formulario.reset();
    alIngresar(resultado.usuario);
  }

  /**
   * Registra los eventos de la pantalla de ingreso.
   * @param {{alIngresar: Function}} opciones
   */
  function inicializar({ alIngresar }) {
    elementos.pantalla = document.getElementById('pantalla-login');
    elementos.formulario = document.getElementById('form-login');
    elementos.mensaje = document.getElementById('login-mensaje');
    elementos.formulario.addEventListener('submit', (evento) =>
      procesarIngreso(evento, alIngresar)
    );
  }

  /**
   * Muestra la pantalla de ingreso, opcionalmente con un mensaje.
   * @param {string} [mensaje='']
   */
  function mostrar(mensaje = '') {
    elementos.pantalla.hidden = false;
    mostrarMensaje(mensaje);
    document.title = 'SGEDF – Sistema de Gestión de Evidencias Digitales Forenses';
    elementos.formulario.elements.usuario.focus();
  }

  /** Oculta la pantalla de ingreso. */
  function ocultar() {
    elementos.pantalla.hidden = true;
  }

  SGEDF.VistaLogin = Object.freeze({ inicializar, mostrar, ocultar });
})((window.SGEDF = window.SGEDF || {}));
