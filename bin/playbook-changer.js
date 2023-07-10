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

if (process.env.CI === "true") {
  headRef = process.env.GITHUB_HEAD_REF;
  baseRef = process.env.GITHUB_BASE_REF;
} else {
  headRef = "HEAD";
  baseRef = "develop"
  url = ".";
}

fs.readFile(antoraPlaybook, "utf8", function (err,data) {
  if (err) {
    return console.err(err);
  }

  let result = data.replace(baseRef, headRef);
  console.log(url);
  if (url != undefined) {
    result = result.replace("https://github.com/decidim/documentation", url);
  }

  fs.writeFile(antoraPlaybook, result, "utf8", function (err) {
    if (err) {
      return console.err(err);
    }
  });
});

