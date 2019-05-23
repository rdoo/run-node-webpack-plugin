"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var child_process_1 = require("child_process");
var fs_1 = require("fs");
var path_1 = require("path");
var logger_1 = require("./logger");
var RunNodeWebpackPlugin = /** @class */ (function () {
    function RunNodeWebpackPlugin(passedOptions) {
        this.isWebpackInWatchMode = false;
        this.errorsInPrevCompilation = false;
        var defaultOptions = {
            scriptToRun: null,
            scriptsToWatch: null,
            runOnlyOnChanges: true,
            runOnlyInWatchMode: false,
            runOnlyInNormalMode: false,
            ignoreErrors: false,
            nodeArgs: [],
        };
        this.options = Object.assign(defaultOptions, passedOptions);
    }
    RunNodeWebpackPlugin.prototype.apply = function (compiler) {
        var _this = this;
        compiler.hooks.watchRun.tap('RunNodeWebpackPlugin', function () { return (_this.isWebpackInWatchMode = true); });
        compiler.hooks.done.tap('RunNodeWebpackPlugin', function (stats) {
            // dont run if webpack is not in a watch mode and runOnlyInWatchMode option is truthy
            if (!_this.isWebpackInWatchMode && _this.options.runOnlyInWatchMode) {
                return;
            }
            // dont run if webpack is in a watch mode and runOnlyInNormalMode option is truthy
            if (_this.isWebpackInWatchMode && _this.options.runOnlyInNormalMode) {
                return;
            }
            // dont run if webpack compilation contains errors and ignoreErrors option is falsy
            if (stats.compilation.errors.length > 0 && !_this.options.ignoreErrors) {
                _this.errorsInPrevCompilation = true;
                return;
            }
            var outputAssets = stats.compilation.assets;
            var outputAssetNames = Object.keys(outputAssets);
            // check if output assets dont exist. idk if this can really happen
            if (outputAssetNames.length < 1) {
                logger_1.Logger.error("There are no output assets. Is your webpack config correct?" /* NO_OUTPUT_ASSETS */);
                return;
            }
            var shouldRun = false;
            if (!_this.options.runOnlyOnChanges || _this.errorsInPrevCompilation) {
                // always run node script if runOnlyOnChanges option is falsy or there were errors in previous compilation
                shouldRun = true;
                _this.errorsInPrevCompilation = false;
            }
            else {
                // else check watched scripts for changes
                if (_this.options.scriptsToWatch && _this.options.scriptsToWatch.length > 0) {
                    // if scriptsToWatch option is set then check if any of the given scripts changed
                    for (var _i = 0, _a = _this.options.scriptsToWatch; _i < _a.length; _i++) {
                        var scriptName = _a[_i];
                        var matchedName = findMatchingScriptName(scriptName, outputAssetNames);
                        if (matchedName && outputAssets[matchedName].emitted) {
                            shouldRun = true;
                            break;
                        }
                    }
                }
                else {
                    // if scriptsToWatch option is NOT set then check if any of the output assets changed
                    for (var _b = 0, outputAssetNames_1 = outputAssetNames; _b < outputAssetNames_1.length; _b++) {
                        var assetName = outputAssetNames_1[_b];
                        if (outputAssets[assetName].emitted) {
                            shouldRun = true;
                            break;
                        }
                    }
                }
            }
            if (!shouldRun) {
                return;
            }
            if (!_this.scriptPath) {
                if (_this.options.scriptToRun) {
                    // if scriptToRun option is set then check if it is in webpack output and get its exact path
                    // if it can not be found in webpack output then check if it exists in the file system
                    _this.scriptName = findMatchingScriptName(_this.options.scriptToRun, outputAssetNames);
                    if (_this.scriptName) {
                        _this.scriptPath = outputAssets[_this.scriptName].existsAt;
                    }
                    else if (fs_1.existsSync(_this.options.scriptToRun)) {
                        _this.scriptName = path_1.parse(_this.options.scriptToRun).base;
                        _this.scriptPath = path_1.normalize(_this.options.scriptToRun);
                    }
                    if (!_this.scriptPath) {
                        logger_1.Logger.error("Given script name '" /* NO_SCRIPT_NAME1 */ +
                            _this.options.scriptToRun +
                            "' could not be found among webpack ouput assets: " /* NO_SCRIPT_NAME2 */ +
                            outputAssetNames +
                            " or in the file system" /* NO_SCRIPT_NAME3 */);
                        return;
                    }
                }
                else {
                    // if scriptToRun option is NOT set then try to guess which script should be run
                    if (outputAssetNames.length === 1) {
                        // if theres only 1 file in output assets choose it
                        _this.scriptName = outputAssetNames[0];
                        _this.scriptPath = outputAssets[_this.scriptName].existsAt;
                    }
                    else {
                        // otherwise try to find scripts named 'server.js' or 'index.js'
                        _this.scriptName =
                            findMatchingScriptName('server.js', outputAssetNames) ||
                                findMatchingScriptName('index.js', outputAssetNames);
                        if (_this.scriptName) {
                            _this.scriptPath = outputAssets[_this.scriptName].existsAt;
                        }
                    }
                }
            }
            if (!_this.scriptPath) {
                logger_1.Logger.error("Can not determine which script to run. Choose a script among given list: " /* NO_SCRIPT_PATH1 */ + outputAssetNames + " or provide a path to a file" /* NO_SCRIPT_PATH2 */);
                return;
            }
            if (_this.scriptProcess && _this.scriptProcess.connected) {
                // if scriptProcess is running then kill it and start once again after it closes
                logger_1.Logger.info("Restarting node script: " /* RESTARTING */ + _this.scriptName);
                _this.scriptProcess.on('close', function () { return (_this.scriptProcess = child_process_1.fork(_this.scriptPath)); });
                try {
                    _this.scriptProcess.kill('SIGKILL');
                }
                catch (error) {
                    console.error(error);
                }
            }
            else {
                logger_1.Logger.info("Starting node script: " /* STARTING */ + _this.scriptName);
                try {
                    _this.scriptProcess = child_process_1.fork(_this.scriptPath, _this.options.nodeArgs);
                }
                catch (error) {
                    console.error(error);
                }
            }
        });
    };
    return RunNodeWebpackPlugin;
}());
exports.default = RunNodeWebpackPlugin;
function findMatchingScriptName(scriptNameToFind, scriptNames) {
    // check for literal matching
    for (var _i = 0, scriptNames_1 = scriptNames; _i < scriptNames_1.length; _i++) {
        var name = scriptNames_1[_i];
        if (name === scriptNameToFind) {
            return name;
        }
    }
    // if the above method fails check file names more liberally
    for (var _a = 0, scriptNames_2 = scriptNames; _a < scriptNames_2.length; _a++) {
        var name = scriptNames_2[_a];
        if (name.indexOf(scriptNameToFind) !== -1) {
            return name;
        }
    }
    return null;
}
