import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDataset } from './lib/validate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'questions.json'), 'utf8'));
const { errors, warnings, counts } = validateDataset(data.questions, {
  imageExists: (img) => fs.existsSync(path.join(ROOT, 'public', img)),
});

console.table(counts);
warnings.forEach((w) => console.warn(`CẢNH BÁO: ${w}`));
if (errors.length) {
  errors.forEach((e) => console.error(`LỖI: ${e}`));
  process.exit(1);
}
console.log('Dữ liệu hợp lệ.');
