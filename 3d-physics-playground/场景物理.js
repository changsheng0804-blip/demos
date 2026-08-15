/*
 * 立体物理乐园
 * 固定依赖：Three.js 0.185.1、cannon-es 0.20.0
 * 本文件按规划分为五个区域：页面状态、场景初始化、物理世界、物体与交互、动画与清理。
 */

// ==================== 一、页面状态 ====================
const FIXED_STEP = 1 / 60;
const MAX_OBJECTS = 60;
const DEFAULT_PARAMETERS = Object.freeze({
  gravity: 9.8,
  restitution: 0.25,
  friction: 0.60
});

const COLOR_PALETTE = Object.freeze([
  { name: '珊瑚红', value: 0xf2766d },
  { name: '琥珀黄', value: 0xf5c34e },
  { name: '薄荷绿', value: 0x58c8ae },
  { name: '湖水蓝', value: 0x55a9e8 },
  { name: '葡萄紫', value: 0x9a7bd5 }
]);

const SHAPE_DEFINITIONS = Object.freeze({
  sphere: {
    label: '球体',
    mass: 1.5,
    radius: 0.65,
    halfHeight: 0.65,
    footprint: 0.72
  },
  box: {
    label: '立方体',
    mass: 1.5,
    size: 1.30,
    halfHeight: 0.68,
    footprint: 0.75
  },
  cylinder: {
    label: '圆柱体',
    mass: 1.5,
    radius: 0.60,
    height: 1.40,
    halfHeight: 0.75,
    footprint: 0.72
  }
});

const appState = {
  parameters: { ...DEFAULT_PARAMETERS },
  objects: [],
  selectedObject: null,
  colorIndex: 0,
  spawnIndex: 0,
  nextObjectId: 1,
  drag: null,
  lastFrameTime: 0,
  accumulator: 0,
  toastTimer: 0,
  impactTimer: 0,
  hasCreatedObject: false,
  isReady: false
};

let THREE = null;
let CANNON = null;
let OrbitControls = null;

let dom = {};
let scene = null;
let camera = null;
let renderer = null;
let controls = null;
let world = null;
let objectMaterial = null;
let floorMaterial = null;
let objectContactMaterial = null;
let floorContactMaterial = null;
let raycaster = null;
let pointerNdc = null;
let cameraDirection = null;
let dragPlane = null;
let dragIntersection = null;

function collectDom() {
  dom = {
    app: document.getElementById('app'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingDetail: document.getElementById('loadingDetail'),
    errorOverlay: document.getElementById('errorOverlay'),
    errorTitle: document.getElementById('errorTitle'),
    errorMessage: document.getElementById('errorMessage'),
    errorRetry: document.getElementById('errorRetry'),
    objectCount: document.getElementById('objectCount'),
    physicsStatus: document.getElementById('physicsStatus'),
    statusText: document.getElementById('statusText'),
    towerPushHeader: document.getElementById('towerPushHeader'),
    mobileTowerPush: document.getElementById('mobileTowerPush'),
    restartButton: document.getElementById('restartButton'),
    resetPhysicsButton: document.getElementById('resetPhysicsButton'),
    objectPanel: document.getElementById('objectPanel'),
    physicsPanel: document.getElementById('physicsPanel'),
    stagePanel: document.getElementById('stagePanel'),
    sceneHost: document.getElementById('sceneHost'),
    guideCard: document.getElementById('guideCard'),
    closeGuideButton: document.getElementById('closeGuideButton'),
    compactHelp: document.getElementById('compactHelp'),
    helpButton: document.getElementById('helpButton'),
    selectionHint: document.getElementById('selectionHint'),
    selectionBar: document.getElementById('selectionBar'),
    selectedObjectName: document.getElementById('selectedObjectName'),
    sceneToast: document.getElementById('sceneToast'),
    impactFx: document.getElementById('impactFx'),
    drawerCloseButton: document.getElementById('drawerCloseButton'),
    sliders: {
      gravity: document.getElementById('gravitySlider'),
      restitution: document.getElementById('restitutionSlider'),
      friction: document.getElementById('frictionSlider')
    },
    values: {
      gravity: document.getElementById('gravityValue'),
      restitution: document.getElementById('restitutionValue'),
      friction: document.getElementById('frictionValue')
    }
  };
}

function setLoadingDetail(message) {
  if (dom.loadingDetail) {
    dom.loadingDetail.textContent = message;
  }
}

function showFatalError(title, message) {
  if (dom.loadingOverlay) {
    dom.loadingOverlay.classList.add('is-hidden');
  }
  if (dom.app) {
    dom.app.classList.add('is-hidden');
  }
  if (dom.errorTitle) {
    dom.errorTitle.textContent = title;
  }
  if (dom.errorMessage) {
    dom.errorMessage.textContent = message;
  }
  if (dom.errorOverlay) {
    dom.errorOverlay.classList.remove('is-hidden');
  }
}

function setStatus(message, busy = false) {
  if (!dom.statusText || !dom.physicsStatus) {
    return;
  }
  dom.statusText.textContent = message;
  dom.physicsStatus.classList.toggle('is-busy', busy);
}

function formatParameter(name, value) {
  if (name === 'gravity') {
    return Number(value).toFixed(1);
  }
  return Number(value).toFixed(2);
}

function updateParameterDisplay() {
  Object.keys(appState.parameters).forEach((name) => {
    const value = appState.parameters[name];
    if (dom.sliders[name]) {
      dom.sliders[name].value = String(value);
    }
    if (dom.values[name]) {
      dom.values[name].textContent = formatParameter(name, value);
    }
  });
}

function showToast(message, duration = 2100) {
  if (!dom.sceneToast) {
    return;
  }
  window.clearTimeout(appState.toastTimer);
  dom.sceneToast.textContent = message;
  dom.sceneToast.classList.remove('is-hidden');
  appState.toastTimer = window.setTimeout(() => {
    dom.sceneToast.classList.add('is-hidden');
  }, duration);
}

function openDrawer(target) {
  if (window.matchMedia('(max-width: 767px)').matches) {
    document.body.dataset.drawer = target;
  }
}

function closeDrawer() {
  document.body.dataset.drawer = '';
}

function setGuideDismissed() {
  if (dom.guideCard) {
    dom.guideCard.classList.add('is-dismissed');
  }
  if (dom.compactHelp) {
    dom.compactHelp.classList.remove('is-hidden');
  }
}

// ==================== 二、场景初始化 ====================
async function loadLibraries() {
  setLoadingDetail('正在加载立体绘制和物理计算资源');
  const threeModule = await import('three');
  setLoadingDetail('正在加载镜头控制器');
  const controlsModule = await import('three/addons/controls/OrbitControls.js');
  setLoadingDetail('正在加载碰撞规则');
  const cannonModule = await import('https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/+esm');
  THREE = threeModule;
  CANNON = cannonModule;
  OrbitControls = controlsModule.OrbitControls;
}

function checkGraphicsCapability() {
  const testCanvas = document.createElement('canvas');
  const context = testCanvas.getContext('webgl2', { antialias: true });
  if (!context) {
    throw new Error('WEBGL_UNSUPPORTED');
  }
}

function initializeScene() {
  setLoadingDetail('正在搭建地台、灯光和镜头');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeef6ff);
  scene.fog = new THREE.Fog(0xeef6ff, 24, 48);

  const width = Math.max(1, dom.sceneHost.clientWidth);
  const height = Math.max(1, dom.sceneHost.clientHeight);
  camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
  camera.position.set(13.8, 10.8, 16.6);
  camera.lookAt(0, 1.8, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute('aria-label', '立体物理互动场景');
  dom.sceneHost.prepend(renderer.domElement);

  raycaster = new THREE.Raycaster();
  pointerNdc = new THREE.Vector2();
  cameraDirection = new THREE.Vector3();
  dragPlane = new THREE.Plane();
  dragIntersection = new THREE.Vector3();

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xb8c7d9, 2.25);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(-7, 16, 9);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -14;
  keyLight.shadow.camera.right = 14;
  keyLight.shadow.camera.top = 15;
  keyLight.shadow.camera.bottom = -12;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 45;
  keyLight.shadow.bias = -0.00025;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xaad7ff, 0.75);
  fillLight.position.set(12, 8, -10);
  scene.add(fillLight);

  createPlatformVisuals();

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.minDistance = 8.5;
  controls.maxDistance = 31;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.rotateSpeed = 0.72;
  controls.panSpeed = 0.72;
  controls.zoomSpeed = 0.8;
  controls.target.set(0, 1.8, 0);
  controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
  controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  controls.update();
}

function createPlatformVisuals() {
  const platformMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0eee7,
    roughness: 0.88,
    metalness: 0.02
  });
  const platform = new THREE.Mesh(new THREE.BoxGeometry(18, 0.5, 14), platformMaterial);
  platform.position.y = 0;
  platform.receiveShadow = true;
  scene.add(platform);

  const platformUnderlay = new THREE.Mesh(
    new THREE.BoxGeometry(18.25, 0.18, 14.25),
    new THREE.MeshStandardMaterial({ color: 0xdce9f0, roughness: 0.92 })
  );
  platformUnderlay.position.y = -0.3;
  platformUnderlay.receiveShadow = true;
  scene.add(platformUnderlay);

  const grid = new THREE.GridHelper(18, 18, 0xc9d8e4, 0xe0e9f0);
  grid.position.y = 0.255;
  if (Array.isArray(grid.material)) {
    grid.material.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.48;
    });
  } else {
    grid.material.transparent = true;
    grid.material.opacity = 0.48;
  }
  scene.add(grid);

  const frontLine = new THREE.Mesh(
    new THREE.BoxGeometry(18.15, 0.06, 0.13),
    new THREE.MeshStandardMaterial({ color: 0x9ec3df, roughness: 0.5 })
  );
  frontLine.position.set(0, 0.31, 7.02);
  frontLine.receiveShadow = true;
  scene.add(frontLine);
}

function initializeInteractionEvents() {
  document.querySelectorAll('.shape-button').forEach((button) => {
    button.addEventListener('click', () => addObject(button.dataset.shape));
  });

  document.querySelectorAll('.selection-button').forEach((button) => {
    button.addEventListener('click', () => handleSelectionAction(button.dataset.action));
  });

  Object.entries(dom.sliders).forEach(([name, slider]) => {
    if (!slider) {
      return;
    }
    slider.addEventListener('input', () => updateParameter(name, Number(slider.value)));
    slider.addEventListener('change', () => pulseParameterCard(name));
  });

  dom.towerPushHeader.addEventListener('click', pushTower);
  dom.mobileTowerPush.addEventListener('click', pushTower);
  dom.restartButton.addEventListener('click', restartScene);
  dom.resetPhysicsButton.addEventListener('click', resetPhysicsParameters);
  dom.closeGuideButton.addEventListener('click', setGuideDismissed);
  dom.helpButton.addEventListener('click', () => {
    if (dom.guideCard.classList.contains('is-dismissed')) {
      dom.guideCard.classList.remove('is-dismissed');
    } else {
      setGuideDismissed();
    }
  });
  dom.drawerCloseButton.addEventListener('click', closeDrawer);
  document.querySelectorAll('.drawer-tab').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.drawerTarget;
      if (document.body.dataset.drawer === target) {
        closeDrawer();
      } else {
        openDrawer(target);
      }
    });
  });
  dom.errorRetry.addEventListener('click', () => window.location.reload());

  renderer.domElement.addEventListener('pointerdown', onPointerDown, true);
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerUp, { passive: false });
  window.addEventListener('pointercancel', onPointerUp, { passive: false });
  window.addEventListener('resize', handleResize);
  document.addEventListener('visibilitychange', () => {
    appState.lastFrameTime = performance.now();
    appState.accumulator = 0;
  });
  window.addEventListener('keydown', handleKeyboard);
}

function handleResize() {
  if (!renderer || !camera || !dom.sceneHost) {
    return;
  }
  const width = Math.max(1, dom.sceneHost.clientWidth);
  const height = Math.max(1, dom.sceneHost.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

// ==================== 三、物理世界 ====================
function initializePhysicsWorld() {
  setLoadingDetail('正在建立地台、边界和碰撞材质');
  world = new CANNON.World();
  world.gravity.set(0, -appState.parameters.gravity, 0);
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;
  world.solver.iterations = 14;
  world.solver.tolerance = 0.001;

  objectMaterial = new CANNON.Material('物体材质');
  floorMaterial = new CANNON.Material('地台材质');
  objectContactMaterial = new CANNON.ContactMaterial(objectMaterial, objectMaterial, {
    friction: appState.parameters.friction,
    restitution: appState.parameters.restitution,
    contactEquationStiffness: 1e7,
    contactEquationRelaxation: 3
  });
  floorContactMaterial = new CANNON.ContactMaterial(objectMaterial, floorMaterial, {
    friction: appState.parameters.friction,
    restitution: appState.parameters.restitution,
    contactEquationStiffness: 1e7,
    contactEquationRelaxation: 3
  });
  world.addContactMaterial(objectContactMaterial);
  world.addContactMaterial(floorContactMaterial);
  world.defaultContactMaterial.friction = appState.parameters.friction;
  world.defaultContactMaterial.restitution = appState.parameters.restitution;

  const floorBody = new CANNON.Body({ mass: 0, material: floorMaterial });
  floorBody.addShape(new CANNON.Box(new CANNON.Vec3(9, 0.25, 7)));
  floorBody.position.set(0, 0, 0);
  world.addBody(floorBody);

  addBoundaryBody(new CANNON.Vec3(0.2, 3.2, 7.2), 9.05, 3.2, 0);
  addBoundaryBody(new CANNON.Vec3(0.2, 3.2, 7.2), -9.05, 3.2, 0);
  addBoundaryBody(new CANNON.Vec3(9.2, 3.2, 0.2), 0, 3.2, 7.05);
  addBoundaryBody(new CANNON.Vec3(9.2, 3.2, 0.2), 0, 3.2, -7.05);
}

function addBoundaryBody(halfExtents, x, y, z) {
  const boundaryBody = new CANNON.Body({ mass: 0, material: floorMaterial });
  boundaryBody.addShape(new CANNON.Box(halfExtents));
  boundaryBody.position.set(x, y, z);
  world.addBody(boundaryBody);
}

function wakeAllObjects() {
  appState.objects.forEach((object) => {
    object.body.wakeUp();
  });
}

function updateContactParameters() {
  if (!world) {
    return;
  }
  const friction = appState.parameters.friction;
  const restitution = appState.parameters.restitution;
  world.gravity.set(0, -appState.parameters.gravity, 0);
  world.defaultContactMaterial.friction = friction;
  world.defaultContactMaterial.restitution = restitution;
  if (objectContactMaterial) {
    objectContactMaterial.friction = friction;
    objectContactMaterial.restitution = restitution;
  }
  if (floorContactMaterial) {
    floorContactMaterial.friction = friction;
    floorContactMaterial.restitution = restitution;
  }
  wakeAllObjects();
}

function updateParameter(name, value) {
  if (!Object.prototype.hasOwnProperty.call(appState.parameters, name)) {
    return;
  }
  appState.parameters[name] = value;
  updateParameterDisplay();
  updateContactParameters();
  setStatus('参数已更新', true);
  window.setTimeout(() => setStatus(appState.objects.length ? '物理运行中' : '场景准备好了'), 420);
}

function pulseParameterCard(name) {
  const card = document.querySelector(`[data-param-card="${name}"]`);
  if (!card) {
    return;
  }
  card.classList.remove('is-pulsing');
  window.requestAnimationFrame(() => {
    card.classList.add('is-pulsing');
    window.setTimeout(() => card.classList.remove('is-pulsing'), 320);
  });
}

function resetPhysicsParameters() {
  appState.parameters = { ...DEFAULT_PARAMETERS };
  updateParameterDisplay();
  updateContactParameters();
  setStatus('默认参数已恢复');
  showToast('三个物理参数已经恢复默认值。');
  ['gravity', 'restitution', 'friction'].forEach(pulseParameterCard);
}

// ==================== 四、物体与交互 ====================
function getNextColor() {
  const paletteColor = COLOR_PALETTE[appState.colorIndex % COLOR_PALETTE.length];
  appState.colorIndex += 1;
  return paletteColor;
}

function getSpawnPoint() {
  const index = appState.spawnIndex;
  appState.spawnIndex += 1;
  const column = index % 5;
  const row = Math.floor(index / 5) % 3;
  return new THREE.Vector3(-4.5 + column * 1.55, 6.8 + (index % 3) * 0.35, -2.8 + row * 1.35);
}

function createVisualForShape(shapeKey, paletteColor) {
  const definition = SHAPE_DEFINITIONS[shapeKey];
  let geometry = null;
  if (shapeKey === 'sphere') {
    geometry = new THREE.SphereGeometry(definition.radius, 32, 20);
  } else if (shapeKey === 'box') {
    geometry = new THREE.BoxGeometry(definition.size, definition.size, definition.size);
  } else {
    geometry = new THREE.CylinderGeometry(definition.radius, definition.radius, definition.height, 32);
  }

  const material = new THREE.MeshStandardMaterial({
    color: paletteColor.value,
    roughness: 0.38,
    metalness: 0.03,
    emissive: new THREE.Color(paletteColor.value).multiplyScalar(0.035),
    emissiveIntensity: 0.8
  });
  const visual = new THREE.Mesh(geometry, material);
  visual.castShadow = true;
  visual.receiveShadow = true;

  const outline = new THREE.Mesh(
    geometry.clone(),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.74,
      depthWrite: false
    })
  );
  outline.scale.setScalar(1.018);
  outline.visible = false;

  const ringRadius = shapeKey === 'sphere' ? 0.55 : definition.footprint;
  const selectionRing = new THREE.Mesh(
    new THREE.RingGeometry(ringRadius * 0.76, ringRadius, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    })
  );
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = -definition.halfHeight - 0.012;
  selectionRing.visible = false;

  const spawnGlow = new THREE.Mesh(
    new THREE.RingGeometry(ringRadius * 0.88, ringRadius * 1.05, 40),
    new THREE.MeshBasicMaterial({
      color: paletteColor.value,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    })
  );
  spawnGlow.rotation.x = -Math.PI / 2;
  spawnGlow.position.y = -definition.halfHeight - 0.004;

  const root = new THREE.Group();
  root.add(visual, outline, selectionRing, spawnGlow);
  root.userData.isPhysicsObject = true;
  scene.add(root);
  return { root, visual, outline, selectionRing, spawnGlow, geometry, material };
}

function createPhysicsShape(shapeKey) {
  const definition = SHAPE_DEFINITIONS[shapeKey];
  if (shapeKey === 'sphere') {
    return new CANNON.Sphere(definition.radius);
  }
  if (shapeKey === 'box') {
    const half = definition.size / 2;
    return new CANNON.Box(new CANNON.Vec3(half, half, half));
  }
  return new CANNON.Cylinder(definition.radius, definition.radius, definition.height, 24);
}

function addObject(shapeKey) {
  if (!appState.isReady || !SHAPE_DEFINITIONS[shapeKey]) {
    return null;
  }
  if (appState.objects.length >= MAX_OBJECTS) {
    showToast('物体已经很多啦，请删除一些或重新开始。', 3000);
    updateObjectButtons();
    return null;
  }

  const definition = SHAPE_DEFINITIONS[shapeKey];
  const paletteColor = getNextColor();
  const visualParts = createVisualForShape(shapeKey, paletteColor);
  const body = new CANNON.Body({ mass: definition.mass, material: objectMaterial });
  body.addShape(createPhysicsShape(shapeKey));
  const spawnPoint = getSpawnPoint();
  body.position.set(spawnPoint.x, spawnPoint.y, spawnPoint.z);
  body.linearDamping = 0.09;
  body.angularDamping = 0.16;
  body.allowSleep = true;
  body.sleepSpeedLimit = 0.14;
  body.sleepTimeLimit = 0.45;
  body.collisionResponse = true;
  body.velocity.set(0, 0, 0);
  body.angularVelocity.set(0, 0, 0);
  world.addBody(body);

  const object = {
    id: appState.nextObjectId,
    shapeKey,
    label: definition.label,
    colorName: paletteColor.name,
    body,
    root: visualParts.root,
    visual: visualParts.visual,
    outline: visualParts.outline,
    selectionRing: visualParts.selectionRing,
    spawnGlow: visualParts.spawnGlow,
    geometry: visualParts.geometry,
    material: visualParts.material,
    spawnGlowUntil: performance.now() + 850,
    mass: definition.mass,
    footprint: definition.footprint,
    maxHalfHeight: definition.halfHeight
  };
  appState.nextObjectId += 1;
  object.root.userData.objectRecord = object;
  object.visual.userData.objectRecord = object;
  object.body.userData = { objectId: object.id };
  appState.objects.push(object);

  appState.hasCreatedObject = true;
  dom.stagePanel.classList.add('has-objects');
  setGuideDismissed();
  setSelectedObject(object);
  updateObjectCounter();
  updateObjectButtons();
  setStatus('物理运行中', true);
  window.setTimeout(() => setStatus('物理运行中'), 430);
  return object;
}

function updateObjectCounter() {
  if (dom.objectCount) {
    dom.objectCount.textContent = `物体：${appState.objects.length} / ${MAX_OBJECTS}`;
  }
}

function updateObjectButtons() {
  const atLimit = appState.objects.length >= MAX_OBJECTS;
  document.querySelectorAll('.shape-button').forEach((button) => {
    button.disabled = atLimit;
    button.title = atLimit ? '物体已经很多啦，请删除一些或重新开始' : `添加${SHAPE_DEFINITIONS[button.dataset.shape].label}`;
  });
}

function setSelectedObject(object) {
  if (appState.selectedObject && appState.selectedObject !== object) {
    appState.selectedObject.selectionRing.visible = false;
    appState.selectedObject.outline.visible = false;
  }
  appState.selectedObject = object || null;
  if (object) {
    object.selectionRing.visible = true;
    object.outline.visible = true;
    dom.selectedObjectName.textContent = `${object.label} · ${object.colorName}`;
    dom.selectionHint.textContent = '已选中，可拖动或操作';
    dom.selectionBar.classList.remove('is-hidden');
    dom.selectionBar.setAttribute('aria-hidden', 'false');
  } else {
    dom.selectedObjectName.textContent = '未选择物体';
    dom.selectionHint.textContent = '点击物体开始实验';
    dom.selectionBar.classList.add('is-hidden');
    dom.selectionBar.setAttribute('aria-hidden', 'true');
  }
}

function removeObject(object) {
  if (!object) {
    return;
  }
  if (appState.drag && appState.drag.object === object) {
    finishDrag(null, true);
  }
  if (appState.selectedObject === object) {
    setSelectedObject(null);
  }
  if (world && object.body) {
    world.removeBody(object.body);
  }
  if (object.root && object.root.parent) {
    object.root.parent.remove(object.root);
  }
  object.geometry?.dispose();
  object.material?.dispose();
  object.outline?.geometry?.dispose();
  object.outline?.material?.dispose();
  object.selectionRing?.geometry?.dispose();
  object.selectionRing?.material?.dispose();
  object.spawnGlow?.geometry?.dispose();
  object.spawnGlow?.material?.dispose();
  const index = appState.objects.indexOf(object);
  if (index >= 0) {
    appState.objects.splice(index, 1);
  }
  updateObjectCounter();
  updateObjectButtons();
  dom.stagePanel.classList.toggle('has-objects', appState.objects.length > 0);
}

function deleteSelectedObject() {
  if (!appState.selectedObject) {
    showToast('请先点击一个物体。');
    return;
  }
  const deletedName = appState.selectedObject.label;
  removeObject(appState.selectedObject);
  showToast(`已删除选中的${deletedName}。`);
}

function getPointerNdc(event) {
  const rectangle = renderer.domElement.getBoundingClientRect();
  pointerNdc.x = ((event.clientX - rectangle.left) / rectangle.width) * 2 - 1;
  pointerNdc.y = -((event.clientY - rectangle.top) / rectangle.height) * 2 + 1;
  return pointerNdc;
}

function pickObject(event) {
  getPointerNdc(event);
  raycaster.setFromCamera(pointerNdc, camera);
  const roots = appState.objects.map((object) => object.root);
  const intersections = raycaster.intersectObjects(roots, true);
  if (!intersections.length) {
    return null;
  }
  let node = intersections[0].object;
  while (node && !node.userData.objectRecord) {
    node = node.parent;
  }
  if (!node || !node.userData.objectRecord) {
    return null;
  }
  return { object: node.userData.objectRecord, point: intersections[0].point.clone() };
}

function getDragPlanePoint(event) {
  getPointerNdc(event);
  raycaster.setFromCamera(pointerNdc, camera);
  if (raycaster.ray.intersectPlane(dragPlane, dragIntersection)) {
    return dragIntersection.clone();
  }
  return null;
}

function clampDragPosition(point, object) {
  const floorTop = 0.25;
  const safeMargin = object.footprint;
  point.x = THREE.MathUtils.clamp(point.x, -8.3 + safeMargin * 0.08, 8.3 - safeMargin * 0.08);
  point.z = THREE.MathUtils.clamp(point.z, -6.3 + safeMargin * 0.08, 6.3 - safeMargin * 0.08);
  point.y = THREE.MathUtils.clamp(point.y, floorTop + object.maxHalfHeight + 0.02, 9.5);
  return point;
}

function onPointerDown(event) {
  if (!appState.isReady || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) {
    return;
  }
  const picked = pickObject(event);
  if (!picked) {
    setSelectedObject(null);
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  setSelectedObject(picked.object);
  beginDrag(event, picked.object, picked.point);
}

function beginDrag(event, object, pickedPoint) {
  const direction = camera.getWorldDirection(cameraDirection);
  dragPlane.setFromNormalAndCoplanarPoint(direction, object.root.position);
  const offset = new THREE.Vector3().subVectors(object.root.position, pickedPoint);
  const startPoint = getDragPlanePoint(event) || object.root.position.clone();
  const target = clampDragPosition(startPoint.add(offset), object);
  const body = object.body;
  const originalVelocity = new CANNON.Vec3(body.velocity.x, body.velocity.y, body.velocity.z);

  appState.drag = {
    pointerId: event.pointerId,
    object,
    offset,
    target,
    previousTarget: target.clone(),
    lastTime: performance.now(),
    recentPositions: [{ position: target.clone(), time: performance.now() }],
    originalVelocity
  };

  body.wakeUp();
  body.type = CANNON.Body.KINEMATIC;
  body.updateMassProperties();
  body.collisionResponse = true;
  body.velocity.set(0, 0, 0);
  body.angularVelocity.set(0, 0, 0);
  body.position.set(target.x, target.y, target.z);
  object.root.position.copy(target);
  controls.enabled = false;
  dom.sceneHost.classList.add('is-dragging');
  try {
    renderer.domElement.setPointerCapture(event.pointerId);
  } catch {
    // 某些触控浏览器不支持捕获，窗口级指针事件仍会继续接收。
  }
  setStatus('拖动中', true);
}

function onPointerMove(event) {
  if (!appState.drag || event.pointerId !== appState.drag.pointerId) {
    return;
  }
  event.preventDefault();
  const drag = appState.drag;
  const point = getDragPlanePoint(event);
  if (!point) {
    return;
  }
  const nextTarget = clampDragPosition(point.add(drag.offset.clone()), drag.object);
  const now = performance.now();
  const deltaSeconds = Math.max(1 / 240, Math.min(0.08, (now - drag.lastTime) / 1000));
  const velocity = nextTarget.clone().sub(drag.target).multiplyScalar(1 / deltaSeconds);
  const safeVelocity = clampVelocity(velocity, 9);
  drag.object.body.position.set(nextTarget.x, nextTarget.y, nextTarget.z);
  drag.object.body.velocity.set(safeVelocity.x, safeVelocity.y, safeVelocity.z);
  drag.target.copy(nextTarget);
  drag.previousTarget.copy(nextTarget);
  drag.lastTime = now;
  drag.recentPositions.push({ position: nextTarget.clone(), time: now });
  if (drag.recentPositions.length > 6) {
    drag.recentPositions.shift();
  }
}

function clampVelocity(velocity, maximum) {
  const length = velocity.length();
  if (length > maximum && length > 0) {
    velocity.multiplyScalar(maximum / length);
  }
  velocity.y = THREE.MathUtils.clamp(velocity.y, -maximum * 0.7, maximum * 0.7);
  return velocity;
}

function onPointerUp(event) {
  if (!appState.drag || (event && event.pointerId !== appState.drag.pointerId)) {
    return;
  }
  if (event) {
    event.preventDefault();
  }
  finishDrag(event, false);
}

function finishDrag(event, cancelled) {
  const drag = appState.drag;
  if (!drag) {
    return;
  }
  const object = drag.object;
  const body = object.body;
  let releaseVelocity = new THREE.Vector3();
  if (!cancelled && drag.recentPositions.length >= 2) {
    const newest = drag.recentPositions[drag.recentPositions.length - 1];
    const older = drag.recentPositions[Math.max(0, drag.recentPositions.length - 4)];
    const elapsed = Math.max(1 / 120, (newest.time - older.time) / 1000);
    releaseVelocity = newest.position.clone().sub(older.position).multiplyScalar(1 / elapsed);
    releaseVelocity = clampVelocity(releaseVelocity, 7.5);
  }
  if (cancelled) {
    releaseVelocity.set(0, 0, 0);
  }
  body.type = CANNON.Body.DYNAMIC;
  body.mass = object.mass;
  body.updateMassProperties();
  body.position.set(drag.target.x, drag.target.y, drag.target.z);
  body.velocity.set(releaseVelocity.x, releaseVelocity.y, releaseVelocity.z);
  body.angularVelocity.set(0, 0, 0);
  body.collisionResponse = true;
  body.wakeUp();
  if (event) {
    try {
      renderer.domElement.releasePointerCapture(event.pointerId);
    } catch {
      // 浏览器已经自动释放捕获时无需额外处理。
    }
  }
  controls.enabled = true;
  dom.sceneHost.classList.remove('is-dragging');
  appState.drag = null;
  setStatus('物理运行中');
}

function rotateSelected(axis, angle) {
  const object = appState.selectedObject;
  if (!object) {
    showToast('请先点击一个物体。');
    return;
  }
  const body = object.body;
  body.wakeUp();
  body.angularVelocity.set(0, 0, 0);
  const rotation = new CANNON.Quaternion();
  rotation.setFromAxisAngle(new CANNON.Vec3(axis.x, axis.y, axis.z), angle);
  body.quaternion.mult(rotation, body.quaternion);
  body.aabbNeedsUpdate = true;
  object.root.quaternion.copy(body.quaternion);
  showToast(`已将${object.label}${angle > 0 ? '向右' : '向左'}旋转。`, 1300);
}

function flipSelected() {
  const object = appState.selectedObject;
  if (!object) {
    showToast('请先点击一个物体。');
    return;
  }
  const body = object.body;
  body.wakeUp();
  body.angularVelocity.set(0, 0, 0);
  const rotation = new CANNON.Quaternion();
  rotation.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
  body.quaternion.mult(rotation, body.quaternion);
  body.aabbNeedsUpdate = true;
  object.root.quaternion.copy(body.quaternion);
  showToast(`已翻转${object.label}。`, 1300);
}

function handleSelectionAction(action) {
  if (action === 'rotate-left') {
    rotateSelected({ x: 0, y: 1, z: 0 }, -Math.PI / 12);
  } else if (action === 'rotate-right') {
    rotateSelected({ x: 0, y: 1, z: 0 }, Math.PI / 12);
  } else if (action === 'flip') {
    flipSelected();
  } else if (action === 'push') {
    pushSelected();
  } else if (action === 'delete') {
    deleteSelectedObject();
  }
}

function getHorizontalPushDirection() {
  camera.getWorldDirection(cameraDirection);
  cameraDirection.y = 0;
  if (cameraDirection.lengthSq() < 0.001) {
    cameraDirection.set(0, 0, -1);
  } else {
    cameraDirection.normalize();
  }
  return cameraDirection.clone();
}

function pushSelected() {
  if (!appState.selectedObject) {
    showToast('请先点击一个物体。');
    return;
  }
  applyPush(appState.selectedObject);
}

function chooseTowerTarget() {
  if (appState.selectedObject) {
    return appState.selectedObject;
  }
  if (!appState.objects.length) {
    return null;
  }
  return appState.objects.reduce((best, object) => {
    const currentRadius = Math.hypot(object.body.position.x, object.body.position.z);
    const currentScore = currentRadius + Math.max(0, object.body.position.y - 0.8) * 0.14;
    if (!best) {
      return { object, score: currentScore };
    }
    return currentScore < best.score ? { object, score: currentScore } : best;
  }, null)?.object || null;
}

function pushTower() {
  const target = chooseTowerTarget();
  if (!target) {
    showToast('场上还没有可推动的物体。');
    return;
  }
  setSelectedObject(target);
  applyPush(target, true);
}

function applyPush(object, isTowerPush = false) {
  const direction = getHorizontalPushDirection();
  const impulseStrength = isTowerPush ? 10.2 : 7.8;
  const impulse = new CANNON.Vec3(
    direction.x * impulseStrength,
    isTowerPush ? 0.82 : 0.46,
    direction.z * impulseStrength
  );
  const body = object.body;
  body.wakeUp();
  body.velocity.scale(0.45, body.velocity);
  body.angularVelocity.scale(0.45, body.angularVelocity);
  body.applyImpulse(impulse, body.position);
  showImpact(object, direction);
  setStatus(isTowerPush ? '冲击已传入塔身' : '冲击已施加', true);
  window.setTimeout(() => setStatus('物理运行中'), 520);
}

function showImpact(object, direction) {
  if (!dom.impactFx || !dom.sceneHost) {
    return;
  }
  const projected = object.root.position.clone().project(camera);
  const left = (projected.x * 0.5 + 0.5) * dom.sceneHost.clientWidth;
  const top = (-projected.y * 0.5 + 0.5) * dom.sceneHost.clientHeight;
  dom.impactFx.style.left = `${left}px`;
  dom.impactFx.style.top = `${top}px`;
  dom.impactFx.style.setProperty('--impact-angle', `${Math.atan2(direction.x, -direction.z)}rad`);
  dom.impactFx.classList.remove('is-hidden', 'is-playing');
  void dom.impactFx.offsetWidth;
  dom.impactFx.classList.add('is-playing');
  window.clearTimeout(appState.impactTimer);
  appState.impactTimer = window.setTimeout(() => {
    dom.impactFx.classList.add('is-hidden');
  }, 650);
}

function handleKeyboard(event) {
  const targetTag = event.target?.tagName;
  if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'BUTTON') {
    return;
  }
  if (event.key === 'q' || event.key === 'Q') {
    event.preventDefault();
    rotateSelected({ x: 0, y: 1, z: 0 }, -Math.PI / 12);
  } else if (event.key === 'e' || event.key === 'E') {
    event.preventDefault();
    rotateSelected({ x: 0, y: 1, z: 0 }, Math.PI / 12);
  } else if (event.key === 'r' || event.key === 'R') {
    event.preventDefault();
    flipSelected();
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    deleteSelectedObject();
  } else if (event.code === 'Space') {
    event.preventDefault();
    pushSelected();
  }
}

function restartScene() {
  if (!appState.isReady) {
    return;
  }
  if (appState.drag) {
    finishDrag(null, true);
  }
  appState.objects.slice().forEach(removeObject);
  appState.selectedObject = null;
  appState.colorIndex = 0;
  appState.spawnIndex = 0;
  appState.nextObjectId = 1;
  appState.parameters = { ...DEFAULT_PARAMETERS };
  updateParameterDisplay();
  updateContactParameters();
  resetCamera();
  updateObjectCounter();
  updateObjectButtons();
  dom.stagePanel.classList.remove('has-objects');
  closeDrawer();
  dom.sceneToast.classList.add('is-hidden');
  dom.impactFx.classList.add('is-hidden');
  setSelectedObject(null);
  setStatus('场景准备好了');
  showToast('场景已经重新开始。', 1500);
}

function resetCamera() {
  if (!camera || !controls) {
    return;
  }
  camera.position.set(13.8, 10.8, 16.6);
  controls.target.set(0, 1.8, 0);
  controls.update();
}

// ==================== 五、动画与清理 ====================
function syncObjectsToScene(now) {
  for (let index = appState.objects.length - 1; index >= 0; index -= 1) {
    const object = appState.objects[index];
    const body = object.body;
    object.root.position.set(body.position.x, body.position.y, body.position.z);
    object.root.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    if (object.spawnGlow) {
      if (now < object.spawnGlowUntil) {
        const progress = 1 - (object.spawnGlowUntil - now) / 850;
        const scale = 0.82 + progress * 0.76;
        object.spawnGlow.scale.setScalar(scale);
        object.spawnGlow.material.opacity = Math.max(0, 0.65 * (1 - progress));
      } else if (object.spawnGlow.parent) {
        object.spawnGlow.parent.remove(object.spawnGlow);
        object.spawnGlow.geometry.dispose();
        object.spawnGlow.material.dispose();
        object.spawnGlow = null;
      }
    }
    if (body.position.y < -12 || Math.abs(body.position.x) > 22 || Math.abs(body.position.z) > 22) {
      if (appState.selectedObject === object) {
        setSelectedObject(null);
      }
      removeObject(object);
      showToast('有物体飞出实验范围，已自动清理。', 1600);
    }
  }
}

function animate(timestamp) {
  if (!appState.isReady) {
    return;
  }
  window.requestAnimationFrame(animate);
  if (!appState.lastFrameTime) {
    appState.lastFrameTime = timestamp;
  }
  const elapsed = Math.min(0.1, Math.max(0, (timestamp - appState.lastFrameTime) / 1000));
  appState.lastFrameTime = timestamp;
  appState.accumulator += elapsed;

  let stepCount = 0;
  while (appState.accumulator >= FIXED_STEP && stepCount < 4) {
    world.step(FIXED_STEP);
    appState.accumulator -= FIXED_STEP;
    stepCount += 1;
  }
  if (stepCount >= 4) {
    appState.accumulator = 0;
  }

  syncObjectsToScene(timestamp);
  controls.update();
  renderer.render(scene, camera);
}

async function startApplication() {
  collectDom();
  try {
    await loadLibraries();
    checkGraphicsCapability();
    dom.app.classList.remove('is-hidden');
    initializeScene();
    initializePhysicsWorld();
    updateParameterDisplay();
    initializeInteractionEvents();
    updateObjectCounter();
    updateObjectButtons();
    appState.isReady = true;
    dom.loadingOverlay.classList.add('is-hidden');
    setStatus('场景准备好了');
    window.requestAnimationFrame(animate);
  } catch (error) {
    console.error('立体物理乐园初始化失败：', error);
    if (error?.message === 'WEBGL_UNSUPPORTED') {
      showFatalError('当前浏览器无法显示立体画面', '请更新浏览器或开启硬件加速后，再重新加载页面。');
    } else {
      showFatalError('资源加载失败', '请检查网络连接后重新加载页面。固定版本资源暂时没有成功到达浏览器。');
    }
  }
}

startApplication();
