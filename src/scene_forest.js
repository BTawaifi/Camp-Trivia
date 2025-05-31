// scene_forest.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Module Scope Variables ---
let scene, camera, renderer, controls;
const trees = []; // Keep track of trees for potential animation/cleanup
let animationFrameId = null;
let containerElement = null;

// --- Scene Initialization ---
export function initScene(containerId) {
    if (renderer) { cleanupScene(); }

    containerElement = document.getElementById(containerId);
    if (!containerElement) {
        console.error(`[SCENE Forest] Container #${containerId} not found!`); return;
    }

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x3a5a3a, 8, 45); // Greenish fog

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 7, 18); // Positioned slightly higher

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x253825); // Dark green background
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerElement.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 1.5, 0); // Look towards the ground center
    controls.maxDistance = 50;
    controls.minDistance = 4;
    controls.enablePan = true; // Allow panning
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Limit looking straight down

    // --- Forest Specifics ---
    createForestEnvironmentInternal();
    // --- End Forest ---

    window.addEventListener('resize', onWindowResizeInternal, false);
    animateInternal();
    console.log("[SCENE Forest] Initialized.");
}

// --- Cleanup Function ---
export function cleanupScene() {
    console.log("[SCENE Forest] Cleaning up...");
    if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
    window.removeEventListener('resize', onWindowResizeInternal, false);
    if (scene) {
        scene.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) object.material.forEach(m => m.dispose());
                else object.material.dispose();
            }
        });
         while(scene.children.length > 0) scene.remove(scene.children[0]);
    }
    trees.length = 0; // Clear trees array
    // choiceOrbs are already handled (empty)
    if (controls) controls.dispose(); controls = null;
    if (renderer) {
        renderer.dispose();
         if (renderer.domElement && containerElement) {
            try { containerElement.removeChild(renderer.domElement); } catch (e) { containerElement.innerHTML = '';}
         }
        renderer = null;
    }
    scene = null; camera = null; containerElement = null;
    console.log("[SCENE Forest] Cleanup complete.");
}

// --- Internal Functions ---
function createForestEnvironmentInternal() {
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x386638, roughness: 0.9, metalness: 0.1 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Trees (Simple Cones and Cylinders)
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.8 }); // Brown
    const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x2E7D32, roughness: 0.7 }); // Dark Green

    const createTree = (x, z) => {
        const tree = new THREE.Group();
        const trunkHeight = Math.random() * 3 + 4;
        const trunkRadius = Math.random() * 0.3 + 0.4;
        const trunkGeom = new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, 8);
        const trunkMesh = new THREE.Mesh(trunkGeom, trunkMaterial);
        trunkMesh.position.y = trunkHeight / 2;
        trunkMesh.castShadow = true;
        tree.add(trunkMesh);

        const leavesHeight = trunkHeight * (Math.random() * 0.5 + 1.2);
        const leavesRadius = trunkRadius * (Math.random() * 2 + 3);
        const leavesGeom = new THREE.ConeGeometry(leavesRadius, leavesHeight, 12);
        const leavesMesh = new THREE.Mesh(leavesGeom, leavesMaterial);
        leavesMesh.position.y = trunkHeight + leavesHeight * 0.4; // Position leaves above trunk
        leavesMesh.castShadow = true;
        tree.add(leavesMesh);

        tree.position.set(x, 0, z);
        tree.rotation.y = Math.random() * Math.PI * 2;
        const scale = Math.random() * 0.4 + 0.8;
        tree.scale.set(scale, scale, scale);

        scene.add(tree);
        trees.push(tree);
    };

    // Scatter trees
    for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 8 + Math.random() * 25; // Scatter further out
        createTree(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x608060, 0.7); // Soft green ambient
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffe0, 1.0); // Yellowish sun
    sunLight.position.set(15, 25, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -30;
    scene.add(sunLight);
     // Optional: Add helper to visualize light
     // const helper = new THREE.DirectionalLightHelper( sunLight, 5 ); scene.add( helper );
     // const shadowHelper = new THREE.CameraHelper( sunLight.shadow.camera ); scene.add( shadowHelper );
}

function animateInternal() {
    animationFrameId = requestAnimationFrame(animateInternal);
    if (!renderer || !scene || !camera) return;
    controls.update();
    renderer.render(scene, camera);
}

function onWindowResizeInternal() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Exported Orb/Resize Functions (Placeholders) ---
export function updateChoiceOrbsVisuals(choices, correctChoiceText = null, selectedChoiceText = null) {
    // Orb logic is removed/commented out
}
export function hideAllChoiceOrbs() {
    // Orb logic is removed/commented out
}
export function resizeScene() {
    onWindowResizeInternal();
}