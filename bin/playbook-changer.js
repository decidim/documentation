#!/bin/env node
// Antora playbook changer script for Decidim documentation
//
// Changes the playbook accordingly to its environment
//

const fs = require('fs')

const scriptName = process.argv[1];
const antoraPlaybook = "antora-playbook.yml";

let headRef;
let baseRef;
let url;

console.log(process.env);

// Infers base branch reference according to the head reference
//
// If the head reference starts with the version number (i.e. "v0.26/fix/preview"), returns the base branch reference (i.e. "release/0.26-stable")
// If not, then returns "develop"
//
// @param {string} headRef - The head reference. Examples: "v0.26/fix/preview" or "fix/preview"
// @returns {string} The base reference. Examples "release/0.26-stable" or "develop"
function baseFromHead(headRef) {
  let baseRef;

  if (headRef.startsWith("v0.")) {
    const version = headRef.split("/")[0].replace("v");
    baseRef = `release/${version}-stable`;
  } else {
    baseRef = "develop";
  };

  return baseRef;
}

if (process.env.CONTEXT === "deploy-preview" || process.env.RUNNER_ENVIRONMENT == "github-hosted") {
  // We're in CI and we need to adapt the head of the playbook
  headRef = process.env.HEAD || process.env.GITHUB_HEAD_REF;
  if (process.env.GITHUB_BASE_REF != undefined) {
    baseRef = process.env.GITHUB_BASE_REF
  } else {
    baseRef = baseFromHead(headRef);
  }
} else if (process.env.CI === "true") {
  // We're in production so we don't need to change anything
  return;
} else {
  // We're in development and we need to adapt the head and also the URL
  headRef = "HEAD";
  baseRef = "develop";
  url = ".";
}

fs.readFile(antoraPlaybook, "utf8", function (err,data) {
  if (err) {
    return console.err(err);
  }

  let result = data.replace(baseRef, headRef);
  if (url != undefined) {
    result = result.replace("https://github.com/decidim/documentation", url);
  }

  console.log(result);

  fs.writeFile(antoraPlaybook, result, "utf8", function (err) {
    if (err) {
      return console.err(err);
    }
  });
});

