import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const envPath = path.join(root, '.env');

if (!fs.existsSync(envPath)) {
  console.warn('No .env file found. Copy .env.example to .env and fill in the project values before running the app.');
  process.exit(0);
}

const content = fs.readFileSync(envPath, 'utf8');
const requiredKeys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missing = requiredKeys.filter((key) => !content.includes(`${key}=`));

if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('Environment file looks configured.');
