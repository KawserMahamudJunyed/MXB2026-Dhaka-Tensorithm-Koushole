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

    // Refresh dynamic user data with new language
    if (typeof updateUI === 'function') updateUI();
}

// --- VIEW NAVIGATION ---
function switchTab(viewName) {
    // Special handling for Quiz Tab: Show Config if no quiz running
    if (viewName === 'quiz') {
        const quizContent = document.getElementById('quiz-content');
        const quizResults = document.getElementById('quiz-results');
        // Check if hidden or empty and NO results showing
        if ((quizContent.classList.contains('hidden') || quizContent.innerHTML.trim() === '') && quizResults.classList.contains('hidden')) {
            openQuizConfig();
            return;
        }
    }

    ['dashboard', 'quiz', 'chat', 'profile', 'library'].forEach(v => {
        document.getElementById('view-' + v).classList.add('hidden');
        document.getElementById('nav-' + v).classList.remove('active', 'text-amber');
    });
    document.getElementById('view-' + viewName).classList.remove('hidden');
    document.getElementById('nav-' + viewName).classList.add('active', 'text-amber');
}
