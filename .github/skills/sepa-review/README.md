# sepa-review Skill

A Copilot agent skill that reviews changes against Woodgrove Transfers house rules.

## Overview

The `sepa-review` skill automatically checks all modified/added files against the 7 core house rules:

1. **Money as Integer Cents** - Amounts must be integers (cents), never floats
2. **Customer Display Format** - Use `formatAmount()` from src/money.js
3. **IBAN & Name Masking** - Never expose full IBANs/names in logs/responses
4. **Error Code Format** - Codes must be UPPER_SNAKE_CASE with plain-English messages
5. **Test Coverage** - Every behavior change must have tests
6. **UMD Wrapper** - All src/ files must have UMD wrapper for browser + Node.js
7. **No External Dependencies** - src/ files only use built-in and local modules

## Usage

### From Command Line

```bash
# Review current changes
node .github/skills/sepa-review/sepa-review.js

# Or make it executable and run directly
.github/skills/sepa-review/sepa-review.js
```

### From Copilot

```
@copilot review my changes against house rules

# or

/skills sepa-review
```

### In CI/CD

```yaml
- name: Review changes against house rules
  run: node .github/skills/sepa-review/sepa-review.js
```

## Output Example

```
================================================================================
✅ SEPA House Rules Review
================================================================================

✅ PASS - All house rules satisfied

House Rules Checklist:
────────────────────────────────────────────────────────────────────────────

✅ Money as Integer Cents
   Rule: Amounts must be integers (cents), never floats
   Status: PASS

✅ Customer Display Format
   Rule: Use formatAmount() from src/money.js for display
   Status: PASS

✅ IBAN & Name Masking
   Rule: Never log or return full IBANs/names; mask with maskIban()
   Status: PASS

✅ Error Code Format
   Rule: Error codes UPPER_SNAKE_CASE with plain-English messages
   Status: PASS

✅ Test Coverage
   Rule: Every behavior change comes with tests
   Status: PASS

✅ UMD Wrapper
   Rule: All src/ files must have UMD wrapper for browser + Node.js
   Status: PASS

✅ No External Dependencies
   Rule: No external packages in src/ files
   Status: PASS

────────────────────────────────────────────────────────────────────────────
Summary Report:
────────────────────────────────────────────────────────────────────────────
Total Files Reviewed: 3
Total Rules: 7
Rules Passing: 7
Rules Failing: 0
Total Violations: 0
────────────────────────────────────────────────────────────────────────────

✅ All house rules passed. Ready to submit.
```

## Exit Codes

- `0` - All rules passed ✅
- `1` - One or more rules violated ❌

## Files Checked

The skill scans:
- Staged files (git index)
- Unstaged modifications
- Untracked files

And checks the following file types:
- `.js` files in `src/` (UMD wrapper, no dependencies, error codes)
- `.js` files in `console/` (display format, masking)
- `.js` files in `tests/` (test coverage)
- `server.js` (masking, error handling)

## House Rules Reference

For the complete house rules, see: `.github/copilot-instructions.md`

## Related

- Utility modules: `src/iban.js`, `src/money.js`
- Tests: `tests/run.js`
- CI/CD: `.github/workflows/ci.yml`
