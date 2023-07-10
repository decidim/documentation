#!/bin/env node

const scriptName = process.argv[1];
const environment = process.argv[2];

function helpMessage () {
	console.log(`${scriptName} - Antora playbook changer script for Decidim documentation

Changes the playbook accordingly to its environment`);
	console.log(process.env);
}

helpMessage();
