#!/usr/bin/env node

/**
 * SEPA Review Skill: Verify changes against Woodgrove Transfers house rules.
 * 
 * This skill scans modified/added files and checks them against:
 * 1. Money as integer cents (no floats)
 * 2. Customer display format (formatAmount)
 * 3. IBAN & name masking (maskIban)
 * 4. Error code format (UPPER_SNAKE_CASE)
 * 5. Test coverage (tests added for behavior changes)
 * 6. UMD wrapper (all src/ files)
 * 7. No external dependencies (src/ files only)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================================
// Configuration
// ============================================================================

const RULES = [
  {
    id: 'money-integer-cents',
    title: 'Money as Integer Cents',
    description: 'Amounts must be integers (cents), never floats',
    check: checkMoneyIntegers,
  },
  {
    id: 'customer-display-format',
    title: 'Customer Display Format',
    description: 'Use formatAmount() from src/money.js for display',
    check: checkDisplayFormat,
  },
  {
    id: 'iban-name-masking',
    title: 'IBAN & Name Masking',
    description: 'Never log or return full IBANs/names; mask with maskIban()',
    check: checkIbanNameMasking,
  },
  {
    id: 'error-code-format',
    title: 'Error Code Format',
    description: 'Error codes UPPER_SNAKE_CASE with plain-English messages',
    check: checkErrorCodeFormat,
  },
  {
    id: 'test-coverage',
    title: 'Test Coverage',
    description: 'Every behavior change comes with tests',
    check: checkTestCoverage,
  },
  {
    id: 'umd-wrapper',
    title: 'UMD Wrapper',
    description: 'All src/ files must have UMD wrapper for browser + Node.js',
    check: checkUmdWrapper,
  },
  {
    id: 'no-dependencies',
    title: 'No External Dependencies',
    description: 'No external packages in src/ files',
    check: checkNoDependencies,
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function getModifiedFiles() {
  const cwd = process.cwd();
  const files = new Set();

  try {
    // Staged files
    const staged = execSync('git diff --cached --name-only', { cwd, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    staged.forEach(f => files.add(f));

    // Unstaged files
    const unstaged = execSync('git diff --name-only', { cwd, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    unstaged.forEach(f => files.add(f));

    // Untracked files
    const untracked = execSync('git ls-files --others --exclude-standard', { cwd, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    untracked.forEach(f => files.add(f));
  } catch (e) {
    console.error('Warning: Could not get git status', e.message);
  }

  return Array.from(files).filter(f => f && fs.existsSync(f));
}

function getLineNumber(content, pos) {
  return content.slice(0, pos).split('\n').length;
}

function getContext(content, startLine, endLine, contextLines = 2) {
  const lines = content.split('\n');
  const start = Math.max(0, startLine - contextLines - 1);
  const end = Math.min(lines.length, endLine + contextLines);
  return lines.slice(start, end).map((line, i) => ({
    lineNumber: start + i + 1,
    code: line,
  }));
}

// ============================================================================
// Rule Checks
// ============================================================================

function checkMoneyIntegers(files) {
  const violations = [];
  
  files.forEach(file => {
    if (!file.endsWith('.js')) return;
    if (file.includes('skill') || file.includes('test')) return; // Skip skills and tests
    const content = readFile(file);
    
    // Check for floating-point amount assignments (e.g., amountCents: 123.45, cents / 100)
    const floatPatterns = [
      { pattern: /amountCents\s*[:=]\s*\d+\.\d+/, desc: 'Floating-point in amountCents' },
      { pattern: /amountCents\s*[:=]\s*[\w.]+\s*\/\s*100\b/, desc: 'Division by 100 (float risk)' },
      { pattern: /feeCents\s*[:=]\s*\d+\.\d+/, desc: 'Floating-point in feeCents' },
    ];

    floatPatterns.forEach(({ pattern, desc }) => {
      let match;
      const regex = new RegExp(pattern, 'gm');
      while ((match = regex.exec(content)) !== null) {
        // Skip if in a comment or string literal (e.g., documentation, examples)
        const line = getLineNumber(content, match.index);
        const lineContent = content.split('\n')[line - 1] || '';
        if (lineContent.trim().startsWith('//') || lineContent.includes('Example')) {
          return; // Skip this match
        }
        
        violations.push({
          file,
          line,
          code: match[0],
          message: desc,
        });
      }
    });
  });

  return violations;
}

function checkDisplayFormat(files) {
  const violations = [];
  
  files.forEach(file => {
    if (!file.endsWith('.js')) return;
    const content = readFile(file);
    if (file.includes('money.js')) return; // Skip money.js itself

    // Check for direct cents-to-string conversions without formatAmount
    // Pattern: looks for string concatenation with cent values not using formatAmount
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('textContent') || line.includes('innerHTML') || line.includes('innerText')) {
        // Check if it's a currency amount without formatAmount
        if ((line.includes('Cents') || line.includes('cents') || line.includes('€')) && 
            !line.includes('formatAmount') && 
            !line.includes('formatIban') &&
            !line.includes('maskIban')) {
          // This might be a violation - flag for manual review
          if (/\$\{.*[Cc]ents.*\}|€\s*\$\{/.test(line)) {
            violations.push({
              file,
              line: i + 1,
              code: line.trim(),
              message: 'Possible unformatted currency amount in display',
            });
          }
        }
      }
    });
  });

  return violations;
}

function checkIbanNameMasking(files) {
  const violations = [];
  
  files.forEach(file => {
    if (!file.endsWith('.js')) return;
    const content = readFile(file);
    if (file.includes('iban.js') || file === 'src/money.js') return;

    // Check for console.log with potentially unmasked data
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('console.log') || line.includes('console.error')) {
        // Check if it's logging fromIban, toIban, or beneficiaryName without masking
        if ((line.includes('fromIban') || line.includes('toIban') || line.includes('beneficiaryName')) &&
            !line.includes('maskIban') && !line.includes('maskedIban')) {
          violations.push({
            file,
            line: i + 1,
            code: line.trim(),
            message: 'Potential unmasked IBAN or name in log output',
          });
        }
      }
      
      // Check for return statements that might expose IBANs
      if ((line.includes('return ') || line.includes('send')) &&
          (line.includes('fromIban') || line.includes('toIban')) &&
          !line.includes('maskIban') && 
          file === 'server.js') {
        violations.push({
          file,
          line: i + 1,
          code: line.trim(),
          message: 'Potential unmasked IBAN in API response',
        });
      }
    });
  });

  return violations;
}

function checkErrorCodeFormat(files) {
  const violations = [];
  
  files.forEach(file => {
    if (!file.endsWith('.js')) return;
    if (file.includes('test.js')) return; // Skip tests
    
    const content = readFile(file);
    
    // Check for error code definitions
    const errorPattern = /fail\s*\(\s*['"]([^'"]+)['"]\s*,/g;
    let match;
    while ((match = errorPattern.exec(content)) !== null) {
      const code = match[1];
      
      // Check format: must be UPPER_SNAKE_CASE
      if (!/^[A-Z][A-Z0-9_]*$/.test(code)) {
        violations.push({
          file,
          line: getLineNumber(content, match.index),
          code: match[0],
          message: `Error code '${code}' should be UPPER_SNAKE_CASE`,
        });
      }
    }
  });

  return violations;
}

function checkTestCoverage(files) {
  const violations = [];
  const srcFiles = files.filter(f => f.startsWith('src/') && f.endsWith('.js'));
  const testFiles = files.filter(f => f.startsWith('tests/') && f.endsWith('.js'));

  // If src files changed but no test files, flag it
  if (srcFiles.length > 0 && testFiles.length === 0) {
    violations.push({
      file: 'tests/',
      line: 0,
      code: '',
      message: `${srcFiles.length} source file(s) changed but no tests added`,
    });
  }

  return violations;
}

function checkUmdWrapper(files) {
  const violations = [];
  
  files.forEach(file => {
    if (!file.startsWith('src/') || !file.endsWith('.js')) return;
    
    const content = readFile(file);
    const hasUmd = /\(function\s*\(\s*root\s*,\s*factory\s*\)/.test(content);
    
    if (!hasUmd) {
      violations.push({
        file,
        line: 1,
        code: '',
        message: 'Missing UMD wrapper for browser + Node.js compatibility',
      });
    }
  });

  return violations;
}

function checkNoDependencies(files) {
  const violations = [];
  const externalPackagePattern = /require\s*\(\s*['"](?!\.\/|\.\.\/|node:)[^'"]+['"]\s*\)/g;
  const allowedBuiltins = /^node:/;
  
  files.forEach(file => {
    if (!file.startsWith('src/') || !file.endsWith('.js')) return;
    
    const content = readFile(file);
    let match;
    
    while ((match = externalPackagePattern.exec(content)) !== null) {
      const pkg = match[0].match(/['"]([^'"]+)['"]/)[1];
      
      if (!allowedBuiltins.test(pkg)) {
        violations.push({
          file,
          line: getLineNumber(content, match.index),
          code: match[0],
          message: `External package '${pkg}' imported; src/ files should have no dependencies`,
        });
      }
    }
  });

  return violations;
}

// ============================================================================
// Reporting
// ============================================================================

function formatReport(results) {
  const passing = results.filter(r => r.violations.length === 0);
  const failing = results.filter(r => r.violations.length > 0);
  const totalViolations = results.reduce((sum, r) => sum + r.violations.length, 0);

  console.log('\n' + '='.repeat(80));
  console.log('✅ SEPA House Rules Review'.padEnd(80));
  console.log('='.repeat(80) + '\n');

  if (totalViolations === 0) {
    console.log('✅ PASS - All house rules satisfied\n');
  } else {
    console.log(`❌ FAIL - ${totalViolations} violation(s) found\n`);
  }

  console.log('House Rules Checklist:');
  console.log('-'.repeat(80));

  results.forEach(result => {
    const icon = result.violations.length === 0 ? '✅' : '❌';
    console.log(`\n${icon} ${result.rule.title}`);
    console.log(`   Rule: ${result.rule.description}`);
    console.log(`   Status: ${result.violations.length === 0 ? 'PASS' : 'FAIL'}`);

    if (result.violations.length > 0) {
      console.log('   Violations:');
      result.violations.forEach(v => {
        console.log(`     • ${v.file}:${v.line}`);
        console.log(`       ${v.message}`);
        if (v.code) {
          console.log(`       Code: ${v.code}`);
        }
      });
    }
  });

  console.log('\n' + '-'.repeat(80));
  console.log('Summary Report:');
  console.log('-'.repeat(80));
  console.log(`Total Files Reviewed: ${new Set(results.flatMap(r => r.violations.map(v => v.file))).size}`);
  console.log(`Total Rules: ${results.length}`);
  console.log(`Rules Passing: ${passing.length}`);
  console.log(`Rules Failing: ${failing.length}`);
  console.log(`Total Violations: ${totalViolations}`);
  console.log('-'.repeat(80));

  if (totalViolations === 0) {
    console.log('\n✅ All house rules passed. Ready to submit.\n');
    return 0;
  } else {
    console.log('\n❌ Please fix violations before submitting.\n');
    return 1;
  }
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const files = getModifiedFiles();
  
  if (files.length === 0) {
    console.log('\n✅ No files to review.\n');
    return 0;
  }

  const results = RULES.map(rule => ({
    rule,
    violations: rule.check(files),
  }));

  return formatReport(results);
}

process.exit(main());
