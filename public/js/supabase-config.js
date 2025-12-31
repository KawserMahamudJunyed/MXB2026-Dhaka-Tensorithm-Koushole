
// Supabase Client Initialization
// NOTE: Replace these values with your actual project URL and Anon Key from Supabase Dashboard.
// For Vercel, you can also inject these if you have a build step, but for vanilla JS, 
// we often read them from a window config or hardcode the PUBLIC key (Anon key is safe for client side).

const SUPABASE_URL = 'https://iexolpurphniznxurjdh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlleG9scHVycGhuaXpueHVyamRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwOTg3ODIsImV4cCI6MjA4MjY3NDc4Mn0.-3krAlaNs2q2tU7wSnsmPkf_YOdB-OR0nexJabz8S34';

let supabaseConfig; // Initialize supabaseConfig

console.log("Supabase Config Loading...");

function initSupabase() {
    try {
        if (typeof supabase !== 'undefined') {
            console.log("Supabase found via global variable");
            supabaseConfig = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } else if (window.supabase) {
            console.log("Supabase found via window.supabase");
            supabaseConfig = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } else {
            console.error("Supabase Global NOT found. Script loaded?");
            // Final fallback check
            if (window.supabaseClient) return; // Already set?
            alert("Error: Supabase Library not loaded. Please allow scripts or check connection.");
        }
    } catch (err) {
        console.error("Supabase Init Error:", err);
    }

    // Export for usage in app.js
    window.supabaseClient = supabaseConfig;
    console.log("window.supabaseClient set to:", window.supabaseClient);

    // Trigger auth check if app.js is already waiting? 
    // Usually app.js runs after, but let's be safe.
}

// Initialize on load to ensure script is parsed
window.addEventListener('load', initSupabase);
