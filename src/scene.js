import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Chaque scène possède son renderer, sa caméra et ses contrôles.
export function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#080c18');

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  camera.position.set(4, 3, 6);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.domElement.setAttribute('aria-label', 'Cube animé en trois dimensions');
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 3;
  controls.maxDistance = 30;

  scene.add(new THREE.AmbientLight('#ffffff', 1.2));
  const light = new THREE.DirectionalLight('#ffffff', 3);
  light.position.set(3, 5, 4);
  scene.add(light);

  function resize() {
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
  }

  resize();
  window.addEventListener('resize', resize);

  function dispose() {
    window.removeEventListener('resize', resize);
    controls.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { scene, camera, renderer, controls, dispose };
}
