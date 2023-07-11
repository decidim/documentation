#!/bin/env node
// Antora playbook changer script for Decidim documentation
//
// Changes the playbook accordingly to its environment
//

const fs = require('fs');
const exec = require('child_process').exec;

// Executes a command and returns the output as a Promise
//
// @param {string} command - The command to run
// @returns {Promise} The output of the command
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`Command execution error: ${stderr}`);
        reject(new Error(stderr));
        return;
      }
      resolve(stdout);
    });
  });
}

// Infers base branch reference according to the head reference
//
// If the head reference starts with the version number (i.e. "v0.26/fix/preview"), returns the base branch reference (i.e. "release/0.26-stable")
// If not, then returns "develop"
//
// @param {string} headRef - The head reference. Examples: "v0.26/fix/preview" or "fix/preview"
// @returns {string} The base reference. Examples "release/0.26-stable" or "develop"
function baseFromHead(headRef) {
  let baseRef;

  console.log("HEAD => ", headRef);
  if (headRef.startsWith("v0.")) {
    const version = headRef.split("/")[0].replace("v", "");
    baseRef = `release/${version}-stable`;
  } else {
    baseRef = "develop";
  };

  return baseRef;
}

// Get metatada from the environment
//
// Gets the head reference and the base reference by checking out environment variables
//
// @returns {object}
async function getMetadataFromEnvironment() {
  let headRef;
  let baseRef;

  if (process.env.CONTEXT === "deploy-preview" || process.env.RUNNER_ENVIRONMENT == "github-hosted") {
    // We're in CI and we need to change the head of the playbook
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
    // We're in development and we need to change the head
    headRef = "HEAD";
    const branch = await executeCommand("git branch --show-current");
    baseRef = baseFromHead(branch);
  }

  return {
    headRef,
    baseRef,
  }
}

function writeToFile(antoraPlaybookFile, metadata) {
  fs.readFile(antoraPlaybookFile, "utf8", function (err,data) {
    if (err) {
      return console.err(err);
    }

    let result = data.replace(metadata.baseRef, metadata.headRef);
    if (metadata.headRef === "HEAD") {
      result = result.replace("https://github.com/decidim/documentation", ".");
    }

    console.log(result);

    fs.writeFile(antoraPlaybookFile, result, "utf8", function (err) {
      if (err) {
        return console.err(err);
      }
    });
  });
}

(async function() {
  const ANTORA_PLAYBOOK = "antora-playbook.yml";
  const metadata = await getMetadataFromEnvironment();

  console.log(process.env);
  console.log(metadata);

  writeToFile(ANTORA_PLAYBOOK, metadata);
}());
