import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
}

// Server-only client (secret key) — verifies user access tokens and can bypass RLS.
// Never expose this client or the secret key to the frontend.
export const supabaseAdmin = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
