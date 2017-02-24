"use strict";

const archDevRequire = require("electrode-archetype-react-component-dev/require");
const mergeWebpackConfig = archDevRequire("webpack-partial").default;
const styleLoader = archDevRequire.resolve("style-loader");
const cssLoader = archDevRequire.resolve("css-loader");
const stylusLoader = archDevRequire.resolve("stylus-loader");
const stylusRelativeLoader = archDevRequire.resolve("stylus-relative-loader");

const Path = require("path");
const fs = require("fs");
const recursiveReadSync = require("recursive-readdir-sync");
const detective = require('detective-stylus');
const uniq = require('lodash/uniq');

const extractToModules = "?modules&importLoaders=1&localIdentName=[name]__[local]___[hash:base64:5]";


// get all .styl files that *.mod.styl files require
const recursiveDetective = (inputPath, inputResults) => {

  let resultPaths = inputResults || [];
  const content = fs.readFileSync(inputPath, 'utf8');
  let results = detective(content);
  let pending = results.length;
  if (results.length) {
    // normalize relative paths
    results = results.map((relPath) => {
      const fileExt = Path.extname(relPath) || "";
      const isStyl = fileExt === 'styl';
      if (!isStyl && fileExt !== "") return;
      relPath = isStyl ? relPath : relPath + '.styl';
      const absPath = Path.resolve(inputPath.substring(0, inputPath.lastIndexOf("/")), relPath);
      if (!fs.existsSync(absPath)) return;
      return absPath;
    }).filter((value) => !!value);

    resultPaths = resultPaths.concat(results);
    resultPaths.push(inputPath);
    console.log('children! pushing children and iterating over them: ', resultPaths);
    results.forEach((filePath) => {
      resultPaths = recursiveDetective(filePath, resultPaths);
    })
  } else {
    console.log('no children, pushing parent: ', inputPath);
    resultPaths.push(inputPath);
  }
  return resultPaths;
}

// all *.mod.styl files + the *.styl files they require
const stylusModulePaths = () => {
  try {
    let paths = recursiveReadSync(process.cwd())
      .filter((fileName) => (/\.mod.styl$/).test(fileName));

    paths = paths.map((path) => {
      let results = recursiveDetective(path);
      results.push(path);
      return results;
    });
    let finalPaths = [];
    paths.forEach((pathsArray) => pathsArray.forEach((path) => finalPaths.push(path)));
    console.log('styl files for css modules loader: ', finalPaths);
    return uniq(finalPaths);
  } catch(err) {
    console.log('error', err);
    throw err;
  }
};

module.exports = () => (config) => mergeWebpackConfig(config, {
  module: {
    loaders: [{
      name: "stylusModules",
      test: /\.styl$/,
      include: stylusModulePaths(),
      /* eslint-disable prefer-template */
      loader: styleLoader + "!" + cssLoader + extractToModules + "!" + stylusLoader
      /* eslint-enable prefer-template */
    }]
  }
});
