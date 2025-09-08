import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

export const BLUEPRINTS = {};

for (const file of fs.readdirSync(__dirname)) {
  if (file.endsWith('.json')) {
    const blueprint = JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf-8'));
    const name = path.basename(file, '.json').toLowerCase(); 
    BLUEPRINTS[name] = blueprint;
  }
}
