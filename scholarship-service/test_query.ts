import { ScholarshipService } from './src/scholarship/scholarship.service';

async function main() {
  console.log('[*] Testing ScholarshipService database queries...');
  const service = new ScholarshipService();

  const searchResult = await service.searchScholarships({ page: 1, pageSize: 10 });
  console.log('\n[+] Search Results from PostgreSQL:');
  console.log(JSON.stringify(searchResult, null, 2));

  if (searchResult.items.length > 0) {
    const id = searchResult.items[0].id;
    console.log(`\n[*] Fetching detail for scholarship ID: ${id}...`);
    const detailResult = await service.getScholarship(id);
    console.log('\n[+] Full Scholarship Detail (with Cycle, Rules & Documents):');
    console.log(JSON.stringify(detailResult, null, 2));
  }
}

main().catch(console.error);
