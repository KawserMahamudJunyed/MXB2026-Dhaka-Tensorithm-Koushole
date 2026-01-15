// =====================================================
// QUIZ INITIALIZATION - MUST LOAD BEFORE quiz.js
// =====================================================
// This file ONLY defines the global functions needed for onclick handlers.
// The full implementations are in quiz.js and will overwrite these.
// This prevents "openQuizConfig is not defined" errors.
// =====================================================

console.log('🎯 quiz-init.js loading...');

// Global state for quiz context
window.currentQuizContext = 'General';
window.currentBookName = '';
window.currentBookId = null;
window.currentBookSourceType = 'library';

// =====================================================
// openQuizConfig - Shows the quiz configuration modal
// =====================================================
window.openQuizConfig = function (bookName, presetSubject, presetTopic, bookId, sourceType) {
    console.log('📝 openQuizConfig called:', { bookName, presetSubject, bookId });

    // Set global state
    window.currentQuizContext = bookName ? 'Book' : 'General';
    window.currentBookName = bookName || '';
    window.currentBookId = bookId || null;
    window.currentBookSourceType = sourceType || 'library';

    // Show the modal
    const modal = document.getElementById('quiz-setup-modal');
    if (modal) {
        modal.classList.remove('hidden');

        // Reset form
        const subjectSelect = document.getElementById('config-subject');
        const questionCount = document.getElementById('config-question-count');
        const customCount = document.getElementById('config-custom-count');

        if (subjectSelect) subjectSelect.selectedIndex = 0;
        if (questionCount) questionCount.value = '10';
        if (customCount) {
            customCount.classList.add('hidden');
            customCount.value = '';
        }

        // Set modal title if book-based quiz
        const modalTitle = document.getElementById('modal-book-title');
        if (modalTitle) {
            modalTitle.innerText = bookName ? `Source: ${bookName}` : '';
        }

        console.log('✅ Quiz modal opened');
    } else {
        console.error('❌ quiz-setup-modal not found in DOM!');
    }
};

// =====================================================
// closeQuizConfig - Hides the quiz configuration modal
// =====================================================
window.closeQuizConfig = function () {
    const modal = document.getElementById('quiz-setup-modal');
    if (modal) {
        modal.classList.add('hidden');
        console.log('✅ Quiz modal closed');
    }
};

console.log('✅ quiz-init.js loaded - openQuizConfig is now defined');
console.log('   typeof openQuizConfig:', typeof window.openQuizConfig);
