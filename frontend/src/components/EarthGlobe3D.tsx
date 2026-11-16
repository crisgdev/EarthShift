import { useLanguage, type Key } from '../research/i18n';
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Compass,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Pause,
  Play,
  RotateCcw,
  Satellite,
} from 'lucide-react';
import type { GeoCoordinates, NasaEonetEvent, PiuraStation } from '../types/climate';
import {
  createCloudLayerTexture,
  createImmediateEarthBaseTexture,
  loadNasaGibsEarthTexture,
  type EarthSkinMode,
} from '../utils/earthTextureGenerator';
import { getEonetCategoryColor, translateEonetCategory } from '../services/nasaClient';

interface EarthGlobe3DProps {
  stations: PiuraStation[];
  eonetEvents: NasaEonetEvent[];
  selectedLocation: GeoCoordinates;
  selectedEventId: string | null;
  gibsDate?: string;
  onSelectLocation: (coords: GeoCoordinates) => void;
  onSelectStation: (station: PiuraStation) => void;
  onSelectEvent: (ev: NasaEonetEvent) => void;
  onOpenInMap?: () => void;
  onTexturesReady?: () => void;
  minimal?: boolean;
  fullBleed?: boolean;
}

const EARTH_RADIUS = 2.0;
const PIURA_LAT = -5.1945;
const PIURA_LON = -80.6328;

const SKIN_OPTIONS: Array<{
  id: EarthSkinMode;
  label: string;
  legend?: { title: string; gradient: string[]; labels: string[] };
}> = [
  { id: 'viirs', label: 'Satélite' },
  {
    id: 'lst',
    label: 'Calor LST',
    legend: {
      title: 'MODIS Temp. Superficial (LST)',
      gradient: ['#1E3A8A', '#06B6D4', '#FACC15', '#F97316', '#DC2626'],
      labels: ['-15 °C', '10 °C', '25 °C', '38 °C', '+48 °C'],
    },
  },
  {
    id: 'imerg',
    label: 'Lluvia GPM',
    legend: {
      title: 'GPM IMERG Precipitación',
      gradient: ['#0F172A', '#0284C7', '#22D3EE', '#A3E635', '#FACC15', '#EF4444'],
      labels: ['0 mm/h', '2', '10', '25', '>50 mm/h'],
    },
  },
  {
    id: 'ndvi',
    label: 'NDVI',
    legend: {
      title: 'MODIS Vegetación NDVI',
      gradient: ['#78350F', '#CA8A04', '#84CC16', '#22C55E', '#14532D'],
      labels: ['0.0 Árido', '0.2', '0.5', '0.7', '0.9'],
    },
  },
];

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

function localVector3ToLatLon(localPoint: THREE.Vector3): { lat: number; lon: number } {
  const r = localPoint.length() || 1;
  const clampedY = THREE.MathUtils.clamp(localPoint.y / r, -1, 1);
  const lat = 90 - Math.acos(clampedY) * (180 / Math.PI);
  const rawLon = Math.atan2(localPoint.z, -localPoint.x) * (180 / Math.PI) - 180;
  const lon = ((rawLon + 540) % 360) - 180;
  return {
    lat: Number(lat.toFixed(3)),
    lon: Number(lon.toFixed(3)),
  };
}

function buildOrbitalSatellite(): THREE.Group {
  const sat = new THREE.Group();

  const bus = new THREE.Mesh(
    new THREE.BoxGeometry(0.056, 0.032, 0.036),
    new THREE.MeshStandardMaterial({ color: 0xd4a442, metalness: 0.88, roughness: 0.24 })
  );
  const sensor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.014, 0.022, 10),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      metalness: 0.5,
      roughness: 0.15,
    })
  );
  sensor.rotation.x = Math.PI / 2;
  sensor.position.z = 0.024;

  const truss = new THREE.Mesh(
    new THREE.CylinderGeometry(0.003, 0.003, 0.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.35 })
  );
  truss.rotation.z = Math.PI / 2;

  const wingMat = new THREE.MeshStandardMaterial({
    color: 0x0b3b75,
    metalness: 0.7,
    roughness: 0.2,
  });
  const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.004, 0.032), wingMat);
  leftWing.position.x = -0.072;
  const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.004, 0.032), wingMat);
  rightWing.position.x = 0.072;

  sat.add(bus, sensor, truss, leftWing, rightWing);
  return sat;
}

const _tmpVec = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _worldHit = new THREE.Vector3();
const _localHit = new THREE.Vector3();
const _upVec = new THREE.Vector3(0, 1, 0);

export const EarthGlobe3D: React.FC<EarthGlobe3DProps> = ({
  stations,
  eonetEvents,
  selectedLocation,
  selectedEventId,
  gibsDate = '2025-11-10',
  onSelectLocation,
  onSelectStation,
  onSelectEvent,
  onOpenInMap,
  onTexturesReady,
  minimal = false,
  fullBleed = false,
}) => {
  const { t, language } = useLanguage();
  const skinLabels: Record<string, Key> = {bluemarble:'globeNatural',viirs:'globeSatellite',lst:'globeHeat',imerg:'globeRain',ndvi:'ndvi',night:'globeNight'};
  const reducedMotion = useRef(matchMedia('(prefers-reduced-motion: reduce)').matches);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [skinMode, setSkinMode] = useState<EarthSkinMode>('viirs');
  const [skinLoading, setSkinLoading] = useState(false);
  const [skinUnavailable, setSkinUnavailable] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showClouds] = useState(true);
  const [showEonet] = useState(true);
  const [sunAngleDeg] = useState(38);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    title: string;
    subtitle: string;
  } | null>(null);

  const autoRotateRef = useRef(autoRotate);
  const showCloudsRef = useRef(showClouds);
  const showEonetRef = useRef(showEonet);
  const showArcsRef = useRef(true);
  const sunAngleDegRef = useRef(sunAngleDeg);
  const skinModeRef = useRef(skinMode);

  const callbacksRef = useRef({
    onSelectLocation,
    onSelectStation,
    onSelectEvent,
    onTexturesReady,
  });

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    showCloudsRef.current = showClouds;
  }, [showClouds]);

  useEffect(() => {
    showEonetRef.current = showEonet;
  }, [showEonet]);

  useEffect(() => {
    sunAngleDegRef.current = sunAngleDeg;
  }, [sunAngleDeg]);

  useEffect(() => {
    skinModeRef.current = skinMode;
  }, [skinMode]);

  useEffect(() => {
    callbacksRef.current = {
      onSelectLocation,
      onSelectStation,
      onSelectEvent,
      onTexturesReady,
    };
  }, [onSelectLocation, onSelectStation, onSelectEvent, onTexturesReady]);

  const sceneHandlesRef = useRef<{
    focusLatLon: (lat: number, lon: number, distance?: number) => void;
    zoom: (factor: number) => void;
    rotate: (direction: number) => void;
    updatePinMarker: (lat: number, lon: number) => void;
    rebuildEonetMarkers: (events: NasaEonetEvent[], selectedId: string | null) => void;
    rebuildStationMarkers: (stationsList: PiuraStation[]) => void;
    applyEarthSkin: (mode: EarthSkinMode, dateStr: string) => void;
  } | null>(null);

  useEffect(() => {
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
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('WebGL no está disponible.');
      return;
    }

    const initWidth = container.clientWidth || 800;
    const initHeight = container.clientHeight || 600;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(initWidth, initHeight);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(36, initWidth / initHeight, 0.1, 100);
    const initialDir = latLonToVector3(PIURA_LAT, PIURA_LON, 1).normalize();
    camera.position.copy(initialDir.multiplyScalar(minimal ? 4.4 : 4.05));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 2.75;
    controls.maxDistance = 9.5;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.65;
    controls.zoomSpeed = 0.85;

    // Orbital Sun + Cool Space Hemisphere Lighting
    const hemiLight = new THREE.HemisphereLight(0xa5d8ff, 0x050914, 0.92);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffaf0, 2.45);
    sunLight.position.set(6.5, 2.4, 5.0);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rimLight.position.set(-6.5, -2.5, -5.5);
    scene.add(rimLight);

    // Deep-space Starfield
    const starCount = 1350;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 22 + Math.random() * 34;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xe2e8f0,
      size: 0.08,
      transparent: true,
      opacity: 0.68,
      sizeAttenuation: true,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const baseFallbackTex = createImmediateEarthBaseTexture(maxAnisotropy);
    const cloudTex = createCloudLayerTexture(maxAnisotropy);

    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 80, 56);
    const earthMat = new THREE.MeshStandardMaterial({
      map: baseFallbackTex,
      roughness: 0.7,
      metalness: 0.08,
      emissive: new THREE.Color(0xffcc66),
      emissiveIntensity: 0.0,
    });
    earthMat.onBeforeCompile = (shader) => {
      shader.vertexShader =
        `varying vec3 vObjPos;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>\nvObjPos = position;`
        );
      shader.fragmentShader =
        `varying vec3 vObjPos;\n` +
        shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          vec3 nPos = normalize(vObjPos);
          float lonGrid = smoothstep(0.992, 1.0, abs(cos(atan(nPos.z, nPos.x) * 12.0)));
          float latGrid = smoothstep(0.992, 1.0, abs(cos(asin(clamp(nPos.y, -1.0, 1.0)) * 12.0)));
          float gridLine = max(lonGrid, latGrid);
          totalEmissiveRadiance += vec3(0.08, 0.72, 0.94) * gridLine * 0.08;
          `
        );
    };
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.name = 'earth-surface';
    earthGroup.add(earthMesh);

    const cloudGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.014, 64, 48);
    const cloudMat = new THREE.MeshStandardMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      roughness: 0.95,
      metalness: 0.0,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    earthGroup.add(cloudMesh);

    // Atmospheric Fresnel Glow Shader
    const atmosGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.08, 64, 48);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec3 viewDir = normalize(vViewPosition);
          float rim = pow(0.67 - dot(vNormal, viewDir), 3.3);
          vec3 skyBlue = vec3(0.14, 0.70, 0.98);
          gl_FragColor = vec4(skyBlue, 1.0) * clamp(rim, 0.0, 1.0) * 0.88;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(atmosGeo, atmosMat));

    // Orbital Track + Composite Satellite Probe
    const orbitRingGeo = new THREE.TorusGeometry(EARTH_RADIUS * 1.25, 0.0032, 8, 128);
    const orbitRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
    });
    const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat);
    orbitRing.rotation.x = Math.PI / 2.35;
    orbitRing.rotation.y = 0.28;
    scene.add(orbitRing);

    const satGroup = buildOrbitalSatellite();
    orbitRing.add(satGroup);

    const stationGroup = new THREE.Group();
    const eonetGroup = new THREE.Group();
    const arcGroup = new THREE.Group();
    earthGroup.add(stationGroup, eonetGroup, arcGroup);

    // Target Coordinate Reticle
    const pinGroup = new THREE.Group();
    const pinRing = new THREE.Mesh(
      new THREE.RingGeometry(0.04, 0.058, 32),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, side: THREE.DoubleSide })
    );
    const pinSpire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.007, 0.13, 10),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee })
    );
    pinSpire.rotation.x = Math.PI / 2;
    pinSpire.position.z = 0.065;
    const pinHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    pinHead.position.z = 0.13;
    pinGroup.add(pinRing, pinSpire, pinHead);
    earthGroup.add(pinGroup);

    const surfaceShockwaves: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; life: number }> = [];
    const spawnSurfaceShockwave = (lat: number, lon: number, colorHex = 0x22d3ee) => {
      const geo = new THREE.RingGeometry(0.032, 0.048, 36);
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(geo, mat);
      latLonToVector3(lat, lon, EARTH_RADIUS * 1.012, mesh.position);
      mesh.lookAt(mesh.position.x * 2, mesh.position.y * 2, mesh.position.z * 2);
      earthGroup.add(mesh);
      surfaceShockwaves.push({ mesh, mat, life: 0 });
    };

    const updatePinMarker = (lat: number, lon: number) => {
      latLonToVector3(lat, lon, EARTH_RADIUS * 1.006, pinGroup.position);
      pinGroup.lookAt(
        pinGroup.position.x * 2,
        pinGroup.position.y * 2,
        pinGroup.position.z * 2
      );
      spawnSurfaceShockwave(lat, lon);
    };

    const clickableMeshes: THREE.Object3D[] = [earthMesh];

    const clearGroup = (grp: THREE.Group) => {
      while (grp.children.length > 0) {
        const child = grp.children[0];
        grp.remove(child);
        child.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            node.geometry.dispose();
            if (Array.isArray(node.material)) node.material.forEach((m) => m.dispose());
            else node.material.dispose();
          }
        });
      }
    };

    const rebuildStationMarkers = (stationsList: PiuraStation[]) => {
      clearGroup(stationGroup);
      clickableMeshes.length = 0;
      clickableMeshes.push(earthMesh);

      // Regional Piura Corridor Halo Ring
      const piuraCenter = latLonToVector3(PIURA_LAT, PIURA_LON, EARTH_RADIUS * 1.008);
      const corridorRing = new THREE.Mesh(
        new THREE.RingGeometry(0.14, 0.15, 48),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.48,
        })
      );
      corridorRing.position.copy(piuraCenter);
      corridorRing.lookAt(piuraCenter.x * 2, piuraCenter.y * 2, piuraCenter.z * 2);
      stationGroup.add(corridorRing);

      stationsList.forEach((st) => {
        const colorHex =
          st.status === 'Crítico'
            ? 0xf43f5e
            : st.status === 'Alerta temprana'
            ? 0xf59e0b
            : 0x34d399;

        const beacon = new THREE.Group();
        const pos = latLonToVector3(st.lat, st.lon, EARTH_RADIUS * 1.008);
        beacon.position.copy(pos);
        beacon.quaternion.setFromUnitVectors(_upVec, pos.clone().normalize());

        const spire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.005, 0.005, 0.095, 8),
          new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.9 })
        );
        spire.position.y = 0.047;

        const orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.025, 14, 14),
          new THREE.MeshBasicMaterial({ color: colorHex })
        );
        orb.position.y = 0.1;

        const proxy = new THREE.Mesh(
          new THREE.SphereGeometry(0.055, 8, 8),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        proxy.position.y = 0.06;
        proxy.userData = {
          kind: 'station',
          station: st,
          title: st.name,
          subtitle: `${st.province} · NDVI ${st.ndviCurrent.toFixed(2)}`,
        };

        beacon.add(spire, orb, proxy);
        stationGroup.add(beacon);
        clickableMeshes.push(proxy);
      });

      eonetGroup.children.forEach((c) => clickableMeshes.push(c));
    };

    const rebuildEonetMarkers = (events: NasaEonetEvent[], selectedId: string | null) => {
      clearGroup(eonetGroup);
      clearGroup(arcGroup);

      clickableMeshes.length = 0;
      clickableMeshes.push(earthMesh);
      stationGroup.children.forEach((beacon) => {
        beacon.children.forEach((c) => {
          if (c.userData?.kind === 'station') clickableMeshes.push(c);
        });
      });

      // Focus regional hazards around Peru, Andes & Eastern Pacific so Piura view stays clean
      const regionalEvents = events.filter(
        (ev) => ev.lat >= -32 && ev.lat <= 14 && ev.lon >= -106 && ev.lon <= -52
      );
      const displayEvents = regionalEvents.length > 0 ? regionalEvents : events.slice(0, 8);

      const baseGeo = new THREE.SphereGeometry(0.024, 12, 12);
      const piuraOrigin = latLonToVector3(PIURA_LAT, PIURA_LON, EARTH_RADIUS * 1.012);

      const arcCandidates = [...displayEvents]
        .map((ev) => ({
          ev,
          distSq: Math.pow(ev.lat - PIURA_LAT, 2) + Math.pow(ev.lon - PIURA_LON, 2),
        }))
        .sort((a, b) => a.distSq - b.distSq)
        .slice(0, 5)
        .map((x) => x.ev.id);

      displayEvents.forEach((ev) => {
        const isSel = ev.id === selectedId;
        const color = new THREE.Color(getEonetCategoryColor(ev.categoryId));
        const mat = new THREE.MeshBasicMaterial({
          color: isSel ? 0xffffff : color,
        });
        const mesh = new THREE.Mesh(baseGeo.clone(), mat);
        if (isSel) mesh.scale.setScalar(1.65);
        latLonToVector3(ev.lat, ev.lon, EARTH_RADIUS * 1.018, mesh.position);
        mesh.userData = {
          kind: 'eonet',
          event: ev,
          title: ev.title,
          subtitle: `NASA EONET · ${ev.categoryId}`,
        };
        eonetGroup.add(mesh);
        clickableMeshes.push(mesh);

        // Draw 3D Great-Circle Telemetry Arc to Piura for closest/selected events
        if (isSel || arcCandidates.includes(ev.id)) {
          const endVec = mesh.position.clone();
          const chordDist = piuraOrigin.distanceTo(endVec);
          if (chordDist > 0.15) {
            const mid = piuraOrigin
              .clone()
              .add(endVec)
              .multiplyScalar(0.5)
              .normalize()
              .multiplyScalar(EARTH_RADIUS + Math.min(0.85, chordDist * 0.28 + 0.14));
            const curve = new THREE.QuadraticBezierCurve3(piuraOrigin, mid, endVec);
            const tubeGeo = new THREE.TubeGeometry(curve, 32, isSel ? 0.0085 : 0.0045, 6, false);
            const tubeMat = new THREE.MeshBasicMaterial({
              color: isSel ? 0x22d3ee : color,
              transparent: true,
              opacity: isSel ? 0.9 : 0.42,
            });
            arcGroup.add(new THREE.Mesh(tubeGeo, tubeMat));
          }
        }
      });
      baseGeo.dispose();
    };

    let glideActive = false;
    const glideTargetCamPos = new THREE.Vector3();

    const focusLatLon = (lat: number, lon: number, distance = 4.6) => {
      latLonToVector3(lat, lon, 1, _tmpVec);
      _tmpVec.applyEuler(earthGroup.rotation).normalize().multiplyScalar(distance);
      glideTargetCamPos.copy(_tmpVec);
      if (reducedMotion.current) { camera.position.copy(glideTargetCamPos); controls.update(); glideActive = false; } else { glideActive = true; }
    };

    controls.addEventListener('start', () => {
      glideActive = false;
    });

    let disposed = false;

    const applyEarthSkin = async (mode: EarthSkinMode, dateStr: string) => {
      setSkinLoading(true);
      setSkinUnavailable(false);
      try {
        const [skinTex, nightTex] = await Promise.all([
          loadNasaGibsEarthTexture(mode, dateStr, maxAnisotropy),
          mode === 'night'
            ? Promise.resolve(null)
            : loadNasaGibsEarthTexture('night', dateStr, maxAnisotropy),
        ]);

        if (disposed) return;

        setSkinUnavailable(!skinTex);
        if (skinTex) {
          earthMat.map = skinTex;
          if (mode === 'night') {
            earthMat.emissiveMap = skinTex;
            earthMat.emissive = new THREE.Color(0xffd28a);
            earthMat.emissiveIntensity = 1.15;
          } else if (nightTex) {
            earthMat.emissiveMap = nightTex;
            earthMat.emissive = new THREE.Color(0xffc970);
            earthMat.emissiveIntensity = mode === 'bluemarble' || mode === 'viirs' ? 0.65 : 0.3;
          } else {
            earthMat.emissiveMap = null;
            earthMat.emissiveIntensity = 0.0;
          }
          earthMat.needsUpdate = true;
          callbacksRef.current.onTexturesReady?.();
        }
      } catch {
        if (!disposed) setSkinUnavailable(true);
      } finally {
        if (!disposed) setSkinLoading(false);
      }
    };

    sceneHandlesRef.current = {
      focusLatLon,
      zoom: (factor: number) => {glideActive=false; camera.position.setLength(THREE.MathUtils.clamp(camera.position.length()*factor, controls.minDistance, controls.maxDistance));controls.update();},
      rotate: (direction: number) => {glideActive=false;camera.position.applyAxisAngle(_upVec,direction*0.2);controls.update();},
      updatePinMarker,
      rebuildEonetMarkers,
      rebuildStationMarkers,
      applyEarthSkin,
    };

    rebuildStationMarkers(stations);
    rebuildEonetMarkers(eonetEvents, selectedEventId);
    updatePinMarker(selectedLocation.lat, selectedLocation.lon);
    applyEarthSkin(skinModeRef.current, gibsDate);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let lastHoverTime = 0;

    const updatePointer = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      return rect;
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTime < 45) return;
      lastHoverTime = now;

      const rect = updatePointer(e);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);

      const markerHit = hits.find((h) => h.object !== earthMesh);
      if (markerHit) {
        const ud = markerHit.object.userData;
        renderer.domElement.style.cursor = 'pointer';
        setHoverInfo({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          title: ud.title,
          subtitle: ud.subtitle,
        });
      } else if (hits.some((h) => h.object === earthMesh)) {
        renderer.domElement.style.cursor = 'crosshair';
        setHoverInfo(null);
      } else {
        renderer.domElement.style.cursor = 'grab';
        setHoverInfo(null);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (Math.hypot(dx, dy) > 6) return;

      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickableMeshes, false);
      if (hits.length === 0) return;

      const markerHit = hits.find((h) => h.object !== earthMesh);
      if (markerHit) {
        const ud = markerHit.object.userData;
        if (ud.kind === 'station' && ud.station) {
          const st = ud.station as PiuraStation;
          callbacksRef.current.onSelectStation(st);
          focusLatLon(st.lat, st.lon, 4.1);
          return;
        }
        if (ud.kind === 'eonet' && ud.event) {
          const ev = ud.event as NasaEonetEvent;
          callbacksRef.current.onSelectEvent(ev);
          focusLatLon(ev.lat, ev.lon, 4.35);
          return;
        }
      }

      const earthHit = hits.find((h) => h.object === earthMesh);
      if (earthHit) {
        _worldHit.copy(earthHit.point);
        _localHit.copy(_worldHit);
        earthGroup.worldToLocal(_localHit);
        const { lat, lon } = localVector3ToLatLon(_localHit);
        updatePinMarker(lat, lon);
        callbacksRef.current.onSelectLocation({
          lat,
          lon,
          label: `Sonda ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
          subtitle: 'Consulta satelital directa',
        });
      }
    };

    const onPointerLeave = () => setHoverInfo(null);

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    domEl.addEventListener('pointermove', onPointerMove);
    domEl.addEventListener('pointerup', onPointerUp);
    domEl.addEventListener('pointerleave', onPointerLeave);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError('El contexto 3D se suspendió temporalmente.');
    };
    const onContextRestored = () => setWebglError(null);
    domEl.addEventListener('webglcontextlost', onContextLost);
    domEl.addEventListener('webglcontextrestored', onContextRestored);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(160, Math.floor(entry.contentRect.width));
        const h = Math.max(160, Math.floor(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    ro.observe(container);

    let frameId = 0;
    const clock = new THREE.Timer();
    clock.connect(document);
    let currentSunRad = THREE.MathUtils.degToRad(sunAngleDegRef.current);

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
      clock.update();
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = reducedMotion.current ? 0 : clock.getElapsed();

      if (autoRotateRef.current && !glideActive && !reducedMotion.current) {
        earthGroup.rotation.y += dt * 0.08;
      }

      // Smoothly update solar terminator direction
      const targetSunRad = THREE.MathUtils.degToRad(sunAngleDegRef.current);
      currentSunRad = THREE.MathUtils.damp(currentSunRad, targetSunRad, 6.0, dt);
      sunLight.position.set(
        Math.cos(currentSunRad) * 8.2,
        2.3,
        Math.sin(currentSunRad) * 8.2
      );

      cloudMesh.visible = showCloudsRef.current && skinModeRef.current !== 'viirs';
      if (cloudMesh.visible && !reducedMotion.current) {
        cloudMesh.rotation.y += dt * 0.022;
      }

      eonetGroup.visible = showEonetRef.current;
      arcGroup.visible = showEonetRef.current && showArcsRef.current;

      const pulseScale = 1 + Math.sin(elapsed * 3.0) * 0.15;
      pinRing.scale.set(pulseScale, pulseScale, 1);

      for (let i = surfaceShockwaves.length - 1; i >= 0; i--) {
        const sw = surfaceShockwaves[i];
        sw.life += dt;
        const t = sw.life / 1.05;
        if (t >= 1) {
          earthGroup.remove(sw.mesh);
          sw.mesh.geometry.dispose();
          sw.mat.dispose();
          surfaceShockwaves.splice(i, 1);
        } else {
          sw.mesh.scale.setScalar(1 + t * 4.5);
          sw.mat.opacity = (1 - t) * 0.9;
        }
      }

      const satAngle = elapsed * 0.42;
      const satOrbitR = EARTH_RADIUS * 1.25;
      satGroup.position.set(Math.cos(satAngle) * satOrbitR, Math.sin(satAngle) * satOrbitR, 0);
      satGroup.rotation.z = satAngle + Math.PI / 2;

      if (glideActive) {
        const alpha = 1 - Math.exp(-5.0 * dt);
        _targetCamPos.copy(camera.position).lerp(glideTargetCamPos, alpha);
        const targetDist = glideTargetCamPos.length();
        const currentDist = camera.position.length();
        const nextDist = THREE.MathUtils.lerp(currentDist, targetDist, alpha);
        _targetCamPos.normalize().multiplyScalar(nextDist);
        camera.position.copy(_targetCamPos);

        if (camera.position.distanceTo(glideTargetCamPos) < 0.03) {
          glideActive = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      clock.dispose();
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      domEl.removeEventListener('pointerdown', onPointerDown);
      domEl.removeEventListener('pointermove', onPointerMove);
      domEl.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('pointerleave', onPointerLeave);
      domEl.removeEventListener('webglcontextlost', onContextLost);
      domEl.removeEventListener('webglcontextrestored', onContextRestored);

      controls.dispose();
      clearGroup(stationGroup);
      clearGroup(eonetGroup);
      clearGroup(arcGroup);
      for (const sw of surfaceShockwaves) {
        sw.mesh.geometry.dispose();
        sw.mat.dispose();
      }
      satGroup.traverse((node) => {
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
      orbitRingGeo.dispose();
      orbitRingMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      envTexture.dispose();
      baseFallbackTex.dispose();
      cloudTex.dispose();
      renderer.dispose();
      sceneHandlesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sceneHandlesRef.current?.rebuildEonetMarkers(eonetEvents, selectedEventId);
  }, [eonetEvents, selectedEventId]);

  useEffect(() => {
    sceneHandlesRef.current?.rebuildStationMarkers(stations);
  }, [stations]);

  useEffect(() => {
    sceneHandlesRef.current?.updatePinMarker(selectedLocation.lat, selectedLocation.lon);
    sceneHandlesRef.current?.focusLatLon(
      selectedLocation.lat,
      selectedLocation.lon,
      minimal ? 4.8 : 4.65
    );
  }, [selectedLocation.lat, selectedLocation.lon, minimal]);

  useEffect(() => {
    sceneHandlesRef.current?.applyEarthSkin(skinMode, gibsDate);
  }, [skinMode, gibsDate]);

  const activeSkinMeta = SKIN_OPTIONS.find((s) => s.id === skinMode);

  if (webglError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#04070D] p-6 text-center">
        <Compass className="w-8 h-8 text-cyan-400 mb-3" />
        <p className="text-sm font-medium text-slate-200">{t('globeFallback')}</p>
        {onOpenInMap && (
          <button
            type="button"
            onClick={onOpenInMap}
            className="mt-4 px-4 py-2 text-xs font-medium bg-cyan-400 text-slate-950 rounded-lg cursor-pointer"
          >
            {t('globeMap')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-[#03050A] ${
        fullBleed ? '' : 'rounded-2xl border border-white/[0.08]'
      }`}
    >
      {skinUnavailable && <p role="status" className="absolute top-3 left-3 right-3 z-30 rounded bg-slate-950/90 p-2 text-xs text-amber-200">{t('textureFallback')}</p>}
      {/* Dedicated WebGL Mount Container */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Raycast Hover Tooltip */}
      {hoverInfo && (
        <div
          className="pointer-events-none absolute z-30 px-3 py-2 rounded-lg bg-[#080D17]/95 border border-white/[0.14] shadow-xl max-w-[240px]"
          style={{
            left: Math.min(hoverInfo.x + 14, 520),
            top: Math.max(hoverInfo.y - 44, 12),
          }}
        >
          <p className="text-xs font-medium text-white truncate">{hoverInfo.title}</p>
          <p className="text-[11px] text-cyan-400 truncate mt-0.5">{hoverInfo.subtitle}</p>
        </div>
      )}

      {/* Minimal Mode Corner Button (for Map PiP) */}
      {minimal && (
        <div className="absolute top-2.5 right-2.5 z-10">
          <button
            type="button"
            onClick={() => sceneHandlesRef.current?.focusLatLon(PIURA_LAT, PIURA_LON, 4.1)}
            title={t('globeCenter')}
            className="p-1.5 rounded-lg bg-[#080D17]/92 border border-white/[0.1] text-slate-300 hover:text-cyan-300 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sleek Single-Row Aerospace Instrument Dock (Zero backdrop-blur over WebGL) */}
      {!minimal && (
        <div className="earth-dock">
          {activeSkinMeta?.legend && (
            <div className="px-3.5 py-1.5 rounded-md bg-[#050811]/95 border border-white/[0.11] shadow-lg min-w-[260px] max-w-[340px]">
              <div className="text-[10px] font-mono text-slate-300 mb-1 flex items-center justify-between gap-2">
                <span>{skinMode === 'lst' ? 'MODIS · '+t('lst') : skinMode === 'imerg' ? 'GPM IMERG · '+t('precipitation') : 'MODIS · '+t('ndvi')}</span>
              </div>
              <div
                className="h-1.5 w-full rounded-sm"
                style={{
                  background: `linear-gradient(90deg, ${activeSkinMeta.legend.gradient.join(', ')})`,
                }}
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1 tabular-nums">
                {activeSkinMeta.legend.labels.map((lbl) => (
                  <span key={language === 'en' ? lbl.replace('Árido', 'Arid').replace(',', '.') : lbl}>{lbl}</span>
                ))}
              </div>
            </div>
          )}

          <div className="earth-dock-panel">
            <div className="earth-dock-layers" role="group" aria-label={t('layer')}>
              {SKIN_OPTIONS.map((skin) => (
                <button key={skin.id} type="button" aria-pressed={skinMode === skin.id} onClick={() => setSkinMode(skin.id)}>
                  {t(skinLabels[skin.id])}
                </button>
              ))}
            </div>
            <div className="earth-dock-actions">
              <div className="earth-dock-zoom" role="group" aria-label="Zoom">
                <button type="button" aria-label={t('zoomOut')} title={t('zoomOut')} onClick={() => sceneHandlesRef.current?.zoom(1.15)}><Minus size={16} /></button>
                <button type="button" aria-label={t('zoomIn')} title={t('zoomIn')} onClick={() => sceneHandlesRef.current?.zoom(0.85)}><Plus size={16} /></button>
              </div>
              <button type="button" aria-pressed={autoRotate} onClick={() => setAutoRotate((v) => !v)} title={t('globeRotation')}>
                {autoRotate ? <Pause size={14} /> : <Play size={14} />}{t('globeRotate')}
              </button>
              <button type="button" onClick={() => sceneHandlesRef.current?.focusLatLon(PIURA_LAT, PIURA_LON, 3.8)}><Satellite size={14} />Piura</button>
              {onOpenInMap && <button type="button" className="earth-dock-explore" onClick={onOpenInMap}><MapPin size={14} />{t('globeMap')}</button>}
              {skinLoading && <Loader2 role="status" aria-label={t('running')} className="w-4 h-4 text-cyan-300 animate-spin" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
