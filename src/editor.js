// --- START OF FILE editor.js ---

// Module scope variables to hold dependencies
let _dom = null;
let _getTriviaData = null;
let _setTriviaData = null;
let _processJsonData = null; // Keep for potential validation on save
let _updateUICallback = null; // Main script's function to update counts etc.
let _resetCallback = null;     // Main script's function for full reset
let _storageKey = null;
let _exportDataCallback = null; // Main script's function to handle export logic

/**
 * Initializes the NEW UI-based editor module.
 */
export function initEditor(config) {
    _dom = config.dom; // Expects dom with NEW UI element IDs
    _getTriviaData = config.getTriviaData;
    _setTriviaData = config.setTriviaData;
    _processJsonData = config.processJsonData;
    _updateUICallback = config.updateUICallback;
    _resetCallback = config.resetCallback; // Still useful via start screen button
    _storageKey = config.storageKey;
    _exportDataCallback = config.exportDataCallback;

    // --- Add Internal Event Listeners for the NEW UI ---
    if (!_dom.questionEditorUI) {
        console.error("[EDITOR] Critical: Editor UI container not found!");
        return;
    }

    // Buttons within the editor UI
    _dom.addNewQuestionButton?.addEventListener('click', () => showEditForm(null));
    _dom.addChoiceButton?.addEventListener('click', () => addChoiceInput());
    _dom.cancelEditQuestionButton?.addEventListener('click', showListView); // Go back to list
    _dom.closeUiEditorButton?.addEventListener('click', closeEditor);
    _dom.exportQuestionsButtonUI?.addEventListener('click', handleExportClick);
	_dom.deleteAllQuestionsButton?.addEventListener('click', handleDeleteAllQuestions);

    // Form submission
    _dom.questionEditForm?.addEventListener('submit', handleSaveQuestion);

    // Delegate listeners for dynamically added buttons (Edit/Delete/Remove Choice)
    _dom.questionListContainer?.addEventListener('click', handleListAction);
    _dom.editQChoicesContainer?.addEventListener('click', handleChoiceAction);

     // Expose refresh function globally (simple approach)
     window.refreshEditorListView = populateQuestionList;


    console.log("[EDITOR-UI] Initialized.");
}

// --- Editor State ---
let currentEditId = null; // ID of the question being edited, or null if adding

// --- Utility Functions ---
function setEditorStatus(msg, type = 'info') { // type: 'info', 'success', 'error'
    if (_dom.editorStatusMessage) {
        _dom.editorStatusMessage.textContent = msg;
        _dom.editorStatusMessage.className = `status-message status-${type}`; // Use classes for styling
         // Clear message after a delay for info/success
         if (type !== 'error') {
             setTimeout(() => {
                 if (_dom.editorStatusMessage && _dom.editorStatusMessage.textContent === msg) {
                     _dom.editorStatusMessage.textContent = '';
                     _dom.editorStatusMessage.className = 'status-message';
                 }
             }, 3500);
         }
    }
}

// --- View Switching ---
function showListView() {
    if (_dom.questionListView && _dom.questionEditFormView) {
        _dom.questionListView.style.display = 'block';
        _dom.questionEditFormView.style.display = 'none';
        setEditorStatus(""); // Clear status when switching views
        // Scroll container back to top
         if (_dom.editorViewContainer) _dom.editorViewContainer.scrollTop = 0;
    }
}

function showEditFormView() {
     if (_dom.questionListView && _dom.questionEditFormView) {
        _dom.questionListView.style.display = 'none';
        _dom.questionEditFormView.style.display = 'block';
         setEditorStatus(""); // Clear status when switching views
          // Scroll container back to top
         if (_dom.editorViewContainer) _dom.editorViewContainer.scrollTop = 0;

         // --- START FIX/DEBUG ---
         // Explicitly ensure text inputs and textareas within the form are enabled
         // just before the view becomes fully interactive.
         try {
            const textInputs = _dom.questionEditFormView.querySelectorAll('input[type="text"], textarea');
            let reEnabledCount = 0;
            textInputs.forEach(input => {
                if (input.disabled) {
                    console.warn("[EDITOR-FIX] Input was disabled, re-enabling:", input.id || input.placeholder);
                    input.disabled = false;
                    reEnabledCount++;
                }
                if (input.readOnly) {
                     console.warn("[EDITOR-FIX] Input was readOnly, removing readOnly:", input.id || input.placeholder);
                     input.readOnly = false;
                     reEnabledCount++;
                }
            });
            if (reEnabledCount > 0) {
                 console.log(`[EDITOR-FIX] Re-enabled ${reEnabledCount} input(s).`);
            }
             // Optionally, try focusing the first input
             const firstInput = _dom.editQText; // The main question textarea
             if (firstInput && document.activeElement !== firstInput) {
                 // Don't steal focus if user might be clicking elsewhere quickly
                 // setTimeout(() => firstInput.focus(), 0);
             }
         } catch (e) {
             console.error("[EDITOR-FIX] Error during input enable check:", e);
         }
         // --- END FIX/DEBUG ---
    }
}


// --- List Population ---
function populateQuestionList() {
    if (!_dom.questionListContainer || !_getTriviaData || !_dom.questionListViewTitleCount) return;

    const questions = _getTriviaData();
    _dom.questionListContainer.innerHTML = ''; // Clear existing list
     _dom.questionListViewTitleCount.textContent = questions.length; // Update count

    if (questions.length === 0) {
        _dom.questionListContainer.innerHTML = '<li class="editor-list-empty">لا توجد أسئلة حالياً.</li>';
        return;
    }

    questions.forEach(q => {
        const li = document.createElement('li');
        li.className = 'question-list-item';
        li.dataset.id = q.id; // Store ID on the list item

        const textSpan = document.createElement('span');
        textSpan.className = 'question-item-text';
        textSpan.textContent = q.question.length > 100 ? q.question.substring(0, 97) + '...' : q.question; // Truncate long questions

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'question-item-actions';

        const editButton = document.createElement('button');
        editButton.textContent = 'تعديل';
        editButton.className = 'edit-question-btn';
        editButton.dataset.id = q.id; // Store ID on button too

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'حذف';
        deleteButton.className = 'delete-question-btn warning-action';
        deleteButton.dataset.id = q.id; // Store ID on button

        actionsDiv.appendChild(editButton);
        actionsDiv.appendChild(deleteButton);
        li.appendChild(textSpan);
        li.appendChild(actionsDiv);

        _dom.questionListContainer.appendChild(li);
    });
}

// --- Edit Form Handling ---

// Shows the form, pre-filled if questionId is provided
function showEditForm(questionId) {
    currentEditId = questionId;
    resetEditForm();

    if (questionId) {
        // --- Editing Existing Question ---
        const questions = _getTriviaData();
        const question = questions.find(q => q.id === questionId);
        if (!question) {
            setEditorStatus(`خطأ: لم يتم العثور على السؤال بالمعرف ${questionId}`, 'error');
            return;
        }

        if (_dom.editFormTitle) _dom.editFormTitle.textContent = "تعديل سؤال";
        if (_dom.editQId) _dom.editQId.value = question.id;
        if (_dom.editQText) _dom.editQText.value = question.question;
        if (_dom.editQVerse) _dom.editQVerse.value = question.verse || '';
        if (_dom.editQType) _dom.editQType.value = question.type || 'normal';

        // Populate choices
        question.choices.forEach((choice, index) => {
            addChoiceInput(choice.text, choice.text === question.correct);
        });

    } else {
        // --- Adding New Question ---
        if (_dom.editFormTitle) _dom.editFormTitle.textContent = "إضافة سؤال جديد";
        // Add 2 default empty choices
        addChoiceInput('', false);
        addChoiceInput('', false);
        if (_dom.editQType) _dom.editQType.value = 'normal'; // Default type
    }

    showEditFormView(); // Switch to the form view
}

// Resets the form fields
function resetEditForm() {
    if(_dom.questionEditForm) _dom.questionEditForm.reset(); // Basic reset
    if(_dom.editQId) _dom.editQId.value = '';
    if(_dom.editQText) _dom.editQText.value = '';
    if(_dom.editQVerse) _dom.editQVerse.value = '';
    if(_dom.editQChoicesContainer) _dom.editQChoicesContainer.innerHTML = ''; // Clear dynamic choices
    currentEditId = null;
}

// Adds a choice input row to the form
function addChoiceInput(text = '', isCorrect = false) {
    if (!_dom.editQChoicesContainer) return;

    const choiceIndex = _dom.editQChoicesContainer.children.length;

    const div = document.createElement('div');
    div.className = 'choice-edit-item';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'correct_choice_radio'; // Group radios
    radio.value = choiceIndex; // Use index as value temporarily
    radio.checked = isCorrect;
    radio.required = true; // Ensure one is selected

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'edit-q-choice-input';
    input.placeholder = `نص الخيار ${choiceIndex + 1}`;
    input.value = text;
    input.required = true; // Ensure choices have text

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '\u00D7'; // Multiplication sign (X)
    removeBtn.className = 'remove-choice-btn';
    removeBtn.title = 'إزالة الخيار';

    div.appendChild(radio);
    div.appendChild(input);
    div.appendChild(removeBtn);
    _dom.editQChoicesContainer.appendChild(div);

    // Renumber radio values after adding (important if choices are removed)
    renumberChoiceRadioValues();
}

// Removes a choice input row
function removeChoiceInput(buttonElement) {
    const choiceItem = buttonElement.closest('.choice-edit-item');
    // Prevent removing if only 1 or 2 choices left (optional, adjust as needed)
    if (_dom.editQChoicesContainer && _dom.editQChoicesContainer.children.length <= 2) {
        setEditorStatus("يجب أن يكون هناك خياران على الأقل.", 'error');
        return;
    }
    if (choiceItem) {
        choiceItem.remove();
        // Renumber radio values after removal
        renumberChoiceRadioValues();
    }
}

// Ensures radio button values correspond to their current index
function renumberChoiceRadioValues() {
    if (!_dom.editQChoicesContainer) return;
    const radios = _dom.editQChoicesContainer.querySelectorAll('input[type="radio"]');
    radios.forEach((radio, index) => {
        radio.value = index;
    });
}

// --- Event Handlers ---

// Handles clicks within the question list (Edit/Delete)
function handleListAction(event) {
    const target = event.target;
    const questionId = target.dataset.id;

    if (!questionId) return; // Clicked somewhere else

    if (target.classList.contains('edit-question-btn')) {
        showEditForm(questionId);
    } else if (target.classList.contains('delete-question-btn')) {
        handleDeleteQuestion(questionId);
    }
}

// Handles clicks within the choices container (Remove button)
function handleChoiceAction(event) {
     const target = event.target;
     if (target.classList.contains('remove-choice-btn')) {
         removeChoiceInput(target);
     }
}


// Handles the save action (form submission)
function handleSaveQuestion(event) {
    event.preventDefault(); // Prevent default form submission
    if (!_dom.questionEditForm || !_setTriviaData || !_storageKey || !_updateUICallback) return;

    // --- गैदर डेटा ---
    const questionId = _dom.editQId?.value || null;
    const questionText = _dom.editQText?.value.trim();
    const verseText = _dom.editQVerse?.value.trim() || undefined; // Store as undefined if empty
    const questionType = _dom.editQType?.value || 'normal';

    const choiceElements = _dom.editQChoicesContainer?.querySelectorAll('.choice-edit-item');
    const choices = [];
    let correctChoiceText = null;
    let correctIndex = -1;

    const checkedRadio = _dom.editQChoicesContainer?.querySelector('input[type="radio"]:checked');
    if (checkedRadio) {
         correctIndex = parseInt(checkedRadio.value, 10);
    }

    if (choiceElements) {
        choiceElements.forEach((item, index) => {
            const textInput = item.querySelector('.edit-q-choice-input');
            const choiceText = textInput?.value.trim();
            if (choiceText) {
                choices.push({ text: choiceText }); // Add ID later if needed
                if (index === correctIndex) {
                    correctChoiceText = choiceText;
                }
            }
        });
    }

    // --- वेलिडेट ---
    if (!questionText) return setEditorStatus("نص السؤال مطلوب.", 'error');
    if (choices.length < 2) return setEditorStatus("يجب إضافة خيارين على الأقل.", 'error');
    if (correctChoiceText === null) return setEditorStatus("يجب تحديد الإجابة الصحيحة.", 'error');
    if (choices.some(c => !c.text)) return setEditorStatus("جميع الخيارات يجب أن تحتوي على نص.", 'error');


    // --- क्रिएट प्रश्न ऑब्जेक्ट ---
     const newQuestionData = {
        // Generate ID only if it's a new question
        id: questionId || `q_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        question: questionText,
        choices: choices.map((c, i) => ({ ...c, id: `${questionId || 'new'}_c${i}` })), // Simple choice IDs
        correct: correctChoiceText,
        verse: verseText,
        type: questionType
    };

     // --- अपडेट डेटा ---
     let currentData = _getTriviaData();
     let updated = false;
     if (questionId) { // Editing existing
         const index = currentData.findIndex(q => q.id === questionId);
         if (index !== -1) {
             currentData[index] = newQuestionData;
             updated = true;
             setEditorStatus("تم تحديث السؤال بنجاح.", 'success');
         } else {
             return setEditorStatus(`خطأ: لم يتم العثور على السؤال الأصلي للتحديث (ID: ${questionId})`, 'error');
         }
     } else { // Adding new
         currentData.push(newQuestionData);
         updated = true;
         setEditorStatus("تمت إضافة السؤال بنجاح.", 'success');
     }

     // --- सेव & अपडेट यूआई ---
     if (updated) {
         _setTriviaData(currentData); // Update main script's data
         localStorage.setItem(_storageKey, JSON.stringify(currentData)); // Save to localStorage
         _updateUICallback(); // Update count in setup screen etc.
         populateQuestionList(); // Refresh the editor's list view
         showListView(); // Switch back to the list view
     }
}

// Handles the delete action
function handleDeleteQuestion(questionId) {
    if (!questionId || !_setTriviaData || !_storageKey || !_updateUICallback) return;

    if (confirm(`هل أنت متأكد من حذف هذا السؤال؟ لا يمكن التراجع عن هذا الإجراء.`)) {
        let currentData = _getTriviaData();
        const initialLength = currentData.length;
        currentData = currentData.filter(q => q.id !== questionId);

        if (currentData.length < initialLength) {
            _setTriviaData(currentData); // Update main script's data
            localStorage.setItem(_storageKey, JSON.stringify(currentData)); // Save to localStorage
            _updateUICallback(); // Update count in setup screen etc.
            populateQuestionList(); // Refresh the editor's list view
            setEditorStatus("تم حذف السؤال بنجاح.", 'success');
        } else {
             setEditorStatus(`خطأ: لم يتم العثور على السؤال للحذف (ID: ${questionId})`, 'error');
        }
    }
}

// Deleting ALL Questions ---
function handleDeleteAllQuestions() {
    if (!_setTriviaData || !_storageKey || !_updateUICallback || !_getTriviaData) {
        setEditorStatus("خطأ: لا يمكن تنفيذ الحذف، مكونات داخلية مفقودة.", 'error');
        return;
    }

    const currentData = _getTriviaData();
    if (currentData.length === 0) {
        setEditorStatus("لا توجد أسئلة لحذفها.", 'info');
        return;
    }

    // --- CRITICAL CONFIRMATION ---
    if (confirm(`!! تحذير !!\nهل أنت متأكد تماماً من حذف *جميع* (${currentData.length}) الأسئلة؟\n\nلا يمكن التراجع عن هذا الإجراء.`)) {
        console.log(`[EDITOR-UI] Deleting all ${currentData.length} questions.`);
        _setTriviaData([]); // Update main script's data to an empty array
        localStorage.setItem(_storageKey, JSON.stringify([])); // Update localStorage
        _updateUICallback(); // Update count in setup screen etc.
        populateQuestionList(); // Refresh the editor's list view (will show empty)
        setEditorStatus(`تم حذف جميع الأسئلة (${currentData.length}) بنجاح.`, 'success');
    } else {
        console.log("[EDITOR-UI] Delete all questions cancelled by user.");
        setEditorStatus("تم إلغاء عملية الحذف.", 'info');
    }
}

// Handles click on the Export button within the UI Editor
function handleExportClick() {
    if (_exportDataCallback) {
        const result = _exportDataCallback(); // Call the main script's export function
        if (result && result.message) {
             setEditorStatus(result.message, result.success ? 'success' : 'error');
        }
    } else {
        setEditorStatus("خطأ: وظيفة التصدير غير متاحة.", 'error');
    }
}


// --- Public Functions (Called by main script) ---

export function openEditor() {
    if (!_dom.questionEditorUI || !_dom.startConfig) return;
    console.log("[EDITOR-UI] Opening editor.");
    populateQuestionList(); // Load current questions into the list
    showListView(); // Ensure list view is shown first
    _dom.questionEditorUI.style.display = 'flex'; // Use flex for alignment
    _dom.questionEditorUI.classList.add('visible');
    _dom.startConfig.classList.remove('visible'); // Hide setup
    setEditorStatus(''); // Clear any previous status
}

export function closeEditor() {
    if (!_dom.questionEditorUI || !_dom.startConfig) return;
    console.log("[EDITOR-UI] Closing editor.");
    _dom.questionEditorUI.style.display = 'none';
    _dom.questionEditorUI.classList.remove('visible');
    _dom.startConfig.classList.add('visible'); // Show setup again
}

// --- END OF FILE editor.js ---