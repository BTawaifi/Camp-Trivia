// scene_sinai.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let mountain;
let cloudParticles;
let animationFrameId = null;
let containerElement = null;

export function initScene(containerId) {
    if (renderer) cleanupScene();

    containerElement = document.getElementById(containerId);
    if (!containerElement) {
        console.error(`[SCENE Sinai] Container #${containerId} not found!`); return;
    }

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x303040, 10, 70); // Dark, dense fog

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 30); // Further back, looking up

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x181820); // Very dark blue/grey sky
    renderer.shadowMap.enabled = true; // Enable shadows for drama
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerElement.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 5, 0); // Target higher up towards mountain
    controls.maxDistance = 60;
    controls.minDistance = 5;
    controls.maxPolarAngle = Math.PI * 0.6; // Allow looking up more
    controls.minPolarAngle = Math.PI * 0.1; // Prevent looking straight down

    createSinaiEnvironmentInternal();

    window.addEventListener('resize', onWindowResizeInternal, false);
    animateInternal();
    console.log("[SCENE Sinai] Initialized.");
}

export function cleanupScene() {
    console.log("[SCENE Sinai] Cleaning up...");
    if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
    window.removeEventListener('resize', onWindowResizeInternal, false);
    if (scene) {
        scene.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                // Dispose material textures if any were loaded
                Object.values(object.material).forEach(value => {
                    if (value instanceof THREE.Texture) value.dispose();
                });
                if (Array.isArray(object.material)) object.material.forEach(m => m.dispose());
                else object.material.dispose();
            }
        });
         while(scene.children.length > 0) scene.remove(scene.children[0]);
    }
    mountain = null; cloudParticles = null;
    if (controls) controls.dispose(); controls = null;
    if (renderer) {
        renderer.dispose();
         if (renderer.domElement && containerElement) {
            try { containerElement.removeChild(renderer.domElement); } catch (e) { containerElement.innerHTML = '';}
         }
        renderer = null;
    }
    scene = null; camera = null; containerElement = null;
    console.log("[SCENE Sinai] Cleanup complete.");
}


function createSinaiEnvironmentInternal() {
    // Ground (Rocky)
    const groundGeometry = new THREE.PlaneGeometry(120, 120);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x5c504a, roughness: 0.9 }); // Rocky brown/grey
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Scattered Rocks
    const rockGeometry = new THREE.DodecahedronGeometry(0.8, 0); // Rough shape
    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x6c605a, roughness: 0.85 });
     for (let i = 0; i < 40; i++) {
         const rock = new THREE.Mesh(rockGeometry, rockMaterial);
         const angle = Math.random() * Math.PI * 2;
         const radius = 10 + Math.random() * 30; // Further out
         rock.position.set(
            Math.cos(angle) * radius,
            Math.random() * 0.5, // Slightly embedded/raised
            Math.sin(angle) * radius
         );
         rock.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
         rock.scale.setScalar(Math.random()*0.8 + 0.5);
         rock.castShadow = true;
         rock.receiveShadow = true;
         scene.add(rock);
     }


    // Mountain (Large Cone)
    const mountainHeight = 25;
    const mountainRadius = 15;
    const mountainGeometry = new THREE.ConeGeometry(mountainRadius, mountainHeight, 32, 8); // More segments for detail
    // Add some displacement (optional, simple version)
    const pos = mountainGeometry.attributes.position;
    for (let i = 0; i < pos.count; i++){
        const y = pos.getY(i);
        if (y > 0.1) { // Don't displace base much
            const noise = (Math.random() - 0.5) * 2; // Simple noise factor
            pos.setX(i, pos.getX(i) + noise);
            pos.setZ(i, pos.getZ(i) + noise);
        }
    }
    mountainGeometry.computeVertexNormals(); // Recalculate normals after displacement

    const mountainMaterial = new THREE.MeshStandardMaterial({ color: 0x4a403a, roughness: 0.95, flatShading: false }); // Darker rock
    mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
    mountain.position.y = mountainHeight / 2; // Base on the ground plane
    mountain.castShadow = true;
    mountain.receiveShadow = true;
    scene.add(mountain);

     // Clouds/Mist around the top (Particles)
     const particleCount = 300;
     const positions = [];
     const mountainTopY = mountainHeight * 0.8; // Target upper part
     const mountainTopRadius = mountainRadius * 0.3; // Radius near top

     for (let i = 0; i < particleCount; i++) {
         const angle = Math.random() * Math.PI * 2;
         const radius = Math.random() * mountainTopRadius * 1.5 + mountainTopRadius * 0.5; // Spread around top
         const heightOffset = (Math.random() - 0.5) * 5; // Vertical spread

         positions.push(
             Math.cos(angle) * radius,
             mountainTopY + heightOffset,
             Math.sin(angle) * radius
         );
     }
     const geometry = new THREE.BufferGeometry();
     geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
     const material = new THREE.PointsMaterial({
         color: 0xcccccc,
         size: 2.5,
         sizeAttenuation: true,
         transparent: true,
         opacity: 0.4,
         blending: THREE.AdditiveBlending, // Brighter where overlap
         depthWrite: false
     });
     cloudParticles = new THREE.Points(geometry, material);
     cloudParticles.position.y = mountainHeight / 2; // Adjust particle system origin to match mountain's offset
     scene.add(cloudParticles);

    // Lighting (Dramatic)
    const ambientLight = new THREE.AmbientLight(0x404050, 0.5); // Dark ambient
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xaaaaff, 0.8); // Cool key light
    keyLight.position.set(-20, 15, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 80;
    keyLight.shadow.camera.left = -40;
    keyLight.shadow.camera.right = 40;
    keyLight.shadow.camera.top = 40;
    keyLight.shadow.camera.bottom = -40;
    scene.add(keyLight);

    // Optional: Lightning flash effect (PointLight)
    const flashLight = new THREE.PointLight(0xffffff, 0, 50, 2); // Start intensity 0
    flashLight.position.set(0, mountainHeight * 1.1, 0); // Position above mountain top
    scene.add(flashLight);
    mountain.userData.flashLight = flashLight; // Store reference for animation
}

function animateInternal() {
    animationFrameId = requestAnimationFrame(animateInternal);
    if (!renderer || !scene || !camera) return;
    controls.update();

    // Animate clouds slightly
    if (cloudParticles) {
        cloudParticles.rotation.y += 0.0005;
    }

    // Animate lightning flash randomly
    if (mountain && mountain.userData.flashLight) {
        const light = mountain.userData.flashLight;
        if (light.intensity > 0) {
            light.intensity *= 0.85; // Decay flash
            if (light.intensity < 0.05) light.intensity = 0;
        } else if (Math.random() < 0.005) { // Low probability of flashing
            light.intensity = Math.random() * 1.5 + 1.0; // Random intensity
            light.position.x = (Math.random() - 0.5) * 10; // Random position near top
            light.position.z = (Math.random() - 0.5) * 10;
        }
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