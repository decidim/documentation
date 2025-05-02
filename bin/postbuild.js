#!/usr/bin/env node

const fs = require('fs');
const exec = require('child_process').exec;
const path = require('path');

exec('git restore antora-playbook.yml', (error, stdout, stderr) => {
    if (error) {
        console.error(`Error restoring file: ${stderr}`);
        return;
    }
    console.log(stdout);
});

const wellKnownDir = path.join(__dirname, 'build/site/.well-known');
const sourceFile = path.join(__dirname, '../.well-known/funding-manifest-urls');
const destinationFile = path.join(wellKnownDir, 'funding-manifest-urls');

if (!fs.existsSync(wellKnownDir)) {
  fs.mkdirSync(wellKnownDir, { recursive: true });
}

fs.copyFileSync(sourceFile, destinationFile);
