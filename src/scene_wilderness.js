// scene_wilderness.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
const rocks = [];
let animationFrameId = null;
let containerElement = null;

export function initScene(containerId) {
    if (renderer) cleanupScene();

    containerElement = document.getElementById(containerId);
    if (!containerElement) {
        console.error(`[SCENE Wilderness] Container #${containerId} not found!`); return;
    }

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xd8c8b8, 20, 70); // Sandy/Haze fog

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 4, 15); // Low viewpoint

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0xf0e0d0); // Pale, hazy sky
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows look good in sand
    containerElement.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 1, 0);
    controls.maxDistance = 50;
    controls.minDistance = 2;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;

    createWildernessEnvironmentInternal();

    window.addEventListener('resize', onWindowResizeInternal, false);
    animateInternal();
    console.log("[SCENE Wilderness] Initialized.");
}

export function cleanupScene() {
    console.log("[SCENE Wilderness] Cleaning up...");
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
    rocks.length = 0;
    if (controls) controls.dispose(); controls = null;
    if (renderer) {
        renderer.dispose();
         if (renderer.domElement && containerElement) {
            try { containerElement.removeChild(renderer.domElement); } catch (e) { containerElement.innerHTML = '';}
         }
        renderer = null;
    }
    scene = null; camera = null; containerElement = null;
    console.log("[SCENE Wilderness] Cleanup complete.");
}


function createWildernessEnvironmentInternal() {
    // Ground (Sandy/Rocky Plane)
    const groundGeometry = new THREE.PlaneGeometry(120, 120, 20, 20); // More segments for potential displacement
     // Simple vertex displacement for uneven ground
     const pos = groundGeometry.attributes.position;
     for (let i = 0; i < pos.count; i++){
         const noise = (Math.random() - 0.5) * 0.5; // Gentle undulation
         pos.setY(i, pos.getY(i) + noise);
     }
     groundGeometry.computeVertexNormals();

    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xc2b280, roughness: 0.9 }); // Sandy color
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Scattered Rocks (More angular?)
    const rockGeometry = new THREE.IcosahedronGeometry(1, 0); // More facets than Dodecahedron
    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.85, flatShading: false }); // Greyer rocks
     for (let i = 0; i < 50; i++) { // More rocks, smaller sizes
         const rock = new THREE.Mesh(rockGeometry, rockMaterial);
         const angle = Math.random() * Math.PI * 2;
         const radius = 5 + Math.random() * 35; // Scatter widely
         rock.position.set(
            Math.cos(angle) * radius,
            Math.random() * 0.3 + 0.1, // Slightly raised/embedded
            Math.sin(angle) * radius
         );
         rock.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
         rock.scale.setScalar(Math.random()*0.6 + 0.3); // Smaller average size
         rock.castShadow = true;
         rock.receiveShadow = true;
         scene.add(rock);
         rocks.push(rock);
     }

    // Lighting (Harsh Sun)
    const ambientLight = new THREE.AmbientLight(0xaaa899, 0.6); // Warm ambient
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffe5, 1.4); // Bright, slightly yellow sun
    sunLight.position.set(20, 25, -10); // Different angle
    sunLight.castShadow = true;
    // Configure shadows for sharpness
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -30;
    // sunLight.shadow.bias = -0.001; // Adjust if shadow acne appears

    scene.add(sunLight);
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

// --- Exported Placeholders ---
export function updateChoiceOrbsVisuals(choices, correctChoiceText = null, selectedChoiceText = null) { }
export function hideAllChoiceOrbs() { }
export function resizeScene() { onWindowResizeInternal(); }