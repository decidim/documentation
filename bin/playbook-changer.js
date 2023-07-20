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
  let baseRef = "develop";

  if (headRef.startsWith("v0.")) {
    const version = headRef.split("/")[0].replace("v", "");
    baseRef = `release/${version}-stable`;
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

  const isNetlifyDeployPreview = process.env.CONTEXT === "deploy-preview";
  const isGithubActionCI = process.env.RUNNER_ENVIRONMENT == "github-hosted";
  const isProductionEnvironment = process.env.CI === "true";

  if (isNetlifyDeployPreview || isGithubActionCI) {
    // We're in CI and we need to change the head of the playbook
    headRef = process.env.HEAD || process.env.GITHUB_HEAD_REF;
    if (process.env.GITHUB_BASE_REF != undefined) {
      baseRef = process.env.GITHUB_BASE_REF
    } else {
      baseRef = baseFromHead(headRef);
    }
  } else if (isProductionEnvironment) {
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

// Given an antora-playbook.yml file, and a metadata object
// Replaces the contents of the file depending in the metadata
//
// @param {string} antoraPlaybookFile - the path of the antora-playbook.yml file
// @param {object} metadata - an object with the metadata
// @param {string} metadata.baseRef - the base branch from where this branch was created
//                                    It can be `develop` or the release branch (i.e. `release/0.27-stable`)
// @param {string} metadata.headRef - the head reference of git
//                                    It's the name of the current branch
function writeToFile(antoraPlaybookFile, metadata) {
  fs.readFile(antoraPlaybookFile, "utf8", function (err,data) {
    if (err) {
      return console.err(err);
    }

    let result = data.replace(metadata.baseRef, metadata.headRef);

    const isDevelopment = metadata.headRef === "HEAD";
    if (isDevelopment) {
      const antoraDocumentationUrl = "https://github.com/decidim/documentation";
      result = result.replace(antoraDocumentationUrl, ".");
    }

    console.log("********************************")
    console.log(antoraPlaybookFile);
    console.log(result);
    console.log("********************************")

    fs.writeFile(antoraPlaybookFile, result, "utf8", function (err) {
      if (err) {
        return console.err(err);
      }
    });
  });
}

(async function() {
  console.log("********************************")
  console.log(process.env);
  console.log("********************************")

  const ANTORA_PLAYBOOK = "antora-playbook.yml";
  const metadata = await getMetadataFromEnvironment();

  writeToFile(ANTORA_PLAYBOOK, metadata);
}());
