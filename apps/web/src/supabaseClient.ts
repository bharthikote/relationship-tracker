import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !publishableKey) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set");
}

export const supabase = createClient(url, publishableKey);
