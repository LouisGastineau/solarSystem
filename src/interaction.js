import { MathUtils, Raycaster, Sphere, Vector2, Vector3 } from 'three';

export function createInteraction(world, planets, onSelect) {
  const { camera, controls, renderer, scene } = world;
  const canvas = renderer.domElement;
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const sphere = new Sphere();
  const hit = new Vector3();
  const projected = new Vector3();
  const shift = new Vector3();
  const destination = new Vector3();
  const activePointers = new Set();
  const globalView = { position: camera.position.clone(), target: controls.target.clone() };
  const globalMinDistance = controls.minDistance;
  let selected = null;
  let transition = null;
  let gesture = null;

  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1,
      -(event.clientY - rect.top) / rect.height * 2 + 1);
    camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const meshes = planets.map((planet) => planet.mesh);
    const direct = raycaster.intersectObjects(meshes, false)[0];
    if (direct) return planets.find((planet) => planet.mesh === direct.object);

    // Une sphère de sélection offre au moins 12 pixels de rayon à l'écran.
    // Elle n'altère ni le rayon affiché, ni la géométrie de la planète.
    let closest = null;
    let bestScore = Infinity;
    planets.forEach((planet) => {
      projected.copy(planet.mesh.position).project(camera);
      if (projected.z < -1 || projected.z > 1) return;
      const depth = -planet.mesh.position.clone().applyMatrix4(camera.matrixWorldInverse).z;
      const unitsPerPixel = 2 * depth * Math.tan(MathUtils.degToRad(camera.fov / 2)) / rect.height;
      sphere.set(planet.mesh.position, Math.max(planet.data.radius, unitsPerPixel * 12));
      if (!raycaster.ray.intersectSphere(sphere, hit)) return;
      const score = Math.hypot((projected.x - pointer.x) * rect.width,
        (projected.y - pointer.y) * rect.height);
      if (score < bestScore) { closest = planet; bestScore = score; }
    });
    return closest;
  }

  function beginTransition(offset) {
    // Vider l'inertie avant d'interpoler évite les dérives de caméra.
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = true;
    controls.enabled = false;
    controls.minDistance = 0.1;
    transition = {
      elapsed: 0, position: camera.position.clone(),
      target: controls.target.clone(), offset,
    };
  }

  function select(planet) {
    if (selected === planet) return;
    if (!selected && !transition) {
      globalView.position.copy(camera.position);
      globalView.target.copy(controls.target);
    }
    const offset = camera.position.clone().sub(controls.target).normalize()
      .multiplyScalar(Math.max(planet.data.radius * 6, 4.5));
    selected = planet;
    beginTransition(offset);
    controls.enablePan = false;
    canvas.style.cursor = '';
    onSelect(planet);
  }

  function reset() {
    if (!selected) return;
    selected = null;
    beginTransition(null);
    controls.enablePan = true;
    onSelect(null);
  }

  function update(delta) {
    if (transition) {
      transition.elapsed += delta;
      const progress = Math.min(transition.elapsed / 1.25, 1);
      const eased = progress * progress * (3 - 2 * progress);
      const target = selected ? selected.mesh.position : globalView.target;
      destination.copy(selected ? target : globalView.position);
      if (selected) destination.add(transition.offset);
      controls.target.lerpVectors(transition.target, target, eased);
      camera.position.lerpVectors(transition.position, destination, eased);
      if (progress === 1) {
        transition = null;
        controls.minDistance = selected ? selected.data.radius * 1.8 : globalMinDistance;
        controls.enabled = true;
      }
    } else if (selected) {
      // Translation commune : l'orbite continue sans annuler rotation ou zoom.
      shift.copy(selected.mesh.position).sub(controls.target);
      camera.position.add(shift);
      controls.target.copy(selected.mesh.position);
    }
  }

  function pointerDown(event) {
    activePointers.add(event.pointerId);
    if (activePointers.size > 1) { gesture = null; return; }
    if (event.button !== 0) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  }

  function pointerMove(event) {
    if (gesture && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 6) {
      gesture.moved = true;
    }
    if (!activePointers.size && event.pointerType === 'mouse') {
      canvas.style.cursor = pick(event) ? 'pointer' : '';
    }
  }

  function pointerUp(event) {
    const click = gesture && gesture.id === event.pointerId && !gesture.moved
      && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <= 6;
    activePointers.delete(event.pointerId);
    gesture = null;
    if (click) {
      const planet = pick(event);
      if (planet) select(planet);
    }
  }

  function cancel(event) { activePointers.delete(event.pointerId); gesture = null; }
  function keyDown(event) { if (event.key === 'Escape') reset(); }
  const events = { pointerdown: pointerDown, pointermove: pointerMove,
    pointerup: pointerUp, pointercancel: cancel, lostpointercapture: cancel };
  Object.entries(events).forEach(([name, handler]) => canvas.addEventListener(name, handler));
  window.addEventListener('keydown', keyDown);

  function dispose() {
    Object.entries(events).forEach(([name, handler]) => canvas.removeEventListener(name, handler));
    window.removeEventListener('keydown', keyDown);
    canvas.style.cursor = '';
  }

  return { update, reset, dispose };
}
