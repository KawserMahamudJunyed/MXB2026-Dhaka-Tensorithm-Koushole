
// Supabase Client Initialization
// NOTE: Replace these values with your actual project URL and Anon Key from Supabase Dashboard.
// For Vercel, you can also inject these if you have a build step, but for vanilla JS, 
// we often read them from a window config or hardcode the PUBLIC key (Anon key is safe for client side).

const SUPABASE_URL = 'https://iexolpurphniznxurjdh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlleG9scHVycGhuaXpueHVyamRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwOTg3ODIsImV4cCI6MjA4MjY3NDc4Mn0.-3krAlaNs2q2tU7wSnsmPkf_YOdB-OR0nexJabz8S34';

let supabase;

console.log("Supabase Config Loaded");
if (window.supabase) {
    console.log("Supabase Global Found");
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase Client Created: ", !!supabase);
} else {
    console.error("Supabase JS not loaded! window.supabase is undefined.");
}

// Export for usage in app.js
window.supabaseClient = supabase;
