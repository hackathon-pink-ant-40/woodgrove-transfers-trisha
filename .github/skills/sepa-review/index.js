/**
 * sepa-review Skill - Main Entry Point
 * 
 * This module exports the sepa-review skill for use as a Copilot agent skill.
 * When invoked, it reviews all changes in the working directory against
 * Woodgrove Transfers house rules and returns a structured report.
 */

const { execSync } = require('child_process');
const path = require('path');

/**
 * Run the sepa-review skill
 * @returns {Object} Structured report with pass/fail status and violations
 */
async function run() {
  try {
    const skillPath = path.join(__dirname, 'sepa-review.js');
    execSync(`node "${skillPath}"`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = { run };
