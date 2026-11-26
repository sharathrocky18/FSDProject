// StudySync 3D Particle Sprout & Soil Animation (Vanilla Three.js)
// Converted from user's React Three Fiber ParticleSwarm component

(function() {
  let scene, camera, renderer, instancedMesh;
  let animId = null;
  let isRunning = false;
  const count = 18000;
  let clock;
  let dummy, target, pColor;
  let positions = [];
  let plantIndices = [];
  let isDragging = false;
  let prevMouseX = 0;
  let prevMouseY = 0;
  let rotX = 0.2;
  let rotY = 0;

  function moundHash(seed) {
    const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  }

  function moundSurface(x, z) {
    const mainDistance = Math.sqrt(Math.pow((x + 4) / 27, 2) + Math.pow((z - 1) / 20, 2));
    const mainHeap = 19 * Math.pow(Math.max(0, 1 - mainDistance), 1.05);

    const sideDistance = Math.sqrt(Math.pow((x - 10) / 18, 2) + Math.pow((z + 3) / 15, 2));
    const sideHeap = 10 * Math.pow(Math.max(0, 1 - sideDistance), 1.1);

    const frontDistance = Math.sqrt(Math.pow((x + 13) / 15, 2) + Math.pow((z + 8) / 12, 2));
    const frontHeap = 7 * Math.max(0, 1 - frontDistance);

    const baseHeight = Math.max(mainHeap, sideHeap, frontHeap);
    const roughness =
      Math.sin(x * 0.33 + z * 0.21) * 1.0 +
      Math.sin(x * 0.81 - z * 0.57) * 0.50 +
      Math.cos(x * 1.73 + z * 1.19) * 0.23;

    const edgeFade = Math.min(1, baseHeight / 3);
    return Math.max(0, baseHeight + roughness * edgeFade);
  }

  function initSprout() {
    const canvas = document.getElementById('sproutCanvas');
    if (!canvas || typeof THREE === 'undefined') return;

    clock = new THREE.Clock();
    dummy = new THREE.Object3D();
    target = new THREE.Vector3();
    pColor = new THREE.Color();

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a14, 0.0035);

    const container = canvas.parentElement || document.body;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    camera = new THREE.PerspectiveCamera(52, w / h, 1, 1000);
    camera.position.set(0, 10, 80);
    camera.lookAt(0, 6, 0);

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const geometry = new THREE.TetrahedronGeometry(0.32);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const moundFloor = -13;

    // Precompute positions & colors
    for (let i = 0; i < count; i++) {
      const isPlant = (i % 4 === 0);
      positions.push(new THREE.Vector3(0, 0, 0));

      if (isPlant) {
        plantIndices.push(i);
      } else {
        // Soil particle
        const moundA = moundHash(i + 1);
        const moundB = moundHash(i + 101);
        const moundC = moundHash(i + 1001);
        const moundD = moundHash(i + 5001);
        const moundType = moundHash(i + 6101);

        let mX, mY, mZ;
        if (moundType < 0.74) {
          const angle = moundA * Math.PI * 2;
          const radius = Math.sqrt(moundB);
          const edgeShape = 1 + 0.10 * Math.sin(angle * 3 + 0.7) + 0.07 * Math.cos(angle * 5 - 0.5) + 0.035 * Math.sin(angle * 9);
          mX = -2 + Math.cos(angle) * radius * 30 * edgeShape;
          mZ = Math.sin(angle) * radius * 22 * edgeShape;
          const surface = moundSurface(mX, mZ);
          const depthFraction = moundC < 0.87 ? 1 : Math.pow((moundC - 0.87) / 0.13, 0.65);
          const grainRoughness = (moundHash(i + 7101) - 0.5) * 0.55 * Math.min(1, surface);
          mY = moundFloor + surface * depthFraction + grainRoughness;
        } else if (moundType < 0.93) {
          const clodIndex = Math.floor(moundHash(i + 8101) * 65);
          const clodAngle = moundHash(clodIndex + 12001) * Math.PI * 2;
          const clodRadius = Math.sqrt(moundHash(clodIndex + 13001));
          const clodX = -2 + Math.cos(clodAngle) * clodRadius * 31;
          const clodZ = Math.sin(clodAngle) * clodRadius * 23;
          const clodSize = 0.45 + moundHash(clodIndex + 14001) * 1.35;
          const sphereHeight = moundA * 2 - 1;
          const sphereAngle = moundB * Math.PI * 2;
          const sphereRing = Math.sqrt(Math.max(0, 1 - sphereHeight * sphereHeight));
          mX = clodX + Math.cos(sphereAngle) * sphereRing * clodSize;
          mZ = clodZ + Math.sin(sphereAngle) * sphereRing * clodSize;
          mY = moundFloor + moundSurface(clodX, clodZ) + clodSize * 0.55 + sphereHeight * clodSize * 0.75;
        } else {
          const scatterAngle = moundA * Math.PI * 2;
          const scatterRadius = 0.88 + moundB * 0.43;
          mX = -2 + Math.cos(scatterAngle) * 31 * scatterRadius;
          mZ = Math.sin(scatterAngle) * 23 * scatterRadius;
          mY = moundFloor + moundSurface(mX, mZ) + moundC * 0.35;
        }

        // Soil color
        const shade = 0.70 + moundD * 0.55;
        const elevation = Math.max(0, Math.min(1, (mY - moundFloor) / 19));
        const topLight = 0.86 + elevation * 0.18;
        let red = 0.29 * shade * topLight;
        let green = 0.19 * shade * topLight;
        let blue = 0.105 * shade * topLight;
        if (moundD > 0.96) { red = 0.40; green = 0.29; blue = 0.17; }
        if (moundD < 0.09) { red = 0.115; green = 0.075; blue = 0.04; }

        pColor.setRGB(red, green, blue);
        dummy.position.set(mX, mY, mZ);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
        instancedMesh.setColorAt(i, pColor);
      }
    }

    scene.add(instancedMesh);
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

    // Interactive mouse rotation
    const onMouseDown = (e) => {
      // Allow drag on canvas or when clicking outside input elements
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };
    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      rotY += dx * 0.006;
      rotX = Math.max(-0.4, Math.min(0.8, rotX + dy * 0.005));
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };
    const onMouseUp = () => { isDragging = false; };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Touch support
    window.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1 && e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
        isDragging = true;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      }
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - prevMouseX;
        const dy = e.touches[0].clientY - prevMouseY;
        rotY += dx * 0.006;
        rotX = Math.max(-0.4, Math.min(0.8, rotX + dy * 0.005));
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      }
    }, { passive: true });
    window.addEventListener('touchend', onMouseUp);

    window.addEventListener('resize', () => {
      if (!renderer || !camera) return;
      const nw = container.clientWidth || window.innerWidth;
      const nh = container.clientHeight || window.innerHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });

    startSprout();
  }

  function renderFrame() {
    if (!isRunning) return;
    animId = requestAnimationFrame(renderFrame);

    const time = clock.getElapsedTime();
    const moundFloor = -13;
    const plantX = -3;
    const plantZ = 0;
    const plantBaseY = moundFloor + moundSurface(plantX, plantZ) - 0.6;
    const plantHeight = 17;
    const plantSway = Math.sin(time * 1.15) * 0.55;

    // Update plant particles each frame for gentle swaying
    for (let k = 0; k < plantIndices.length; k++) {
      const i = plantIndices[k];
      const plantPart = moundHash(i + 20001);
      const plantU = moundHash(i + 21001);
      const plantV = moundHash(i + 22001);
      const plantTone = moundHash(i + 23001);

      let px, py, pz;

      if (plantPart < 0.30) {
        // Curved stem
        const stemT = plantU;
        const stemAngle = plantV * Math.PI * 2;
        const stemRadius = (0.48 - stemT * 0.18) * Math.sqrt(moundHash(i + 24001));

        px = plantX + 1.3 * stemT * stemT + Math.cos(stemAngle) * stemRadius + plantSway * stemT * stemT;
        py = plantBaseY + stemT * plantHeight;
        pz = plantZ + Math.sin(stemAngle) * stemRadius;

        pColor.setRGB(0.16 + plantTone * 0.07, 0.39 + plantTone * 0.15, 0.055 + plantTone * 0.035);
      } else {
        // Two pointed leaves
        const leafSide = plantPart < 0.65 ? -1 : 1;
        const leafT = plantU;
        const leafAcross = plantV * 2 - 1;
        const leafLength = leafSide < 0 ? 10 : 11;
        const leafWidth = leafSide < 0 ? 3.5 : 3.9;
        const leafShape = Math.pow(Math.sin(Math.PI * leafT), 0.85);
        const attachT = leafSide < 0 ? 0.76 : 0.92;

        py = plantBaseY + attachT * plantHeight + 3.7 * leafT + 1.8 * Math.sin(Math.PI * leafT) - 0.65 * leafAcross * leafAcross * leafShape;
        const swayFactor = (py - plantBaseY) / plantHeight;

        px = plantX + 1.3 * attachT * attachT + leafSide * leafLength * leafT + plantSway * swayFactor * swayFactor;
        pz = plantZ + leafAcross * leafWidth * leafShape + leafSide * leafT * 1.1;

        const isVein = Math.abs(leafAcross) < 0.045;
        const leafLight = 0.85 + plantTone * 0.20 + (1 - Math.abs(leafAcross)) * 0.12;

        if (isVein) {
          pColor.setRGB(0.32, 0.59, 0.12);
        } else {
          pColor.setRGB(0.10 * leafLight, 0.42 * leafLight, 0.055 * leafLight);
        }
      }

      dummy.position.set(px, py, pz);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
      instancedMesh.setColorAt(i, pColor);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;

    // Gentle auto-rotation unless dragging
    if (!isDragging) {
      rotY += 0.003;
    }

    // Camera positioning based on orbital rotation
    const dist = 74;
    const cy = 6 + dist * Math.sin(rotX);
    const cr = dist * Math.cos(rotX);
    camera.position.x = cr * Math.sin(rotY);
    camera.position.z = cr * Math.cos(rotY);
    camera.position.y = cy;
    camera.lookAt(0, 6, 0);

    renderer.render(scene, camera);
  }

  function startSprout() {
    if (isRunning) return;
    isRunning = true;
    if (clock) clock.start();
    renderFrame();
  }

  function stopSprout() {
    isRunning = false;
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  window.StudySyncSprout = { init: initSprout, start: startSprout, stop: stopSprout };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSprout);
  } else {
    initSprout();
  }
})();
