import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docsDir = path.resolve(__dirname, '../docs');
const prismaSchemaPath = path.resolve(__dirname, '../packages/database/prisma/schema.prisma');

console.log('----------------------------------------------------');
console.log('    AUTOMATED DOCUMENTATION VALIDATION SUITE        ');
console.log('----------------------------------------------------');

let errorCount = 0;

// 1. Verify docs folder exists and list files
if (!fs.existsSync(docsDir)) {
  console.error('❌ FAIL: docs directory does not exist');
  process.exit(1);
}

const docFiles = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));
console.log(`\n✔ Found ${docFiles.length} documentation files in docs/ folder:`);
docFiles.forEach(f => console.log(`   - ${f}`));

if (docFiles.length < 19) {
  console.error(`❌ FAIL: Expected at least 19 documentation files, found ${docFiles.length}`);
  errorCount++;
}

// 2. Extract models from schema.prisma and check database_schema.md
if (fs.existsSync(prismaSchemaPath)) {
  const schemaContent = fs.readFileSync(prismaSchemaPath, 'utf8');
  const modelRegex = /^model\s+(\w+)\s+\{/gm;
  const models = [];
  let match;
  while ((match = modelRegex.exec(schemaContent)) !== null) {
    models.push(match[1]);
  }

  console.log(`\n✔ Extracted ${models.length} Prisma models from schema.prisma`);

  const dbSchemaDocPath = path.join(docsDir, 'database_schema.md');
  if (fs.existsSync(dbSchemaDocPath)) {
    const dbSchemaDocContent = fs.readFileSync(dbSchemaDocPath, 'utf8');
    let missingModels = 0;
    models.forEach(model => {
      if (!dbSchemaDocContent.includes(model)) {
        console.error(`❌ Missing model in database_schema.md: ${model}`);
        missingModels++;
        errorCount++;
      }
    });

    if (missingModels === 0) {
      console.log(`✔ All ${models.length} Prisma models are accurately documented in database_schema.md!`);
    }
  } else {
    console.error('❌ FAIL: database_schema.md not found');
    errorCount++;
  }
}

// 3. Verify file links in all docs
console.log('\n✔ Verifying internal document links across all markdown files...');
docFiles.forEach(file => {
  const filePath = path.join(docsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  // find links like [text](file:///.../docs/xyz.md) or [xyz.md](xyz.md)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(content)) !== null) {
    const rawTarget = linkMatch[2];
    if (rawTarget.includes('docs/')) {
      const targetBasename = path.basename(rawTarget);
      if (!docFiles.includes(targetBasename)) {
        console.error(`❌ Broken link in ${file}: points to non-existent file '${targetBasename}'`);
        errorCount++;
      }
    }
  }
});

// 4. Verify file naming convention in docs folder (must be lowercase_snake_case)
console.log('\n✔ Verifying documentation file naming conventions (lowercase_snake_case)...');
const snakeCaseRegex = /^[a-z0-9_]+\.md$/;
docFiles.forEach(file => {
  if (file !== 'README.md' && !snakeCaseRegex.test(file)) {
    console.error(`❌ Non-conforming filename in docs/: '${file}'. Must be lowercase_snake_case.md`);
    errorCount++;
  }
});

console.log('\n----------------------------------------------------');
if (errorCount === 0) {
  console.log('✅ ALL AUTOMATED VALIDATION CHECKS PASSED SUCCESSFULLY!');
  console.log('----------------------------------------------------');
  process.exit(0);
} else {
  console.error(`❌ COMPLETED WITH ${errorCount} ERRORS.`);
  console.log('----------------------------------------------------');
  process.exit(1);
}
