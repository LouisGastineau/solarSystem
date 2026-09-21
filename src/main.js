import { createScene } from './scene.js';
import { createPlanetSystem } from './planets.js';
import { PLANETS } from './data.js';
import { createLabels } from './ui.js';
import './style.css';

function start() {
  const container = document.querySelector('#app');
  const world = createScene(container);
  const system = createPlanetSystem(world.scene, PLANETS);
  const labels = createLabels(container, system.planets);
  let previousTime;

  world.renderer.setAnimationLoop((time) => {
    // Rotation indépendante du débit d'images, sans saut au retour d'onglet.
    const delta = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    system.update(delta);
    world.controls.update();
    world.renderer.render(world.scene, world.camera);
    labels.update(world.camera);
  });

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      world.renderer.setAnimationLoop(null);
      labels.dispose();
      system.dispose();
      world.dispose();
    });
  }
}

start();
