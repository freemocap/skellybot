import { loadEnvironmentVariables } from '../server-scraper/services/envService';

import * as fs from 'fs';

const envVariables = loadEnvironmentVariables('../env.analysis');

const studentIdentifiersPath = envVariables.STUDENT_IDENTIFIERS_JSON;

if (!fs.existsSync(studentIdentifiersPath)) {
  console.error(`Error: JSON file does not exist: ${studentIdentifiersPath}`);
  process.exit(1);
}
console.log(`Reading student identifiers from ${studentIdentifiersPath}`);
// Read the student identifiers JSON file
const studentIdentifiers = JSON.parse(
  fs.readFileSync(studentIdentifiersPath, 'utf8'),
);
console.log(studentIdentifiers);
