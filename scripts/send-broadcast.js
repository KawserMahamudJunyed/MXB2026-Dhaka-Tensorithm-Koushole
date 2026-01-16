require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Parse arguments
const title = process.argv[2] || "System Update";
const message = process.argv[3] || "Hello from Koushole Team!";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error("❌ Stats: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env");
    process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function broadcast() {
    console.log(`📢 Broadcasting: [${title}] ${message}`);

    // 1. Fetch all user IDs
    const { data: users, error: fetchError } = await supabase
        .from('profiles')
        .select('user_id');

    if (fetchError) {
        console.error("❌ Failed to fetch users:", fetchError.message);
        return;
    }

    if (!users || users.length === 0) {
        console.warn("⚠️ No users found to broadcast to.");
        return;
    }

    console.log(`👥 Found ${users.length} users.`);

    // 2. Prepare Payload
    const notifications = users.map(u => ({
        user_id: u.user_id,
        type: 'system',
        title: title,
        message: message,
        is_read: false,
        created_at: new Date().toISOString()
    }));

    // 3. Batch Insert
    const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

    if (insertError) {
        console.error("❌ Broadcast failed:", insertError.message);
    } else {
        console.log(`✅ Successfully sent ${users.length} notifications!`);
    }
}

broadcast();
