import { Vector3 } from 'three';

// Repères visuels uniquement ; la sélection arrive à l'étape 2.
export function createLabels(container, planets) {
  const layer = document.createElement('div');
  layer.className = 'planet-labels';
  const entries = planets.map((planet) => {
    const element = document.createElement('span');
    element.className = 'planet-label';
    element.textContent = planet.data.name;
    element.style.setProperty('--planet-color', planet.data.color);
    layer.appendChild(element);
    return { planet, element };
  });
  container.appendChild(layer);
  const projected = new Vector3();

  function update(camera) {
    const width = container.clientWidth;
    const height = container.clientHeight;
    entries.forEach(({ planet, element }) => {
      projected.copy(planet.mesh.position).project(camera);
      element.hidden = !(projected.z > -1 && projected.z < 1
        && Math.abs(projected.x) < 0.96 && Math.abs(projected.y) < 0.92);
      if (!element.hidden) {
        element.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
        element.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
      }
    });
  }

  return { update, dispose: () => layer.remove() };
}
