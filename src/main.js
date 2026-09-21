import { createScene } from './scene.js';
import { createPlanetSystem } from './planets.js';
import { PLANETS } from './data.js';
import { createLabels, createDescriptionPanel, createPlanetEditor } from './ui.js';
import { createInteraction } from './interaction.js';
import './style.css';

function start() {
  const container = document.querySelector('#app');
  const world = createScene(container);
  const system = createPlanetSystem(world.scene, PLANETS);
  const labels = createLabels(container, system.planets);
  const panel = createDescriptionPanel(container, () => interaction.reset(), removePlanet);
  const interaction = createInteraction(world, system.planets, (planet) => {
    panel.show(planet);
    labels.select(planet);
  });
  const editor = createPlanetEditor(container, {
    onAdd: addPlanet, onSelect: interaction.select, onDelete: removePlanet,
  });

  function addPlanet(data) {
    const planet = system.addCustom(data);
    labels.add(planet);
    editor.add(planet);
    updateCount();
    interaction.select(planet);
  }

  function removePlanet(planet) {
    if (!planet.custom) return;
    // Quitter le suivi avant de libérer la géométrie de la planète.
    interaction.forget(planet);
    labels.remove(planet);
    editor.remove(planet);
    system.remove(planet);
    updateCount();
    editor.focus();
  }

  function updateCount() {
    const count = system.planets.length;
    world.renderer.domElement.setAttribute('aria-label', `Soleil et ${count} planètes en orbite`);
    document.querySelector('.subtitle').textContent = count === 8
      ? 'Huit mondes. Une étoile. Un voyage en mouvement.'
      : `${count} mondes. Une étoile. Un voyage en mouvement.`;
  }
  let previousTime;

  world.renderer.setAnimationLoop((time) => {
    // Rotation indépendante du débit d'images, sans saut au retour d'onglet.
    const delta = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    system.update(delta);
    interaction.update(delta);
    world.controls.update();
    world.renderer.render(world.scene, world.camera);
    labels.update(world.camera);
  });

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      world.renderer.setAnimationLoop(null);
      labels.dispose();
      interaction.dispose();
      panel.dispose();
      editor.dispose();
      system.dispose();
      world.dispose();
    });
  }
}

start();
