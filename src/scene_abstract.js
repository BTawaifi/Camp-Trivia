// scene_abstract.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Module Scope Variables ---
let scene, camera, renderer, controls;
const animatedShapes = []; // For animation
let animationFrameId = null;
let containerElement = null;

// --- Scene Initialization ---
export function initScene(containerId) {
    if (renderer) { cleanupScene(); }

    containerElement = document.getElementById(containerId);
    if (!containerElement) {
        console.error(`[SCENE Abstract] Container #${containerId} not found!`); return;
    }

    scene = new THREE.Scene();
    // No fog

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 12);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x222233); // Dark blue/purple background
    // No shadows needed? renderer.shadowMap.enabled = false;
    containerElement.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.target.set(0, 1, 0); // Look slightly up
    controls.maxDistance = 40;
    controls.minDistance = 3;
    controls.enablePan = true;

    // --- Abstract Specifics ---
    createAbstractShapesInternal();
    // --- End Abstract ---

    window.addEventListener('resize', onWindowResizeInternal, false);
    animateInternal();
    console.log("[SCENE Abstract] Initialized.");
}

// --- Cleanup Function ---
export function cleanupScene() {
    console.log("[SCENE Abstract] Cleaning up...");
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
    animatedShapes.length = 0; // Clear shapes array
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
    console.log("[SCENE Abstract] Cleanup complete.");
}

// --- Internal Functions ---
function createAbstractShapesInternal() {
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x606080, 0.8); // Cool ambient
    scene.add(ambientLight);
    const light1 = new THREE.PointLight(0xffaaaa, 0.7, 50);
    light1.position.set(8, 10, 5);
    scene.add(light1);
    const light2 = new THREE.PointLight(0xaaaaff, 0.7, 50);
    light2.position.set(-8, -5, -5);
    scene.add(light2);

    // Shapes
    const geometries = [
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.SphereGeometry(1.5, 32, 16),
        new THREE.IcosahedronGeometry(1.8, 0),
        new THREE.TorusKnotGeometry(1.5, 0.4, 100, 16),
        new THREE.ConeGeometry(1.5, 3, 32),
        new THREE.TorusGeometry(1.7, 0.6, 16, 100),
    ];

    const materials = [
        new THREE.MeshStandardMaterial({ color: 0x8e44ad, roughness: 0.4, metalness: 0.1 }), // Purple
        new THREE.MeshStandardMaterial({ color: 0x2980b9, roughness: 0.6, metalness: 0.1 }), // Blue
        new THREE.MeshStandardMaterial({ color: 0xf39c12, roughness: 0.5, metalness: 0.1 }), // Orange
        new THREE.MeshStandardMaterial({ color: 0x1abc9c, roughness: 0.7, metalness: 0.1 }), // Turquoise
        new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.8, metalness: 0.1 }), // Red
        new THREE.MeshStandardMaterial({ color: 0xbdc3c7, roughness: 0.2, metalness: 0.5 }), // Silver
    ];

    for (let i = 0; i < 15; i++) { // Create 15 random shapes
        const geometry = geometries[Math.floor(Math.random() * geometries.length)];
        const material = materials[Math.floor(Math.random() * materials.length)];
        const shape = new THREE.Mesh(geometry, material);

        shape.position.set(
            (Math.random() - 0.5) * 25,
            (Math.random() - 0.5) * 15 + 1, // Bias slightly upwards
            (Math.random() - 0.5) * 15 - 5 // Bias slightly further back
        );
        shape.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );
        const scale = Math.random() * 0.5 + 0.5;
        shape.scale.set(scale, scale, scale);

        scene.add(shape);
        // Add random rotation speeds for animation
        shape.userData.rotationSpeed = new THREE.Vector3(
            (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.01,
            (Math.random() - 0.5) * 0.01
        );
        animatedShapes.push(shape);
    }
}

function animateInternal() {
    animationFrameId = requestAnimationFrame(animateInternal);
    if (!renderer || !scene || !camera) return;
    controls.update();

    // Animate shapes
    const delta = 0.01; // Or use a clock for smoother animation
    animatedShapes.forEach(shape => {
        if (shape.userData.rotationSpeed) {
            shape.rotation.x += shape.userData.rotationSpeed.x;
            shape.rotation.y += shape.userData.rotationSpeed.y;
            shape.rotation.z += shape.userData.rotationSpeed.z;
        }
    });

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