// scene_starryNight.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Module Scope Variables ---
let scene, camera, renderer, controls;
const choiceOrbs = []; // Keep array declaration, but it will remain empty
let starField;
let animationFrameId = null;
let containerElement = null;

// --- Scene Initialization ---
export function initScene(containerId) {
    if (renderer) { cleanupScene(); } // Safeguard

    containerElement = document.getElementById(containerId);
    if (!containerElement) {
        console.error(`[SCENE Starry] Container #${containerId} not found!`); return;
    }

    scene = new THREE.Scene();
    // No fog for starry night? Or maybe a very distant one

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 3, 10); // Adjust camera

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x010105); // Very dark blue/black
    // No shadows needed for this simple scene? renderer.shadowMap.enabled = false;
    containerElement.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.target.set(0, 1, 0); // Lower target
    controls.maxDistance = 30;
    controls.minDistance = 3;
    controls.enablePan = true; // Maybe allow panning
    // controls.maxPolarAngle = Math.PI; // Allow looking up/down more

    // --- Starry Night Specifics ---
    createStarfieldInternal();
    // Add a subtle ambient light
    const ambientLight = new THREE.AmbientLight(0x202030, 0.8);
    scene.add(ambientLight);
     // Add a dim directional light for orbs? (Kept for general scene lighting, not specifically for orbs anymore)
     const dirLight = new THREE.DirectionalLight(0x505080, 0.5);
     dirLight.position.set(5, 10, 7);
     scene.add(dirLight);
    // --- End Starry Night ---

    window.addEventListener('resize', onWindowResizeInternal, false);
    animateInternal();
    console.log("[SCENE Starry] Initialized.");
}

// --- Cleanup Function ---
export function cleanupScene() {
    console.log("[SCENE Starry] Cleaning up...");
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
    choiceOrbs.length = 0; // Clear the (empty) array
    if (controls) controls.dispose(); controls = null;
    if (renderer) {
        renderer.dispose();
         if (renderer.domElement && containerElement) {
            try { containerElement.removeChild(renderer.domElement); } catch (e) { containerElement.innerHTML = '';}
         }
        renderer = null;
    }
    scene = null; camera = null; starField = null; containerElement = null;
    console.log("[SCENE Starry] Cleanup complete.");
}

// --- Internal Functions ---
function createStarfieldInternal() {
    const starCount = 10000;
    const positions = [];
    for (let i = 0; i < starCount; i++) {
        const r = 500 + Math.random() * 1000; // Distance from center
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);

        positions.push(
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta),
            r * Math.cos(phi)
        );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.0,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.8 + Math.random() * 0.2, // Slight variation
        blending: THREE.AdditiveBlending
    });
    starField = new THREE.Points(geometry, material);
    scene.add(starField);
}

function animateInternal() {
    animationFrameId = requestAnimationFrame(animateInternal);
    if (!renderer || !scene || !camera) return;
    controls.update();
    // Rotate starfield slowly?
    if (starField) starField.rotation.y += 0.0001;
    renderer.render(scene, camera);
}

function onWindowResizeInternal() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Exported Orb/Resize Functions (COMMENTED OUT ORB LOGIC) ---
export function updateChoiceOrbsVisuals(choices, correctChoiceText = null, selectedChoiceText = null) {
    /*
    if (!scene || !choices || !Array.isArray(choices)) return;
    const numChoices = choices.length;
    adjustChoiceOrbCountInternal(numChoices); // Ensure orbs

    const angleStep = numChoices > 0 ? (Math.PI * 2) / numChoices : 0;
    const radius = 4; // Slightly smaller radius maybe

    choiceOrbs.forEach((orb, index) => {
         if (!orb) return;
        if (index < numChoices) {
            const angle = angleStep * index - Math.PI / 2;
            // Position orbs lower maybe?
            orb.position.set(Math.cos(angle) * radius, 0.8, Math.sin(angle) * radius);
            orb.userData.choiceText = choices[index].text;

            // Use same coloring logic as campfire, adjust emissive intensity maybe?
            let emissiveColor = 0x3333cc; let baseColor = 0x5555dd; let emissiveIntensity = 1.0;

            if (correctChoiceText !== null) {
                 const currentChoiceText = choices[index].text;
                 if (currentChoiceText === correctChoiceText) {
                     emissiveColor = 0x33cc33; baseColor = 0x77ff77; emissiveIntensity = 1.5;
                 } else if (currentChoiceText === selectedChoiceText) {
                      emissiveColor = 0xcc3333; baseColor = 0xff7777; emissiveIntensity = 1.5;
                 } else {
                      emissiveColor = 0x111133; baseColor = 0x333366; emissiveIntensity = 0.5;
                 }
            }
            orb.material.color.setHex(baseColor);
            orb.material.emissive.setHex(emissiveColor);
            // orb.material.emissiveIntensity = emissiveIntensity; // Need MeshStandardMaterial for this
            orb.visible = true;
        } else {
            orb.visible = false;
        }
    });
    */
}

function adjustChoiceOrbCountInternal(requiredCount) {
     /*
     if (!scene) return;
     while (choiceOrbs.length > requiredCount) {
         const orbToRemove = choiceOrbs.pop();
         if (orbToRemove) scene.remove(orbToRemove);
     }
     // Use MeshStandardMaterial if you want emissiveIntensity control
     const geom = new THREE.SphereGeometry(0.5, 32, 16); // Smaller orbs maybe
     const mat = new THREE.MeshStandardMaterial({
         color: 0x5555dd, emissive: 0x3333cc, roughness: 0.6, metalness: 0.1, emissiveIntensity: 1.0
     });
     while (choiceOrbs.length < requiredCount) {
         const orb = new THREE.Mesh(geom, mat.clone());
         orb.visible = false; // orb.castShadow = false; // No shadows maybe
         scene.add(orb);
         choiceOrbs.push(orb);
     }
     */
}

export function hideAllChoiceOrbs() {
    // choiceOrbs.forEach(orb => { if (orb) orb.visible = false; });
}

export function resizeScene() {
    onWindowResizeInternal();
}