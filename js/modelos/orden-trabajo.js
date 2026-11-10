/**
 * @file Clase de dominio OrdenTrabajo.
 * @description Entidad central del SGEDF (tabla `orden_trabajo` del modelo relacional).
 * Agrupa los datos de la orden de trabajo y sus componentes asociados:
 *  - Orden de policía judicial (NUNC, delito, autoridad solicitante, plazo).
 *  - Solicitud de análisis FPJ-12 (policía judicial solicitante).
 *  - Dispositivos de almacenamiento digital recibidos (EMP/EF).
 *  - Herramientas forenses empleadas.
 *  - Informe de investigador de laboratorio FPJ-13 y su entrega.
 */
(function (SGEDF) {
  'use strict';

  const { Config, Validadores, Formato } = SGEDF;

  /** Longitud máxima permitida para el campo de observaciones. */
  const MAX_OBSERVACIONES = 2000;

  /** Plazo máximo, en días, de una orden de policía judicial. */
  const MAX_PLAZO_DIAS = 365;

  /**
   * Convierte un valor a entero no negativo (0 si no es válido).
   * @param {*} valor
   * @returns {number}
   */
  function aEntero(valor) {
    const numero = parseInt(valor, 10);
    return Number.isInteger(numero) && numero > 0 ? numero : 0;
  }

  /**
   * Convierte un valor a texto sin espacios sobrantes.
   * @param {*} valor
   * @returns {string}
   */
  function aTexto(valor) {
    return valor === null || valor === undefined ? '' : String(valor).trim();
  }

  class OrdenTrabajo {
    /**
     * @param {Object} [datos={}] Datos de la orden (estructura anidada por componente).
     */
    constructor(datos = {}) {
      const pj = datos.policiaJudicial || {};
      const solicitud = datos.solicitudAnalisis || {};
      const dispositivos = datos.dispositivos || {};
      const informe = datos.informe || {};
      const perito = datos.perito || {};

      // Datos de la orden de trabajo
      this.numero = aTexto(datos.numero).toUpperCase();
      this.fechaInicio = aTexto(datos.fechaInicio);
      this.fechaVigencia = aTexto(datos.fechaVigencia);
      this.clase = aTexto(datos.clase) || Config.CLASES_ORDEN[0];
      this.estado = aTexto(datos.estado) || Config.ESTADOS_ORDEN[0];
      this.perito = {
        identificacion: aTexto(perito.identificacion),
        nombre: aTexto(perito.nombre),
      };

      // Orden de policía judicial
      this.policiaJudicial = {
        nunc: aTexto(pj.nunc),
        delito: aTexto(pj.delito),
        autoridadSolicitante: aTexto(pj.autoridadSolicitante),
        ciudadAutoridad: aTexto(pj.ciudadAutoridad),
        plazoDias: aEntero(pj.plazoDias),
        fechaVencimiento: '',
      };
      this.policiaJudicial.fechaVencimiento = this.calcularFechaVencimiento();

      // Solicitud de análisis FPJ-12
      this.solicitudAnalisis = {
        numero: aTexto(solicitud.numero).toUpperCase(),
        nombreSolicitante: aTexto(solicitud.nombreSolicitante),
        dependencia: aTexto(solicitud.dependencia),
        ciudad: aTexto(solicitud.ciudad),
        telefono: aTexto(solicitud.telefono),
        correo: aTexto(solicitud.correo).toLowerCase(),
      };

      // Dispositivos de almacenamiento digital (cantidades por tipo)
      this.dispositivos = {};
      Config.TIPOS_DISPOSITIVO.forEach(({ clave }) => {
        this.dispositivos[clave] = aEntero(dispositivos[clave]);
      });
      const gigas = parseFloat(datos.totalGb);
      this.totalGb = Number.isFinite(gigas) && gigas > 0 ? Math.round(gigas * 10) / 10 : 0;
      this.herramientas = Array.isArray(datos.herramientas) ? [...new Set(datos.herramientas)] : [];

      // Informe FPJ-13 y entrega
      this.informe = {
        fechaInforme: aTexto(informe.fechaInforme),
        funcionarioReclama: aTexto(informe.funcionarioReclama),
        fechaReclamacion: aTexto(informe.fechaReclamacion),
      };
      this.observaciones = aTexto(datos.observaciones);

      // Metadatos de trazabilidad
      this.fechaRegistro = datos.fechaRegistro || new Date().toISOString();
      this.fechaActualizacion = datos.fechaActualizacion || this.fechaRegistro;
    }

    /**
     * Fecha de vencimiento = fecha de inicio + plazo de la orden (en días).
     * @returns {string} Fecha ISO o cadena vacía si faltan datos.
     */
    calcularFechaVencimiento() {
      if (!this.fechaInicio || this.policiaJudicial.plazoDias <= 0) {
        return '';
      }
      return Formato.sumarDias(this.fechaInicio, this.policiaJudicial.plazoDias);
    }

    /** @returns {number} Cantidad total de dispositivos recibidos. */
    get totalDispositivos() {
      return Object.values(this.dispositivos).reduce((suma, cantidad) => suma + cantidad, 0);
    }

    /** @returns {boolean} Verdadero si la orden sigue en trámite. */
    get estaActiva() {
      return Config.ESTADOS_ACTIVOS.includes(this.estado);
    }

    /**
     * Días que faltan para el vencimiento (negativo si ya venció).
     * @param {string} [hoyIso] Fecha de referencia; por defecto, hoy.
     * @returns {number|null}
     */
    diasParaVencer(hoyIso = Formato.fechaHoyIso()) {
      return Formato.diasEntre(hoyIso, this.policiaJudicial.fechaVencimiento);
    }

    /**
     * Clasifica la orden según la proximidad de su vencimiento.
     * @param {string} [hoyIso]
     * @returns {'vencida'|'proxima'|'en-termino'|'no-aplica'}
     */
    situacionVencimiento(hoyIso = Formato.fechaHoyIso()) {
      const dias = this.diasParaVencer(hoyIso);
      if (!this.estaActiva || dias === null) {
        return 'no-aplica';
      }
      if (dias < 0) {
        return 'vencida';
      }
      return dias <= Config.DIAS_ALERTA_VENCIMIENTO ? 'proxima' : 'en-termino';
    }

    /**
     * Valida la orden con las reglas de negocio de la historia de usuario HU-01.
     * Las claves del resultado coinciden con el atributo `name` de los campos del
     * formulario para poder señalar cada error junto a su campo.
     * @param {string} [hoyIso] Fecha de referencia para validar fechas futuras.
     * @returns {Object<string, string>} Mapa campo → mensaje (vacío si es válida).
     */
    validar(hoyIso = Formato.fechaHoyIso()) {
      const errores = {};
      const pj = this.policiaJudicial;
      const solicitud = this.solicitudAnalisis;
      const informe = this.informe;

      // --- Datos de la orden de trabajo ---
      if (!Validadores.esNumeroOrdenTrabajo(this.numero)) {
        errores.numero = 'Use el formato OT-AAAA-NNN (ejemplo: OT-2026-015).';
      }
      if (!Validadores.esFechaValida(this.fechaInicio)) {
        errores.fechaInicio = 'Ingrese la fecha de inicio.';
      } else if (Formato.diasEntre(hoyIso, this.fechaInicio) > 0) {
        errores.fechaInicio = 'La fecha de inicio no puede ser posterior a la fecha actual.';
      }
      if (!Validadores.esFechaValida(this.fechaVigencia)) {
        errores.fechaVigencia = 'Ingrese la fecha de vigencia.';
      } else if (
        Validadores.esFechaValida(this.fechaInicio) &&
        !Validadores.esFechaNoAnterior(this.fechaInicio, this.fechaVigencia)
      ) {
        errores.fechaVigencia = 'La vigencia no puede ser anterior a la fecha de inicio.';
      }
      if (!Config.CLASES_ORDEN.includes(this.clase)) {
        errores.clase = 'Seleccione una clase de orden válida.';
      }
      if (!Config.ESTADOS_ORDEN.includes(this.estado)) {
        errores.estado = 'Seleccione un estado válido.';
      }
      if (!Validadores.esCedula(this.perito.identificacion)) {
        errores['perito.identificacion'] = 'Ingrese una cédula válida (6 a 10 dígitos).';
      }
      if (!Validadores.esRequerido(this.perito.nombre)) {
        errores['perito.nombre'] = 'Ingrese los nombres y apellidos del perito.';
      }

      // --- Orden de policía judicial ---
      if (!Validadores.esNunc(pj.nunc)) {
        errores['policiaJudicial.nunc'] = 'El NUNC debe tener exactamente 21 dígitos.';
      }
      if (!Validadores.esRequerido(pj.delito)) {
        errores['policiaJudicial.delito'] = 'Indique el delito investigado.';
      }
      if (!Validadores.esRequerido(pj.autoridadSolicitante)) {
        errores['policiaJudicial.autoridadSolicitante'] = 'Indique la autoridad solicitante.';
      }
      if (!Validadores.esRequerido(pj.ciudadAutoridad)) {
        errores['policiaJudicial.ciudadAutoridad'] = 'Indique la ciudad de la autoridad.';
      }
      if (pj.plazoDias < 1 || pj.plazoDias > MAX_PLAZO_DIAS) {
        errores['policiaJudicial.plazoDias'] =
          `El plazo debe estar entre 1 y ${MAX_PLAZO_DIAS} días.`;
      }

      // --- Solicitud de análisis FPJ-12 ---
      if (!Validadores.esRequerido(solicitud.numero)) {
        errores['solicitudAnalisis.numero'] = 'Indique el número de la solicitud FPJ-12.';
      }
      if (!Validadores.esRequerido(solicitud.nombreSolicitante)) {
        errores['solicitudAnalisis.nombreSolicitante'] = 'Indique el policía judicial solicitante.';
      }
      if (!Validadores.esRequerido(solicitud.dependencia)) {
        errores['solicitudAnalisis.dependencia'] = 'Indique la dependencia solicitante.';
      }
      if (solicitud.telefono && !Validadores.esTelefono(solicitud.telefono)) {
        errores['solicitudAnalisis.telefono'] = 'Ingrese un teléfono válido.';
      }
      if (solicitud.correo && !Validadores.esCorreo(solicitud.correo)) {
        errores['solicitudAnalisis.correo'] = 'Ingrese un correo electrónico válido.';
      }

      // --- Dispositivos y herramientas ---
      if (this.totalDispositivos === 0) {
        errores.dispositivos = 'Registre al menos un dispositivo de almacenamiento digital.';
      }
      if (this.herramientas.length === 0) {
        errores.herramientas = 'Seleccione al menos una herramienta forense.';
      } else if (this.herramientas.some((h) => !Config.HERRAMIENTAS_FORENSES.includes(h))) {
        errores.herramientas = 'La lista contiene herramientas no reconocidas.';
      }

      // --- Informe FPJ-13 y entrega ---
      if (informe.fechaInforme) {
        if (!Validadores.esFechaValida(informe.fechaInforme)) {
          errores['informe.fechaInforme'] = 'Ingrese una fecha válida.';
        } else if (!Validadores.esFechaNoAnterior(this.fechaInicio, informe.fechaInforme)) {
          errores['informe.fechaInforme'] =
            'La fecha del informe no puede ser anterior al inicio de la orden.';
        }
      }
      if (informe.fechaReclamacion) {
        if (!informe.fechaInforme) {
          errores['informe.fechaReclamacion'] = 'Registre primero la fecha del informe FPJ-13.';
        } else if (!Validadores.esFechaNoAnterior(informe.fechaInforme, informe.fechaReclamacion)) {
          errores['informe.fechaReclamacion'] =
            'La reclamación no puede ser anterior a la fecha del informe.';
        }
        if (!Validadores.esRequerido(informe.funcionarioReclama)) {
          errores['informe.funcionarioReclama'] = 'Indique el funcionario que reclama el informe.';
        }
      }
      if (this.estado === 'Resuelta' && !informe.fechaInforme) {
        errores.estado = 'Para marcar la orden como Resuelta registre la fecha del informe FPJ-13.';
      }
      if (this.observaciones.length > MAX_OBSERVACIONES) {
        errores.observaciones = `Máximo ${MAX_OBSERVACIONES} caracteres.`;
      }

      return errores;
    }

    /**
     * Objeto plano para persistencia o intercambio con el back-end (JSON).
     * @returns {Object}
     */
    aObjetoPlano() {
      return {
        numero: this.numero,
        fechaInicio: this.fechaInicio,
        fechaVigencia: this.fechaVigencia,
        clase: this.clase,
        estado: this.estado,
        perito: { ...this.perito },
        policiaJudicial: { ...this.policiaJudicial },
        solicitudAnalisis: { ...this.solicitudAnalisis },
        dispositivos: { ...this.dispositivos },
        totalGb: this.totalGb,
        herramientas: [...this.herramientas],
        informe: { ...this.informe },
        observaciones: this.observaciones,
        fechaRegistro: this.fechaRegistro,
        fechaActualizacion: this.fechaActualizacion,
      };
    }

    /**
     * Crea una instancia a partir de un objeto plano almacenado.
     * @param {Object} objeto
     * @returns {OrdenTrabajo}
     */
    static desdeObjeto(objeto) {
      return new OrdenTrabajo(objeto);
    }
  }

  SGEDF.OrdenTrabajo = OrdenTrabajo;
})((window.SGEDF = window.SGEDF || {}));
