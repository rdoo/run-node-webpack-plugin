# Run Node Webpack Plugin
Webpack plugin that starts a node.js script after webpack compilation and smartly restarts it after subsequent recompilations

## Installation
```sh
$ npm install run-node-webpack-plugin --save-dev
```

## Usage
**webpack.config.js**
```js
const RunNodeWebpackPlugin = require('run-node-webpack-plugin');

module.exports = {
    // ...
    plugins: [
        new RunNodeWebpackPlugin()
    ],
    // ...
};
```
Plugin's primary use case is when you are developing a node.js app with webpack and want that app to restart whenever webpack finishes compiling its bundle.

## Advantages
- More efficient in webpack development scenarios than `nodemon`, `pm2`, `forever`, etc.
- Contrary to other similar plugins can restart script only when an actual change in webpack bundle occurs
- Rich customization possible via plugin options

## Options
All the options are optional and are configured so that in most cases you should not want to change them.

### `scriptToRun: string`
Node script which will be run after webpack compilations. You can provide a file name from webpack output or path to an external file.

**Default:** By default when webpack config contains only one output file then that file will be run. If more files are present then file named `server.js` or `index.js` (whichever exists) will be run

**Examples**
```js
// ...
entry: {
    server: 'src/server.js',
    otherScript: 'src/otherScript.js'
},
output: {
    path: 'build',
    filename: '[name].js'
},
// ...
plugins: [
    new RunNodeWebpackPlugin({ scriptToRun: 'otherScript.js' })
],
// ...
```
In this example by default `server.js` would be run but you can change it to `otherScript.js`.
```js
// ...
entry: 'src/index.js',
output: {
    path: 'build',
    filename: 'webpackOutputScript.js'
},
// ...
plugins: [
    new RunNodeWebpackPlugin({ scriptToRun: './path/to/external/file.js' })
],
// ...
```
In this example by default `webpackOutputScript.js` would be run but you can change it to an external script not connected with webpack build process, for example: `./path/to/external/file.js`.

### `runOnlyOnChanges: boolean`
When set to `true` plugin will run the script only when an actual change in webpack output files happens, otherwise after every webpack compilation.

**Default: `true`**

### `scriptsToWatch: string[]`
Array of webpack ouput file names that plugin should watch for changes. Works only if `runOnlyOnChanges` is set to `true`.

**Default:** By default plugin watches all webpack output files

**Examples**
```js
// ...
entry: {
    server: 'src/server.js',
    script: 'src/script.js'
},
output: {
    path: 'build',
    filename: '[name].js'
},
// ...
plugins: [
    new RunNodeWebpackPlugin({ scriptsToWatch: ['server.js'] })
],
// ...
```
In this example by default plugin would run `server.js` whenever a change to `server.js` or `script.js` happens but you can exclude `script.js` from change detection by providing only `server.js` to `scriptsToWatch` option.

### `runOnlyInWatchMode: boolean`
When set to `true` plugin will run the script only when webpack is in a watch mode.

**Default: `false`**

### `runOnlyInNormalMode: boolean`
When set to `true` plugin will run the script only when webpack is NOT in a watch mode.

**Default: `false`**

### `ignoreErrors: boolean`
When set to `true` plugin will try to run the script even when webpack compilation throws errors.

**Default: `false`**

## License
Copyright © 2018 [rdoo](https://github.com/rdoo). Released under the MIT license.
