// src/renderer.js

// --- Import Editor Module ---
// Path relative to renderer.js
import { initEditor, openEditor, closeEditor } from './editor.js';

// --- Static Scene Imports (Replaces Dynamic Imports) ---
// Paths relative to renderer.js
import * as SceneCampfire from './scene_campfire.js';
import * as SceneStarryNight from './scene_starryNight.js';
import * as SceneForest from './scene_forest.js';
import * as SceneAbstract from './scene_abstract.js';
import * as SceneDesert from './scene_desert.js';
import * as SceneEden from './scene_eden.js';
import * as SceneSinai from './scene_sinai.js';
import * as SceneGalilee from './scene_galilee.js';
import * as SceneWilderness from './scene_wilderness.js';
import * as SceneBush from './scene_bush.js';

// --- Scene Management ---
const SCENE_STORAGE_KEY = 'campTriviaScene';
// Map scene names to the statically imported module objects
const sceneModules = {
    'campfire': SceneCampfire,
    'starryNight': SceneStarryNight,
    'forest': SceneForest,
    'abstract': SceneAbstract,
    'desert': SceneDesert,
    'eden': SceneEden,
    'sinai': SceneSinai,
    'galilee': SceneGalilee,
    'wilderness': SceneWilderness,
    'bush': SceneBush,
    // 'none' doesn't correspond to a module, handled separately
};
const defaultSceneName = 'campfire';
const NO_SCENE_VALUE = 'none';
let currentSceneModule = null; // Will hold the currently active scene *module object*
let currentSceneName = null;

// --- Centralized DOM Elements (Initialize as null initially) ---
const dom = {
    // Game Elements
    body: null, canvasContainer: null, uiContainer: null, themeSelector: null, sceneSelector: null, loadingText: null,
    startConfig: null, questionContainer: null, resultContainer: null, endGame: null, questionText: null,
    questionCounter: null, choicesContainer: null, resultText: null, verseDisplay: null, verseToggle: null,
    verseContent: null, pointAwardContainer: null, nextButton: null, skipButton: null, startButton: null,
    restartButton: null, discussionPrompt: null, scoreDisplay: null, scoresList: null, numTeamsInput: null,
    teamNamesContainer: null, numQuestionsInput: null, startError: null, availableQuestionsDisplay: null,
    endGameScores: null, endGameWinner: null, questionTypeRadios: null, fileInput: null, importButton: null,
    importCheckbox: null, importStatus: null,

    // --- NEW UI Editor Elements ---
    questionEditorUI: null,
    editorStatusMessage: null,
    editorViewContainer: null,
    questionListView: null,
    questionListViewTitleCount: null,
    addNewQuestionButton: null,
    questionListContainer: null,
    questionEditFormView: null,
    editFormTitle: null,
    questionEditForm: null,
    editQId: null,
    editQText: null,
    editQChoicesContainer: null,
    addChoiceButton: null,
    editQVerse: null,
    editQType: null,
    saveEditedQuestionButton: null,
    cancelEditQuestionButton: null,
    exportQuestionsButtonUI: null,
    deleteAllQuestionsButton: null,
    closeUiEditorButton: null,
    openUiEditorButton: null, // Button in start-config to open the UI editor

    // --- Keep Reset Button reference ---
    resetQuestionsButton: null
};

// --- Game Data ---
const TRIVIA_STORAGE_KEY = 'campTriviaUserData'; // Key for user-edited questions
let defaultFetchedTrivia = []; // Holds the originally fetched data
let triviaData = []; // Holds the CURRENT working data (fetched, user-saved, or default)
let importedTriviaData = []; // Holds data from file import (used ONLY if replace checkbox is checked)
let availableQuestions = []; // Questions for the current round
let currentGameSourcePool = []; // Source pool for the current round (filtered triviaData or importedTriviaData)
let shownQuestionIds = new Set();

// --- Game State ---
let gameState = {
    phase: 'loading', // Start in loading
    teams: [],
    totalQuestionsToAsk: 5,
    questionsAskedCount: 0,
    currentQuestion: null,
};

// --- Default Trivia Data (Fallback) ---
const defaultTrivia = [
    { "question": "ما هو أعلى جبل في العالم؟", "choices": ["إيفرست", "كي 2"], "correct": "إيفرست", "type": "normal", "id": "def_q1" },
    { "question": "يسألك غريب معطفك... بحسب متى 5: 40؟", "choices": ["أعطه قميصك أيضًا", "ارفض"], "correct": "أعطه قميصك أيضًا", "verse": "متى 5: 40...", "type": "biblical", "id": "def_q2" }
];

// --- Helper Functions ---
const setStatus = (el, msg, color = 'var(--text-secondary)') => {
     if (el) {
         el.textContent = msg;
         el.style.color = color;
     } else {
         console.warn("setStatus called on null element with message:", msg);
     }
};

const processJsonData = (data, defaultType = 'normal') => {
     if (!Array.isArray(data)) {
         console.warn("[PROCESS] Input data is not an array.");
         return [];
     }
     return data
         .filter(q => q && q.question && Array.isArray(q.choices) && q.choices.length > 0 && q.correct)
         .map((q, i) => {
             const questionId = q.id || `q_${Date.now()}_${Math.random().toString(16).slice(2)}_${i}`;
             const processedChoices = q.choices.map((c, j) => {
                     const choiceText = (typeof c === 'string') ? c : c?.text;
                     if (typeof choiceText === 'string' && choiceText.trim()) {
                         const choiceId = c?.id || `${questionId}_c${j}`;
                         return { text: choiceText, id: choiceId };
                     }
                     console.warn(`[PROCESS] Malformed or empty choice @ q[${i}] index ${j}:`, c);
                     return null;
                 }).filter(choice => choice !== null);

             const isValidCorrect = processedChoices.some(pc => pc.text === q.correct);
             // Fix for when correct answer might not exist after filtering choices
             let finalCorrect = 'INVALID_CORRECT_ANSWER';
             if (isValidCorrect) {
                finalCorrect = q.correct;
             } else if (processedChoices.length > 0 && processedChoices.some(pc => pc.text === processedChoices[0].text)) {
                // If original correct is invalid, try to use the first *valid* choice as correct
                // This is a fallback, ideally the data source is corrected
                finalCorrect = processedChoices[0].text;
                console.warn(`[PROCESS] Original correct answer "${q.correct}" for Q ID ${questionId} not found in valid choices. Defaulting to "${finalCorrect}".`);
             } else {
                 console.error(`[PROCESS] Cannot determine a valid correct answer for Q ID ${questionId} after filtering choices.`);
             }


             return {
                 ...q,
                 id: questionId,
                 type: q.type || (q.verse ? 'biblical' : defaultType),
                 verse: q.verse || undefined,
                 choices: processedChoices,
                 correct: finalCorrect // Use the validated or fallback correct answer
             };
         })
         .filter(q => q.choices.length > 0 && q.correct !== 'INVALID_CORRECT_ANSWER'); // Final filter
};


const fetchQuestions = async (url, type) => {
    const fetchUrl = url;
    console.log(`[FETCH] Attempting: ${fetchUrl}`);
    try {
        const response = await fetch(fetchUrl);
        console.log(`[FETCH] ${fetchUrl} - Status: ${response.status}`);
        if (!response.ok) {
            if (response.status !== 404) console.error(`[FETCH] HTTP Error ${response.status} for ${fetchUrl}`);
            return [];
        }
        const data = await response.json();
        const processed = processJsonData(data, type);
        console.log(`[FETCH] OK: Loaded ${processed.length} ${type} from ${fetchUrl}.`);
        return processed;
    } catch (error) {
        console.error(`[FETCH] Error fetching/parsing ${fetchUrl}:`, error);
        if (error instanceof SyntaxError) { console.error(`[FETCH] Response from ${fetchUrl} was not valid JSON.`); }
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
             console.error(`[FETCH] Network error for ${fetchUrl}. Check if the file exists at the expected path in the built application and if the path in 'fetch()' is correct relative to the final index.html.`);
        }
        return [];
    }
};

const shuffleArray = (array) => {
     if (!Array.isArray(array)) return [];
     let currentIndex = array.length;
     let randomIndex;
     while (currentIndex !== 0) {
         randomIndex = Math.floor(Math.random() * currentIndex);
         currentIndex--;
         [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
     }
     return array;
};

// --- THEME HANDLING ---
const THEME_STORAGE_KEY = 'campTriviaTheme';
const themes = ['campfire', 'mono-dark', 'forest'];
function applyTheme(themeName) {
     if (!dom.body) { console.error("applyTheme: dom.body is null."); return; }
     if (!themes.includes(themeName)) themeName = themes[0];
     dom.body.classList.remove(...themes.map(t => `theme-${t}`));
     dom.body.classList.add(`theme-${themeName}`);
     if (dom.themeSelector && dom.themeSelector.value !== themeName) dom.themeSelector.value = themeName;
     localStorage.setItem(THEME_STORAGE_KEY, themeName);
     console.log(`[THEME] Applied theme: ${themeName}`);
     if (dom.canvasContainer) {
        try { dom.canvasContainer.style.backgroundColor = getComputedStyle(dom.body).getPropertyValue('--bg-body'); }
        catch(e) { console.warn("Could not apply background color during theme change:", e); }
     }
 }
function loadAndApplyInitialTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    applyTheme(savedTheme || themes[0]);
}

// --- SCENE LOADING & MANAGEMENT (STATIC IMPORT VERSION) ---
async function cleanupCurrentScene() {
    if (currentSceneModule?.cleanupScene) {
        console.log(`[SCENE] Cleaning up previous scene: ${currentSceneName}`);
        try {
            await currentSceneModule.cleanupScene();
        }
        catch (cleanupError) { console.error(`[SCENE] Error cleaning up scene "${currentSceneName}":`, cleanupError); }
    }
     if (dom.canvasContainer) dom.canvasContainer.innerHTML = ''; // Clear canvas container
    currentSceneModule = null; // Reset the module object reference
    currentSceneName = null;
     if (dom.body) dom.body.classList.remove('scene-active'); // Remove scene indicator class
}

async function loadAndSetScene(sceneName) {
    const isLoadingTextAvailable = !!dom.loadingText;
    let originalStatus = isLoadingTextAvailable ? dom.loadingText.textContent : '';
    let originalVisibility = isLoadingTextAvailable ? dom.loadingText.style.display : 'none';
    if (isLoadingTextAvailable) { setStatus(dom.loadingText, `جارٍ تحميل المشهد: ${sceneName}...`); dom.loadingText.classList.add('visible'); }
    if (dom.sceneSelector) dom.sceneSelector.disabled = true;

    await cleanupCurrentScene(); // Clean up previous scene first

    // Handle the 'none' scene case (no module needed)
    if (sceneName === NO_SCENE_VALUE) {
        console.log("[SCENE] No scene selected.");
        currentSceneName = NO_SCENE_VALUE;
        currentSceneModule = null; // Explicitly null
        localStorage.setItem(SCENE_STORAGE_KEY, NO_SCENE_VALUE);
        if(dom.sceneSelector?.value !== NO_SCENE_VALUE) dom.sceneSelector.value = NO_SCENE_VALUE;
        if (isLoadingTextAvailable) { dom.loadingText.classList.remove('visible'); setStatus(dom.loadingText, originalStatus); dom.loadingText.style.display = originalVisibility; }
        if (dom.canvasContainer && dom.body) { try { dom.canvasContainer.style.backgroundColor = getComputedStyle(dom.body).getPropertyValue('--bg-body'); } catch (e) { console.warn("Could not set bg color for 'none' scene:", e); } }
        if (dom.sceneSelector) dom.sceneSelector.disabled = false;
        return true;
    }

    // Get the pre-imported module object from our map
    let module = sceneModules[sceneName]; // Use 'let' as it might change for default fallback

    if (!module) {
        console.warn(`Scene "${sceneName}" not found in statically imported modules. Using default "${defaultSceneName}".`);
        sceneName = defaultSceneName;
        const defaultModule = sceneModules[sceneName]; // Try getting the default module
        if (!defaultModule && sceneName !== NO_SCENE_VALUE) {
            console.error(`Default scene "${defaultSceneName}" also not found in map! Fallback to NO scene.`);
            if (isLoadingTextAvailable) setStatus(dom.loadingText, `خطأ: المشهد الافتراضي غير موجود!`, '#f88');
            if (dom.sceneSelector) dom.sceneSelector.disabled = false;
            return await loadAndSetScene(NO_SCENE_VALUE); // Fallback to 'none'
        }
        if(defaultModule) {
             module = defaultModule; // Re-assign 'module' if we fell back to default
        } else {
            console.error("Critical error retrieving default scene module. Falling back to none.");
             return await loadAndSetScene(NO_SCENE_VALUE);
        }
    }

    // Now, 'module' should hold the correct, pre-imported scene module object
    try {
        if (typeof module.initScene !== 'function' || typeof module.cleanupScene !== 'function') {
            throw new Error(`Statically imported module for "${sceneName}" is invalid or missing required exports (initScene/cleanupScene).`);
        }

        currentSceneModule = module; // Store the reference to the active module object
        currentSceneName = sceneName;
        localStorage.setItem(SCENE_STORAGE_KEY, sceneName);
        if(dom.sceneSelector?.value !== sceneName) dom.sceneSelector.value = sceneName;

        console.log(`[SCENE] Initializing statically imported: ${sceneName}`);
        if (dom.canvasContainer) dom.canvasContainer.innerHTML = ''; // Ensure container is clear

        await currentSceneModule.initScene('canvas-container');

        console.log(`[SCENE] "${sceneName}" loaded.`);
        if (dom.body) dom.body.classList.add('scene-active');
        if (isLoadingTextAvailable) { dom.loadingText.classList.remove('visible'); setStatus(dom.loadingText, originalStatus); dom.loadingText.style.display = originalVisibility; }
        if (dom.sceneSelector) dom.sceneSelector.disabled = false;
        return true;

    } catch (error) {
        console.error(`[SCENE] Failed init/setup for statically imported "${sceneName}":`, error);
        currentSceneModule = null; // Ensure module is cleared on error
        currentSceneName = null;
        if (isLoadingTextAvailable) setStatus(dom.loadingText, `فشل تحميل المشهد: ${sceneName}. المحاولة بدون مشهد.`, '#f88');
        if (dom.sceneSelector) dom.sceneSelector.disabled = false;
        return await loadAndSetScene(NO_SCENE_VALUE);
    }
}

function loadAndApplyInitialScene() {
    const savedScene = localStorage.getItem(SCENE_STORAGE_KEY);
    let initialScene = defaultSceneName; // Default if nothing saved or invalid

    if (savedScene === NO_SCENE_VALUE) {
        initialScene = NO_SCENE_VALUE; // Respect saved 'none'
    } else if (savedScene && sceneModules[savedScene]) {
        initialScene = savedScene; // Use saved scene if it's valid (exists in our static map)
    } else if (savedScene) {
        console.warn(`Saved scene "${savedScene}" is invalid or not statically imported, using default "${defaultSceneName}".`);
    }

    if (dom.sceneSelector) dom.sceneSelector.value = initialScene; // Update dropdown
    return loadAndSetScene(initialScene); // Load the determined initial scene
}

// --- Initialization ---
async function init() {
    setStatus(dom.loadingText, 'جارٍ تحميل الأسئلة...');
    dom.loadingText.classList.add('visible');

    try {
        loadAndApplyInitialTheme(); // Apply theme early

        // Fetch default questions - paths assumed relative to final index.html location
        const [biblicalQs, normalQs] = await Promise.all([
            fetchQuestions('trivia-biblical.json', 'biblical'),
            fetchQuestions('trivia-normal.json', 'normal')
        ]);
        defaultFetchedTrivia = [...biblicalQs, ...normalQs]; // Store the original fetched data

        // Try to load user data from localStorage
        let loadedUserData = null;
        const storedData = localStorage.getItem(TRIVIA_STORAGE_KEY);
        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                // Process loaded data to ensure structure and IDs are good
                const processedUserData = processJsonData(parsedData);
                if (processedUserData.length > 0) {
                    loadedUserData = processedUserData;
                    console.log(`[INIT] Loaded and processed ${loadedUserData.length} questions from localStorage.`);
                } else {
                    console.warn("[INIT] localStorage data was empty or invalid after processing. Using fetched defaults.");
                     localStorage.removeItem(TRIVIA_STORAGE_KEY); // Clean up invalid data
                }
            } catch (e) {
                console.error("[INIT] Error parsing or processing localStorage data:", e, ". Using fetched defaults.");
                localStorage.removeItem(TRIVIA_STORAGE_KEY); // Clean up corrupted data
            }
        }

        // Determine initial triviaData
        if (loadedUserData) {
            triviaData = loadedUserData; // Use processed user data if valid
        } else if (defaultFetchedTrivia.length > 0) {
             triviaData = [...defaultFetchedTrivia]; // Use fetched data if no valid user data
        } else {
            console.warn("[INIT] No questions from files or localStorage, using built-in defaults.");
            triviaData = processJsonData(defaultTrivia); // Use fallback defaults
        }
         // Ensure defaultFetchedTrivia always has *something* for resets, even if fetch failed
         if (defaultFetchedTrivia.length === 0) {
             defaultFetchedTrivia = processJsonData(defaultTrivia);
         }

        console.log(`[INIT] Initial working questions set: ${triviaData.length}`);
         if (triviaData.some(q => !q.id)) { console.error("Some initial questions lack IDs!", triviaData.filter(q=>!q.id)); }


        // Initialize the NEW UI Editor Module
        initEditor({
            dom: dom, // Pass the updated dom object
            getTriviaData: () => triviaData,
            setTriviaData: (newData) => { triviaData = newData; },
            getDefaultData: () => [...defaultFetchedTrivia],
            processJsonData: processJsonData, // Still useful for validation
            updateUICallback: updateAvailableCountAndInput,
            resetCallback: resetTriviaData, // Pass the reset function
            storageKey: TRIVIA_STORAGE_KEY,
            exportDataCallback: exportTriviaData // Pass the export function
        });

        addEventListeners(); // Add listeners *after* DOM elements and editor init

        // Load initial scene (using static import logic now)
        const sceneReady = await loadAndApplyInitialScene();
        if (!sceneReady && dom.sceneSelector?.value !== NO_SCENE_VALUE) {
            console.error("Initialization Warning: Scene failed to load, proceeding without 3D.");
        }
        setGamePhase('setup'); // Proceed to setup

    } catch (error) {
        console.error("Initialization failed critically:", error);
        setStatus(dom.loadingText, "خطأ فادح أثناء تحميل اللعبة.", "#f88");
        dom.loadingText.classList.add('visible');
    }
}

// --- Game Phase Management ---
function setGamePhase(newPhase) {
     if (!dom.uiContainer) { console.error("setGamePhase: dom.uiContainer is null!"); return; }
    const oldPhase = gameState.phase;
    gameState.phase = newPhase;
    console.log(`Game Phase: ${oldPhase} -> ${gameState.phase}`);

    // Hide all UI elements first, except the UI editor if it's currently displayed
     dom.uiContainer.querySelectorAll('.ui-element').forEach(el => {
         if (el.id !== 'question-editor-ui' || el.style.display === 'none') {
             el.classList.remove('visible');
         }
     });
     // Show elements relevant to the new phase (excluding the editor, managed by open/close)
     dom.uiContainer.querySelectorAll(`.ui-element[data-phase*="${newPhase}"]`).forEach(el => el.classList.add('visible'));


     if (dom.skipButton) dom.skipButton.style.display = 'none';

     // Helper to call functions on the current scene module IF it exists and has the function
     const sceneAction = (action, ...args) => {
        if (currentSceneModule?.[action] && typeof currentSceneModule[action] === 'function') {
            try {
                currentSceneModule[action](...args);
            }
            catch (e) { console.error(`Scene action "${action}" on module "${currentSceneName}" error:`, e); }
        }
    };

    switch (newPhase) {
        case 'setup':
            if (dom.questionEditorUI && dom.questionEditorUI.style.display !== 'none') {
                closeEditor(); // Use the editor's close function
            }
            generateTeamNameInputs();
            updateAvailableCountAndInput(); // Update count based on current triviaData
            if(dom.startError) dom.startError.textContent = '';
            if(dom.scoreDisplay) dom.scoreDisplay.style.display = 'none';
            sceneAction('hideAllChoiceOrbs');
            break;
        case 'presenting':
             if(dom.resultContainer) dom.resultContainer.classList.remove('visible');
            if(dom.scoreDisplay) dom.scoreDisplay.style.display = 'block';
            displayQuestion();
            break;
        case 'scoring':
            if(dom.questionContainer) dom.questionContainer.classList.add('visible');
            if(dom.resultContainer) dom.resultContainer.classList.add('visible');
            if(dom.scoreDisplay) dom.scoreDisplay.style.display = 'block';
            displayPointAwardButtons();
            break;
        case 'end':
            displayEndGameSummary();
            sceneAction('hideAllChoiceOrbs');
             if(dom.scoreDisplay) dom.scoreDisplay.style.display = 'none';
            break;
        case 'loading': break;
        default:
            break;
    }
}

// --- File Import ---
async function handleFileImport() {
     if (!dom.fileInput || !dom.importStatus || !dom.importButton || !dom.importCheckbox) return;
    const files = dom.fileInput.files;
    if (!files || files.length === 0) return setStatus(dom.importStatus, "لم يتم اختيار ملفات.");
    setStatus(dom.importStatus, `جارٍ قراءة ${files.length} ملف(ات)...`, "var(--accent-color)");
    dom.importButton.disabled = true;

    const readFile = file => new Promise((resolve, reject) => {
         if (!file.name.toLowerCase().endsWith('.json')) { resolve({ fileName: file.name, status: 'skipped', questions: [] }); return; }
         const reader = new FileReader();
         reader.onload = e => {
             try {
                 const data = JSON.parse(e.target.result);
                 const questions = processJsonData(data); // Process imported data too
                 resolve({ fileName: file.name, status: questions.length > 0 ? 'success' : 'format_error', questions });
             } catch (err) { reject({ fileName: file.name, status: 'parse_error', error: err }); }
         };
         reader.onerror = err => reject({ fileName: file.name, status: 'read_error', error: err });
         reader.readAsText(file);
     });

    const results = await Promise.allSettled(Array.from(files).map(readFile));
    let newlyImported = [], success = 0, skipped = 0, errors = 0;
    results.forEach(res => {
         if (res.status === 'fulfilled') {
             const { status, questions } = res.value;
             if (status === 'success') { newlyImported.push(...questions); success++; }
             else if (status === 'skipped') skipped++; else errors++;
         } else errors++;
     });

    // --- START: MODIFIED IMPORT LOGIC ---
    if (dom.importCheckbox.checked) {
        // REPLACE MODE: Update importedTriviaData, leave triviaData alone until game start.
        importedTriviaData = newlyImported;
        let msg = `تم استيراد ${importedTriviaData.length} سؤالاً صالحاً من ${success} ملف(ات).`;
        if (skipped > 0) msg += ` تم تخطي ${skipped}.`;
        if (errors > 0) msg += ` خطأ في ${errors}.`;
        msg += ` (سيتم استخدامها بدلاً من الحالية عند بدء اللعبة).`;
        setStatus(dom.importStatus, msg, errors > 0 ? "#f88" : "var(--button-correct-bg)");
        console.log(`[IMPORT REPLACE] Stored ${importedTriviaData.length} questions for replacement.`);

    } else {
        // APPEND MODE: Add to triviaData, ensuring uniqueness by ID (existing questions take priority).
        const combinedMap = new Map();
        // Add existing questions first
        triviaData.forEach(q => {
            if(q && q.id) combinedMap.set(q.id, q);
            else console.warn("[IMPORT APPEND] Existing question missing ID:", q);
        });

        let addedCount = 0;
        let duplicateCount = 0;
        // Add newly imported questions only if the ID doesn't already exist
        newlyImported.forEach(q => {
             if (q && q.id) {
                 if (!combinedMap.has(q.id)) {
                     combinedMap.set(q.id, q);
                     addedCount++;
                 } else {
                     duplicateCount++;
                     console.warn(`[IMPORT APPEND] Duplicate question ID "${q.id}" found. Keeping existing question, discarding imported one.`);
                 }
             } else {
                 console.warn("[IMPORT APPEND] Imported question missing ID:", q);
             }
        });

        const originalCount = triviaData.length;
        triviaData = Array.from(combinedMap.values()); // Update main data source
        importedTriviaData = []; // Clear the separate import pool as we've merged

        let msg = `تمت إضافة ${addedCount} سؤالاً جديداً إلى المجموعة الحالية (${triviaData.length} المجموع).`;
        if (duplicateCount > 0) msg += ` تم تجاهل ${duplicateCount} مكرر(ة).`;
        if (skipped > 0) msg += ` تم تخطي ${skipped} ملف(ات).`;
        if (errors > 0) msg += ` خطأ في ${errors} ملف(ات).`;
        setStatus(dom.importStatus, msg, errors > 0 ? "#f88" : (addedCount > 0 ? "var(--button-correct-bg)" : "var(--text-secondary)"));
        console.log(`[IMPORT APPEND] Added ${addedCount} new questions. Total now: ${triviaData.length}. Discarded duplicates: ${duplicateCount}.`);
    }
    // --- END: MODIFIED IMPORT LOGIC ---

    dom.fileInput.value = '';
    dom.importButton.disabled = false;
    updateAvailableCountAndInput(); // Update UI based on the potentially modified triviaData or new importedTriviaData

    // If editor is open, refresh it after import append
    if (!dom.importCheckbox.checked && dom.questionEditorUI && dom.questionEditorUI.style.display !== 'none') {
         if (typeof window.refreshEditorListView === 'function') {
              window.refreshEditorListView();
         }
    }
}


// --- Game Logic Functions ---
 function generateTeamNameInputs() {
     if (!dom.numTeamsInput || !dom.teamNamesContainer) return;
    const num = parseInt(dom.numTeamsInput.value) || 2;
    dom.teamNamesContainer.innerHTML = Array.from({ length: num }, (_, i) => `
        <label for="tn-${i}">اسم الفريق ${i + 1}:</label>
        <input type="text" id="tn-${i}" name="tn-${i}" placeholder="الفريق ${i + 1}" maxlength="50"><br>
    `).join('');
}

function getFilteredTrivia(sourceData) {
     const checkedRadio = dom.uiContainer ? dom.uiContainer.querySelector('input[name="question_type"]:checked') : null;
     const type = checkedRadio?.value || 'mixed';
     // Ensure sourceData is an array before filtering
     const dataToFilter = Array.isArray(sourceData) ? sourceData : [];
    return type === 'mixed' ? [...dataToFilter] : dataToFilter.filter(q => q.type === type);
}

function updateAvailableCountAndInput() {
     if (!dom.importCheckbox || !dom.availableQuestionsDisplay || !dom.numQuestionsInput) return;

     // Determine which pool to count from
     const useImported = dom.importCheckbox.checked && importedTriviaData.length > 0;
     // If checkbox is checked AND there's data in importedTriviaData, use that.
     // Otherwise (checkbox unchecked OR it's checked but importedTriviaData is empty), use triviaData.
     const source = useImported ? importedTriviaData : triviaData;
     const filteredTriviaData = getFilteredTrivia(source); // Apply type filter
     const count = filteredTriviaData.length;

     setStatus(dom.availableQuestionsDisplay, `(${count} سؤالاً متاحاً ${useImported ? '[من المستورد - سيستبدل الحالي]' : '[من المجموعة الحالية]'})`); // Clarify source meaning

     dom.numQuestionsInput.max = Math.max(1, count); // Set max based on available
     let currentVal = parseInt(dom.numQuestionsInput.value) || 5;
     // Adjust value if it exceeds the new max, but don't go below 1
     dom.numQuestionsInput.value = Math.max(1, Math.min(currentVal, count > 0 ? count : 1));
}

// --- Trivia Data Reset Function ---
function resetTriviaData() {
    console.log("[RESET] Resetting trivia data to defaults.");
    localStorage.removeItem(TRIVIA_STORAGE_KEY); // Clear user saved data
    triviaData = [...defaultFetchedTrivia]; // Reset working data to originally fetched/default
    importedTriviaData = []; // Clear any imported data as well

    // Update UI elements immediately
    updateAvailableCountAndInput();
    if (dom.importCheckbox) dom.importCheckbox.checked = false; // Uncheck import replace
    if (dom.importStatus) dom.importStatus.textContent = ''; // Clear import status
    setStatus(dom.startError, 'تمت إعادة تعيين الأسئلة إلى الافتراضي بنجاح.', 'var(--button-correct-bg)');
     // Clear the error message after a short delay
     setTimeout(() => { if(dom.startError) dom.startError.textContent = ''; }, 3500);

    // If the editor UI is open, refresh its list view
     if (dom.questionEditorUI && dom.questionEditorUI.style.display !== 'none') {
         // Check if the refresh function provided by editor.js exists
         if (typeof window.refreshEditorListView === 'function') {
              window.refreshEditorListView();
              setStatus(dom.editorStatusMessage, 'تمت إعادة التعيين. عرض البيانات الافتراضية.', 'success');
         } else {
             console.warn("Editor refresh function (window.refreshEditorListView) not found after reset.");
         }
     }
    console.log(`[RESET] Trivia data reset. Current count: ${triviaData.length}`);
}

// --- Export Function (Called by Editor via Callback) ---
 function exportTriviaData() {
     try {
         const dataToExport = triviaData; // Export current working data
         const dataString = JSON.stringify(dataToExport, null, 2);
         const blob = new Blob([dataString], { type: 'application/json;charset=utf-8' });
         const url = URL.createObjectURL(blob);
         const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
         const filename = `camp-trivia-questions-${timestamp}.json`;
         const link = document.createElement('a');
         link.href = url; link.download = filename;
         document.body.appendChild(link); link.click(); document.body.removeChild(link);
         URL.revokeObjectURL(url);
         console.log(`[EXPORT] Exported ${dataToExport.length} questions.`);
         // Return status for the editor message
         return { success: true, message: `تم تصدير ${dataToExport.length} سؤالاً إلى ${filename}.` };
     } catch (error) {
         console.error("[EXPORT] Error exporting JSON:", error);
          return { success: false, message: `خطأ في التصدير: ${error.message}` };
     }
 }


// --- Core Game Flow ---
async function startGame() {
     if (!dom.sceneSelector || !dom.startError || !dom.numQuestionsInput || !dom.numTeamsInput || !dom.importCheckbox) {
         console.error("startGame: Missing essential DOM elements.");
         if (dom.startError) setStatus(dom.startError, "خطأ في تحميل عناصر الواجهة.", '#ff8080');
         return;
     }

    // Ensure selected scene is loaded *before* changing phase
    const selectedScene = dom.sceneSelector.value;
    if (currentSceneName !== selectedScene) {
         console.log(`startGame: Scene changed to ${selectedScene}. Loading before starting game...`);
         const sceneReady = await loadAndSetScene(selectedScene);
         if (!sceneReady) {
             setStatus(dom.startError, "فشل تحميل المشهد المحدد. لا يمكن بدء اللعبة.", '#ff8080');
             if(dom.sceneSelector.value !== currentSceneName) dom.sceneSelector.value = currentSceneName ?? NO_SCENE_VALUE;
             return;
         }
         console.log(`startGame: Scene ${selectedScene} loaded successfully.`);
    }
    dom.startError.textContent = '';

    // Determine the source pool for *this game*
    const useImportedForGame = dom.importCheckbox.checked && importedTriviaData.length > 0;
    // If checkbox is checked AND imported data exists, use it. Otherwise, use the main triviaData (which might include appended imports)
    const sourceDataForGame = useImportedForGame ? importedTriviaData : triviaData;
    console.log(`[START] Starting game using ${useImportedForGame ? 'imported (replacement)' : 'current (potentially merged)'} question pool.`);

    currentGameSourcePool = getFilteredTrivia(sourceDataForGame); // Filter based on type selector
    shownQuestionIds = new Set(); // Reset shown questions for the new game

    const count = currentGameSourcePool.length;
    const requested = parseInt(dom.numQuestionsInput.value);
    const numT = parseInt(dom.numTeamsInput.value);

    if (count === 0) return setStatus(dom.startError, `لا توجد أسئلة متاحة ${useImportedForGame ? 'من المستورد ' : ''}بالنوع المحدد...`, '#ff8080');
    if (isNaN(numT) || numT < 1 || numT > 10) return setStatus(dom.startError, 'عدد الفرق غير صالح...', '#ff8080');
    if (isNaN(requested) || requested < 1 || (count > 0 && requested > count)) {
        return setStatus(dom.startError, `عدد الأسئلة المطلوب غير صالح (المتاح: ${count}).`, '#ff8080');
    }

    gameState.teams = [];
    for (let i = 0; i < numT; i++) {
         const teamNameInput = document.getElementById(`tn-${i}`);
        const name = teamNameInput?.value.trim() || `الفريق ${i + 1}`;
        gameState.teams.push({ name: name, score: 0 });
    }

    availableQuestions = shuffleArray([...currentGameSourcePool]).slice(0, requested);
    gameState.totalQuestionsToAsk = availableQuestions.length; // Actual number might be less if pool was small
    gameState.questionsAskedCount = 0;

     if (gameState.totalQuestionsToAsk === 0) {
         console.warn("[START] No questions available for the game after filtering and slicing.");
         return setStatus(dom.startError, 'لم يتم العثور على أسئلة لبدء اللعبة.', '#ff8080');
     }

    updateScoreDisplay();
    nextQuestion(); // This will eventually call setGamePhase('presenting')
}

function nextQuestion() {
    if (gameState.questionsAskedCount >= gameState.totalQuestionsToAsk || gameState.questionsAskedCount >= availableQuestions.length) {
        console.log(`Game complete. Asked: ${gameState.questionsAskedCount}, Total planned: ${gameState.totalQuestionsToAsk}, Available length: ${availableQuestions.length}`);
        return setGamePhase('end');
    }

    gameState.currentQuestion = availableQuestions[gameState.questionsAskedCount];
    gameState.questionsAskedCount++;

    if (!gameState.currentQuestion) {
        console.error(`Error: Retrieved null question at index ${gameState.questionsAskedCount - 1}. Ending game.`);
        return setGamePhase('end');
    }
    if (!gameState.currentQuestion.id) {
         console.error(`Error: Question at index ${gameState.questionsAskedCount - 1} has no ID!`, gameState.currentQuestion);
         gameState.currentQuestion.id = `temp_q_${Date.now()}_${Math.random()}`;
         console.warn(`Assigned temporary ID: ${gameState.currentQuestion.id}`);
    }

    setGamePhase('presenting');
}

function skipQuestion() {
    if (gameState.phase !== 'presenting') return;
    if (!gameState.currentQuestion?.id) {
         console.error("Cannot skip question: Current question or its ID is missing.");
         if (dom.skipButton) dom.skipButton.disabled = true;
         return;
    }

    console.log("Skipping Q:", gameState.currentQuestion.id);
     if (dom.skipButton) dom.skipButton.disabled = true;

    const currentSkippedIndex = gameState.questionsAskedCount - 1;
    shownQuestionIds.add(gameState.currentQuestion.id);

    // Find potential replacements: from original pool for this game, not shown yet, and has a valid ID
    const replacementPool = currentGameSourcePool.filter(q => q.id && !shownQuestionIds.has(q.id));

    if (replacementPool.length > 0) {
        const replacement = replacementPool[Math.floor(Math.random() * replacementPool.length)];
        console.log("Replacing with:", replacement.id);
         shownQuestionIds.add(replacement.id);

        if (currentSkippedIndex >= 0 && currentSkippedIndex < availableQuestions.length) {
             availableQuestions[currentSkippedIndex] = replacement;
             gameState.questionsAskedCount--;
             console.log("Replaying index", currentSkippedIndex);
             nextQuestion();
        } else {
            console.error("Error: Invalid index for skip replacement. Proceeding to next scheduled question.");
             nextQuestion();
        }
    } else {
        console.log("No replacement Qs available. Skipping to next scheduled question (or ending game).");
        nextQuestion();
    }
}


function displayQuestion() {
     if (!dom.questionText || !dom.questionCounter || !dom.choicesContainer || !dom.resultText || !dom.verseDisplay || !dom.verseToggle || !dom.verseContent || !dom.discussionPrompt || !dom.nextButton || !dom.pointAwardContainer || !dom.skipButton) {
         console.error("displayQuestion: Missing essential DOM elements.");
         return;
     }

     const q = gameState.currentQuestion;
     if (!q) { console.error("displayQuestion: No current question."); return; }
     if (!q.question || !Array.isArray(q.choices) || q.choices.length === 0) {
          console.error("displayQuestion: Invalid question structure (missing text or choices). Skipping.", q);
          nextQuestion();
          return;
     }

     shownQuestionIds.add(q.id);
     console.log(`Displaying Q ${gameState.questionsAskedCount}/${gameState.totalQuestionsToAsk}, ID: ${q.id}. Shown set size: ${shownQuestionIds.size}`);

     dom.questionText.textContent = q.question;
     dom.questionCounter.textContent = `السؤال ${gameState.questionsAskedCount}/${gameState.totalQuestionsToAsk}`;
     dom.resultText.textContent = '';
     dom.verseDisplay.style.display = 'none'; dom.verseToggle.onclick = null;

     if (q.verse) {
         dom.verseContent.textContent = q.verse; dom.verseContent.style.display = 'none';
         dom.verseToggle.textContent = "إظهار الشاهد"; dom.verseDisplay.style.display = 'block';
         dom.verseToggle.onclick = () => {
             const hidden = dom.verseContent.style.display === 'none';
             dom.verseContent.style.display = hidden ? 'block' : 'none';
             dom.verseToggle.textContent = hidden ? 'إخفاء الشاهد' : 'إظهار الشاهد';
         };
     } else {
          dom.verseDisplay.style.display = 'none';
     }

     dom.choicesContainer.innerHTML = '';
     const shuffledChoices = shuffleArray([...q.choices]);
     shuffledChoices.forEach(choice => {
          if (choice && choice.text) {
              const button = document.createElement('button');
              button.className = 'choice-button';
              button.dataset.choiceText = choice.text;
              button.textContent = choice.text;
              button.onclick = () => handleVote(choice.text);
              dom.choicesContainer.appendChild(button);
          } else {
              console.warn(`displayQuestion: Invalid choice object for Q ID ${q.id}:`, choice);
          }
     });

    const sceneAction = (action, ...args) => {
         if (currentSceneModule?.[action] && typeof currentSceneModule[action] === 'function') {
             try { currentSceneModule[action](...args); }
             catch(e){ console.error(`Scene action "${action}" error:`, e); }
         }
    };
    sceneAction('updateChoiceOrbsVisuals', shuffledChoices);

     dom.discussionPrompt.style.display = 'block';
     dom.nextButton.classList.add('disabled');
     dom.pointAwardContainer.innerHTML = '';
     dom.skipButton.style.display = 'inline-block';
     dom.skipButton.disabled = false;
}

function handleVote(selectedChoiceText) {
    if (gameState.phase !== 'presenting') return;
     if (!dom.choicesContainer || !dom.resultText || !dom.discussionPrompt || !dom.skipButton) {
         console.error("handleVote: Missing essential DOM elements.");
         return;
     }

    gameState.phase = 'voted';
    const q = gameState.currentQuestion;
    if (!q || !q.correct) { console.error("handleVote: No current question or correct answer defined."); return; }
    const correctChoiceText = q.correct;
    const isCorrect = selectedChoiceText === correctChoiceText;

    dom.choicesContainer.querySelectorAll('.choice-button').forEach(btn => {
        btn.classList.add('disabled'); btn.onclick = null;
        const choiceText = btn.dataset.choiceText;
        if (choiceText === correctChoiceText) {
            btn.classList.add('correct');
        } else if (choiceText === selectedChoiceText) {
            btn.classList.add('incorrect');
        }
    });

     const sceneAction = (action, ...args) => {
         if (currentSceneModule?.[action] && typeof currentSceneModule[action] === 'function') {
             try { currentSceneModule[action](...args); }
             catch(e){ console.error(`Scene action "${action}" error:`, e); }
         }
    };
    const choicesData = Array.from(dom.choicesContainer.querySelectorAll('.choice-button')).map(b => b.dataset.choiceText);
    sceneAction('updateChoiceOrbsVisuals', choicesData, correctChoiceText, selectedChoiceText);

    setStatus(dom.resultText, isCorrect ? "صحيح!" : `خطأ. الصحيح: ${correctChoiceText}`);
    dom.discussionPrompt.style.display = 'none';
    dom.skipButton.style.display = 'none';

    setTimeout(() => {
         if (gameState.phase === 'voted') {
             setGamePhase('scoring');
         }
    }, 500);
}

function displayPointAwardButtons() {
     if (!dom.pointAwardContainer || !dom.nextButton) {
         console.error("displayPointAwardButtons: Missing essential DOM elements.");
         return;
     }
    dom.pointAwardContainer.innerHTML = gameState.teams.map((team, i) =>
        `<button class="award-button" data-team-index="${i}">نقطة لـ ${team.name || `الفريق ${i+1}`}</button>`
    ).join('') + `<button class="award-button no-points" data-team-index="-1">لا نقاط</button>`;

    dom.pointAwardContainer.querySelectorAll('.award-button').forEach(btn => {
        btn.onclick = () => awardPoint(parseInt(btn.dataset.teamIndex));
    });
    dom.nextButton.classList.add('disabled');
}

function awardPoint(teamIndex) {
    if (gameState.phase !== 'scoring') return;
     if (!dom.pointAwardContainer || !dom.nextButton) {
         console.error("awardPoint: Missing essential DOM elements.");
         return;
     }

    gameState.phase = 'scored';
    if (teamIndex >= 0 && teamIndex < gameState.teams.length) {
        gameState.teams[teamIndex].score++;
        console.log(`Point awarded to ${gameState.teams[teamIndex].name}. New score: ${gameState.teams[teamIndex].score}`);
        updateScoreDisplay();
    } else {
        console.log("No points awarded for this question.");
    }

    dom.pointAwardContainer.querySelectorAll('.award-button').forEach(btn => {
         btn.disabled = true;
         btn.onclick = null;
         btn.classList.add('disabled');
         if (parseInt(btn.dataset.teamIndex) === teamIndex) {
             btn.classList.add('awarded');
         }
    });
    dom.nextButton.classList.remove('disabled');
}

function updateScoreDisplay() {
     if (!dom.scoresList) {
         console.error("updateScoreDisplay: Missing dom.scoresList.");
         return;
     }
    dom.scoresList.innerHTML = gameState.teams.length > 0
        ? gameState.teams.map(t => `<div>${t.name || 'فريق ؟'}: ${t.score}</div>`).join('')
        : "لا فرق بعد.";
}

function displayEndGameSummary() {
     if (!dom.endGameScores || !dom.endGameWinner) {
         console.error("displayEndGameSummary: Missing essential DOM elements.");
         return;
     }
    dom.endGameScores.innerHTML = `<h4>النتائج النهائية:</h4>${gameState.teams.map(t => `<div>${t.name || 'فريق ؟'}: ${t.score}</div>`).join('')}`;

    let winningScore = -Infinity;
    let winners = [];
    gameState.teams.forEach(t => {
         if (t.score > winningScore) {
              winningScore = t.score;
              winners = [t.name || 'فريق ؟'];
          } else if (t.score === winningScore) {
              winners.push(t.name || 'فريق ؟');
          }
    });

    let winnerMsg = "";
    if (winners.length === 0 || winningScore <= 0) { // Adjusted condition slightly
         winnerMsg = "لا يوجد فائز!";
     } else if (winners.length === 1) {
         winnerMsg = `الفائز: ${winners[0]}!`;
     } else {
         winnerMsg = `تعادل بين: ${winners.join(', ')}!`;
     }
    setStatus(dom.endGameWinner, winnerMsg);
}


// --- Event Listeners ---
function addEventListeners() {
    // Theme & Scene
    if (dom.themeSelector) dom.themeSelector.addEventListener('change', (e) => applyTheme(e.target.value));
    if (dom.sceneSelector) {
         dom.sceneSelector.addEventListener('change', (e) => {
             const newScene = e.target.value;
             console.log(`[SCENE] User selected: ${newScene}. Loading if in setup phase.`);
             if (gameState.phase === 'setup') {
                 loadAndSetScene(newScene).catch(err => console.error("Error loading scene from setup change:", err));
             } else {
                 localStorage.setItem(SCENE_STORAGE_KEY, newScene);
                 console.log(`[SCENE] Preference saved: ${newScene}. Will load on next setup.`);
             }
         });
     }

    // Setup Screen Controls
    if (dom.numTeamsInput) dom.numTeamsInput.addEventListener('change', generateTeamNameInputs);
    if (dom.startButton) dom.startButton.addEventListener('click', startGame);
    if (dom.questionTypeRadios) dom.questionTypeRadios.forEach(radio => radio.addEventListener('change', updateAvailableCountAndInput));
    if (dom.importCheckbox) dom.importCheckbox.addEventListener('change', updateAvailableCountAndInput);
    if (dom.importButton) dom.importButton.addEventListener('click', handleFileImport);
    if (dom.fileInput) {
         dom.fileInput.addEventListener('change', () => {
             const count = dom.fileInput.files?.length || 0;
             // Reset status on new file selection before import click
             setStatus(dom.importStatus, count > 0 ? `${count} ملف(ات) جاهز للاستيراد.` : '');
         });
     }
    if (dom.numQuestionsInput) dom.numQuestionsInput.addEventListener('input', updateAvailableCountAndInput);

    // Editor Trigger Button
    if (dom.openUiEditorButton) dom.openUiEditorButton.addEventListener('click', openEditor);

    // Reset Button Listener
     if (dom.resetQuestionsButton) {
         dom.resetQuestionsButton.addEventListener('click', () => {
             if (confirm("هل أنت متأكد أنك تريد إعادة تعيين جميع الأسئلة إلى الوضع الافتراضي؟ سيتم فقد أي تعديلات محفوظة.")) {
                 resetTriviaData();
             }
         });
     }

    // Gameplay Buttons
    if (dom.skipButton) dom.skipButton.addEventListener('click', skipQuestion);
    if (dom.nextButton) dom.nextButton.addEventListener('click', () => {
         if (!dom.nextButton.classList.contains('disabled')) {
              nextQuestion();
         } else {
             console.log("Next button clicked but disabled (likely waiting for point award).");
         }
    });
    if (dom.restartButton) {
         dom.restartButton.addEventListener('click', () => {
            const sceneToLoad = dom.sceneSelector ? dom.sceneSelector.value : localStorage.getItem(SCENE_STORAGE_KEY) || defaultSceneName;
            console.log(`Restarting: Attempting to load scene '${sceneToLoad}'...`);
            loadAndSetScene(sceneToLoad).finally(() => {
                 console.log("Scene load attempt finished (success or fallback), setting phase to setup.");
                 setGamePhase('setup');
            });
        });
     }

     // Window Resize for 3D scene
     window.addEventListener('resize', () => {
         if (currentSceneModule?.resizeScene && typeof currentSceneModule.resizeScene === 'function') {
             try {
                 currentSceneModule.resizeScene();
             }
             catch(e){ console.warn(`Error during resize for scene "${currentSceneName}":`, e); }
         }
     }, false);
}

// --- Assign DOM Elements ---
function assignDomElements() {
    // Assign Game Elements
    dom.body = document.body;
    dom.canvasContainer = document.getElementById('canvas-container');
    dom.uiContainer = document.getElementById('ui-container');
    dom.themeSelector = document.getElementById('theme-selector');
    dom.sceneSelector = document.getElementById('scene-selector');
    dom.loadingText = document.getElementById('loading-text');
    dom.startConfig = document.getElementById('start-config');
    dom.questionContainer = document.getElementById('question-container');
    dom.resultContainer = document.getElementById('result-container');
    dom.endGame = document.getElementById('end-game');
    dom.questionText = document.getElementById('question-text');
    dom.questionCounter = document.getElementById('question-counter');
    dom.choicesContainer = document.getElementById('choices-container');
    dom.resultText = document.getElementById('result-text');
    dom.verseDisplay = document.getElementById('verse-display');
    dom.verseToggle = document.getElementById('verse-toggle');
    dom.verseContent = document.getElementById('verse-content');
    dom.pointAwardContainer = document.getElementById('point-award-container');
    dom.nextButton = document.getElementById('next-button');
    dom.skipButton = document.getElementById('skip-button');
    dom.startButton = document.getElementById('start-button');
    dom.restartButton = document.getElementById('start-button-restart');
    dom.discussionPrompt = document.getElementById('discussion-prompt');
    dom.scoreDisplay = document.getElementById('score-display');
    dom.scoresList = document.getElementById('scores-list');
    dom.numTeamsInput = document.getElementById('num-teams');
    dom.teamNamesContainer = document.getElementById('team-names-container');
    dom.numQuestionsInput = document.getElementById('num-questions');
    dom.startError = document.getElementById('start-error');
    dom.availableQuestionsDisplay = document.getElementById('available-questions-count');
    dom.endGameScores = document.getElementById('end-game-scores');
    dom.endGameWinner = document.getElementById('end-game-winner');
    dom.questionTypeRadios = document.querySelectorAll('input[name="question_type"]');
    dom.fileInput = document.getElementById('file-input');
    dom.importButton = document.getElementById('import-button');
    dom.importCheckbox = document.getElementById('import-replace-checkbox');
    dom.importStatus = document.getElementById('import-status');

    // Assign NEW Editor UI Elements
    dom.questionEditorUI = document.getElementById('question-editor-ui');
    dom.editorStatusMessage = document.getElementById('editor-status-message');
    dom.editorViewContainer = document.getElementById('editor-view-container');
    dom.questionListView = document.getElementById('question-list-view');
    dom.questionListViewTitleCount = document.getElementById('editor-question-count');
    dom.addNewQuestionButton = document.getElementById('add-new-question-button');
    dom.questionListContainer = document.getElementById('question-list-container');
    dom.questionEditFormView = document.getElementById('question-edit-form-view');
    dom.editFormTitle = document.getElementById('edit-form-title');
    dom.questionEditForm = document.getElementById('question-edit-form');
    dom.editQId = document.getElementById('edit-q-id');
    dom.editQText = document.getElementById('edit-q-text');
    dom.editQChoicesContainer = document.getElementById('edit-q-choices-container');
    dom.addChoiceButton = document.getElementById('add-choice-button');
    dom.editQVerse = document.getElementById('edit-q-verse');
    dom.editQType = document.getElementById('edit-q-type');
    dom.saveEditedQuestionButton = document.getElementById('save-edited-question-button');
    dom.cancelEditQuestionButton = document.getElementById('cancel-edit-question-button');
    dom.exportQuestionsButtonUI = document.getElementById('export-questions-button-ui');
    dom.closeUiEditorButton = document.getElementById('close-ui-editor-button');
    dom.openUiEditorButton = document.getElementById('open-ui-editor-button');
    dom.deleteAllQuestionsButton = document.getElementById('delete-all-questions-button');

    // Assign Reset Button
    dom.resetQuestionsButton = document.getElementById('reset-questions-button');

    // Critical element check
    const criticalElements = [
        dom.body, dom.uiContainer, dom.loadingText, dom.startConfig,
        dom.questionEditorUI, dom.openUiEditorButton, dom.resetQuestionsButton,
        dom.importCheckbox, dom.importStatus, dom.importButton // Check import elements too
    ];
    if (criticalElements.some(el => !el)) {
         console.error("CRITICAL DOM ERROR: Essential UI elements not found!", dom);
         if (dom.loadingText) { setStatus(dom.loadingText, "خطأ فادح في تحميل الواجهة!", "#f00"); dom.loadingText.classList.add('visible'); }
         else { alert("CRITICAL DOM ERROR! Please reload."); }
         return false; // Indicate failure
     }
    return true; // Indicate success
}

// --- Start the game ---
document.addEventListener('DOMContentLoaded', () => {
     console.log("DOM fully loaded and parsed.");
     const elementsAssigned = assignDomElements();
     if (elementsAssigned) {
         console.log("DOM elements assigned. Initializing game...");
         init().catch(initError => {
              console.error("CRITICAL INIT ERROR:", initError);
              setStatus(dom.loadingText || document.body, "خطأ فادح جداً أثناء التهيئة!", "#f00");
         });
     } else {
         console.error("Game initialization aborted due to missing critical DOM elements.");
     }
});