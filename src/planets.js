import * as THREE from 'three';
import { loadPlanetTexture } from './textures.js';

function createOrbit(distance) {
  const points = Array.from({ length: 256 }, (_, index) => {
    const angle = index / 256 * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);
  });
  return new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: '#697b98', transparent: true, opacity: 0.32 }),
  );
}

// Fabrique commune, réutilisable pour les futures planètes personnalisées.
export function createPlanet(data, initialAngle = 0, parent = null) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(data.radius, 32, 24),
    new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.85 }),
  );
  mesh.name = data.name;
  const orbit = createOrbit(data.distance);
  let angle = initialAngle;
  let imageRequest = 0;
  let disposed = false;
  let imageName = '';

  function removeImage() {
    imageRequest += 1;
    mesh.material.map?.dispose();
    mesh.material.map = null;
    mesh.material.color.set(data.color);
    mesh.material.needsUpdate = true;
    imageName = '';
  }

  async function setImage(file) {
    const request = ++imageRequest;
    const texture = await loadPlanetTexture(file, data.color);
    // Une suppression ou un nouvel import peut intervenir pendant le décodage.
    if (disposed || request !== imageRequest) { texture.dispose(); return false; }
    setTexture(texture, file.name);
    return true;
  }

  function setTexture(texture, name) {
    imageRequest += 1;
    mesh.material.map?.dispose();
    mesh.material.map = texture;
    mesh.material.color.set('#ffffff');
    mesh.material.needsUpdate = true;
    imageName = name;
  }

  function update(delta) {
    angle = (angle + data.speed * delta) % (Math.PI * 2);
    mesh.position.set(Math.cos(angle) * data.distance, 0, Math.sin(angle) * data.distance);
    // Coordonnées mondiales : la rotation propre du parent n'affecte pas l'orbite.
    if (parent) {
      mesh.position.add(parent.mesh.position);
      orbit.position.copy(parent.mesh.position);
    }
    mesh.rotation.y += delta * 0.15;
  }

  function dispose() {
    disposed = true;
    removeImage();
    [mesh, orbit].forEach((object) => {
      object.removeFromParent();
      object.geometry.dispose();
      object.material.dispose();
    });
  }

  update(0);
  return { data, mesh, orbit, update, dispose, setImage, setTexture, removeImage,
    get imageName() { return imageName; },
  };
}

export function createPlanetSystem(scene, definitions, moonDefinitions = {}) {
  // Le tableau reste le même objet pour l'animation et le raycasting.
  const planets = [];
  function add(data, custom = false) {
    const planet = createPlanet({ ...data }, planets.length * 2.4 + 0.6);
    planet.custom = custom;
    planet.moons = [];
    scene.add(planet.mesh, planet.orbit);
    planets.push(planet);
    return planet;
  }

  function remove(planet) {
    const index = planets.indexOf(planet);
    if (index === -1 || !planet.custom) return;
    planet.moons.forEach((moon) => moon.dispose());
    planet.moons.length = 0;
    planets.splice(index, 1);
    planet.dispose();
  }

  definitions.forEach((data) => add(data));

  function addMoon(parent, data, custom = true) {
    const moon = createPlanet({ ...data }, parent.moons.length * 2.4 + 0.5, parent);
    moon.custom = custom;
    moon.orbit.material.opacity = 0.18;
    parent.moons.push(moon);
    scene.add(moon.mesh, moon.orbit);
    return moon;
  }

  function removeMoon(parent, moon) {
    const index = parent.moons.indexOf(moon);
    if (index === -1 || !moon.custom) return;
    parent.moons.splice(index, 1);
    moon.dispose();
  }

  planets.forEach((planet) => {
    (moonDefinitions[planet.data.name] || []).forEach((name, index) => {
      addMoon(planet, {
        name, radius: planet.data.radius * (0.18 + index * 0.015),
        distance: planet.data.radius * (2 + index * 0.6),
        speed: (name === 'Triton' ? -1 : 1) * (0.7 / (1 + index * 0.5)),
        color: '#c6c0b5',
      }, false);
    });
  });
  return {
    planets,
    addMoon, removeMoon,
    addCustom: (data) => add(data, true),
    remove,
    update: (delta) => planets.forEach((planet) => {
      planet.update(delta);
      planet.moons.forEach((moon) => moon.update(delta));
    }),
    dispose: () => planets.forEach((planet) => {
      planet.moons.forEach((moon) => moon.dispose());
      planet.dispose();
    }),
  };
}
