import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://iexolpurphniznxurjdh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlleG9scHVycGhuaXpueHVyamRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwOTg3ODIsImV4cCI6MjA4MjY3NDc4Mn0.-3krAlaNs2q2tU7wSnsfPkf_YOdB-OR0nexJabz8S34';

console.log("Supabase Config Loading (ES Module)...");

try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = supabase;
    console.log("Supabase Client initialized and attached to window.");
} catch (err) {
    console.error("Supabase Init Error:", err);
    alert("Critical Error: Supabase failed to initialize.");
}
