const fs = require('fs-extra');
const path = require('path');
const mediumexporter = require('./tools/mediumexporter/index.js');

async function importer(link, dir, name) {
  return mediumexporter.getPost(link, {
    output: path.resolve(dir, name),
    hugo: true,
    frontmatter: true
  });
}

const getOption = name => {
  const indexOf = process.argv.indexOf(`--${name}`);
  return indexOf === -1 ? '' : process.argv[indexOf + 1];
};

const options = {
  name: getOption('name'),
  from: getOption('from'),
  serie: getOption('serie')
};

const usage = `
  use as follow:

  medium-import.js --name=<shortname> --from=<medium-url> [--serie=<serie-name>]

  name: file and folder name (required)
  from: medium url from which to import (required)
  serie: will create the new folder in a new or existing "serie-name" folder (false by default)
`;

if (!options.name || !options.from) {
  console.log(usage);
  process.exit(1);
}

(async function() {
  const dir = path.resolve(__dirname, options.serie);

  fs.ensureDirSync(dir);

  console.log('generating markdown...\n')

  await importer(options.from, dir, options.name);

  const mdPath = path.resolve(dir, options.name, 'index.md');

  if (!fs.existsSync(mdPath)) {
    console.log('no markdown generated!');
    process.exit(1);
  } else {
    console.log(`\nmarkdown generated at:\n${mdPath}\n`);
  }

  const mediumMd = fs.readFileSync(mdPath, 'utf8');
  const title = mediumMd.match(/(?<=^---[\s\S]*title:[\s]+).+(?=[\s\S]*---)/)[0] || options.name;
  const mediumMeta = mediumMd.match(/(?<=^---[\s])[\s\S]*?(?=---)/)[0];
  const devtoMd = mediumMd.replace(
    /^---[\s\S]*?---/,
    `---
title: ${title}
published: false
description: 
tags:
series: ${options.serie || ''}
---`
  );

  fs.writeFileSync(mdPath, devtoMd, 'utf8');
  fs.writeFileSync(path.join(dir, options.name, 'medium.yaml'), mediumMeta, 'utf8');
})();
