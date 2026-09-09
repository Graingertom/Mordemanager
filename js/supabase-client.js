/* ============================================================
   MORDEMANAGER
   Supabase Client
   ============================================================ */

/*
 * The publishable key below is safe to ship in client-side code -
 * it identifies the project, but every table it can touch is
 * gated by Row Level Security (see supabase/schema.sql). It is
 * not a secret the way a service-role key would be.
 */

const SUPABASE_URL =
    "https://pveysukjlywqnjlduabf.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_IpUUAbh0zVpRy8QJb-cGEg_EVVR29J1";


const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );
