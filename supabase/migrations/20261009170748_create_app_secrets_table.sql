/*
# Create app_secrets table

## Purpose
Stores application secrets (e.g., Gemini API keys) that must only be accessible
server-side via the service role key. The browser/frontend never reads from this
table directly — edge functions use the service role to read and write.

## New Tables
- `app_secrets`
  - `key` (text, primary key) — secret identifier (e.g. "gemini_api_key")
  - `value` (text, not null) — the secret value
  - `created_at` (timestamptz, default now()) — row creation timestamp
  - `updated_at` (timestamptz, default now()) — last update timestamp

## Security
- Row Level Security ENABLED on `app_secrets`.
- NO policies are added — the table is only accessible via the service role key
  used inside edge functions. The `anon` and `authenticated` roles cannot read
  or write, ensuring API keys are never exposed to the browser.
*/

CREATE TABLE IF NOT EXISTS app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;
