// scene_galilee.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Water } from 'three/addons/objects/Water2.js'; // Optional: Use Water2 for better effect

let scene, camera, renderer, controls;
let water, simpleBoat;
let clock = new THREE.Clock();
let animationFrameId = null;
let containerElement = null;
let sunLight; // Make light accessible for animation


export function initScene(containerId) {
    if (renderer) cleanupScene();

    containerElement = document.getElementById(containerId);
    if (!containerElement) {
        console.error(`[SCENE Galilee] Container #${containerId} not found!`); return;
    }

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 5, 15); // Slightly elevated view

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x87CEEB); // Sky Blue
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Better lighting/color
    // Shadows optional for water scene
    // renderer.shadowMap.enabled = true;
    containerElement.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1, 0); // Look towards water level
    controls.maxDistance = 60;
    controls.minDistance = 3;
    controls.maxPolarAngle = Math.PI * 0.55; // Allow looking down slightly more

    createGalileeEnvironmentInternal();

    window.addEventListener('resize', onWindowResizeInternal, false);
    animateInternal();
    console.log("[SCENE Galilee] Initialized.");
}

export function cleanupScene() {
    console.log("[SCENE Galilee] Cleaning up...");
    if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
    window.removeEventListener('resize', onWindowResizeInternal, false);
    if (scene) {
        scene.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                 // Specific cleanup for Water2 material textures if used
                if (object.material.normalMap) object.material.normalMap.dispose();
                if (object.material.envMap) object.material.envMap.dispose();

                if (Array.isArray(object.material)) object.material.forEach(m => m.dispose());
                else object.material.dispose();
            }
        });
         while(scene.children.length > 0) scene.remove(scene.children[0]);
    }
    water = null; simpleBoat = null; sunLight = null; clock = new THREE.Clock(); // Reset clock
    if (controls) controls.dispose(); controls = null;
    if (renderer) {
        renderer.dispose();
         if (renderer.domElement && containerElement) {
            try { containerElement.removeChild(renderer.domElement); } catch (e) { containerElement.innerHTML = '';}
         }
        renderer = null;
    }
    scene = null; camera = null; containerElement = null;
    console.log("[SCENE Galilee] Cleanup complete.");
}


function createGalileeEnvironmentInternal() {
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xccccff, 0.6);
    scene.add(ambientLight);

    sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(30, 30, 20);
    // sunLight.castShadow = true; // Optional shadows
    scene.add(sunLight);

    // Simple Water (Plane) - Can be replaced with Water2
    const waterGeometry = new THREE.PlaneGeometry(1000, 1000, 32, 32); // Larger plane, more segments
    const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x4682B4, // SteelBlue
        roughness: 0.1,
        metalness: 0.2,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        // Add displacement for wave effect
        onBeforeCompile: shader => {
             shader.uniforms.time = { value: 0 };
             shader.vertexShader = 'uniform float time;\n' + shader.vertexShader;
             shader.vertexShader = shader.vertexShader.replace(
                 '#include <begin_vertex>',
                 `#include <begin_vertex>
                 float waveX = sin(position.x * 0.1 + time * 0.5) * 0.15;
                 float waveZ = cos(position.z * 0.15 + time * 0.3) * 0.1;
                 transformed.y += waveX + waveZ;
                 `
             );
             waterMaterial.userData.shader = shader; // Store shader for animation
        }
    });

    water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0;
    // water.receiveShadow = true; // Optional
    scene.add(water);

    /*
    // --- Optional: Using Water2 for better effect ---
    // Need to import Water from 'three/addons/objects/Water2.js'
     const waterGeometry2 = new THREE.PlaneGeometry(1000, 1000);
     water = new Water(waterGeometry2, {
         color: 0x77ccff, // Lighter blue
         scale: 4,
         flowDirection: new THREE.Vector2(0.5, 0.5),
         textureWidth: 512,
         textureHeight: 512,
         // normalMap0: // requires texture loading
         // normalMap1: // requires texture loading
     });
     water.rotation.x = -Math.PI / 2;
     water.position.y = 0;
     scene.add(water);
    // ---------------------------------------------
    */


    // Simple Boat Representation
    simpleBoat = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.7 });
    const hullGeom = new THREE.BoxGeometry(5, 1, 2); // Simple box hull
    const hullMesh = new THREE.Mesh(hullGeom, hullMat);
    hullMesh.position.y = 0.5; // Slightly above water
    simpleBoat.add(hullMesh);

    const mastGeom = new THREE.CylinderGeometry(0.1, 0.1, 5, 8);
    const mastMesh = new THREE.Mesh(mastGeom, hullMat);
    mastMesh.position.y = 3; // On top of hull
    simpleBoat.add(mastMesh);

    simpleBoat.position.set(-5, 0, -5); // Place boat somewhere
    simpleBoat.rotation.y = Math.PI / 4;
    scene.add(simpleBoat);

    // Distant Shore/Hills (very simple)
    const hillGeom = new THREE.ConeGeometry(50, 15, 16);
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x90aa80, roughness: 0.9 }); // Muted green/brown
    const hill1 = new THREE.Mesh(hillGeom, hillMat);
    hill1.position.set(-60, 7, -50);
    scene.add(hill1);
    const hill2 = new THREE.Mesh(hillGeom, hillMat);
    hill2.position.set(70, 6, -60);
    hill2.scale.set(1.2, 0.8, 1.0);
    scene.add(hill2);

}


function animateInternal() {
    animationFrameId = requestAnimationFrame(animateInternal);
    if (!renderer || !scene || !camera) return;
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    controls.update();

    // Animate water (simple plane version)
    if (water && water.material.userData.shader) {
        water.material.userData.shader.uniforms.time.value = elapsedTime;
    }
    // For Water2, animation is often handled internally or via uniforms updated here

    // Simple boat bobbing
    if (simpleBoat) {
        simpleBoat.position.y = Math.sin(elapsedTime * 0.7) * 0.1;
        simpleBoat.rotation.z = Math.sin(elapsedTime * 0.5) * 0.02;
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