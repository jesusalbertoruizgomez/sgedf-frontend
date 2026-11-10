/**
 * @file Clase de dominio Usuario.
 * @description Representa a un funcionario del laboratorio con acceso al sistema.
 * Corresponde a la clase "Usuario" del diagrama de clases y a la entidad de usuarios
 * del modelo relacional. Un usuario puede tener uno o varios roles (perito, admin).
 */
(function (SGEDF) {
  'use strict';

  const { Config, Validadores, Cripto } = SGEDF;

  class Usuario {
    /**
     * @param {Object} [datos={}] Datos iniciales del usuario.
     * @param {string} datos.identificacion Número de cédula (clave única).
     * @param {string} datos.nombreCompleto Nombres y apellidos.
     * @param {string} [datos.grado] Grado o cargo (Detective, Técnico, etc.).
     * @param {string} datos.correo Correo institucional.
     * @param {string[]} datos.roles Roles asignados.
     * @param {boolean} [datos.activo=true] Estado de la cuenta.
     * @param {string} [datos.sal] Sal de la contraseña.
     * @param {string} [datos.hashContrasena] Resumen SHA-256 de la contraseña.
     * @param {string|null} [datos.ultimoAcceso] Marca de tiempo ISO del último ingreso.
     * @param {string} [datos.fechaCreacion] Marca de tiempo ISO de creación.
     */
    constructor(datos = {}) {
      this.identificacion = String(datos.identificacion || '').trim();
      this.nombreCompleto = String(datos.nombreCompleto || '').trim();
      this.grado = String(datos.grado || '').trim();
      this.correo = String(datos.correo || '')
        .trim()
        .toLowerCase();
      this.roles = Array.isArray(datos.roles) ? [...new Set(datos.roles)] : [];
      this.activo = datos.activo !== false;
      this.sal = datos.sal || '';
      this.hashContrasena = datos.hashContrasena || '';
      this.ultimoAcceso = datos.ultimoAcceso || null;
      this.fechaCreacion = datos.fechaCreacion || new Date().toISOString();
    }

    /**
     * Indica si el usuario tiene asignado un rol.
     * @param {string} rol Valor de Config.ROLES.
     * @returns {boolean}
     */
    tieneRol(rol) {
      return this.roles.includes(rol);
    }

    /** @returns {string} Roles en formato legible ("Perito / Administrador"). */
    get descripcionRoles() {
      const nombres = {
        [Config.ROLES.PERITO]: 'Perito',
        [Config.ROLES.ADMIN]: 'Administrador',
      };
      return this.roles.map((rol) => nombres[rol] || rol).join(' / ');
    }

    /**
     * Asigna una nueva contraseña generando una sal aleatoria y su resumen.
     * La contraseña en texto plano nunca se almacena.
     * @param {string} contrasena
     */
    establecerContrasena(contrasena) {
      this.sal = Cripto.generarSal();
      this.hashContrasena = Cripto.resumirContrasena(contrasena, this.sal);
    }

    /**
     * Compara una contraseña con el resumen almacenado.
     * @param {string} contrasena
     * @returns {boolean}
     */
    verificarContrasena(contrasena) {
      if (!this.sal || !this.hashContrasena) {
        return false;
      }
      return Cripto.resumirContrasena(contrasena, this.sal) === this.hashContrasena;
    }

    /**
     * Valida los datos del usuario según las reglas de negocio.
     * @returns {Object<string, string>} Mapa campo → mensaje de error (vacío si es válido).
     */
    validar() {
      const errores = {};
      if (!Validadores.esCedula(this.identificacion)) {
        errores.identificacion = 'Ingrese una cédula válida (6 a 10 dígitos).';
      }
      if (this.nombreCompleto.length < 5) {
        errores.nombreCompleto = 'Ingrese nombres y apellidos completos.';
      }
      if (!Validadores.esCorreo(this.correo)) {
        errores.correo = 'Ingrese un correo electrónico válido.';
      }
      const rolesValidos = Object.values(Config.ROLES);
      if (this.roles.length === 0 || this.roles.some((rol) => !rolesValidos.includes(rol))) {
        errores.roles = 'Seleccione al menos un rol válido.';
      }
      return errores;
    }

    /**
     * Objeto plano para persistencia (incluye datos de credenciales).
     * @returns {Object}
     */
    aObjetoPlano() {
      return {
        identificacion: this.identificacion,
        nombreCompleto: this.nombreCompleto,
        grado: this.grado,
        correo: this.correo,
        roles: [...this.roles],
        activo: this.activo,
        sal: this.sal,
        hashContrasena: this.hashContrasena,
        ultimoAcceso: this.ultimoAcceso,
        fechaCreacion: this.fechaCreacion,
      };
    }

    /**
     * Crea una instancia a partir de un objeto plano almacenado.
     * @param {Object} objeto
     * @returns {Usuario}
     */
    static desdeObjeto(objeto) {
      return new Usuario(objeto);
    }
  }

  SGEDF.Usuario = Usuario;
})((window.SGEDF = window.SGEDF || {}));
