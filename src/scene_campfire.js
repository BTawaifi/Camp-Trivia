// scene_campfire.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Module Scope Variables ---
let scene, camera, renderer, controls;
let particleSystem;
const choiceOrbs = []; // Keep array declaration, but it will remain empty
let fireLight;
let animationFrameId = null; // To store the requestAnimationFrame ID
let containerElement = null; // Store container for cleanup

// --- Scene Initialization ---
export function initScene(containerId) {
    // --- Cleanup potential previous instance ---
    // Although cleanupScene should be called first, this is a safeguard
    if (renderer) {
        console.warn("[SCENE Campfire] Re-initializing without proper cleanup? Attempting cleanup first.");
        cleanupScene();
    }
    // --- End Cleanup ---

    containerElement = document.getElementById(containerId);
    if (!containerElement) {
        console.error(`[SCENE Campfire] Container #${containerId} not found!`);
        return;
    }

    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000010, 10, 50);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 15);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); // Alpha false might be better for opaque background
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000010); // Campfire night color
    renderer.shadowMap.enabled = true;
    containerElement.appendChild(renderer.domElement); // Use stored element

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 2, 0);
    controls.maxDistance = 40;
    controls.minDistance = 5;
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;

    // Environment
    createEnvironmentInternal();
    createParticlesInternal();

    // Add resize listener specific to this scene instance
    window.addEventListener('resize', onWindowResizeInternal, false);

    // Start animation loop
    animateInternal();

    console.log("[SCENE Campfire] Initialized.");
}

// --- Cleanup Function (NEW) ---
export function cleanupScene() {
    console.log("[SCENE Campfire] Cleaning up...");
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    window.removeEventListener('resize', onWindowResizeInternal, false);

    // Dispose of Three.js objects
    if (scene) {
        // Traverse scene and dispose geometries, materials, textures
        scene.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
            // Textures need specific disposal if loaded
        });
        // Remove all children
        while(scene.children.length > 0){
            scene.remove(scene.children[0]);
        }
    }
    choiceOrbs.length = 0; // Clear orbs array


    if (controls) {
        controls.dispose();
        controls = null;
    }

    if (renderer) {
        renderer.dispose(); // Dispose WebGL context
        if (renderer.domElement && containerElement) {
             try { // Add try-catch for safety during rapid switching
                 containerElement.removeChild(renderer.domElement);
             } catch (e) {
                 console.warn("[SCENE Campfire] Error removing renderer DOM element:", e);
                 // Fallback: Clear container HTML just in case
                 containerElement.innerHTML = '';
             }
        }
        renderer = null;
    }

    // Nullify references
    scene = null;
    camera = null;
    particleSystem = null;
    fireLight = null;
    containerElement = null; // Clear container ref

    console.log("[SCENE Campfire] Cleanup complete.");
}


// --- Internal Functions (createEnvironmentInternal, createParticlesInternal, animateInternal, onWindowResizeInternal) ---
// (Keep these functions as they were in the original scene.js)
function createEnvironmentInternal() {
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x332211, roughness: 0.8, metalness: 0.2 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

    // Stones
    const stoneGeometry = new THREE.DodecahedronGeometry(0.5, 0);
    const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
    for (let i = 0; i < 15; i++) {
        const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
        const angle = Math.random() * Math.PI * 2, radius = 1.5 + Math.random() * 0.5;
        stone.position.set(Math.cos(angle) * radius, 0.2, Math.sin(angle) * radius);
        stone.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
        stone.scale.setScalar(Math.random()*0.5+0.7);
        stone.castShadow=true; stone.receiveShadow=true; scene.add(stone);
    }

    // Fire Light
    fireLight = new THREE.PointLight(0xffaa33, 2, 30, 1.5); // Assign to module-scope variable
    fireLight.position.set(0, 1.5, 0); fireLight.castShadow = true; scene.add(fireLight);

    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0x404088, 0.5); scene.add(ambientLight);
}

function createParticlesInternal() {
    const particleCount = 200, particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3), velocities = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 1.5; positions[i3 + 1] = Math.random() * 0.5 + 0.2; positions[i3 + 2] = (Math.random() - 0.5) * 1.5;
        velocities[i3] = (Math.random() - 0.5) * 0.01; velocities[i3 + 1] = Math.random() * 0.03 + 0.02; velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;
    }
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    const particleMaterial = new THREE.PointsMaterial({ color: 0xffaa33, size: 0.15, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, sizeAttenuation: true });
    particleSystem = new THREE.Points(particles, particleMaterial); particleSystem.position.y = 0.5; scene.add(particleSystem);
}

function animateInternal() {
    animationFrameId = requestAnimationFrame(animateInternal); // Store the ID
    if (!renderer || !scene || !camera) return;

    controls.update();

     // Particle Animation
     if (particleSystem && particleSystem.geometry.attributes.position) { // Add checks
         const positions = particleSystem.geometry.attributes.position.array;
         const velocities = particleSystem.geometry.attributes.velocity.array;
         const count = positions.length / 3;
         for (let i = 0; i < count; i++) {
             const i3 = i * 3;
             positions[i3] += velocities[i3]; positions[i3 + 1] += velocities[i3 + 1]; positions[i3 + 2] += velocities[i3 + 2];
             velocities[i3 + 1] -= 0.0005; // Gravity
             if (positions[i3 + 1] < 0.1 || positions[i3 + 1] > 6) { // Reset condition
                 positions[i3] = (Math.random() - 0.5) * 1.5; positions[i3 + 1] = Math.random() * 0.5 + 0.2; positions[i3 + 2] = (Math.random() - 0.5) * 1.5;
                 velocities[i3] = (Math.random() - 0.5) * 0.01; velocities[i3 + 1] = Math.random() * 0.03 + 0.02; velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;
             }
         }
         particleSystem.geometry.attributes.position.needsUpdate = true;
     }

     // Fire Light Flickering
     if (fireLight) {
         fireLight.intensity = 1.8 + Math.sin(Date.now() * 0.005) * 0.3 + Math.random() * 0.2;
         fireLight.position.y = 1.5 + Math.sin(Date.now() * 0.003) * 0.1;
     }

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
     if (!scene || !choices || !Array.isArray(choices)) return; // Add scene check

     const numChoices = choices.length;
     adjustChoiceOrbCountInternal(numChoices); // Ensure enough orbs exist first

     const angleStep = numChoices > 0 ? (Math.PI * 2) / numChoices : 0;
     const radius = 5;

     choiceOrbs.forEach((orb, index) => {
         if (!orb) return; // Safety check
         if (index < numChoices) {
             const angle = angleStep * index - Math.PI / 2;
             orb.position.set(Math.cos(angle) * radius, 1.5, Math.sin(angle) * radius);
             orb.userData.choiceText = choices[index].text;

             // Default state (presenting)
             let emissiveColor = 0x3333cc; let baseColor = 0x6666ff;

             if (correctChoiceText !== null) { // Results phase
                  const currentChoiceText = choices[index].text;
                  if (currentChoiceText === correctChoiceText) {
                      emissiveColor = 0x33cc33; baseColor = 0x99ff99;
                  } else if (currentChoiceText === selectedChoiceText) {
                       emissiveColor = 0xcc3333; baseColor = 0xff9999;
                  } else {
                       emissiveColor = 0x111133; baseColor = 0x444488;
                  }
             }
             orb.material.emissive.setHex(emissiveColor);
             orb.material.color.setHex(baseColor);
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
     // Remove excess orbs
     while (choiceOrbs.length > requiredCount) {
         const orbToRemove = choiceOrbs.pop();
         if (orbToRemove) scene.remove(orbToRemove);
         // Consider disposing geometry/material if unique
     }

     // Add needed orbs
     const geom = new THREE.SphereGeometry(0.6, 32, 16);
     const mat = new THREE.MeshStandardMaterial({ color: 0x6666ff, emissive: 0x3333cc, roughness: 0.5, metalness: 0.1 });

     while (choiceOrbs.length < requiredCount) {
         const orb = new THREE.Mesh(geom, mat.clone());
         orb.visible = false; orb.castShadow = true;
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