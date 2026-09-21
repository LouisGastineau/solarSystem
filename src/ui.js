import { Vector3 } from 'three';

// Les étiquettes laissent les gestes traverser vers le canvas.
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
  let selected = null;

  function update(camera) {
    const width = container.clientWidth;
    const height = container.clientHeight;
    entries.forEach(({ planet, element }) => {
      projected.copy(planet.mesh.position).project(camera);
      element.hidden = planet === selected || !(projected.z > -1 && projected.z < 1
        && Math.abs(projected.x) < 0.96 && Math.abs(projected.y) < 0.92);
      if (!element.hidden) {
        element.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
        element.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
      }
    });
  }

  return { update, select: (planet) => { selected = planet; }, dispose: () => layer.remove() };
}

export function createDescriptionPanel(container, onReturn) {
  const panel = document.createElement('aside');
  panel.className = 'description-panel';
  panel.hidden = true;
  panel.setAttribute('aria-labelledby', 'planet-title');
  panel.innerHTML = `
    <button class="return-button" type="button">← Retour</button>
    <p class="panel-eyebrow">EXPLORATION · PLANÈTE</p>
    <div class="planet-swatch" aria-hidden="true"></div>
    <div aria-live="polite" aria-atomic="true">
      <h2 id="planet-title"></h2>
      <p class="planet-description"></p>
    </div>
    <p class="follow-status"><span></span> Suivi de l’orbite actif</p>
    <p class="panel-help">Glissez pour observer la planète. Utilisez la molette pour zoomer.</p>`;
  const button = panel.querySelector('button');
  const title = panel.querySelector('h2');
  const description = panel.querySelector('.planet-description');
  const badge = document.querySelector('.view-badge');
  const originalBadge = badge.innerHTML;
  button.addEventListener('click', onReturn);
  container.appendChild(panel);

  function show(planet) {
    panel.hidden = !planet;
    document.body.classList.toggle('is-following', Boolean(planet));
    if (!planet) {
      badge.innerHTML = originalBadge;
      return;
    }
    // textContent protège également les futurs noms et descriptions custom.
    title.textContent = planet.data.name;
    description.textContent = planet.data.description;
    panel.style.setProperty('--planet-color', planet.data.color);
    badge.textContent = `SUIVI · ${planet.data.name.toLocaleUpperCase('fr')}`;
    button.focus({ preventScroll: true });
  }

  function dispose() {
    button.removeEventListener('click', onReturn);
    show(null);
    panel.remove();
  }

  return { show, dispose };
}
