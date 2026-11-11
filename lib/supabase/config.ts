// Public values: the URL and publishable key are meant to be shipped to browsers.
// Row Level Security in the database decides what each signed-in user may see.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bjcseowrzyhylhjtozih.supabase.co';
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_RBIRuCoq4hSmRi1RhVrM3A_7N-QEm3j';
/** Accounts are open to the public only once a custom e-mail sender (SMTP) is configured in Supabase. */
export const ACCOUNTS_OPEN = process.env.NEXT_PUBLIC_ACCOUNTS_OPEN === 'true';
