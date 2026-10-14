import * as fs from 'fs';
import * as path from 'path';
import { IngestionService } from './ingestion/ingestion.service';

async function main() {
  const jsonPath = process.argv[2] || path.join(__dirname, '../../crawler-service/extracted_sample.json');
  console.log(`[*] Loading extracted JSON from: ${jsonPath}`);

  if (!fs.existsSync(jsonPath)) {
    console.error(`[!] File not found: ${jsonPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const payload = JSON.parse(raw);

  const ingestionService = new IngestionService();
  try {
    const result = await ingestionService.storeExtractedScholarship(payload);
    console.log('[+] SUCCESS! Scholarship saved to PostgreSQL:');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('[!] Ingestion failed:', err);
    process.exit(1);
  }
}

main();

