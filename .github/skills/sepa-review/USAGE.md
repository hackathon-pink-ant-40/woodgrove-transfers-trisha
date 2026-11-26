# sepa-review Skill Usage Guide

## Quick Start

```bash
cd /path/to/woodgrove-transfers-trisha
node .github/skills/sepa-review/sepa-review.js
```

## Detailed Examples

### Example 1: Review Changes Before Commit

```bash
# After making changes, before committing
$ node .github/skills/sepa-review/sepa-review.js

✅ PASS - All house rules satisfied
✅ All house rules passed. Ready to submit.
```

### Example 2: Catch a Violation

If you accidentally use a floating-point amount:

```javascript
// In src/transfer.js
const feeCents = amountCents * 0.001;  // ❌ WRONG - this is a float
```

Running the skill:

```bash
$ node .github/skills/sepa-review/sepa-review.js

❌ FAIL - 1 violation(s) found

❌ Money as Integer Cents
   Rule: Amounts must be integers (cents), never floats
   Status: FAIL
   Violations:
     • src/transfer.js:42
       Floating-point in amountCents
       Code: const feeCents = amountCents * 0.001;

❌ Please fix violations before submitting.
```

**Fix:**
```javascript
// Correct - rounds to whole cents
const feeCents = Math.floor((amountCents + 500) / 1000);
```

### Example 3: Missing Test Coverage

If you change behavior without adding tests:

```bash
$ node .github/skills/sepa-review/sepa-review.js

❌ FAIL - 1 violation(s) found

❌ Test Coverage
   Rule: Every behavior change comes with tests
   Status: FAIL
   Violations:
     • tests/
       2 source file(s) changed but no tests added

❌ Please fix violations before submitting.
```

**Fix:** Add tests to `tests/transfer.test.js` or create a new test file.

### Example 4: Missing IBAN Masking

If you log a full IBAN:

```javascript
// In src/transfer.js
console.log(transfer.fromIban);  // ❌ WRONG - full IBAN exposed
```

Running the skill:

```bash
$ node .github/skills/sepa-review/sepa-review.js

❌ FAIL - 1 violation(s) found

❌ IBAN & Name Masking
   Rule: Never log or return full IBANs/names; mask with maskIban()
   Status: FAIL
   Violations:
     • src/transfer.js:85
       Potential unmasked IBAN or name in log output
       Code: console.log(transfer.fromIban);

❌ Please fix violations before submitting.
```

**Fix:**
```javascript
console.log(iban.maskIban(transfer.fromIban));  // ✅ CORRECT - masked IBAN
```

### Example 5: Missing UMD Wrapper

If you create a new file without UMD wrapper:

```javascript
// src/newfile.js
const myFunction = () => { /* ... */ };
module.exports = myFunction;  // ❌ No UMD wrapper
```

Running the skill:

```bash
$ node .github/skills/sepa-review/sepa-review.js

❌ FAIL - 1 violation(s) found

❌ UMD Wrapper
   Rule: All src/ files must have UMD wrapper for browser + Node.js
   Status: FAIL
   Violations:
     • src/newfile.js:1
       Missing UMD wrapper for browser + Node.js compatibility

❌ Please fix violations before submitting.
```

**Fix:** Add UMD wrapper:
```javascript
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Woodgrove = root.Woodgrove || {};
    root.Woodgrove.newfile = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  
  const myFunction = () => { /* ... */ };
  
  return { myFunction };
});
```

## Integration Guides

### GitHub Actions CI

Add to `.github/workflows/ci.yml`:

```yaml
- name: Review changes against house rules
  run: node .github/skills/sepa-review/sepa-review.js
```

### Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
node .github/skills/sepa-review/sepa-review.js
if [ $? -ne 0 ]; then
  echo "❌ Please fix violations before committing"
  exit 1
fi
```

Then:
```bash
chmod +x .git/hooks/pre-commit
```

### IDE Integration

**VS Code:**
Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Review changes against house rules",
      "type": "shell",
      "command": "node .github/skills/sepa-review/sepa-review.js",
      "group": {
        "kind": "build",
        "isDefault": false
      },
      "problemMatcher": []
    }
  ]
}
```

Then: `Ctrl+Shift+B` → Select "Review changes against house rules"

## Troubleshooting

### "No files to review"
This means you have no staged, unstaged, or untracked changes. This is normal if you just ran the skill and there are no changes.

### "git command not found"
The skill requires Git to be installed and in your PATH. Make sure you're running it from a Git repository.

### False positives

The skill is designed to minimize false positives:
- Comments are skipped
- Documentation examples are ignored
- Context is checked before flagging

If you encounter a false positive, please report it with:
- The exact code that triggered it
- The rule that failed
- File and line number

### Script permission denied

If you get `permission denied`:
```bash
chmod +x .github/skills/sepa-review/sepa-review.js
```

## House Rules Reference

For the complete house rules, see: `.github/copilot-instructions.md`

**Quick Reference:**

1. **Money** - Always integer cents (€123,45 = 12345 cents)
2. **Display** - Use `formatAmount()` for customer output
3. **Masking** - Use `maskIban()` for logs/responses
4. **Errors** - Codes are UPPER_SNAKE_CASE + plain English message
5. **Tests** - Every behavior change needs tests
6. **UMD** - All src/ files need UMD wrapper
7. **Dependencies** - No external packages in src/

## Support

For issues or questions:
1. Check the README.md
2. Review SKILL.md
3. Look at example violations above
4. Check `.github/copilot-instructions.md` for house rules
