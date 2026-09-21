import { Vector3 } from 'three';

// Les étiquettes laissent les gestes traverser vers le canvas.
export function createLabels(container, planets) {
  const layer = document.createElement('div');
  layer.className = 'planet-labels';
  const entries = [];
  function add(planet) {
    const element = document.createElement('span');
    element.className = 'planet-label';
    element.textContent = planet.data.name;
    element.style.setProperty('--planet-color', planet.data.color);
    layer.appendChild(element);
    entries.push({ planet, element });
  }
  function remove(planet) {
    const index = entries.findIndex((entry) => entry.planet === planet);
    if (index === -1) return;
    entries[index].element.remove();
    entries.splice(index, 1);
    if (selected === planet) selected = null;
  }
  planets.forEach(add);
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

  return { update, add, remove, select: (planet) => { selected = planet; }, dispose: () => layer.remove() };
}

export function createDescriptionPanel(container, onReturn, onDelete) {
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
    <p class="panel-help">Glissez pour observer la planète. Utilisez la molette pour zoomer.</p>
    <button class="delete-button" type="button" hidden>Supprimer cette planète</button>`;
  const button = panel.querySelector('button');
  const title = panel.querySelector('h2');
  const description = panel.querySelector('.planet-description');
  const badge = document.querySelector('.view-badge');
  const originalBadge = badge.innerHTML;
  const deleteButton = panel.querySelector('.delete-button');
  let current = null;
  function deleteCurrent() { if (current?.custom) onDelete(current); }
  deleteButton.addEventListener('click', deleteCurrent);
  button.addEventListener('click', onReturn);
  container.appendChild(panel);

  function show(planet) {
    current = planet;
    deleteButton.hidden = !planet?.custom;
    panel.hidden = !planet;
    document.body.classList.toggle('is-following', Boolean(planet));
    if (!planet) {
      badge.innerHTML = originalBadge;
      return;
    }
    // textContent protège également les futurs noms et descriptions custom.
    title.textContent = planet.data.name;
    description.textContent = planet.data.description;
    panel.querySelector('.panel-eyebrow').textContent = planet.custom
      ? 'EXPLORATION · VOTRE PLANÈTE' : 'EXPLORATION · PLANÈTE';
    panel.style.setProperty('--planet-color', planet.data.color);
    badge.textContent = `SUIVI · ${planet.data.name.toLocaleUpperCase('fr')}`;
    button.focus({ preventScroll: true });
  }

  function dispose() {
    button.removeEventListener('click', onReturn);
    deleteButton.removeEventListener('click', deleteCurrent);
    show(null);
    panel.remove();
  }

  return { show, dispose };
}

export function createPlanetEditor(container, { onAdd, onSelect, onDelete }) {
  const launcher = document.createElement('button');
  launcher.className = 'add-planet-button';
  launcher.type = 'button';
  launcher.textContent = '+ Ajouter une planète';
  const dialog = document.createElement('dialog');
  dialog.className = 'planet-editor';
  dialog.setAttribute('aria-labelledby', 'editor-title');
  dialog.innerHTML = `
    <div class="editor-heading"><h2 id="editor-title">Ajouter une planète</h2>
      <button class="close-editor" type="button" aria-label="Fermer le formulaire">×</button></div>
    <p class="editor-intro">Imaginez un nouveau monde. Les valeurs sont celles de la simulation, hors échelle.</p>
    <form>
      <label>Nom<input name="name" type="text" required maxlength="40" placeholder="Ex. : Aurore" autocomplete="off"></label>
      <div class="form-grid">
        <label>Rayon<input name="radius" type="number" required min="0.3" max="4" step="0.1" value="1.2"><small>De 0,3 à 4 unités</small></label>
        <label>Distance au Soleil<input name="distance" type="number" required min="6" max="70" step="0.5" value="52"><small>De 6 à 70 unités</small></label>
        <label>Vitesse orbitale<input name="speed" type="number" required min="0" max="1" step="0.01" value="0.08"><small>De 0 à 1 radian/seconde</small></label>
        <label>Couleur<input name="color" type="color" value="#b58cff"></label>
      </div>
      <label>Description<textarea name="description" required maxlength="600" rows="3" placeholder="Décrivez votre planète imaginaire…"></textarea></label>
      <p class="form-error" role="alert"></p>
      <button class="submit-planet" type="submit">Créer et observer</button>
    </form>
    <p class="session-note">Vos créations restent dans cet onglet et disparaissent au rechargement.</p>
    <section class="custom-planets" aria-labelledby="custom-title"><h3 id="custom-title">Mes planètes</h3>
      <p class="empty-planets">Aucune planète personnalisée pour le moment.</p><ul></ul></section>`;
  container.append(launcher, dialog);
  const form = dialog.querySelector('form');
  const error = dialog.querySelector('.form-error');
  const list = dialog.querySelector('ul');
  const empty = dialog.querySelector('.empty-planets');
  const closeButton = dialog.querySelector('.close-editor');
  const rows = new Map();

  function open() {
    error.textContent = '';
    dialog.showModal();
    form.elements.namedItem('name').focus();
  }
  function close() { dialog.close(); }

  function readData() {
    const values = new FormData(form);
    return {
      name: values.get('name').trim(),
      radius: Number(values.get('radius')),
      distance: Number(values.get('distance')),
      speed: Number(values.get('speed')),
      color: values.get('color'),
      description: values.get('description').trim(),
    };
  }

  function submit(event) {
    event.preventDefault();
    error.textContent = '';
    if (!form.reportValidity()) return;
    const data = readData();
    if (!data.name || !data.description) {
      error.textContent = 'Le nom et la description doivent contenir du texte.';
      return;
    }
    if (![data.radius, data.distance, data.speed].every(Number.isFinite)) {
      error.textContent = 'Saisissez des valeurs numériques valides.';
      return;
    }
    if (data.distance <= 3 + data.radius + 1) {
      error.textContent = 'Augmentez la distance : la planète doit rester à l’extérieur du Soleil, avec une unité de marge.';
      return;
    }
    close();
    onAdd(data);
    form.reset();
  }

  function add(planet) {
    const row = document.createElement('li');
    const observe = document.createElement('button');
    observe.type = 'button';
    observe.className = 'observe-planet';
    observe.textContent = planet.data.name;
    observe.setAttribute('aria-label', `Observer ${planet.data.name}`);
    observe.style.setProperty('--planet-color', planet.data.color);
    observe.addEventListener('click', () => { close(); onSelect(planet); });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete-button';
    remove.textContent = 'Supprimer';
    remove.setAttribute('aria-label', `Supprimer ${planet.data.name}`);
    remove.addEventListener('click', () => { onDelete(planet); closeButton.focus(); });
    row.append(observe, remove);
    list.appendChild(row);
    rows.set(planet, row);
    empty.hidden = true;
  }

  function remove(planet) {
    rows.get(planet)?.remove();
    rows.delete(planet);
    empty.hidden = rows.size > 0;
  }

  launcher.addEventListener('click', open);
  closeButton.addEventListener('click', close);
  form.addEventListener('submit', submit);

  function dispose() {
    if (dialog.open) close();
    launcher.removeEventListener('click', open);
    closeButton.removeEventListener('click', close);
    form.removeEventListener('submit', submit);
    launcher.remove();
    dialog.remove();
    rows.clear();
  }

  return { add, remove, dispose, focus: () => launcher.focus() };
}
