import * as THREE from 'three';

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
export function createPlanet(data, initialAngle = 0) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(data.radius, 32, 24),
    new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.85 }),
  );
  mesh.name = data.name;
  const orbit = createOrbit(data.distance);
  let angle = initialAngle;

  function update(delta) {
    angle = (angle + data.speed * delta) % (Math.PI * 2);
    mesh.position.set(Math.cos(angle) * data.distance, 0, Math.sin(angle) * data.distance);
    mesh.rotation.y += delta * 0.15;
  }

  function dispose() {
    [mesh, orbit].forEach((object) => {
      object.removeFromParent();
      object.geometry.dispose();
      object.material.dispose();
    });
  }

  update(0);
  return { data, mesh, orbit, update, dispose };
}

export function createPlanetSystem(scene, definitions) {
  // Le tableau reste le même objet pour l'animation et le raycasting.
  const planets = [];
  function add(data, custom = false) {
    const planet = createPlanet({ ...data }, planets.length * 2.4 + 0.6);
    planet.custom = custom;
    scene.add(planet.mesh, planet.orbit);
    planets.push(planet);
    return planet;
  }

  function remove(planet) {
    const index = planets.indexOf(planet);
    if (index === -1 || !planet.custom) return;
    planets.splice(index, 1);
    planet.dispose();
  }

  definitions.forEach((data) => add(data));
  return {
    planets,
    addCustom: (data) => add(data, true),
    remove,
    update: (delta) => planets.forEach((planet) => planet.update(delta)),
    dispose: () => planets.forEach((planet) => planet.dispose()),
  };
}
