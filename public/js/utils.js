// --- GLOBAL VARIABLES & STATE ---
let currentLang = 'en';
// userMemory is now defined and managed in app.js (per-user storage)

// Helper to translate dynamic strings
function t(key) {
    return translations[currentLang][key] || key;
}

// --- THEME LOGIC ---
function syncThemeIcons() {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    const prefixes = ['', 'landing-', 'auth-'];

    const logo = document.getElementById('app-logo');
    const landingLogo = document.getElementById('landing-logo');

    if (isDark) {
        // Dark Mode Active -> Show SUN (to switch to Light)
        if (logo) logo.src = 'Koushole_White.svg';
        if (landingLogo) landingLogo.src = 'Koushole_White.svg';

        prefixes.forEach(p => {
            const sun = document.getElementById(p + 'icon-sun');
            const moon = document.getElementById(p + 'icon-moon');
            if (moon) moon.classList.add('hidden');
            if (sun) sun.classList.remove('hidden');
        });
    } else {
        // Light Mode Active -> Show MOON (to switch to Dark)
        if (logo) logo.src = 'Koushole_Black.svg';
        if (landingLogo) landingLogo.src = 'Koushole_Black.svg';

        prefixes.forEach(p => {
            const sun = document.getElementById(p + 'icon-sun');
            const moon = document.getElementById(p + 'icon-moon');
            if (sun) sun.classList.add('hidden');
            if (moon) moon.classList.remove('hidden');
        });
    }
}

function toggleTheme() {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
    syncThemeIcons();
}

// Call on load
document.addEventListener('DOMContentLoaded', syncThemeIcons);

function toggleStreak() {
    const streakText = document.getElementById('streak-text');
    streakText.classList.toggle('hidden');
}

function setLanguage(lang) {
    currentLang = lang;
    const body = document.body;

    // Toggle Button Colors for all language switches
    const views = ['', 'landing-', 'auth-']; // Prefixes for buttons in Header, Landing, Auth

    views.forEach(prefix => {
        const btnEn = document.getElementById(prefix + 'btn-en');
        const btnBn = document.getElementById(prefix + 'btn-bn');

        if (btnEn && btnBn) {
            if (lang === 'en') {
                btnEn.classList.add('text-amber');
                btnEn.classList.remove('text-text-secondary');
                btnBn.classList.remove('text-amber');
                btnBn.classList.add('text-text-secondary');
            } else {
                btnBn.classList.add('text-amber');
                btnBn.classList.remove('text-text-secondary');
                btnEn.classList.remove('text-amber');
                btnEn.classList.add('text-text-secondary');
            }
        }
    });

    if (lang === 'en') {
        body.classList.remove('lang-bn');
        body.classList.add('lang-en');
    } else {
        body.classList.remove('lang-en');
        body.classList.add('lang-bn');
    }

    const elements = document.querySelectorAll('[data-key]');
    elements.forEach(el => {
        const key = el.getAttribute('data-key');
        if (translations[lang][key]) {
            if (el.innerHTML.includes('<') && key.startsWith('aiMsg')) {
                el.innerHTML = translations[lang][key];
            } else {
                el.textContent = translations[lang][key];
            }
        }
    });
    document.getElementById('chat-input').placeholder = translations[lang].inputPlaceholder;

    // Translate Class dropdown options
    const classSelect = document.querySelector('select[name="classLevel"]');
    if (classSelect) {
        const classOptions = {
            '9': { en: 'Class 9', bn: '৯ম শ্রেণী' },
            '10': { en: 'Class 10', bn: '১০ম শ্রেণী' },
            '11': { en: 'Class 11', bn: '১১শ শ্রেণী' },
            '12': { en: 'Class 12', bn: '১২শ শ্রেণী' }
        };
        classSelect.querySelectorAll('option').forEach(opt => {
            if (classOptions[opt.value]) {
                opt.textContent = classOptions[opt.value][lang];
            }
        });
    }

    // Translate Group dropdown options
    const groupSelect = document.querySelector('select[name="group"]');
    if (groupSelect) {
        const groupOptions = {
            'Science': { en: 'Science', bn: 'বিজ্ঞান' },
            'Humanities': { en: 'Humanities', bn: 'মানবিক' },
            'Business Studies': { en: 'Business Studies', bn: 'ব্যবসায় শিক্ষা' }
        };
        groupSelect.querySelectorAll('option').forEach(opt => {
            if (groupOptions[opt.value]) {
                opt.textContent = groupOptions[opt.value][lang];
            }
        });
    }

    // Refresh dynamic user data with new language
    if (typeof updateUI === 'function') updateUI();
}

// --- VIEW NAVIGATION ---
// --- VIEW NAVIGATION ---
function switchTab(viewName) {
    try {
        console.log(`Switching to tab: ${viewName}`);

        // Special handling for Quiz Tab: Show Config if no quiz running
        if (viewName === 'quiz') {
            const quizContent = document.getElementById('quiz-content');
            const quizResults = document.getElementById('quiz-results');

            // Check if ANY required element is missing
            if (!quizContent) {
                console.error("Critical: #quiz-content not found!");
                return;
            }
            // If quiz results missing, just log but continue if possible (or stop if critical)
            if (!quizResults) {
                console.error("Critical: #quiz-results not found!");
                // Assuming we fixed HTML, this shouldn't happen, but safety first
            }

            // Check if hidden or empty and NO results showing
            if (quizContent && quizResults) {
                if ((quizContent.classList.contains('hidden') || quizContent.innerHTML.trim() === '') && quizResults.classList.contains('hidden')) {
                    if (typeof openQuizConfig === 'function') {
                        openQuizConfig();
                    } else {
                        console.error("openQuizConfig function not found!");
                    }
                    // Continue to show the view!
                }
            }
        }

        const tabs = ['dashboard', 'quiz', 'chat', 'profile', 'library'];
        tabs.forEach(v => {
            const viewEl = document.getElementById('view-' + v);
            const navEl = document.getElementById('nav-' + v);

            if (viewEl) viewEl.classList.add('hidden');
            if (navEl) navEl.classList.remove('active', 'text-amber');
        });

        const targetView = document.getElementById('view-' + viewName);
        const targetNav = document.getElementById('nav-' + viewName);

        if (targetView) {
            targetView.classList.remove('hidden');
            // Force display style if needed, but Tailwind 'hidden' is usually enough
        } else {
            console.error(`View element #view-${viewName} not found!`);
        }

        if (targetNav) {
            targetNav.classList.add('active', 'text-amber');
        } else {
            console.error(`Nav element #nav-${viewName} not found!`);
        }

    } catch (e) {
        console.error("Error in switchTab:", e);
    }
}
