import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 238, 190, 1)');
  gradient.addColorStop(0.22, 'rgba(255, 201, 100, 0.55)');
  gradient.addColorStop(0.5, 'rgba(255, 146, 40, 0.12)');
  gradient.addColorStop(1, 'rgba(255, 146, 40, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function createSun() {
  const sun = new THREE.Group();
  const surface = new THREE.Mesh(
    new THREE.SphereGeometry(3, 48, 32),
    new THREE.MeshBasicMaterial({ color: '#ffe3a0' }),
  );
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createGlowTexture(), blending: THREE.AdditiveBlending,
    transparent: true, depthWrite: false,
  }));
  halo.scale.set(19, 19, 1);
  // Atténuation désactivée : les distances sont volontairement exagérées.
  const light = new THREE.PointLight('#fff1d5', 3, 0, 0);
  sun.add(surface, halo, light);
  return sun;
}

function createStars() {
  const positions = [];
  // Graine fixe pour retrouver le même ciel après un rechargement.
  let seed = 42;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let index = 0; index < 2200; index += 1) {
    const azimuth = random() * Math.PI * 2;
    const y = random() * 2 - 1;
    const radial = Math.sqrt(1 - y * y);
    positions.push(400 * radial * Math.cos(azimuth), 400 * y, 400 * radial * Math.sin(azimuth));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({
    color: '#b9c9e6', size: 1.3, sizeAttenuation: false,
    transparent: true, opacity: 0.7, depthWrite: false,
  }));
}

export function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050810');
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1200);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.domElement.setAttribute('aria-label', 'Soleil et huit planètes en orbite');
  container.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 5;
  controls.maxDistance = 280;
  scene.add(new THREE.AmbientLight('#b8caff', 0.65), createSun(), createStars());

  function resize() {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
  }

  resize();
  // L'angle le plus étroit détermine le cadrage initial, même en portrait.
  const halfAngle = Math.atan(Math.tan(THREE.MathUtils.degToRad(22.5)) * Math.min(camera.aspect, 1));
  const distance = 53 / Math.sin(halfAngle);
  camera.position.set(0.25, 0.85, 1).normalize().multiplyScalar(distance);
  controls.maxDistance = Math.max(280, distance * 1.5);
  controls.update();
  window.addEventListener('resize', resize);

  function dispose() {
    window.removeEventListener('resize', resize);
    controls.dispose();
    scene.traverse((object) => {
      object.geometry?.dispose();
      object.material?.map?.dispose();
      object.material?.dispose();
    });
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { scene, camera, renderer, controls, dispose };
}
