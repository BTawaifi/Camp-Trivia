// --- START OF FILE scene_eden_advanced_meshes.js ---

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js'; // For more natural terrain/placement (optional but included in setup)

// --- Global Variables ---
let scene, camera, renderer, controls;
const regularFlora = [];
let treeOfLife, treeOfKnowledge;
let adamMesh, eveMesh; // Changed from Representation to Mesh
let serpentRepresentation;
let riverMeshes = [];
let animationFrameId = null;
let containerElement = null;

const EDEN_CENTER = new THREE.Vector3(0, 0, 0);
const SPECIAL_TREE_POS_LIFE = new THREE.Vector3(-4, 0, -2); // Slightly offset
const SPECIAL_TREE_POS_KNOWLEDGE = new THREE.Vector3(4, 0, -2); // Slightly offset

// --- Color Palette ---
const Colors = {
    sky: 0xbee4f7, // Lighter, clearer blue
    ground: 0x509140, // Richer green
    groundHighlight: 0x78a85a, // Slightly lighter green for variation
    trunkBrown: 0x7a4f31,
    leavesGreen: 0x2a7d4f,
    leavesAltGreen: 0x3a8f5f,
    riverBlue: 0x60a0d0,
    treeOfLifeLeaves: 0xfffacd, // Golden/Light Yellow
    treeOfLifeTrunk: 0xb8860b, // DarkGoldenrod
    treeOfLifeGlow: 0xffec8b,
    treeOfKnowledgeLeaves: 0xcd5c5c, // IndianRed (more subtle than tomato)
    treeOfKnowledgeTrunk: 0x5d3a1a, // Darker Brown
    knowledgeFruit: 0xff4500, // Orangey Red
    adamColor: 0xffdab9, // PeachPuff (skin-like tone)
    eveColor: 0xffe4e1, // MistyRose (slightly lighter/different skin-like tone)
    serpentColor: 0x2f4f4f, // Dark Slate Gray, slightly metallic
    stoneColor: 0xaaaaaa, // Onyx hint
    goldColor: 0xffd700, // Gold hint
};

// --- Initialization ---
export function initScene(containerId) {
    if (renderer) cleanupScene();

    containerElement = document.getElementById(containerId);
    if (!containerElement) {
        console.error(`[SCENE Eden Adv Meshes] Container #${containerId} not found!`); return;
    }

    scene = new THREE.Scene();
    // scene.fog = new THREE.Fog(0xade0ee, 20, 70); // Soft, distant fog

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 35); // Higher and further back view

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Alpha for potential CSS background gradient
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(Colors.sky, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerElement.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(EDEN_CENTER.x, 3, EDEN_CENTER.z); // Target the center ground
    controls.maxDistance = 80;
    controls.minDistance = 5;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent looking straight down or below ground plane

    createAdvancedEdenEnvironment();

    window.addEventListener('resize', onWindowResizeInternal, false);
    animateInternal();
    console.log("[SCENE Eden Adv Meshes] Initialized.");
}

// --- Cleanup ---
export function cleanupScene() {
    console.log("[SCENE Eden Adv Meshes] Cleaning up...");
    if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
    window.removeEventListener('resize', onWindowResizeInternal, false);

    if (scene) {
        // Traverse and dispose of geometries, materials, textures
        scene.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => { if(material.dispose) material.dispose(); });
                } else if (object.material.dispose) {
                    object.material.dispose();
                }
            }
            // Dispose textures here if they were loaded (e.g., material.map.dispose())
        });
        // Force remove all children
        while(scene.children.length > 0) scene.remove(scene.children[0]);
    }

    // Clear arrays and references
    regularFlora.length = 0;
    riverMeshes.length = 0;
    treeOfLife = null; treeOfKnowledge = null;
    adamMesh = null; eveMesh = null; // Updated variable names
    serpentRepresentation = null;

    // Dispose controls and renderer
    if (controls) controls.dispose(); controls = null;
    if (renderer) {
        renderer.dispose();
         if (renderer.domElement && containerElement) {
            try { containerElement.removeChild(renderer.domElement); } catch (e) { containerElement.innerHTML = '';} // Force clear if remove fails
         }
        renderer = null;
    }
    scene = null; camera = null; containerElement = null;
    console.log("[SCENE Eden Adv Meshes] Cleanup complete.");
}

// --- Geometry Creation Helpers ---

function createVariedTree(config) {
    const treeGroup = new THREE.Group();
    const trunkHeight = config.trunkHeight || (Math.random() * 3 + 4);
    const trunkRadius = config.trunkRadius || (Math.random() * 0.2 + 0.3);
    const leavesRadius = config.leavesRadius || (Math.random() * 1.5 + 1.8);
    const trunkColor = config.trunkColor || Colors.trunkBrown;
    const leavesColor = config.leavesColor || (Math.random() > 0.5 ? Colors.leavesGreen : Colors.leavesAltGreen);

    // Trunk
    const trunkMat = new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.9, metalness: 0.1 });
    const trunkGeom = new THREE.CylinderGeometry(trunkRadius * 0.6, trunkRadius, trunkHeight, 8);
    const trunkMesh = new THREE.Mesh(trunkGeom, trunkMat);
    trunkMesh.position.y = trunkHeight / 2;
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    treeGroup.add(trunkMesh);

    // Leaves (varied shapes)
    const leavesMat = new THREE.MeshStandardMaterial({ color: leavesColor, roughness: 0.8, metalness: 0.0 });
    let leavesMesh;
    const leafShapeType = Math.random();

    if (leafShapeType < 0.6) { // Sphere
        const leavesGeom = new THREE.SphereGeometry(leavesRadius, 10, 7);
        leavesMesh = new THREE.Mesh(leavesGeom, leavesMat);
        leavesMesh.position.y = trunkHeight + leavesRadius * 0.5;
    } else if (leafShapeType < 0.85) { // Cone
        const leavesGeom = new THREE.ConeGeometry(leavesRadius, leavesRadius * 2, 10);
        leavesMesh = new THREE.Mesh(leavesGeom, leavesMat);
        leavesMesh.position.y = trunkHeight + leavesRadius * 0.9;
    } else { // Multiple Spheres
        leavesMesh = new THREE.Group();
        const numSpheres = Math.floor(Math.random() * 3) + 3;
        for (let i = 0; i < numSpheres; i++) {
            const sphereRad = leavesRadius * (Math.random() * 0.3 + 0.5);
            const sphereGeom = new THREE.SphereGeometry(sphereRad, 7, 5);
            const sphere = new THREE.Mesh(sphereGeom, leavesMat.clone()); // Clone mat if properties might change per sphere
            sphere.position.set(
                (Math.random() - 0.5) * leavesRadius * 0.8,
                trunkHeight + leavesRadius * 0.4 + (Math.random() - 0.3) * leavesRadius * 0.6,
                (Math.random() - 0.5) * leavesRadius * 0.8
            );
            sphere.castShadow = true;
            leavesMesh.add(sphere);
        }
    }

    if (leavesMesh instanceof THREE.Mesh) {
       leavesMesh.castShadow = true;
    } else { // Group: Ensure children have shadows set
        leavesMesh.traverse(child => { if (child instanceof THREE.Mesh) child.castShadow = true; });
    }
    treeGroup.add(leavesMesh);

    return treeGroup;
}

function createBush(position) {
    const bushGroup = new THREE.Group();
    const numSpheres = Math.floor(Math.random() * 4) + 5;
    const baseRadius = Math.random() * 0.8 + 0.5;
    const bushColor = Math.random() > 0.3 ? Colors.leavesGreen : Colors.leavesAltGreen;
    const leavesMat = new THREE.MeshStandardMaterial({ color: bushColor, roughness: 0.8 });

    for (let i = 0; i < numSpheres; i++) {
        const sphereRad = baseRadius * (Math.random() * 0.4 + 0.6);
        const sphereGeom = new THREE.SphereGeometry(sphereRad, 6, 4);
        const sphere = new THREE.Mesh(sphereGeom, leavesMat);
        sphere.position.set(
            (Math.random() - 0.5) * baseRadius * 1.5,
            sphereRad * 0.7, // Position spheres slightly above base
            (Math.random() - 0.5) * baseRadius * 1.5
        );
        sphere.castShadow = true;
        bushGroup.add(sphere);
    }
    bushGroup.position.copy(position);
    bushGroup.position.y = 0; // Ensure group base is on the ground
    return bushGroup;
}

function createRock(position) {
    const rockMat = new THREE.MeshStandardMaterial({
        color: Colors.stoneColor,
        roughness: 0.8,
        metalness: 0.1,
        flatShading: true
    });
    const radius = Math.random() * 0.5 + 0.3;
    const rockGeom = new THREE.DodecahedronGeometry(radius, 0); // Faceted look

    const rockMesh = new THREE.Mesh(rockGeom, rockMat);
    rockMesh.position.copy(position);
    rockMesh.position.y = radius * 0.5; // Slightly embedded
    rockMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    rockMesh.castShadow = true;
    return rockMesh;
}

function createHumanoidFigure(figureColor, scale = 1.0) {
    const figureGroup = new THREE.Group();

    // Proportions
    const totalHeight = 1.8 * scale;
    const headRadius = 0.15 * scale;
    const torsoHeight = 0.6 * scale;
    const torsoRadius = 0.18 * scale;
    const limbRadius = 0.06 * scale;
    const armLength = 0.7 * scale;
    const legLength = 0.9 * scale;
    const handFootRadius = 0.08 * scale;

    // Material
    const figureMaterial = new THREE.MeshStandardMaterial({
        color: figureColor,
        roughness: 0.7, // Slightly less rough than stone/wood
        metalness: 0.05,
    });

    // Head
    const headGeom = new THREE.SphereGeometry(headRadius, 16, 12);
    const headMesh = new THREE.Mesh(headGeom, figureMaterial);
    headMesh.position.y = torsoHeight + headRadius * 1.1; // Above torso
    headMesh.castShadow = true; headMesh.receiveShadow = true;
    figureGroup.add(headMesh);

    // Torso
    const torsoGeom = new THREE.CylinderGeometry(torsoRadius * 0.8, torsoRadius, torsoHeight, 12);
    const torsoMesh = new THREE.Mesh(torsoGeom, figureMaterial);
    torsoMesh.position.y = torsoHeight / 2; // Centered
    torsoMesh.castShadow = true; torsoMesh.receiveShadow = true;
    figureGroup.add(torsoMesh);

    // --- Arms ---
    const upperArmGeom = new THREE.CylinderGeometry(limbRadius, limbRadius, armLength / 2, 8);
    const lowerArmGeom = new THREE.CylinderGeometry(limbRadius, limbRadius * 0.9, armLength / 2, 8);
    const handGeom = new THREE.SphereGeometry(handFootRadius, 8, 6);

    // Function to create an arm
    const createArm = (isLeft) => {
        const armGroup = new THREE.Group();
        const upperArm = new THREE.Mesh(upperArmGeom, figureMaterial);
        upperArm.position.y = -armLength / 4; // Origin at shoulder joint
        upperArm.castShadow = true; upperArm.receiveShadow = true;
        armGroup.add(upperArm);

        const lowerArm = new THREE.Mesh(lowerArmGeom, figureMaterial);
        lowerArm.position.y = -armLength / 4; // Relative to upper arm end (elbow)
        lowerArm.castShadow = true; lowerArm.receiveShadow = true;
        upperArm.add(lowerArm); // Child of upper arm

        const hand = new THREE.Mesh(handGeom, figureMaterial);
        hand.position.y = -armLength / 4; // Relative to lower arm end (wrist)
        hand.castShadow = true; hand.receiveShadow = true;
        lowerArm.add(hand); // Child of lower arm

        // Position and rotate arm
        const sideMultiplier = isLeft ? -1 : 1;
        armGroup.position.set(sideMultiplier * torsoRadius * 1.1, torsoHeight * 0.9, 0); // Attach near shoulder
        armGroup.rotation.z = sideMultiplier * Math.PI * 0.15; // Angle slightly downwards
        return armGroup;
    };

    const leftArm = createArm(true);
    const rightArm = createArm(false);
    figureGroup.add(leftArm);
    figureGroup.add(rightArm);

    // --- Legs ---
    const upperLegGeom = new THREE.CylinderGeometry(limbRadius * 1.1, limbRadius, legLength / 2, 8);
    const lowerLegGeom = new THREE.CylinderGeometry(limbRadius, limbRadius * 0.9, legLength / 2, 8);
    const footGeom = new THREE.SphereGeometry(handFootRadius, 8, 6);

    // Function to create a leg
    const createLeg = (isLeft) => {
        const legGroup = new THREE.Group();
        const upperLeg = new THREE.Mesh(upperLegGeom, figureMaterial);
        upperLeg.position.y = -legLength / 4; // Origin at hip
        upperLeg.castShadow = true; upperLeg.receiveShadow = true;
        legGroup.add(upperLeg);

        const lowerLeg = new THREE.Mesh(lowerLegGeom, figureMaterial);
        lowerLeg.position.y = -legLength / 4; // Relative to knee
        lowerLeg.castShadow = true; lowerLeg.receiveShadow = true;
        upperLeg.add(lowerLeg); // Child of upper leg

        const foot = new THREE.Mesh(footGeom, figureMaterial);
        foot.position.y = -legLength / 4; // Relative to ankle
        foot.position.z = handFootRadius * 0.5; // Foot slightly forward
        foot.scale.set(1.0, 0.7, 1.3); // Flatten sphere into foot shape
        foot.castShadow = true; foot.receiveShadow = true;
        lowerLeg.add(foot); // Child of lower leg

        // Position leg group
        const sideMultiplier = isLeft ? -1 : 1;
        legGroup.position.set(sideMultiplier * torsoRadius * 0.5, 0, 0); // Attach near hip
        // legGroup.rotation.z = sideMultiplier * -Math.PI * 0.03; // Optional slight outward angle
        return legGroup;
    };

    const leftLeg = createLeg(true);
    const rightLeg = createLeg(false);
    figureGroup.add(leftLeg);
    figureGroup.add(rightLeg);

    // Adjust group's origin so feet are near y=0
    // The lowest point is the bottom of the foot, relative to the leg group origin (hip).
    // Foot center Y = -legLength/4 (upper) - legLength/4 (lower) - legLength/4 (foot pos rel to lower) = -3*legLength/4
    // Foot bottom approx = Foot center Y - foot radius * scale Y = -3*legLength/4 - handFootRadius * 0.7
    // We want this lowest point to be at y=0 in world space.
    // The leg group origin is at y=0 relative to the figure group.
    // So, we need to lift the entire figureGroup by the amount the foot hangs below the hip.
    figureGroup.position.y = legLength * 0.5 + handFootRadius * 0.7; // Lift by approx lower leg + foot height

    return figureGroup;
}

// --- Main Environment Creation ---
function createAdvancedEdenEnvironment() {
    // Ground Plane
    const groundSize = 150;
    const segments = 50;
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, segments, segments);
    // Optional: Vertex displacement for subtle terrain
    /*
    const noise = new ImprovedNoise();
    const vertices = groundGeometry.attributes.position;
    const noiseFactor = 0.15, scale = 0.05;
    for (let i = 0; i < vertices.count; i++) {
        const x = vertices.getX(i);
        const y = vertices.getY(i); // Corresponds to Z after rotation
        vertices.setZ(i, noise.noise(x * scale, y * scale, 0) * noiseFactor);
    }
    groundGeometry.computeVertexNormals();
    */
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: Colors.ground, roughness: 0.95, metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Rivers
    const riverMaterial = new THREE.MeshStandardMaterial({
        color: Colors.riverBlue, roughness: 0.1, metalness: 0.4,
        transparent: true, opacity: 0.8
    });
    const riverWidth = 3;
    const riverLength = groundSize / 2;
    const riverGeometry = new THREE.PlaneGeometry(riverWidth, riverLength);
    const riverPositions = [
        { x: 0, z: riverLength / 2, rotY: 0 }, { x: 0, z: -riverLength / 2, rotY: Math.PI },
        { x: riverLength / 2, z: 0, rotY: -Math.PI / 2 }, { x: -riverLength / 2, z: 0, rotY: Math.PI / 2 },
    ];
    riverPositions.forEach(posData => {
        const river = new THREE.Mesh(riverGeometry, riverMaterial);
        river.rotation.x = -Math.PI / 2;
        river.rotation.z = posData.rotY;
        river.position.set(posData.x, 0.02, posData.z); // Slightly above ground
        scene.add(river);
        riverMeshes.push(river);
    });

    // Populate with Flora and Features
    const density = 80;
    const placeRadius = 55;
    for (let i = 0; i < density; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.pow(Math.random(), 1.5) * placeRadius;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const pos = new THREE.Vector3(x, 0, z);

        if (pos.distanceTo(SPECIAL_TREE_POS_LIFE) < 5 || pos.distanceTo(SPECIAL_TREE_POS_KNOWLEDGE) < 5 || radius < riverWidth * 1.5) {
           continue; // Skip placement too close to special items
        }

        const itemType = Math.random();
        let item;
        if (itemType < 0.75) { // Tree
            item = createVariedTree({});
            item.position.set(x, 0, z);
            const scale = Math.random() * 0.3 + 0.8;
            item.scale.set(scale, scale, scale);
        } else if (itemType < 0.9) { // Bush
             item = createBush(pos);
        } else { // Rock
            item = createRock(pos);
             if (Math.random() < 0.1) { // Occasional Gold rock
                 item.material = item.material.clone();
                 item.material.color.set(Colors.goldColor);
                 item.material.metalness = 0.6;
                 item.material.roughness = 0.4;
                 item.material.flatShading = false;
             }
        }
        if (item) {
            scene.add(item);
            regularFlora.push(item);
        }
    }

    // Special Trees
    // Tree of Life
    treeOfLife = createVariedTree({
        trunkHeight: 8, trunkRadius: 0.8, leavesRadius: 4,
        trunkColor: Colors.treeOfLifeTrunk, leavesColor: Colors.treeOfLifeLeaves
    });
    treeOfLife.position.copy(SPECIAL_TREE_POS_LIFE);
    treeOfLife.traverse(child => {
        if (child instanceof THREE.Mesh && child.material.color.getHexString() === Colors.treeOfLifeLeaves.toString(16)) {
             child.material = new THREE.MeshStandardMaterial({
                 color: Colors.treeOfLifeLeaves, emissive: Colors.treeOfLifeGlow,
                 emissiveIntensity: 0.6, roughness: 0.5, metalness: 0.1
             });
        } else if (child instanceof THREE.Mesh && child.geometry instanceof THREE.CylinderGeometry) { // Trunk
            child.material.metalness = 0.3;
        }
        child.castShadow = true;
    });
    const lifeLight = new THREE.PointLight(Colors.treeOfLifeGlow, 0.8, 15);
    lifeLight.position.set(SPECIAL_TREE_POS_LIFE.x, 7, SPECIAL_TREE_POS_LIFE.z);
    scene.add(lifeLight);
    scene.add(treeOfLife);

    // Tree of Knowledge
    treeOfKnowledge = createVariedTree({
        trunkHeight: 7.5, trunkRadius: 0.7, leavesRadius: 3.8,
        trunkColor: Colors.treeOfKnowledgeTrunk, leavesColor: Colors.treeOfKnowledgeLeaves
    });
    treeOfKnowledge.position.copy(SPECIAL_TREE_POS_KNOWLEDGE);
    treeOfKnowledge.traverse(child => { child.castShadow = true; });
    // Add Fruit
    const fruitMat = new THREE.MeshStandardMaterial({ color: Colors.knowledgeFruit, roughness: 0.4, metalness: 0.1 });
    const fruitGeom = new THREE.SphereGeometry(0.25, 8, 6);
    const fruitCount = 12;
    const leavesCenterY = 7.5 + 3.8 * 0.5;
    for (let i = 0; i < fruitCount; i++) {
        const fruit = new THREE.Mesh(fruitGeom, fruitMat);
        const phi = Math.acos(-1 + (2 * i) / fruitCount);
        const theta = Math.sqrt(fruitCount * Math.PI) * phi;
        const r = 3.8 * 0.8;
        fruit.position.set(
            r * Math.sin(phi) * Math.cos(theta),
            leavesCenterY + r * Math.cos(phi) * 0.5,
            r * Math.sin(phi) * Math.sin(theta)
        );
        fruit.castShadow = true;
        treeOfKnowledge.add(fruit);
    }
    scene.add(treeOfKnowledge);

    // Serpent
    const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.5, 0.8), new THREE.Vector3(0.5, 1.5, 0.4),
        new THREE.Vector3(0, 2.5, -0.5), new THREE.Vector3(-0.6, 3.5, -0.3),
        new THREE.Vector3(-0.2, 4.5, 0.6)
    ].map(p => p.add(SPECIAL_TREE_POS_KNOWLEDGE))); // Offset relative to tree
    const serpentGeom = new THREE.TubeGeometry(curve, 20, 0.15, 6, false);
    const serpentMat = new THREE.MeshStandardMaterial({ color: Colors.serpentColor, roughness: 0.3, metalness: 0.8 });
    serpentRepresentation = new THREE.Mesh(serpentGeom, serpentMat);
    serpentRepresentation.castShadow = true;
    scene.add(serpentRepresentation);

    // Adam and Eve Meshes
    adamMesh = createHumanoidFigure(Colors.adamColor, 1.0);
    adamMesh.position.set(EDEN_CENTER.x - 1.5, 0, EDEN_CENTER.z + 2.5);
    adamMesh.rotation.y = Math.PI * -0.1; // Face slightly towards Eve/center
    scene.add(adamMesh);

    eveMesh = createHumanoidFigure(Colors.eveColor, 0.92); // Slightly smaller
    eveMesh.position.set(EDEN_CENTER.x + 1.5, 0, EDEN_CENTER.z + 2.5);
    eveMesh.rotation.y = Math.PI * 0.1; // Face slightly towards Adam/center
    scene.add(eveMesh);

    // --- Lighting ---
    const hemisphereLight = new THREE.HemisphereLight(Colors.sky, Colors.ground, 0.7); // Slightly increased intensity
    scene.add(hemisphereLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e1, 1.1); // Slightly increased intensity
    sunLight.position.set(40, 50, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    const shadowCamSize = 40;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 120;
    sunLight.shadow.camera.left = -shadowCamSize; sunLight.shadow.camera.right = shadowCamSize;
    sunLight.shadow.camera.top = shadowCamSize; sunLight.shadow.camera.bottom = -shadowCamSize;
    // sunLight.shadow.bias = -0.001; // Adjust if needed
    scene.add(sunLight);
    // scene.add(new THREE.CameraHelper(sunLight.shadow.camera)); // Debug

    // Optional Ground Lights
     const groundLight1 = new THREE.PointLight(0xffa07a, 0.3, 30);
     groundLight1.position.set(-15, 3, 15);
     scene.add(groundLight1);
     const groundLight2 = new THREE.PointLight(0x98fb98, 0.2, 25);
     groundLight2.position.set(15, 2, -10);
     scene.add(groundLight2);
}

// --- Animation Loop ---
function animateInternal() {
    animationFrameId = requestAnimationFrame(animateInternal);
    if (!renderer || !scene || !camera || !controls) return;

    const time = Date.now() * 0.0005; // Slow time progression

    // Subtle idle animation for Adam and Eve
     if (adamMesh) {
         adamMesh.rotation.y = Math.PI * -0.1 + Math.sin(time * 0.5) * 0.05; // Head sway
         adamMesh.position.y = 0 + Math.sin(time * 1.0) * 0.02; // Breathing
     }
     if (eveMesh) {
         eveMesh.rotation.y = Math.PI * 0.1 + Math.cos(time * 0.5 + 0.2) * 0.05; // Head sway
         eveMesh.position.y = 0 + Math.cos(time * 1.0 + 0.5) * 0.02; // Breathing
     }

    // Subtle glow pulse for Tree of Life
     const lifeLight = scene.getObjectByProperty('type', 'PointLight'); // Find the first point light
     if (lifeLight && lifeLight.color.getHexString() === Colors.treeOfLifeGlow.toString(16)) {
         lifeLight.intensity = 0.7 + Math.sin(time * 1.2) * 0.2;
     }
     // Find the material instance correctly - needs specific check
     let lifeLeavesMaterial = null;
     treeOfLife?.traverse(child => {
        if(child.material && child.material.emissive && child.material.color.getHexString() === Colors.treeOfLifeLeaves.toString(16)) {
            lifeLeavesMaterial = child.material;
        }
     });
     if (lifeLeavesMaterial) {
        lifeLeavesMaterial.emissiveIntensity = 0.5 + Math.sin(time * 1.2) * 0.15;
     }

    controls.update(); // Update orbit controls
    renderer.render(scene, camera); // Render the scene
}

// --- Window Resize Handler ---
function onWindowResizeInternal() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Exported Placeholders (Keep for compatibility if needed) ---
export function updateChoiceOrbsVisuals(choices, correctChoiceText = null, selectedChoiceText = null) {
    console.warn("[SCENE Eden Adv Meshes] updateChoiceOrbsVisuals not implemented.");
}
export function hideAllChoiceOrbs() {
    console.warn("[SCENE Eden Adv Meshes] hideAllChoiceOrbs not implemented.");
}
export function resizeScene() {
    onWindowResizeInternal();
}

// --- END OF FILE scene_eden_advanced_meshes.js ---