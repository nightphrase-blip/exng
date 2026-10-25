// La mesa en 3D (con Three.js): habitación, mesa con tapete, lámpara, robot,
// tablet con la gráfica, montones de fichas y las cartas de tu mano.
(function (global) {
  "use strict";

  const T = global.THREE;
  const X = global.Texturas;

  const MESA_Y = 0.78; // altura del tapete
  const MESA_Z = -0.2; // centro de la mesa
  const TAPETE = { ancho: 1.8, fondo: 1.2 };

  // Dónde va cada cosa sobre la mesa (x, z)
  const SITIOS = {
    efectivo: [-0.44, -0.2],
    invertido: [0.44, -0.2],
    robot: [0.44, -0.66],
    cartaRobot: [-0.44, -0.66],
    cartaJugador: [0, 0.04],
  };

  const COLOR_FICHA = { efectivo: "#f2b632", invertido: "#6d72ff", robot: "#21b8a6" };
  const MAX_FICHAS = 60;

  const sinMovimiento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------------------------------------------------------------------------
  // Animaciones sencillas
  // ---------------------------------------------------------------------------
  const animaciones = new Set();
  const suave = (k) => 1 - Math.pow(1 - k, 3);

  function animar(duracion, paso, curva) {
    if (sinMovimiento()) duracion = 1;
    return new Promise((fin) => {
      animaciones.add({ inicio: performance.now(), duracion, paso, curva: curva || suave, fin });
    });
  }

  function avanzarAnimaciones(ahora) {
    for (const a of animaciones) {
      const k = Math.min(1, Math.max(0, (ahora - a.inicio) / a.duracion));
      a.paso(a.curva(k), k);
      if (k >= 1) {
        animaciones.delete(a);
        a.fin();
      }
    }
  }

  const esperar = (ms) => new Promise((r) => setTimeout(r, sinMovimiento() ? 0 : ms));

  // ---------------------------------------------------------------------------
  // Ayudas para crear objetos
  // ---------------------------------------------------------------------------
  const material = (color, extra) =>
    new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.7, metalness: 0.05 }, extra));

  function textura(canvas) {
    const t = new T.CanvasTexture(canvas);
    t.encoding = T.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }

  function formaRedonda(ancho, alto, radio) {
    const x = -ancho / 2;
    const y = -alto / 2;
    const s = new T.Shape();
    s.moveTo(x + radio, y);
    s.lineTo(x + ancho - radio, y);
    s.quadraticCurveTo(x + ancho, y, x + ancho, y + radio);
    s.lineTo(x + ancho, y + alto - radio);
    s.quadraticCurveTo(x + ancho, y + alto, x + ancho - radio, y + alto);
    s.lineTo(x + radio, y + alto);
    s.quadraticCurveTo(x, y + alto, x, y + alto - radio);
    s.lineTo(x, y + radio);
    s.quadraticCurveTo(x, y, x + radio, y);
    return s;
  }

  // Plano con esquinas redondeadas y la imagen ocupando todo el rectángulo.
  function planoRedondo(ancho, alto, radio) {
    const g = new T.ShapeGeometry(formaRedonda(ancho, alto, radio), 6);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / ancho + 0.5, pos.getY(i) / alto + 0.5);
    return g;
  }

  // Caja con bordes redondeados (centrada).
  function cajaRedonda(ancho, alto, fondo, radio) {
    const bisel = Math.min(radio * 0.5, fondo * 0.3);
    const g = new T.ExtrudeGeometry(formaRedonda(ancho - bisel * 2, alto - bisel * 2, Math.max(0.001, radio - bisel)), {
      depth: fondo - bisel * 2,
      bevelEnabled: true,
      bevelThickness: bisel,
      bevelSize: bisel,
      bevelSegments: 3,
      curveSegments: 8,
    });
    g.translate(0, 0, -(fondo - bisel * 2) / 2);
    return g;
  }

  function sombras(objeto) {
    objeto.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return objeto;
  }

  // ---------------------------------------------------------------------------
  // Tapete con las zonas dibujadas
  // ---------------------------------------------------------------------------
  function dibujarTapete() {
    const W = 1440;
    const H = 960;
    const c = X.lienzo(W, H);
    const ctx = c.getContext("2d");
    const fondo = ctx.createRadialGradient(W / 2, H * 0.45, 50, W / 2, H / 2, W * 0.7);
    fondo.addColorStop(0, "#2a8a63");
    fondo.addColorStop(1, "#155a40");
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, W, H);
    // Textura de fieltro
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
      ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }
    ctx.strokeStyle = "rgba(255, 214, 120, 0.55)";
    ctx.lineWidth = 6;
    X.rectRedondo(ctx, 30, 30, W - 60, H - 60, 90);
    ctx.stroke();

    const enLienzo = ([x, z]) => [((x + TAPETE.ancho / 2) / TAPETE.ancho) * W, ((z - (MESA_Z - TAPETE.fondo / 2)) / TAPETE.fondo) * H];
    const zona = (sitio, texto, forma) => {
      const [cx, cy] = enLienzo(SITIOS[sitio]);
      ctx.strokeStyle = "rgba(255, 214, 120, 0.6)";
      ctx.lineWidth = 5;
      if (forma === "carta") X.rectRedondo(ctx, cx - 80, cy - 112, 160, 224, 16);
      else {
        ctx.beginPath();
        ctx.arc(cx, cy, 110, 0, Math.PI * 2);
      }
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 224, 150, 0.75)";
      ctx.font = '800 30px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(texto, cx, forma === "carta" ? cy + 150 : cy + 152);
    };
    zona("efectivo", "TU HUCHA");
    zona("invertido", "TU INVERSIÓN");
    zona("robot", "ROBOT");
    zona("cartaRobot", "", "carta");
    return c;
  }

  // ---------------------------------------------------------------------------
  // Fichas
  // ---------------------------------------------------------------------------
  const GEO_FICHA = new T.CylinderGeometry(0.034, 0.034, 0.011, 28);

  function texturaFicha(color) {
    const c = X.lienzo(128, 128);
    const ctx = c.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 9;
    ctx.setLineDash([14, 12]);
    ctx.beginPath();
    ctx.arc(64, 64, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(64, 64, 30, 0, Math.PI * 2);
    ctx.stroke();
    return textura(c);
  }

  const materialesFicha = {};
  function materialFicha(tipo) {
    if (!materialesFicha[tipo]) {
      const lado = material(COLOR_FICHA[tipo], { roughness: 0.45 });
      const cara = new T.MeshStandardMaterial({ map: texturaFicha(COLOR_FICHA[tipo]), roughness: 0.45 });
      materialesFicha[tipo] = [lado, cara, cara];
    }
    return materialesFicha[tipo];
  }

  // Posición de la ficha número i en un montón: columnas de 10 alrededor del centro.
  const COLUMNAS = [[0, 0], [0.074, 0], [-0.074, 0], [0.037, 0.064], [-0.037, 0.064], [0, -0.07]];
  function posicionFicha(sitio, i) {
    const [cx, cz] = SITIOS[sitio];
    const [dx, dz] = COLUMNAS[Math.floor(i / 10) % COLUMNAS.length];
    const desorden = Math.sin(i * 12.9898) * 0.003;
    return new T.Vector3(cx + dx + desorden, MESA_Y + 0.0056 + (i % 10) * 0.0112, cz + dz - desorden);
  }

  class Monton {
    constructor(escena, sitio) {
      this.sitio = sitio;
      this.tipo = sitio;
      this.grupo = new T.Group();
      escena.add(this.grupo);
      this.fichas = [];
    }

    crearFicha() {
      const ficha = new T.Mesh(GEO_FICHA, materialFicha(this.tipo));
      ficha.castShadow = true;
      ficha.receiveShadow = true;
      ficha.rotation.y = Math.random() * Math.PI;
      this.grupo.add(ficha);
      return ficha;
    }

    poner(cantidad) {
      while (this.fichas.length < cantidad) this.fichas.push(this.crearFicha());
      while (this.fichas.length > cantidad) this.grupo.remove(this.fichas.pop());
      this.fichas.forEach((f, i) => f.position.copy(posicionFicha(this.sitio, i)));
    }

    // Punto encima del montón, para colocar la etiqueta con el importe.
    cima() {
      const n = Math.min(this.fichas.length, 10);
      const [cx, cz] = SITIOS[this.sitio];
      return new T.Vector3(cx, MESA_Y + 0.05 + n * 0.0112, cz);
    }
  }

  // Mueve fichas volando en arco desde "desde" (punto) hasta las posiciones nuevas de un montón.
  function volarFichas(monton, desdeIndice, hasta, origen, demora) {
    const tareas = [];
    for (let i = desdeIndice; i < hasta; i++) {
      const ficha = monton.crearFicha();
      const inicio = typeof origen === "function" ? origen(i - desdeIndice) : origen.clone();
      const fin = posicionFicha(monton.sitio, i);
      ficha.position.copy(inicio);
      ficha.visible = false;
      const retraso = (i - desdeIndice) * (demora || 45);
      tareas.push(
        esperar(retraso).then(() => {
          ficha.visible = true;
          return animar(480, (k) => {
            ficha.position.lerpVectors(inicio, fin, k);
            ficha.position.y += Math.sin(k * Math.PI) * 0.18;
            ficha.rotation.x = (1 - k) * 2.5;
          });
        }),
      );
      monton.fichas.push(ficha);
    }
    return Promise.all(tareas);
  }

  // ---------------------------------------------------------------------------
  // Robot (amable): cuerpo crema, cara de pantalla, antena naranja
  // ---------------------------------------------------------------------------
  function crearRobot() {
    const grupo = new T.Group();
    const crema = material("#f3eadb", { roughness: 0.42 });
    const naranja = material("#ff8a3d", { roughness: 0.4, emissive: "#ff6a00", emissiveIntensity: 0.15 });
    const oscuro = material("#2b3140", { roughness: 0.5 });

    const cuerpo = new T.Mesh(new T.CapsuleGeometry(0.2, 0.22, 8, 24), crema);
    cuerpo.position.y = 0.98;
    cuerpo.scale.set(1.15, 1, 0.85);
    const boton = new T.Mesh(new T.CircleGeometry(0.05, 28), naranja);
    boton.position.set(0, 1.02, 0.172);
    const cuello = new T.Mesh(new T.CylinderGeometry(0.06, 0.07, 0.08, 20), oscuro);
    cuello.position.y = 1.24;
    grupo.add(cuerpo, boton, cuello);

    const cabeza = new T.Group();
    cabeza.position.y = 1.44;
    const casco = new T.Mesh(cajaRedonda(0.52, 0.38, 0.3, 0.12), crema);
    const marco = new T.Mesh(planoRedondo(0.44, 0.3, 0.07), new T.MeshStandardMaterial({ color: "#11161f", roughness: 0.3 }));
    marco.position.z = 0.151;
    const lienzoCara = X.lienzo(256, 176);
    const texturaCara = textura(lienzoCara);
    const pantalla = new T.Mesh(planoRedondo(0.4, 0.27, 0.06), new T.MeshBasicMaterial({ map: texturaCara, toneMapped: false }));
    pantalla.position.z = 0.153;
    cabeza.add(casco, marco, pantalla);
    for (const lado of [-1, 1]) {
      const oreja = new T.Mesh(new T.CylinderGeometry(0.055, 0.055, 0.06, 24), naranja);
      oreja.rotation.z = Math.PI / 2;
      oreja.position.x = lado * 0.27;
      cabeza.add(oreja);
    }
    const varilla = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 0.12, 8), oscuro);
    varilla.position.y = 0.25;
    const bola = new T.Mesh(new T.SphereGeometry(0.035, 16, 12), naranja.clone());
    bola.position.y = 0.32;
    cabeza.add(varilla, bola);
    grupo.add(cabeza);

    // Brazos apoyados en la mesa (el derecho se mueve al jugar)
    const brazos = [];
    for (const lado of [-1, 1]) {
      const hombro = new T.Group();
      hombro.position.set(lado * 0.27, 1.1, 0.02);
      const brazo = new T.Mesh(new T.CapsuleGeometry(0.048, 0.26, 6, 16), crema);
      brazo.position.y = -0.16;
      const mano = new T.Mesh(new T.SphereGeometry(0.065, 20, 14), naranja);
      mano.position.y = -0.33;
      hombro.add(brazo, mano);
      hombro.rotation.x = -1.05;
      hombro.rotation.z = lado * 0.32;
      grupo.add(hombro);
      brazos.push(hombro);
    }

    grupo.position.set(0, 0, -0.98);
    sombras(grupo);
    pantalla.castShadow = false;
    return { grupo, cabeza, bola, lienzoCara, texturaCara, brazoDerecho: brazos[1] };
  }

  // ---------------------------------------------------------------------------
  // Escena completa
  // ---------------------------------------------------------------------------
  function crearEscena(contenedor, etiquetas) {
    const renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    contenedor.appendChild(renderer.domElement);

    const escena = new T.Scene();
    escena.background = new T.Color("#24170f");
    escena.fog = new T.Fog("#24170f", 3.2, 9);
    const camara = new T.PerspectiveCamera(50, 1, 0.05, 40);
    escena.add(camara);

    // Luces cálidas
    escena.add(new T.HemisphereLight("#ffe2c0", "#2a1a10", 0.65));
    const foco = new T.SpotLight("#ffd7a1", 1.5, 0, 0.9, 0.55, 1);
    foco.position.set(0, 2.15, MESA_Z);
    foco.target.position.set(0, MESA_Y, MESA_Z);
    foco.castShadow = true;
    foco.shadow.mapSize.set(1024, 1024);
    foco.shadow.bias = -0.0005;
    escena.add(foco, foco.target);
    const contraluz = new T.DirectionalLight("#9fb8ff", 0.3);
    contraluz.position.set(-1.5, 2.2, -2.5);
    escena.add(contraluz);

    // Habitación
    const suelo = new T.Mesh(new T.PlaneGeometry(14, 14), material("#3a2417", { roughness: 0.9 }));
    suelo.rotation.x = -Math.PI / 2;
    suelo.receiveShadow = true;
    const pared = new T.Mesh(new T.PlaneGeometry(14, 6), material("#5a3826", { roughness: 0.95 }));
    pared.position.set(0, 3, -2.6);
    const zocalo = new T.Mesh(new T.BoxGeometry(14, 1, 0.05), material("#3f2618"));
    zocalo.position.set(0, 0.5, -2.57);
    escena.add(suelo, pared, zocalo);

    // Cuadro en la pared con una gráfica que sube (decoración)
    const cuadro = X.lienzo(512, 320);
    {
      const ctx = cuadro.getContext("2d");
      ctx.fillStyle = "#f6e7c8";
      ctx.fillRect(0, 0, 512, 320);
      ctx.strokeStyle = "#2a8a63";
      ctx.lineWidth = 14;
      ctx.lineJoin = "round";
      ctx.beginPath();
      [[40, 270], [130, 220], [200, 240], [290, 150], [360, 175], [470, 60]].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    const marcoCuadro = new T.Mesh(new T.BoxGeometry(0.96, 0.64, 0.04), material("#2b1a10"));
    marcoCuadro.position.set(-1.1, 1.9, -2.55);
    const lamina = new T.Mesh(new T.PlaneGeometry(0.86, 0.54), new T.MeshStandardMaterial({ map: textura(cuadro), roughness: 0.8 }));
    lamina.position.set(-1.1, 1.9, -2.528);
    escena.add(marcoCuadro, lamina);

    // Mesa de madera con tapete verde
    const madera = material("#7a4a2a", { roughness: 0.55 });
    const tablero = new T.Mesh(cajaRedonda(2.0, 1.4, 0.07, 0.2), madera);
    tablero.rotation.x = -Math.PI / 2;
    tablero.position.set(0, MESA_Y - 0.04, MESA_Z);
    const tapete = new T.Mesh(planoRedondo(TAPETE.ancho, TAPETE.fondo, 0.14), new T.MeshStandardMaterial({ map: textura(dibujarTapete()), roughness: 0.95 }));
    tapete.rotation.x = -Math.PI / 2;
    tapete.position.set(0, MESA_Y, MESA_Z);
    escena.add(sombras(tablero), tapete);
    tapete.receiveShadow = true;
    for (const [x, z] of [[-0.85, 0.35], [0.85, 0.35], [-0.85, -0.75], [0.85, -0.75]]) {
      const pata = new T.Mesh(new T.CylinderGeometry(0.05, 0.04, MESA_Y - 0.07, 12), madera);
      pata.position.set(x, (MESA_Y - 0.07) / 2, z + MESA_Z + 0.2);
      escena.add(sombras(pata));
    }

    // Lámpara colgante y haz de luz
    const pantallaLampara = new T.Mesh(new T.ConeGeometry(0.3, 0.22, 32, 1, true), material("#2f6b55", { side: T.DoubleSide, roughness: 0.5 }));
    pantallaLampara.position.set(0, 2.26, MESA_Z);
    const bombilla = new T.Mesh(new T.SphereGeometry(0.065, 16, 12), new T.MeshBasicMaterial({ color: "#fff1c9" }));
    bombilla.position.set(0, 2.17, MESA_Z);
    const cable = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, 2), material("#111111"));
    cable.position.set(0, 3.36, MESA_Z);
    const haz = new T.Mesh(
      new T.ConeGeometry(0.95, 2.17 - MESA_Y, 40, 1, true),
      new T.MeshBasicMaterial({ color: "#ffd9a0", transparent: true, opacity: 0.05, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }),
    );
    haz.position.set(0, (2.17 + MESA_Y) / 2, MESA_Z);
    escena.add(pantallaLampara, bombilla, cable, haz);

    // Robot
    const robot = crearRobot();
    escena.add(robot.grupo);
    let expresion = "normal";
    let hablando = false;
    let ultimaCara = 0;

    // Tablet con la gráfica
    const tablet = new T.Group();
    const carcasa = new T.Mesh(cajaRedonda(0.56, 0.37, 0.022, 0.035), material("#1c2230", { roughness: 0.35, metalness: 0.3 }));
    const lienzoTablet = X.lienzo(1024, 640);
    const texturaTablet = textura(lienzoTablet);
    const pantallaTablet = new T.Mesh(planoRedondo(0.512, 0.32, 0.018), new T.MeshBasicMaterial({ map: texturaTablet, toneMapped: false }));
    pantallaTablet.position.z = 0.0115;
    tablet.add(carcasa, pantallaTablet);
    tablet.position.set(0, MESA_Y + 0.2, -0.42);
    tablet.rotation.x = -0.38;
    const soporte = new T.Mesh(new T.BoxGeometry(0.22, 0.24, 0.02), material("#1c2230"));
    soporte.position.set(0, MESA_Y + 0.11, -0.52);
    soporte.rotation.x = 0.45;
    escena.add(sombras(tablet), sombras(soporte));
    X.dibujarTablet(lienzoTablet.getContext("2d"), 1024, 640, null);

    // Fichas
    const montones = {
      efectivo: new Monton(escena, "efectivo"),
      invertido: new Monton(escena, "invertido"),
      robot: new Monton(escena, "robot"),
    };

    // -------------------------------------------------------------------------
    // Cámara: en vertical (móvil) se aleja un poco para que quepa la mesa
    // -------------------------------------------------------------------------
    let aspecto = 1;
    function encuadrar() {
      const ancho = contenedor.clientWidth || 1;
      const alto = contenedor.clientHeight || 1;
      renderer.setSize(ancho, alto, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      aspecto = ancho / alto;
      const t = Math.min(1, Math.max(0, (1.35 - aspecto) / (1.35 - 0.46)));
      camara.aspect = aspecto;
      camara.fov = 50 + t * 14;
      camara.position.set(0, 1.66 + t * 0.34, 1.22 + t * 0.78);
      camara.lookAt(0, 1.02 - t * 0.1, -0.5);
      camara.updateProjectionMatrix();
      maquetarMano(false);
    }

    // -------------------------------------------------------------------------
    // Cartas de la mano (van pegadas a la cámara, siempre abajo)
    // -------------------------------------------------------------------------
    const DIST_MANO = 0.6;
    const dorso = X.dibujarDorso();
    const texturaDorso = textura(dorso);
    let mano = []; // { id, grupo, activa, base }
    let seleccionada = null;
    let encima = null;
    let alJugar = () => {};
    let alTocarTablet = () => {};
    let alMoverMano = () => {};

    function crearCarta(lienzoCara, ancho, alto, encimaDeTodo) {
      const geo = planoRedondo(ancho, alto, ancho * 0.09);
      const opciones = { toneMapped: false, depthTest: !encimaDeTodo, depthWrite: !encimaDeTodo };
      const frente = new T.Mesh(geo, new T.MeshBasicMaterial(Object.assign({ map: textura(lienzoCara) }, opciones)));
      const atras = new T.Mesh(geo, new T.MeshBasicMaterial(Object.assign({ map: texturaDorso }, opciones)));
      atras.rotation.y = Math.PI;
      const grupo = new T.Group();
      grupo.add(frente, atras);
      grupo.userData.frente = frente;
      return grupo;
    }

    function medidasMano(n) {
      const mitadAlto = Math.tan(T.MathUtils.degToRad(camara.fov / 2)) * DIST_MANO;
      const mitadAncho = mitadAlto * aspecto;
      const proporcion = X.ANCHO_CARTA / X.ALTO_CARTA;
      const disponible = mitadAncho * 2 * 0.94;
      let alto = mitadAlto * 0.5;
      let ancho = alto * proporcion;
      let paso = ancho * 1.06;
      // Si no caben, se hacen más pequeñas; solo se montan si quedarían diminutas.
      if (ancho + (n - 1) * paso > disponible) {
        ancho = disponible / (1 + (n - 1) * 1.06);
        alto = ancho / proporcion;
        paso = ancho * 1.06;
        const minimo = mitadAlto * 0.34;
        if (alto < minimo) {
          alto = minimo;
          ancho = alto * proporcion;
          paso = (disponible - ancho) / (n - 1);
        }
      }
      return { mitadAlto, ancho, alto, paso };
    }

    function posicionEnMano(i, n, m, levantada) {
      const desvio = i - (n - 1) / 2;
      const y = -m.mitadAlto + m.alto * 0.53 - Math.abs(desvio) * m.alto * 0.04 + (levantada ? m.alto * 0.24 : 0);
      return {
        pos: new T.Vector3(desvio * m.paso, y, -DIST_MANO + i * 0.0005),
        rotZ: -desvio * 0.05,
        escala: levantada ? 1.08 : 1,
      };
    }

    function maquetarMano(animado) {
      const n = mano.length;
      if (!n) return alMoverMano(0);
      const m = medidasMano(n);
      // Altura (en píxeles, desde abajo) del borde superior de las cartas
      const bordeSuperior = (posicionEnMano(0, 1, m, false).pos.y + m.alto / 2) / m.mitadAlto;
      alMoverMano(((1 + bordeSuperior) / 2) * contenedor.clientHeight);
      mano.forEach((carta, i) => {
        const escalaBase = m.alto / carta.altoCreado;
        const destino = posicionEnMano(i, n, m, carta === encima || carta === seleccionada);
        const g = carta.grupo;
        g.renderOrder = carta === encima || carta === seleccionada ? 50 : 10 + i;
        g.children.forEach((h) => (h.renderOrder = g.renderOrder));
        if (!animado) {
          g.position.copy(destino.pos);
          g.rotation.set(0, 0, destino.rotZ);
          g.scale.setScalar(escalaBase * destino.escala);
          return;
        }
        const desde = g.position.clone();
        const rotDesde = g.rotation.z;
        const escalaDesde = g.scale.x;
        animar(160, (k) => {
          g.position.lerpVectors(desde, destino.pos, k);
          g.rotation.z = rotDesde + (destino.rotZ - rotDesde) * k;
          g.scale.setScalar(escalaDesde + (escalaBase * destino.escala - escalaDesde) * k);
        });
      });
    }

    // cartas: [{ id, lienzo, activa }]
    async function ponerMano(cartas) {
      quitarMano();
      const m = medidasMano(cartas.length);
      mano = cartas.map((c) => {
        const grupo = crearCarta(c.lienzo, m.ancho, m.alto, true);
        camara.add(grupo);
        return { id: c.id, grupo, activa: c.activa, directa: c.directa, altoCreado: m.alto };
      });
      maquetarMano(false);
      // Reparto: las cartas suben desde abajo una a una
      await Promise.all(
        mano.map((carta, i) => {
          const g = carta.grupo;
          const fin = g.position.clone();
          const inicio = fin.clone().add(new T.Vector3(0, -m.alto * 1.4, 0));
          g.position.copy(inicio);
          return esperar(i * 90).then(() => animar(380, (k) => g.position.lerpVectors(inicio, fin, k)));
        }),
      );
    }

    function quitarMano() {
      for (const carta of mano) camara.remove(carta.grupo);
      mano = [];
      alMoverMano(0);
      seleccionada = null;
      encima = null;
    }

    // Carta en la mesa (mundo), tumbada boca arriba
    const cartasEnMesa = [];
    function limpiarMesa() {
      while (cartasEnMesa.length) escena.remove(cartasEnMesa.pop());
    }

    async function llevarCartaALaMesa(grupo, sitio, giro) {
      const [x, z] = SITIOS[sitio];
      escena.attach(grupo); // conserva su posición en el mundo
      const desde = grupo.position.clone();
      const qDesde = grupo.quaternion.clone();
      const escalaDesde = grupo.scale.x;
      const destino = new T.Vector3(x, MESA_Y + 0.004 + cartasEnMesa.length * 0.001, z);
      const qDestino = new T.Quaternion().setFromEuler(new T.Euler(-Math.PI / 2, 0, giro || 0));
      const escalaDestino = escalaDesde * (0.25 / (grupo.userData.altoMundo || 0.25));
      cartasEnMesa.push(grupo);
      await animar(520, (k) => {
        grupo.position.lerpVectors(desde, destino, k);
        grupo.position.y += Math.sin(k * Math.PI) * 0.15;
        grupo.quaternion.slerpQuaternions(qDesde, qDestino, k);
        grupo.scale.setScalar(escalaDesde + (escalaDestino - escalaDesde) * k);
      });
      grupo.traverse((o) => {
        if (o.material) {
          o.material.depthTest = true;
          o.material.depthWrite = true;
        }
        o.renderOrder = 0;
      });
    }

    // Para volver a ver la mesa como quedó (al recargar la página el mismo día)
    function colocarCarta(lienzoCara, sitio, giro) {
      const grupo = crearCarta(lienzoCara, 0.18, 0.252, false);
      const [x, z] = SITIOS[sitio];
      grupo.position.set(x, MESA_Y + 0.004 + cartasEnMesa.length * 0.001, z);
      grupo.rotation.set(-Math.PI / 2, 0, giro || 0);
      escena.add(grupo);
      cartasEnMesa.push(grupo);
    }

    async function jugarCartaDeLaMano(id) {
      const carta = mano.find((c) => c.id === id);
      if (!carta) return;
      mano = mano.filter((c) => c !== carta);
      // Las demás cartas bajan y desaparecen
      const resto = mano;
      mano = [];
      resto.forEach((c) => {
        const desde = c.grupo.position.clone();
        animar(300, (k) => c.grupo.position.set(desde.x, desde.y - k * 0.3, desde.z)).then(() => camara.remove(c.grupo));
      });
      carta.grupo.userData.altoMundo = carta.altoCreado * carta.grupo.scale.x;
      await llevarCartaALaMesa(carta.grupo, "cartaJugador", 0);
    }

    // El robot juega su carta DCA: sale de su mano y cae en su sitio
    async function robotJuega(lienzoCarta) {
      const brazo = robot.brazoDerecho;
      const giroInicial = brazo.rotation.x;
      const grupo = crearCarta(lienzoCarta, 0.18, 0.252, false);
      grupo.position.set(0.3, 1.15, -0.8);
      grupo.rotation.set(-0.3, Math.PI, 0);
      grupo.userData.altoMundo = 0.252;
      escena.add(grupo);
      await animar(260, (k) => (brazo.rotation.x = giroInicial - k * 0.35));
      const vuelo = llevarCartaALaMesa(grupo, "cartaRobot", 0.08);
      animar(320, (k) => (brazo.rotation.x = giroInicial - 0.35 + k * 0.35));
      await vuelo;
    }

    // -------------------------------------------------------------------------
    // Fichas: poner valores (en número de fichas) con animación
    // -------------------------------------------------------------------------
    // cuentas: { efectivo, invertido, robot } en fichas
    async function ponerFichas(cuentas, animado) {
      const objetivo = {};
      for (const k of Object.keys(montones)) objetivo[k] = Math.max(0, Math.min(MAX_FICHAS, Math.round(cuentas[k])));
      if (!animado || sinMovimiento()) {
        for (const k of Object.keys(montones)) montones[k].poner(objetivo[k]);
        return;
      }
      const tareas = [];
      const ef = montones.efectivo;
      const inv = montones.invertido;
      const cambioEf = objetivo.efectivo - ef.fichas.length;
      const cambioInv = objetivo.invertido - inv.fichas.length;

      // Entre tu hucha y tu inversión: las fichas viajan de un montón a otro
      if (cambioEf < 0 && cambioInv > 0) {
        const n = Math.min(-cambioEf, cambioInv);
        const salidas = ef.fichas.slice(-n).map((f) => f.position.clone());
        const antes = inv.fichas.length;
        ef.poner(ef.fichas.length - n);
        tareas.push(volarFichas(inv, antes, antes + n, (i) => salidas[n - 1 - i]));
      } else if (cambioInv < 0 && cambioEf > 0) {
        const n = Math.min(-cambioInv, cambioEf);
        const salidas = inv.fichas.slice(-n).map((f) => f.position.clone());
        const antes = ef.fichas.length;
        inv.poner(inv.fichas.length - n);
        tareas.push(volarFichas(ef, antes, antes + n, (i) => salidas[n - 1 - i]));
      }
      await Promise.all(tareas);

      // Fichas nuevas: tu ahorro cae desde arriba; las del robot salen de su mano
      const nuevas = [];
      if (objetivo.efectivo > ef.fichas.length) {
        const arriba = posicionFicha("efectivo", ef.fichas.length).add(new T.Vector3(0, 0.45, 0.1));
        nuevas.push(volarFichas(ef, ef.fichas.length, objetivo.efectivo, arriba, 70));
      }
      if (objetivo.robot > montones.robot.fichas.length) {
        const manoRobot = new T.Vector3(0.36, 0.95, -0.8);
        nuevas.push(volarFichas(montones.robot, montones.robot.fichas.length, objetivo.robot, manoRobot, 70));
      }
      if (objetivo.invertido > inv.fichas.length) {
        nuevas.push(volarFichas(inv, inv.fichas.length, objetivo.invertido, posicionFicha("invertido", inv.fichas.length).add(new T.Vector3(0, 0.3, 0)), 50));
      }
      await Promise.all(nuevas);
      for (const k of Object.keys(montones)) montones[k].poner(objetivo[k]);
    }

    // -------------------------------------------------------------------------
    // Tocar cartas y tablet
    // -------------------------------------------------------------------------
    const rayo = new T.Raycaster();
    const puntero = new T.Vector2();
    const lienzo3d = renderer.domElement;

    function apuntar(evento) {
      const r = lienzo3d.getBoundingClientRect();
      puntero.set(((evento.clientX - r.left) / r.width) * 2 - 1, -((evento.clientY - r.top) / r.height) * 2 + 1);
      rayo.setFromCamera(puntero, camara);
    }

    function cartaBajoPuntero() {
      const frentes = mano.map((c) => c.grupo.userData.frente);
      const tocados = rayo.intersectObjects(frentes, false);
      if (!tocados.length) return null;
      // la que se ve delante (mayor orden de dibujo)
      const ordenadas = tocados.map((t) => mano.find((c) => c.grupo.userData.frente === t.object)).sort((a, b) => b.grupo.renderOrder - a.grupo.renderOrder);
      return ordenadas[0];
    }

    lienzo3d.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      apuntar(e);
      const carta = cartaBajoPuntero();
      const tablet = !carta && rayo.intersectObject(pantallaTablet).length > 0;
      lienzo3d.style.cursor = (carta && carta.activa) || tablet ? "pointer" : "default";
      if (carta !== encima) {
        encima = carta && carta.activa ? carta : null;
        maquetarMano(true);
      }
    });

    lienzo3d.addEventListener("pointerup", (e) => {
      apuntar(e);
      const carta = cartaBajoPuntero();
      if (carta) {
        if (!carta.activa) return;
        // Ratón: un clic juega. Táctil: el primer toque levanta la carta, el segundo la juega.
        if (e.pointerType === "mouse" || carta.directa || seleccionada === carta) alJugar(carta.id);
        else {
          seleccionada = carta;
          maquetarMano(true);
        }
        return;
      }
      if (seleccionada) {
        seleccionada = null;
        maquetarMano(true);
      }
      if (rayo.intersectObject(pantallaTablet).length) alTocarTablet();
    });

    // -------------------------------------------------------------------------
    // Bucle de dibujo
    // -------------------------------------------------------------------------
    const proyeccion = new T.Vector3();
    function colocarEtiquetas() {
      const ancho = contenedor.clientWidth;
      const alto = contenedor.clientHeight;
      for (const [clave, elemento] of Object.entries(etiquetas || {})) {
        if (!elemento) continue;
        proyeccion.copy(montones[clave].cima()).project(camara);
        elemento.style.transform = `translate(${((proyeccion.x + 1) / 2) * ancho}px, ${((1 - proyeccion.y) / 2) * alto}px) translate(-50%, -100%)`;
      }
    }

    function bucle(ahora) {
      requestAnimationFrame(bucle);
      avanzarAnimaciones(ahora);
      const t = ahora / 1000;
      const mov = sinMovimiento() ? 0 : 1;
      robot.cabeza.position.y = 1.44 + Math.sin(t * 1.7) * 0.007 * mov;
      robot.cabeza.rotation.z = Math.sin(t * 0.6) * 0.035 * mov + (expresion === "burla" ? 0.1 : 0);
      robot.cabeza.rotation.y = Math.sin(t * 0.45) * 0.08 * mov;
      robot.bola.material.emissiveIntensity = 0.4 + 0.4 * Math.sin(t * 3);
      if (t - ultimaCara > 0.06) {
        ultimaCara = t;
        X.dibujarCara(robot.lienzoCara.getContext("2d"), 256, 176, expresion, t, hablando);
        robot.texturaCara.needsUpdate = true;
      }
      colocarEtiquetas();
      renderer.render(escena, camara);
    }

    new ResizeObserver(encuadrar).observe(contenedor);
    encuadrar();
    requestAnimationFrame(bucle);

    return {
      ponerMano,
      quitarMano,
      jugarCartaDeLaMano,
      robotJuega,
      limpiarMesa,
      colocarCarta,
      ponerFichas,
      pintarTablet(datos) {
        X.dibujarTablet(lienzoTablet.getContext("2d"), 1024, 640, datos);
        texturaTablet.needsUpdate = true;
      },
      expresion(e) {
        expresion = e;
      },
      hablar(siONo) {
        hablando = siONo;
      },
      alJugar(fn) {
        alJugar = fn;
      },
      alTocarTablet(fn) {
        alTocarTablet = fn;
      },
      alMoverMano(fn) {
        alMoverMano = fn;
      },
    };
  }

  global.Escena3D = { crear: crearEscena };
})(window);
