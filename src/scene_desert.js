// scene_desert.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Module Scope Variables ---
let scene, camera, renderer, controls;
const palms = [];
let animationFrameId = null;
let containerElement = null;

// --- Scene Initialization ---
export function initScene(containerId) {
    if (renderer) { cleanupScene(); }

    containerElement = document.getElementById(containerId);
    if (!containerElement) {
        console.error(`[SCENE Desert] Container #${containerId} not found!`); return;
    }

    scene = new THREE.Scene();
    // Maybe very light distance fog?
    // scene.fog = new THREE.Fog(0xF0EAD6, 30, 80); // Light sandy fog

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 6, 16); // Positioned for oasis view

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0xADD8E6); // Light blue sky
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerElement.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.target.set(0, 1, 0); // Look towards oasis center
    controls.maxDistance = 50;
    controls.minDistance = 5;
    controls.enablePan = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;

    // --- Desert Specifics ---
    createDesertEnvironmentInternal();
    // --- End Desert ---

    window.addEventListener('resize', onWindowResizeInternal, false);
    animateInternal();
    console.log("[SCENE Desert] Initialized.");
}

// --- Cleanup Function ---
export function cleanupScene() {
    console.log("[SCENE Desert] Cleaning up...");
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
    palms.length = 0; // Clear palms array
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
    console.log("[SCENE Desert] Cleanup complete.");
}

// --- Internal Functions ---
function createDesertEnvironmentInternal() {
    // Ground (Sand Dunes - basic plane for now)
    const groundGeometry = new THREE.PlaneGeometry(150, 150); // Larger ground
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xEAC086, roughness: 0.9, metalness: 0.05 }); // Sandy color
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Oasis Pool
    const waterGeometry = new THREE.CircleGeometry(4, 32); // Circle for pool
    const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x4682B4, // SteelBlue
        roughness: 0.1,
        metalness: 0.0,
        transparent: true,
        opacity: 0.85
    });
    const water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.05; // Slightly above ground to avoid z-fighting
    water.receiveShadow = true; // Can receive shadows (e.g., from palms)
    scene.add(water);

    // Palm Trees (Simple)
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 }); // SaddleBrown
    const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.7 }); // ForestGreen

    const createPalmTree = (x, z) => {
        const palm = new THREE.Group();
        const trunkHeight = Math.random() * 4 + 5;
        const trunkRadius = 0.3;
        const trunkGeom = new THREE.CylinderGeometry(trunkRadius * 0.8, trunkRadius, trunkHeight, 8);
        const trunkMesh = new THREE.Mesh(trunkGeom, trunkMaterial);
        trunkMesh.position.y = trunkHeight / 2;
        trunkMesh.castShadow = true;
        palm.add(trunkMesh);

        // Leaves (simplified as a sphere/cone)
        const leavesGeom = new THREE.IcosahedronGeometry(1.5 + Math.random() * 0.5, 0); // More leafy shape
        const leavesMesh = new THREE.Mesh(leavesGeom, leavesMaterial);
        leavesMesh.scale.y = 0.6; // Flatten it slightly
        leavesMesh.position.y = trunkHeight; // Position leaves at the top
        leavesMesh.castShadow = true;
        palm.add(leavesMesh);

        palm.position.set(x, 0, z);
        const scale = Math.random() * 0.3 + 0.9;
        palm.scale.set(scale, scale, scale);

        scene.add(palm);
        palms.push(palm);
    };

    // Place palms around the oasis
    const oasisRadius = 4.5;
    for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2 + (Math.random() - 0.5) * 0.5; // Spread them out + randomness
        const radius = oasisRadius + Math.random() * 1.5;
        createPalmTree(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }

    // Lighting (Harsh Sun)
    const ambientLight = new THREE.AmbientLight(0xAAAA88, 0.5); // Warm ambient
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xFFFFE0, 1.3); // Bright Yellowish sun
    sunLight.position.set(-20, 30, -15); // Angled sun
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 70;
    sunLight.shadow.camera.left = -40;
    sunLight.shadow.camera.right = 40;
    sunLight.shadow.camera.top = 40;
    sunLight.shadow.camera.bottom = -40;
    scene.add(sunLight);
    scene.add(sunLight.target); // Important for positioning shadow camera correctly
    sunLight.target.position.set(0, 0, 0); // Target the origin (oasis center)

    // Optional: Light Helpers
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