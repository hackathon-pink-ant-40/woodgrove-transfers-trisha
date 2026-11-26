# sepa-review

Review current changes against Woodgrove Transfers house rules and return a pass/fail checklist with file and line references.

## Invocation

```
sepa-review
```

## Input

No input required. The skill inspects the current working directory changes (staged, unstaged, and untracked files).

## Output

A structured checklist report containing:

1. **Summary** - Pass/Fail status and number of violations
2. **House Rules Checklist** - Item-by-item verification:
   - ✅ Rule passes or ❌ Rule fails
   - Description of the rule
   - Violations with file paths and line numbers
3. **Details Section** - For each violation:
   - File path
   - Line number(s) or range
   - Exact code snippet
   - Rule violated
   - Recommended fix

## House Rules Checked

The skill validates all Woodgrove Transfers house rules:

1. **Money as Integer Cents** - All amounts must be integers (cents), never floats
2. **Customer Display Format** - Use `formatAmount()` from src/money.js for display
3. **IBAN & Name Masking** - Never log or return full IBANs/names; use `maskIban()` from src/iban.js
4. **Error Code Format** - Validation error codes must be UPPER_SNAKE_CASE with plain-English messages
5. **Test Coverage** - Every behavior change must have tests in tests/
6. **UMD Wrapper** - All files in src/ must have UMD wrapper for browser + Node.js compatibility
7. **No Dependencies** - No external packages added to src/ files

## Example Output

```
✅ SEPA House Rules Review - PASS

Checked 3 modified files, 0 violations found.

House Rules Checklist:
─────────────────────────────────────────────────────────

✅ Money as Integer Cents
   Rule: Amounts must be integers (cents), never floats
   Status: PASS - No floating-point amounts found

✅ Customer Display Format
   Rule: Use formatAmount() from src/money.js for display
   Status: PASS - All displays use formatAmount()
   References: console/console.js:110, 120

✅ IBAN & Name Masking
   Rule: Never log or return full IBANs/names; mask with maskIban()
   Status: PASS - All IBANs masked in logs
   References: src/transfer.js:80

✅ Error Code Format
   Rule: Error codes UPPER_SNAKE_CASE with plain-English messages
   Status: PASS - All error codes properly formatted
   References: src/transfer.js:28-35

✅ Test Coverage
   Rule: Every behavior change comes with tests
   Status: PASS - Tests added to tests/transfer.test.js
   References: tests/transfer.test.js:150-160

✅ UMD Wrapper
   Rule: All src/ files must have UMD wrapper
   Status: PASS - All src/ files have proper UMD wrapper
   References: src/transfer.js:1-16

✅ No Dependencies
   Rule: No external packages in src/ files
   Status: PASS - Only built-in and local dependencies used
   References: src/transfer.js requires ./iban, ./config

Summary Report:
─────────────────────────────────────────────────────────
Total Files Reviewed: 3
Total Rules: 7
Rules Passing: 7
Rules Failing: 0
Violations: 0

✅ All house rules passed. Ready to submit.
```

## Implementation Notes

The skill:
- Scans staged changes (git index) and unstaged modifications
- Checks each modified/added file against all house rules
- Reports exact line numbers for violations
- Provides before/after context for each issue
- Returns structured data suitable for CI/CD integration

## Exit Codes

- `0` - All rules passed
- `1` - One or more rules violated

## Typical Workflow

```bash
# After making changes
npx copilot skill invoke sepa-review

# Review output
# Fix any violations
# Re-run to verify
npx copilot skill invoke sepa-review
```

## Related

- House rules: `.github/copilot-instructions.md`
- Tests: `tests/run.js`
- IBAN utilities: `src/iban.js`
- Money utilities: `src/money.js`
