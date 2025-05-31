// scene_bush.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let bush, fireParticles, fireLight;
let animationFrameId = null;
let containerElement = null;

export function initScene(containerId) {
    if (renderer) cleanupScene();

    containerElement = document.getElementById(containerId);
    if (!containerElement) {
        console.error(`[SCENE Bush] Container #${containerId} not found!`); return;
    }

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x1a1a2a, 5, 35); // Dark blue/purple fog (night/dusk)

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 10); // Closer view

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x080810); // Very dark background
    renderer.shadowMap.enabled = true; // Shadows from the bush light
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerElement.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 1.5, 0); // Target the bush height
    controls.maxDistance = 30;
    controls.minDistance = 2;
    controls.maxPolarAngle = Math.PI * 0.6;
    controls.minPolarAngle = Math.PI * 0.1;


    createBushEnvironmentInternal();

    window.addEventListener('resize', onWindowResizeInternal, false);
    animateInternal();
    console.log("[SCENE Bush] Initialized.");
}

export function cleanupScene() {
    console.log("[SCENE Bush] Cleaning up...");
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
    bush = null; fireParticles = null; fireLight = null;
    if (controls) controls.dispose(); controls = null;
    if (renderer) {
        renderer.dispose();
         if (renderer.domElement && containerElement) {
            try { containerElement.removeChild(renderer.domElement); } catch (e) { containerElement.innerHTML = '';}
         }
        renderer = null;
    }
    scene = null; camera = null; containerElement = null;
    console.log("[SCENE Bush] Cleanup complete.");
}


function createBushEnvironmentInternal() {
    // Ground (Simple rocky)
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.9 }); // Dark grey rock
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // The Bush (Simple Representation)
    const bushMaterial = new THREE.MeshStandardMaterial({
        color: 0x228B22, // ForestGreen
        roughness: 0.8
    });
    // Use a group and multiple spheres for a bushier look
    bush = new THREE.Group();
    const mainSphereGeom = new THREE.SphereGeometry(1.2, 16, 12);
    const mainSphere = new THREE.Mesh(mainSphereGeom, bushMaterial);
    mainSphere.castShadow = true;
    bush.add(mainSphere);
    for(let i = 0; i < 5; i++) {
        const smallSphereGeom = new THREE.SphereGeometry(0.5 + Math.random()*0.3, 8, 6);
        const smallSphere = new THREE.Mesh(smallSphereGeom, bushMaterial);
        smallSphere.position.set(
            (Math.random() - 0.5) * 1.5,
            (Math.random() - 0.5) * 1.0,
            (Math.random() - 0.5) * 1.5
        );
        smallSphere.castShadow = true;
        bush.add(smallSphere);
    }
    bush.position.y = 1.2; // Elevate bush slightly
    scene.add(bush);


     // Fire Particle System
     const particleCount = 150;
     const positions = [];
     const velocities = [];
     for (let i = 0; i < particleCount; i++) {
         // Start near the bush center
         positions.push(
            (Math.random() - 0.5) * 1.0,
            (Math.random() - 0.5) * 1.0,
            (Math.random() - 0.5) * 1.0
         );
         // Upward velocity
         velocities.push(
             (Math.random() - 0.5) * 0.01,
             Math.random() * 0.03 + 0.03, // Biased upwards
             (Math.random() - 0.5) * 0.01
         );
     }
     const geometry = new THREE.BufferGeometry();
     geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
     geometry.setAttribute('velocity', new THREE.Float32BufferAttribute(velocities, 3));
     const material = new THREE.PointsMaterial({
         color: 0xffaa33,
         size: 0.2,
         blending: THREE.AdditiveBlending,
         transparent: true,
         depthWrite: false, // Render correctly with additive blending
         sizeAttenuation: true,
         opacity: 0.8
     });
     fireParticles = new THREE.Points(geometry, material);
     fireParticles.position.copy(bush.position); // Position particles at bush center
     scene.add(fireParticles);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x202030, 0.4); // Very dim ambient
    scene.add(ambientLight);

    // Light emanating from the bush
    fireLight = new THREE.PointLight(0xff8800, 2.5, 15, 1.8); // Orange light
    fireLight.position.copy(bush.position); // Position light at bush center
    fireLight.castShadow = true;
    fireLight.shadow.mapSize.width = 512; // Lower res shadow map okay for this
    fireLight.shadow.mapSize.height = 512;
    fireLight.shadow.camera.near = 0.5;
    fireLight.shadow.camera.far = 20;
    scene.add(fireLight);

}

function animateInternal() {
    animationFrameId = requestAnimationFrame(animateInternal);
    if (!renderer || !scene || !camera) return;
    controls.update();

    // Animate Fire Particles
     if (fireParticles && fireParticles.geometry.attributes.position) {
         const positions = fireParticles.geometry.attributes.position.array;
         const velocities = fireParticles.geometry.attributes.velocity.array;
         const count = positions.length / 3;
         for (let i = 0; i < count; i++) {
             const i3 = i * 3;
             positions[i3] += velocities[i3];
             positions[i3 + 1] += velocities[i3 + 1];
             positions[i3 + 2] += velocities[i3 + 2];

             velocities[i3 + 1] += 0.0001; // Slight upward acceleration? Or keep constant rise
             velocities[i3] *= 0.98; // Dampen horizontal movement
             velocities[i3 + 2] *= 0.98;

             // Reset particles that go too far/high
             if (positions[i3 + 1] > 3.0 || Math.abs(positions[i3]) > 2.0 || Math.abs(positions[i3+2]) > 2.0) {
                 positions[i3] = (Math.random() - 0.5) * 0.5; // Reset near center
                 positions[i3 + 1] = (Math.random() - 0.5) * 0.5;
                 positions[i3 + 2] = (Math.random() - 0.5) * 0.5;
                 velocities[i3] = (Math.random() - 0.5) * 0.01;
                 velocities[i3 + 1] = Math.random() * 0.03 + 0.03; // Reset velocity
                 velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;
             }
         }
         fireParticles.geometry.attributes.position.needsUpdate = true;

         // Flicker particle size/opacity slightly?
         fireParticles.material.size = 0.15 + Math.sin(Date.now() * 0.01) * 0.05;
     }

     // Flicker fire light
     if (fireLight) {
         fireLight.intensity = 2.0 + Math.sin(Date.now() * 0.008) * 0.5 + Math.random() * 0.3;
         fireLight.color.setHSL(0.08 + Math.random() * 0.02, 1.0, 0.5 + Math.random() * 0.1); // Shift color slightly orange/yellow
     }

    renderer.render(scene, camera);
}

function onWindowResizeInternal() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Exported Placeholders ---
export function updateChoiceOrbsVisuals(choices, correctChoiceText = null, selectedChoiceText = null) { }
export function hideAllChoiceOrbs() { }
export function resizeScene() { onWindowResizeInternal(); }