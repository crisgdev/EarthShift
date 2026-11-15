import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Crosshair, Volume2, VolumeX } from 'lucide-react';
import {
  createCloudLayerTexture,
  createImmediateEarthBaseTexture,
  loadNasaGibsEarthTexture,
} from '../utils/earthTextureGenerator';
import { PIURA_STATIONS } from '../data/piuraData';

export interface LoadingStepState {
  id: string;
  label: string;
  detail: string;
  status: 'pending' | 'loading' | 'done' | 'fallback';
}

interface LoadingScreenProps {
  visible: boolean;
  progress: number;
  steps: LoadingStepState[];
  piuraLiveTemp?: number | null;
  piuraLiveRain?: number | null;
  onEnter: () => void;
  onUserInteract?: () => void;
  readyToEnter: boolean;
  autoEnterPaused: boolean;
  onTogglePauseAutoEnter: () => void;
}

const EARTH_RADIUS = 2.28;
const PIURA_LAT = -5.1945;
const PIURA_LON = -80.6328;

function latLonToVector3(
  lat: number,
  lon: number,
  radius: number,
  out = new THREE.Vector3()
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  out.set(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
  return out;
}

function playTelemetryPing(freq = 680, audioCtxRef: React.MutableRefObject<AudioContext | null>) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const oscHarm = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.4, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + 0.36);

    oscHarm.type = 'triangle';
    oscHarm.frequency.setValueAtTime(freq * 2, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.4);

    osc.connect(gain);
    oscHarm.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    oscHarm.start(now);
    osc.stop(now + 0.42);
    oscHarm.stop(now + 0.42);
  } catch {
    // Ignore audio errors when blocked by browser autoplay policy
  }
}

function buildNasaSpacecraft(accentHex: number, withSwathCone = false): THREE.Group {
  const sat = new THREE.Group();

  // Octagonal thermal foil bus
  const bus = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.034, 0.066, 8),
    new THREE.MeshStandardMaterial({
      color: 0xd9a441,
      metalness: 0.94,
      roughness: 0.2,
    })
  );
  bus.rotation.x = Math.PI / 2;

  // Carbon radiator ring
  const radRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.036, 0.012, 16),
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.72,
      roughness: 0.42,
    })
  );
  radRing.rotation.x = Math.PI / 2;
  radRing.position.z = 0.02;

  // Optical radiometer barrel & spectral lens
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.021, 0.04, 14),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.88, roughness: 0.22 })
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.046;

  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.008, 14),
    new THREE.MeshStandardMaterial({
      color: accentHex,
      emissive: accentHex,
      emissiveIntensity: 1.15,
      metalness: 0.35,
      roughness: 0.08,
    })
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.066;

  // Twin dual-wing solar arrays
  const truss = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0032, 0.0032, 0.36, 8),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.3 })
  );
  truss.rotation.z = Math.PI / 2;

  const wingMat = new THREE.MeshStandardMaterial({
    color: 0x0b4280,
    emissive: 0x08284d,
    emissiveIntensity: 0.45,
    metalness: 0.78,
    roughness: 0.16,
  });

  const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.004, 0.05), wingMat);
  leftWing.position.x = -0.11;
  const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.004, 0.05), wingMat);
  rightWing.position.x = 0.11;

  // Ka-band dish
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0025, 0.0032, 0.04, 8),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.28 })
  );
  mast.position.y = 0.038;

  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.022, 0.013, 16, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.72,
      roughness: 0.22,
      side: THREE.DoubleSide,
    })
  );
  dish.position.y = 0.06;
  dish.rotation.x = Math.PI;

  sat.add(bus, radRing, barrel, lens, truss, leftWing, rightWing, mast, dish);

  if (withSwathCone) {
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(0.21, 0.74, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: accentHex,
        transparent: true,
        opacity: 0.13,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    beam.position.y = -0.39;
    sat.add(beam);
  }

  return sat;
}

const _tmpVecA = new THREE.Vector3();
const _tmpVecB = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _sunDir = new THREE.Vector3();
const _rayPointer = new THREE.Vector2();
const _satWorldPos = new THREE.Vector3();
const _piuraLocalVec = new THREE.Vector3();
const _piuraTargetVec = new THREE.Vector3();

function getMissionPhase(progress: number, readyToEnter: boolean): { phase: string; title: string } {
  if (readyToEnter || progress >= 96) {
    return {
      phase: 'Fase 03 · Bloqueo orbital sobre Piura',
      title: 'Telemetría MODIS, VIIRS y POWER enlazada',
    };
  }
  if (progress >= 48) {
    return {
      phase: 'Fase 02 · Descenso sobre la costa norte',
      title: 'Escaneando las 6 subcuencas de Piura',
    };
  }
  return {
    phase: 'Fase 01 · Amanecer orbital en el Pacífico',
    title: 'Calibrando constelación NASA hacia Perú',
  };
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  visible,
  progress,
  steps,
  piuraLiveTemp,
  piuraLiveRain,
  onEnter,
  onUserInteract,
  readyToEnter,
  autoEnterPaused,
  onTogglePauseAutoEnter,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundEnabledRef = useRef(true);
  const progressRef = useRef(progress);
  const onUserInteractRef = useRef(onUserInteract);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanCount, setScanCount] = useState(0);
  const [lastPingCoord, setLastPingCoord] = useState<string | null>(null);
  const [telemetryHud, setTelemetryHud] = useState({ altKm: 2420, incDeg: 98.2 });
  const [userTookControl, setUserTookControl] = useState(false);

  const clickQueueRef = useRef<Array<{ ndcX: number; ndcY: number }>>([]);
  const pointerMoveRef = useRef({ nx: 0, ny: 0 });

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    onUserInteractRef.current = onUserInteract;
  }, [onUserInteract]);

  useEffect(() => {
    if (!visible) return;
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x010308, 1);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x010308, 0.012);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const isWide = width >= 900;
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 160);
    camera.position.set(-2.4, 0.8, 6.8);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 3.05;
    controls.maxDistance = 9.0;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.65;

    let manualOrbitActive = false;
    controls.addEventListener('start', () => {
      manualOrbitActive = true;
      setUserTookControl(true);
      onUserInteractRef.current?.();
    });

    // Three-point orbital illumination
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x03060f, 0.56);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff4e0, 3.45);
    sunLight.position.set(-6.0, 1.8, -3.5);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x22d3ee, 1.15);
    rimLight.position.set(5.5, -2.5, -5.0);
    scene.add(rimLight);

    // Dual-layer deep-space starfield (parallax galactic field + warm/blue stars)
    const starCount = 2600;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const cCool = new THREE.Color(0x7dd3fc);
    const cWarm = new THREE.Color(0xfde68a);
    const cWhite = new THREE.Color(0xf8fafc);

    for (let i = 0; i < starCount; i++) {
      const r = 18 + Math.random() * 62;
      const theta = Math.random() * Math.PI * 2;
      // Concentrate ~35% into subtle galactic plane band for astronomical depth
      const galactic = i % 3 === 0 ? (Math.random() - 0.5) * 0.42 : Math.acos(2 * Math.random() - 1) - Math.PI / 2;
      const phi = Math.PI / 2 - galactic;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const pick = i % 10 === 0 ? cWarm : i % 3 === 0 ? cCool : cWhite;
      starColors[i * 3] = pick.r;
      starColors[i * 3 + 1] = pick.g;
      starColors[i * 3 + 2] = pick.b;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // Monumental Asymmetric Earth Assembly
    const planetRoot = new THREE.Group();
    planetRoot.position.set(isWide ? 1.05 : 0, isWide ? 0.04 : 0.4, 0);
    scene.add(planetRoot);
    controls.target.set(isWide ? 0.42 : 0, 0, 0);

    const earthSpinGroup = new THREE.Group();
    // Pre-orient so Earth smoothly turns directly toward Northern Peru & Piura
    earthSpinGroup.rotation.y = -0.95;
    planetRoot.add(earthSpinGroup);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const baseFallbackTex = createImmediateEarthBaseTexture(maxAniso);
    const cloudTex = createCloudLayerTexture(maxAniso);

    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 96, 64);
    const earthMat = new THREE.MeshStandardMaterial({
      map: baseFallbackTex,
      roughness: 0.58,
      metalness: 0.08,
      emissive: new THREE.Color(0xffc970),
      emissiveIntensity: 0.0,
    });

    // Custom GLSL Earth Shader: Terminator Black Marble Mask + Ocean Specular Sun Glint + SAR Scan Sweep
    earthMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uScanPhase = { value: 0 };
      shader.uniforms.uSunDirWorld = { value: new THREE.Vector3(-0.7, 0.25, -0.6).normalize() };
      earthMat.userData.shader = shader;

      shader.vertexShader =
        `varying vec3 vObjPos;\nvarying vec3 vWorldNormal;\nvarying vec3 vWorldPos;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vObjPos = position;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);`
        );

      shader.fragmentShader =
        `uniform float uTime;\nuniform float uScanPhase;\nuniform vec3 uSunDirWorld;\nvarying vec3 vObjPos;\nvarying vec3 vWorldNormal;\nvarying vec3 vWorldPos;\n` +
        shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          vec3 wNorm = normalize(vWorldNormal);
          vec3 sDir = normalize(uSunDirWorld);
          float sunFacing = dot(wNorm, sDir);
          float nightMask = smoothstep(0.18, -0.22, sunFacing);
          totalEmissiveRadiance *= (0.12 + 1.18 * nightMask);

          // Ocean Specular Sun Glint (blends gently onto blue marine surfaces near terminator)
          vec3 viewDirW = normalize(cameraPosition - vWorldPos);
          vec3 halfVec = normalize(sDir + viewDirW);
          float spec = pow(max(dot(wNorm, halfVec), 0.0), 42.0);
          float isOcean = smoothstep(0.02, 0.14, diffuseColor.b - diffuseColor.r * 0.85);
          totalEmissiveRadiance += vec3(0.95, 0.84, 0.68) * spec * isOcean * 0.42;

          // Sweeping NASA SAR / LiDAR Telemetry Wave & Graticule
          vec3 nPos = normalize(vObjPos);
          float scanBandY = sin(uScanPhase) * 0.94;
          float distScan = abs(nPos.y - scanBandY);
          float waveGlow = smoothstep(0.044, 0.0, distScan);
          float lonGrid = smoothstep(0.99, 1.0, abs(cos(atan(nPos.z, nPos.x) * 12.0)));
          float latGrid = smoothstep(0.99, 1.0, abs(cos(asin(clamp(nPos.y, -1.0, 1.0)) * 12.0)));
          float holoGrid = max(lonGrid, latGrid) * (0.08 + waveGlow * 0.95);
          totalEmissiveRadiance += vec3(0.08, 0.86, 0.98) * (waveGlow * 0.72 + holoGrid * 0.36);
          `
        );
    };

    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthSpinGroup.add(earthMesh);

    const cloudGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.015, 64, 48);
    const cloudMat = new THREE.MeshStandardMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
      roughness: 0.95,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    earthSpinGroup.add(cloudMesh);

    // Custom Rayleigh + Sunset Terminator Atmosphere GLSL Shader
    const atmosGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.095, 64, 48);
    const atmosMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSunDirWorld: { value: new THREE.Vector3(-0.7, 0.25, -0.6).normalize() },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPos;
        varying vec3 vWorldNorm;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorldNorm = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewPos = -mvPos.xyz;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uSunDirWorld;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        varying vec3 vWorldNorm;
        void main() {
          vec3 viewDir = normalize(vViewPos);
          float fresnel = pow(0.68 - dot(vNormal, viewDir), 2.8);
          float sunDot = dot(normalize(vWorldNorm), normalize(uSunDirWorld));
          float sunsetBand = exp(-pow(sunDot * 3.8, 2.0));
          float daySide = smoothstep(-0.25, 0.45, sunDot);

          vec3 dayBlue = vec3(0.10, 0.68, 1.0);
          vec3 sunsetAmber = vec3(1.0, 0.58, 0.24);
          vec3 nightSapphire = vec3(0.04, 0.22, 0.52);

          vec3 baseAtmos = mix(nightSapphire, dayBlue, daySide);
          vec3 finalCol = mix(baseAtmos, sunsetAmber, sunsetBand * 0.64);
          float pulse = 0.94 + 0.06 * sin(uTime * 1.5);
          gl_FragColor = vec4(finalCol, 1.0) * clamp(fresnel, 0.0, 1.0) * (0.48 + daySide * 0.72) * pulse;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    planetRoot.add(new THREE.Mesh(atmosGeo, atmosMat));

    // Volumetric Solar Corona + Diffraction Starburst Billboard
    const coronaGeo = new THREE.PlaneGeometry(7.2, 7.2);
    const coronaMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv - vec2(0.5);
          float d = length(p) * 2.0;
          float angle = atan(p.y, p.x);

          float rays = pow(abs(cos(angle * 3.0 + uTime * 0.08)), 16.0) * exp(-d * 3.2) * 0.4;
          float streak = exp(-abs(p.y) * 26.0) * exp(-abs(p.x) * 3.2) * 0.48;
          float core = exp(-d * 5.2) * 1.1;
          float halo = exp(-d * 1.65) * 0.28;

          vec3 sunGold = vec3(1.0, 0.91, 0.72);
          vec3 coronaBlue = vec3(0.24, 0.72, 1.0);
          vec3 col = mix(coronaBlue, sunGold, clamp(core * 1.8 + streak, 0.0, 1.0));
          float alpha = clamp((core + halo + rays + streak) * smoothstep(1.0, 0.25, d), 0.0, 1.0);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    scene.add(coronaMesh);

    // Piura Regional Cluster: 6 Live Basin Beacons + Inter-basin Geodesic Network + Orbital Target Spire
    const piuraCluster = new THREE.Group();
    earthSpinGroup.add(piuraCluster);

    const piuraOrigin = latLonToVector3(PIURA_LAT, PIURA_LON, EARTH_RADIUS * 1.008);
    PIURA_STATIONS.forEach((st) => {
      const colHex =
        st.status === 'Crítico'
          ? 0xf43f5e
          : st.status === 'Alerta temprana'
          ? 0xf59e0b
          : 0x34d399;
      const stPos = latLonToVector3(st.lat, st.lon, EARTH_RADIUS * 1.009);
      const node = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 12, 12),
        new THREE.MeshBasicMaterial({ color: colHex })
      );
      node.position.copy(stPos);
      piuraCluster.add(node);

      // Fine telemetry fiber connecting each Piura basin directly to Piura central node
      const chord = piuraOrigin.distanceTo(stPos);
      if (chord > 0.02) {
        const mid = piuraOrigin
          .clone()
          .add(stPos)
          .multiplyScalar(0.5)
          .normalize()
          .multiplyScalar(EARTH_RADIUS + 0.055);
        const arc = new THREE.QuadraticBezierCurve3(piuraOrigin.clone(), mid, stPos);
        const arcMesh = new THREE.Mesh(
          new THREE.TubeGeometry(arc, 16, 0.0028, 5, false),
          new THREE.MeshBasicMaterial({
            color: colHex,
            transparent: true,
            opacity: 0.72,
          })
        );
        piuraCluster.add(arcMesh);
      }
    });

    const lockAnchor = new THREE.Group();
    lockAnchor.position.copy(piuraOrigin);
    lockAnchor.lookAt(piuraOrigin.x * 2, piuraOrigin.y * 2, piuraOrigin.z * 2);

    const lockRingInner = new THREE.Mesh(
      new THREE.RingGeometry(0.052, 0.072, 40),
      new THREE.MeshBasicMaterial({
        color: 0x34d399,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
      })
    );
    const lockRingOuter = new THREE.Mesh(
      new THREE.RingGeometry(0.11, 0.128, 40),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      })
    );
    const lockRingCorridor = new THREE.Mesh(
      new THREE.RingGeometry(0.21, 0.22, 48),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
      })
    );
    const lockBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.014, 0.45, 10),
      new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.92,
      })
    );
    lockBeam.rotation.x = Math.PI / 2;
    lockBeam.position.z = 0.225;

    const lockTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    lockTip.position.z = 0.45;

    lockAnchor.add(lockRingInner, lockRingOuter, lockRingCorridor, lockBeam, lockTip);
    piuraCluster.add(lockAnchor);

    // Inclined NASA Earth-Observation Satellite Tracks (Aqua / Terra / Suomi NPP)
    const orbitConfigs = [
      { radius: EARTH_RADIUS * 1.24, rx: 1.12, ry: 0.35, rz: 0.18, color: 0x22d3ee, speed: 0.65, beam: true },
      { radius: EARTH_RADIUS * 1.39, rx: -0.92, ry: 0.62, rz: -0.25, color: 0x34d399, speed: -0.45, beam: false },
      { radius: EARTH_RADIUS * 1.54, rx: 0.5, ry: -0.82, rz: 0.44, color: 0xf59e0b, speed: 0.34, beam: false },
    ];

    const orbitalTrackSystems: Array<{
      ring: THREE.Mesh;
      sat: THREE.Group;
      radius: number;
      speed: number;
      phase: number;
    }> = [];

    orbitConfigs.forEach((cfg, idx) => {
      const ringGeo = new THREE.TorusGeometry(cfg.radius, 0.0036, 8, 140);
      const ringMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.26,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.set(cfg.rx, cfg.ry, cfg.rz);
      planetRoot.add(ring);

      const sat = buildNasaSpacecraft(cfg.color, cfg.beam);
      ring.add(sat);
      orbitalTrackSystems.push({
        ring,
        sat,
        radius: cfg.radius,
        speed: cfg.speed,
        phase: idx * 2.1,
      });
    });

    // Interactive Click Probe: Satellite Laser Beam + Expanding Shockwave + Geodesic Link to Piura
    const fxGroup = new THREE.Group();
    scene.add(fxGroup);

    const activeEffects: Array<{
      ring: THREE.Mesh;
      ringMat: THREE.MeshBasicMaterial;
      laser?: THREE.Mesh;
      laserMat?: THREE.MeshBasicMaterial;
      arc?: THREE.Mesh;
      arcMat?: THREE.MeshBasicMaterial;
      life: number;
    }> = [];

    const raycaster = new THREE.Raycaster();

    const triggerOrbitalProbe = (ndcX: number, ndcY: number) => {
      _rayPointer.set(ndcX, ndcY);
      raycaster.setFromCamera(_rayPointer, camera);
      const hits = raycaster.intersectObject(earthMesh, false);

      const ringGeo = new THREE.RingGeometry(0.075, 0.11, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: hits.length > 0 ? 0x34d399 : 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.96,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);

      let laser: THREE.Mesh | undefined;
      let laserMat: THREE.MeshBasicMaterial | undefined;
      let arc: THREE.Mesh | undefined;
      let arcMat: THREE.MeshBasicMaterial | undefined;

      if (hits.length > 0) {
        const hitWorld = hits[0].point.clone();
        const surfNorm = _tmpVecA.copy(hitWorld).sub(planetRoot.position).normalize();
        ring.position.copy(hitWorld).addScaledVector(surfNorm, 0.032);
        ring.lookAt(
          hitWorld.x * 2 - planetRoot.position.x,
          hitWorld.y * 2 - planetRoot.position.y,
          hitWorld.z * 2 - planetRoot.position.z
        );

        orbitalTrackSystems[0].sat.getWorldPosition(_satWorldPos);
        const laserCurve = new THREE.LineCurve3(_satWorldPos.clone(), hitWorld.clone());
        const laserGeo = new THREE.TubeGeometry(laserCurve, 8, 0.008, 6, false);
        laserMat = new THREE.MeshBasicMaterial({
          color: 0x34d399,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
        });
        laser = new THREE.Mesh(laserGeo, laserMat);
        fxGroup.add(laser);

        lockAnchor.getWorldPosition(_tmpVecB);
        const chord = hitWorld.distanceTo(_tmpVecB);
        if (chord > 0.15) {
          const mid = hitWorld
            .clone()
            .add(_tmpVecB)
            .multiplyScalar(0.5)
            .sub(planetRoot.position)
            .normalize()
            .multiplyScalar(EARTH_RADIUS + Math.min(0.95, chord * 0.3 + 0.15))
            .add(planetRoot.position);
          const arcCurve = new THREE.QuadraticBezierCurve3(hitWorld, mid, _tmpVecB.clone());
          const arcGeo = new THREE.TubeGeometry(arcCurve, 36, 0.009, 6, false);
          arcMat = new THREE.MeshBasicMaterial({
            color: 0x22d3ee,
            transparent: true,
            opacity: 0.92,
            blending: THREE.AdditiveBlending,
          });
          arc = new THREE.Mesh(arcGeo, arcMat);
          fxGroup.add(arc);
        }

        _tmpVecB.copy(hitWorld);
        earthSpinGroup.worldToLocal(_tmpVecB);
        const r = _tmpVecB.length() || 1;
        const lat = 90 - Math.acos(THREE.MathUtils.clamp(_tmpVecB.y / r, -1, 1)) * (180 / Math.PI);
        const rawLon = Math.atan2(_tmpVecB.z, -_tmpVecB.x) * (180 / Math.PI) - 180;
        const lon = ((rawLon + 540) % 360) - 180;
        setLastPingCoord(`${lat.toFixed(1)}°, ${lon.toFixed(1)}°`);

        if (soundEnabledRef.current) {
          playTelemetryPing(740, audioCtxRef);
        }
      } else {
        _tmpVecA.set(ndcX, ndcY, 0.5).unproject(camera);
        _tmpVecB.copy(_tmpVecA).sub(camera.position).normalize();
        ring.position.copy(camera.position).addScaledVector(_tmpVecB, 3.8);
        ring.lookAt(camera.position);
        if (soundEnabledRef.current) {
          playTelemetryPing(520, audioCtxRef);
        }
      }

      fxGroup.add(ring);
      activeEffects.push({ ring, ringMat, laser, laserMat, arc, arcMat, life: 0 });
    };

    let disposed = false;

    Promise.all([
      loadNasaGibsEarthTexture('bluemarble', '2025-11-10', maxAniso),
      loadNasaGibsEarthTexture('night', '2025-11-10', maxAniso),
    ]).then(([blueTex, nightTex]) => {
      if (disposed) return;
      if (blueTex) earthMat.map = blueTex;
      if (nightTex) {
        earthMat.emissiveMap = nightTex;
        earthMat.emissiveIntensity = 0.85;
      }
      earthMat.needsUpdate = true;
    });

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const wide = w >= 900;
      planetRoot.position.set(wide ? 1.05 : 0, wide ? 0.04 : 0.4, 0);
      controls.target.set(wide ? 0.42 : 0, 0, 0);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let frameId = 0;
    const clock = new THREE.Clock();
    let smoothPtrX = 0;
    let smoothPtrY = 0;
    let lastHudUpdate = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function tick() {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const prog = THREE.MathUtils.clamp(progressRef.current / 100, 0, 1);

      smoothPtrX = THREE.MathUtils.damp(smoothPtrX, pointerMoveRef.current.nx, 4.5, dt);
      smoothPtrY = THREE.MathUtils.damp(smoothPtrY, pointerMoveRef.current.ny, 4.5, dt);

      while (clickQueueRef.current.length > 0) {
        const pt = clickQueueRef.current.shift()!;
        triggerOrbitalProbe(pt.ndcX, pt.ndcY);
      }

      for (let i = activeEffects.length - 1; i >= 0; i--) {
        const fx = activeEffects[i];
        fx.life += dt;
        const t = fx.life / 1.45;
        if (t >= 1) {
          fxGroup.remove(fx.ring);
          fx.ring.geometry.dispose();
          fx.ringMat.dispose();
          if (fx.laser && fx.laserMat) {
            fxGroup.remove(fx.laser);
            fx.laser.geometry.dispose();
            fx.laserMat.dispose();
          }
          if (fx.arc && fx.arcMat) {
            fxGroup.remove(fx.arc);
            fx.arc.geometry.dispose();
            fx.arcMat.dispose();
          }
          activeEffects.splice(i, 1);
        } else {
          fx.ring.scale.setScalar(1 + t * 6.2);
          fx.ringMat.opacity = (1 - t) * 0.92;
          if (fx.laserMat) fx.laserMat.opacity = Math.max(0, (1 - t * 1.8) * 0.9);
          if (fx.arcMat) fx.arcMat.opacity = (1 - t) * 0.9;
        }
      }

      // Phase I -> Phase III Orbital Sun Sweep & Corona
      const sunAngle = THREE.MathUtils.lerp(-2.5, 0.45, prog) + Math.sin(elapsed * 0.2) * 0.08;
      sunLight.position.set(Math.cos(sunAngle) * 8.2, 1.85, Math.sin(sunAngle) * 8.2);
      _sunDir.copy(sunLight.position).normalize();

      coronaMesh.position
        .set(Math.cos(sunAngle) * 5.6, 1.25, Math.sin(sunAngle) * 5.6)
        .add(planetRoot.position);
      coronaMesh.lookAt(camera.position);
      coronaMat.uniforms.uTime.value = elapsed;

      atmosMat.uniforms.uTime.value = elapsed;
      atmosMat.uniforms.uSunDirWorld.value.copy(_sunDir);

      if (earthMat.userData.shader) {
        earthMat.userData.shader.uniforms.uTime.value = elapsed;
        earthMat.userData.shader.uniforms.uScanPhase.value = elapsed * 1.15;
        earthMat.userData.shader.uniforms.uSunDirWorld.value.copy(_sunDir);
      }

      // Smoothly rotate globe to face Piura (-5.19° S, -80.63° W) head-on by Phase III
      const targetRotY = THREE.MathUtils.lerp(-0.95, 1.4, Math.pow(prog, 0.85)) + elapsed * 0.032;
      earthSpinGroup.rotation.y = THREE.MathUtils.damp(earthSpinGroup.rotation.y, targetRotY, 2.2, dt);
      earthSpinGroup.rotation.x = THREE.MathUtils.damp(
        earthSpinGroup.rotation.x,
        0.1 + smoothPtrY * 0.13,
        3.5,
        dt
      );
      cloudMesh.rotation.y += dt * 0.022;

      // Animate Piura lock rings & vertical spire
      const lockPulse = 1 + Math.sin(elapsed * 4.0) * 0.18;
      lockRingOuter.scale.set(lockPulse, lockPulse, 1);
      lockRingCorridor.rotation.z = elapsed * 0.35;
      const lockVis = THREE.MathUtils.smoothstep(prog, 0.16, 0.58);
      lockBeam.scale.z = 0.25 + lockVis * 0.75;
      lockTip.visible = prog > 0.18;

      for (const orb of orbitalTrackSystems) {
        const a = elapsed * orb.speed + orb.phase;
        orb.sat.position.set(Math.cos(a) * orb.radius, Math.sin(a) * orb.radius, 0);
        orb.sat.rotation.set(0, 0, a + Math.PI / 2);
      }

      starPoints.rotation.y = elapsed * 0.006;

      // Choreographed 3-phase orbital descent toward Piura (yields seamlessly if user orbits)
      if (!manualOrbitActive) {
        latLonToVector3(PIURA_LAT, PIURA_LON, 1, _piuraLocalVec);
        _piuraTargetVec
          .copy(_piuraLocalVec)
          .applyEuler(earthSpinGroup.rotation)
          .normalize();
        const dist = THREE.MathUtils.lerp(6.8, 4.35, Math.pow(prog, 0.84));
        _camGoal.set(
          THREE.MathUtils.lerp(-2.2, _piuraTargetVec.x * dist + (isWide ? 0.38 : 0), prog) + smoothPtrX * 0.65,
          THREE.MathUtils.lerp(0.75, _piuraTargetVec.y * dist + 0.18, prog) - smoothPtrY * 0.5,
          THREE.MathUtils.lerp(6.8, _piuraTargetVec.z * dist, prog)
        );
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoal.x, 3.0, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoal.y, 3.0, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoal.z, 2.8, dt);
      }

      controls.update();
      renderer.render(scene, camera);

      if (elapsed - lastHudUpdate > 0.25) {
        lastHudUpdate = elapsed;
        const camDist = camera.position.distanceTo(planetRoot.position);
        const altKm = Math.max(380, Math.round((camDist - EARTH_RADIUS) * 620));
        const incDeg = Number((97.4 + Math.sin(elapsed * 0.4) * 0.7).toFixed(1));
        setTelemetryHud({ altKm, incDeg });
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);

      controls.dispose();
      for (const fx of activeEffects) {
        fx.ring.geometry.dispose();
        fx.ringMat.dispose();
        fx.laser?.geometry.dispose();
        fx.laserMat?.dispose();
        fx.arc?.geometry.dispose();
        fx.arcMat?.dispose();
      }
      orbitalTrackSystems.forEach((orb) => {
        orb.ring.geometry.dispose();
        (orb.ring.material as THREE.Material).dispose();
        orb.sat.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            node.geometry.dispose();
            (node.material as THREE.Material).dispose();
          }
        });
      });

      piuraCluster.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose();
          (node.material as THREE.Material).dispose();
        }
      });

      earthGeo.dispose();
      earthMat.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      atmosGeo.dispose();
      atmosMat.dispose();
      coronaGeo.dispose();
      coronaMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      baseFallbackTex.dispose();
      cloudTex.dispose();
      envTexture.dispose();
      renderer.dispose();
    };
  }, [visible]);

  const pointerDownPosRef = useRef({ x: 0, y: 0 });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerMoveRef.current = {
      nx: (e.clientX / window.innerWidth) * 2 - 1,
      ny: (e.clientY / window.innerHeight) * 2 - 1,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const dist = Math.hypot(
      e.clientX - pointerDownPosRef.current.x,
      e.clientY - pointerDownPosRef.current.y
    );
    if (dist > 6) return;

    clickQueueRef.current.push({
      ndcX: (e.clientX / window.innerWidth) * 2 - 1,
      ndcY: -(e.clientY / window.innerHeight) * 2 + 1,
    });
    setScanCount((c) => c + 1);
    onUserInteract?.();
  };

  const narrative = getMissionPhase(progress, readyToEnter);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="nasa-piura-orbital-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          className="fixed inset-0 z-[700] flex flex-col justify-between bg-[#010308] select-none overflow-hidden cursor-grab active:cursor-grabbing"
        >
          {/* Dedicated Interactive WebGL Stage */}
          <div ref={mountRef} className="absolute inset-0" />

          {/* Clean Directional Contrast Scrims (zero backdrop-blur over WebGL) */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-full lg:w-[46%]"
            style={{
              background:
                'linear-gradient(90deg, rgba(1,3,8,0.88) 0%, rgba(1,3,8,0.42) 66%, rgba(1,3,8,0) 100%)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
            style={{
              background:
                'linear-gradient(to top, rgba(1,3,8,0.95) 0%, rgba(1,3,8,0.45) 60%, rgba(1,3,8,0) 100%)',
            }}
          />

          {/* Top Bar: Flight Director Coordinates + Progress Counter */}
          <div className="pointer-events-none relative z-10 w-full px-6 sm:px-10 pt-6 flex items-start justify-between gap-6">
            <div className="space-y-1">
              <div className="text-[11px] font-mono text-cyan-300 tabular-nums">
                ALT {telemetryHud.altKm.toLocaleString()} km · INCL {telemetryHud.incDeg}° · Piura 5°11&apos;S 80°37&apos;O
              </div>
              <div className="text-xs text-slate-400">
                Arrastra para orbitar · Haz clic para sondear y enlazar con Piura
              </div>
            </div>

            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => setSoundEnabled((v) => !v)}
                aria-label="Alternar audio de telemetría"
                className="pointer-events-auto mt-1 p-2 rounded-md bg-[#060A14]/88 border border-white/[0.12] text-slate-300 hover:text-cyan-300 cursor-pointer"
                title={soundEnabled ? 'Silenciar sondeo' : 'Activar sondeo acústico'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              <div className="text-right">
                <div className="text-4xl sm:text-6xl font-display font-light text-white tabular-nums tracking-tight leading-none">
                  {String(Math.round(progress)).padStart(2, '0')}
                  <span className="text-xl sm:text-2xl text-cyan-400 ml-0.5">%</span>
                </div>
                <div className="mt-1.5 text-[11px] font-mono text-slate-400 inline-flex items-center gap-1.5 justify-end">
                  <Crosshair className="w-3 h-3 text-emerald-400" />
                  {lastPingCoord
                    ? `Sonda ${lastPingCoord} (${scanCount})`
                    : scanCount > 0
                    ? `Sondeos: ${scanCount}`
                    : 'Órbita Piura en vivo'}
                </div>
              </div>
            </div>
          </div>

          {/* Left-Anchored Monumental Editorial Block */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none relative z-10 w-full max-w-lg px-6 sm:px-10 my-auto"
          >
            <div className="w-10 h-[1px] bg-cyan-400 mb-4" />
            <div className="text-[11px] font-mono text-cyan-300 tracking-wide">
              {narrative.phase}
            </div>
            <div className="text-xs font-mono text-slate-400 mt-0.5 mb-3">
              {narrative.title}
            </div>
            <h1 className="text-5xl sm:text-7xl font-display font-semibold tracking-tight leading-[0.94] text-white text-balance">
              Piura
              <br />
              Watch
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mt-5 max-w-md leading-relaxed">
              Centro satelital para las 6 cuencas de Piura, conectado en directo a MODIS, VIIRS, POWER y EONET de la NASA.
            </p>

            {/* Live Piura Telemetry Preview once NASA POWER responds */}
            {(piuraLiveTemp !== null && piuraLiveTemp !== undefined) && (
              <div className="mt-5 inline-flex items-center gap-5 border-t border-white/[0.12] pt-3 text-xs font-mono tabular-nums">
                <div>
                  <span className="text-slate-500 block text-[10px]">Piura hoy (POWER)</span>
                  <span className="text-white text-sm font-medium">{piuraLiveTemp.toFixed(1)} °C</span>
                </div>
                {piuraLiveRain !== null && piuraLiveRain !== undefined && (
                  <div>
                    <span className="text-slate-500 block text-[10px]">Lluvia 30 días</span>
                    <span className="text-cyan-300 text-sm font-medium">{piuraLiveRain.toFixed(1)} mm</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-7 pointer-events-auto flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onEnter}
                className={`px-5 py-2.5 rounded-md text-xs font-semibold tracking-wide transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-2.5 ${
                  readyToEnter
                    ? 'bg-white text-slate-950 hover:bg-cyan-300'
                    : 'bg-[#070C17]/88 text-slate-100 border border-white/25 hover:border-cyan-400'
                }`}
              >
                {readyToEnter ? 'Entrar al observatorio de Piura' : 'Ir directo a Piura'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {(userTookControl || autoEnterPaused) && (
                <button
                  type="button"
                  onClick={onTogglePauseAutoEnter}
                  className="px-3.5 py-2.5 rounded-md text-xs font-mono text-cyan-300 border border-cyan-400/30 bg-[#050A14]/82 hover:bg-cyan-400/15 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {autoEnterPaused ? 'Permaneciendo en órbita' : 'Pausar ingreso automático'}
                </button>
              )}
            </div>
          </motion.div>

          {/* Bottom Aerospace Single-Line Flight Ribbon (No Generic 4-Card Checklist) */}
          <div className="pointer-events-none relative z-10 w-full border-t border-white/[0.1] bg-[#010308]/90">
            <div className="relative h-[2px] w-full bg-white/[0.06] -mt-[1px]">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400"
                initial={{ width: '0%' }}
                animate={{ width: `${Math.min(100, Math.max(3, progress))}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>

            <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-3 flex flex-wrap items-center justify-between gap-4 text-[11px] font-mono">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                {steps.map((step) => {
                  const tone =
                    step.status === 'done'
                      ? 'text-emerald-400'
                      : step.status === 'loading'
                      ? 'text-cyan-300'
                      : step.status === 'fallback'
                      ? 'text-amber-400'
                      : 'text-slate-500';
                  const shortName =
                    step.id === 'webgl'
                      ? 'Mosaico 3D'
                      : step.id === 'eonet'
                      ? 'EONET'
                      : step.id === 'power'
                      ? 'POWER Piura'
                      : 'GIBS WMTS';

                  return (
                    <span key={step.id} className="inline-flex items-center gap-1.5 tabular-nums">
                      <span className="text-slate-400">{shortName}</span>
                      <span className={tone}>{step.detail}</span>
                    </span>
                  );
                })}
              </div>

              <span className="text-slate-500 hidden sm:inline">
                Región Piura · 6 subcuencas en monitoreo
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
