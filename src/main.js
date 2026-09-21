import * as THREE from 'three';
import { createScene } from './scene.js';
import './style.css';

function start() {
  const { scene, camera, renderer, controls, dispose } = createScene(
    document.querySelector('#app'),
  );
  const geometry = new THREE.BoxGeometry(1.8, 1.8, 1.8);
  const material = new THREE.MeshStandardMaterial({
    color: '#75c6ff',
    roughness: 0.35,
    metalness: 0.15,
  });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  let previousTime;
  renderer.setAnimationLoop((time) => {
    // Rotation indépendante du nombre d'images par seconde.
    // Le plafonnement évite un saut au retour d'un onglet inactif.
    const delta = previousTime === undefined
      ? 0
      : Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    cube.rotation.x += delta * 0.25;
    cube.rotation.y += delta * 0.45;
    controls.update();
    renderer.render(scene, camera);
  });

  // Libération des ressources lors du remplacement du module par Vite.
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      renderer.setAnimationLoop(null);
      geometry.dispose();
      material.dispose();
      dispose();
    });
  }
}

start();
