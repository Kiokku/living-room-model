import * as THREE from 'three';

export function createViewTransition({ camera, controls, viewport, plan, panel, floorPlan, onFinish }) {
  let state = null;
  const line = document.createElement('div');
  line.className = 'view-sweep-line';
  line.setAttribute('aria-hidden', 'true');
  line.hidden = true;
  panel.append(line);
  const finish = () => {
    if (!state) return;
    const reverse = state.reverse;
    camera.position.copy(state.position);
    camera.quaternion.copy(state.quaternion);
    camera.fov = state.fov;
    camera.updateProjectionMatrix();
    state = null;
    controls.enabled = true;
    viewport.style.removeProperty('mask-image');
    viewport.style.removeProperty('-webkit-mask-image');
    panel.classList.remove('view-transitioning');
    line.hidden = true;
    plan.hidden = !reverse;
    viewport.hidden = reverse;
    onFinish();
  };
  return {
    get active() { return state !== null; },
    cancel: finish,
    start(now, reverse = false) {
      finish();
      const rect = viewport.getBoundingClientRect();
      const center = floorPlan.toWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
      const bottom = floorPlan.toWorld(rect.left + rect.width / 2, rect.bottom);
      state = { started: now, reverse, position: camera.position.clone(), quaternion: camera.quaternion.clone(), fov: camera.fov };
      viewport.hidden = false;
      camera.position.set(center.x, 45, center.z);
      camera.up.set(0, 0, -1);
      camera.lookAt(center.x, 0, center.z);
      camera.up.set(0, 1, 0);
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.abs(bottom.z - center.z) / 45));
      state.fromTarget = new THREE.Vector3(center.x, 0, center.z);
      state.target = controls.target.clone();
      state.orbit = new THREE.Spherical().setFromVector3(state.position.clone().sub(state.target));
      state.fromFov = camera.fov;
      controls.enabled = false;
      panel.classList.add('view-transitioning');
      this.update(now);
    },
    update(now) {
      if (!state) return;
      const elapsed = state.reverse ? 2100 - (now - state.started) : now - state.started;
      if (elapsed < 1100) {
        plan.hidden = false;
        camera.position.set(state.fromTarget.x, 45, state.fromTarget.z);
        camera.up.set(0, 0, -1);
        camera.lookAt(state.fromTarget);
        camera.up.set(0, 1, 0);
        camera.fov = state.fromFov;
        const progress = Math.max(0, elapsed / 1100);
        const edge = -4 + 108 * progress;
        const mask = `linear-gradient(to right, #000 ${edge - 3}%, transparent ${edge + 3}%)`;
        viewport.style.setProperty('mask-image', mask);
        viewport.style.setProperty('-webkit-mask-image', mask);
        line.hidden = false;
        line.style.left = `${edge}%`;
        line.style.opacity = `${Math.min(1, progress * 12, (1 - progress) * 12)}`;
      } else {
        plan.hidden = true;
        line.hidden = true;
        viewport.style.removeProperty('mask-image');
        viewport.style.removeProperty('-webkit-mask-image');
        const t = Math.min(1, (elapsed - 1100) / 1000);
        const eased = t * t * (3 - 2 * t);
        const target = state.fromTarget.clone().lerp(state.target, eased);
        const distance = THREE.MathUtils.lerp(45, state.orbit.radius, eased);
        const orbit = new THREE.Spherical(distance, Math.max(1e-6, state.orbit.phi * eased), state.orbit.theta * eased);
        camera.position.setFromSpherical(orbit).add(target);
        camera.lookAt(target);
        // Keep the visible field stable while orbiting from top to axonometric.
        const field = THREE.MathUtils.lerp(45 * Math.tan(THREE.MathUtils.degToRad(state.fromFov / 2)),
          state.orbit.radius * Math.tan(THREE.MathUtils.degToRad(state.fov / 2)), eased);
        camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(field / distance));
      }
      camera.updateProjectionMatrix();
      if (now - state.started >= 2100) finish();
    },
  };
}
