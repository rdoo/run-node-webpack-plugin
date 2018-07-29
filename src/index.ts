import { ChildProcess, fork } from 'child_process';
import { existsSync } from 'fs';
import { normalize, parse } from 'path';
import { Compiler, Stats } from 'webpack';

import { Logger, LoggerMessages } from './logger';

export interface RunNodeWebpackPluginOptions {
    scriptToRun?: string;
    scriptsToWatch?: string[];
    runOnlyOnChanges?: boolean;
    runOnlyInWatchMode?: boolean;
    runOnlyInNormalMode?: boolean;
    ignoreErrors?: boolean;
}

export default class RunNodeWebpackPlugin {
    options: RunNodeWebpackPluginOptions;
    isWebpackInWatchMode: boolean = false;
    scriptName: string;
    scriptPath: string;
    scriptProcess: ChildProcess;

    constructor(passedOptions?: RunNodeWebpackPluginOptions) {
        const defaultOptions: RunNodeWebpackPluginOptions = {
            scriptToRun: null,
            scriptsToWatch: null,
            runOnlyOnChanges: true,
            runOnlyInWatchMode: false,
            runOnlyInNormalMode: false,
            ignoreErrors: false
        };
        this.options = Object.assign(defaultOptions, passedOptions);
    }

    apply(compiler: Compiler) {
        compiler.hooks.watchRun.tap('RunNodeWebpackPlugin', () => (this.isWebpackInWatchMode = true));

        compiler.hooks.done.tap('RunNodeWebpackPlugin', (stats: Stats) => {
            // dont run if webpack is not in a watch mode and runOnlyInWatchMode option is truthy
            if (!this.isWebpackInWatchMode && this.options.runOnlyInWatchMode) {
                return;
            }

            // dont run if webpack is in a watch mode and runOnlyInNormalMode option is truthy
            if (this.isWebpackInWatchMode && this.options.runOnlyInNormalMode) {
                return;
            }

            // dont run if webpack compilation contains errors and ignoreErrors option is falsy
            if (stats.compilation.errors.length > 0 && !this.options.ignoreErrors) {
                return;
            }

            const outputAssets = stats.compilation.assets;
            const outputAssetNames: string[] = Object.keys(outputAssets);

            // check if output assets dont exist. idk if this can really happen
            if (outputAssetNames.length < 1) {
                Logger.error(LoggerMessages.NO_OUTPUT_ASSETS);
                return;
            }

            // always run node if runOnlyOnChanges option is falsy
            let shouldRun: boolean = !this.options.runOnlyOnChanges;

            if (!shouldRun) {
                if (this.options.scriptsToWatch && this.options.scriptsToWatch.length > 0) {
                    // if scriptsToWatch option is set then check if any of the given scripts changed
                    for (const scriptName of this.options.scriptsToWatch) {
                        const matchedName: string = findMatchingScriptName(scriptName, outputAssetNames);
                        if (matchedName && outputAssets[matchedName].emitted) {
                            shouldRun = true;
                            break;
                        }
                    }
                } else {
                    // if scriptsToWatch option is NOT set then check if any of the output assets changed
                    for (const assetName of outputAssetNames) {
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

            if (!this.scriptPath) {
                if (this.options.scriptToRun) {
                    // if scriptToRun option is set then check if it is in webpack output and get its exact path
                    // if it can not be found in webpack output then check if it exists in the file system
                    this.scriptName = findMatchingScriptName(this.options.scriptToRun, outputAssetNames);
                    if (this.scriptName) {
                        this.scriptPath = outputAssets[this.scriptName].existsAt;
                    } else if (existsSync(this.options.scriptToRun)) {
                        this.scriptName = parse(this.options.scriptToRun).base;
                        this.scriptPath = normalize(this.options.scriptToRun);
                    }

                    if (!this.scriptPath) {
                        Logger.error(
                            LoggerMessages.NO_SCRIPT_NAME1 +
                                this.options.scriptToRun +
                                LoggerMessages.NO_SCRIPT_NAME2 +
                                outputAssetNames +
                                LoggerMessages.NO_SCRIPT_NAME3
                        );
                        return;
                    }
                } else {
                    // if scriptToRun option is NOT set then try to guess which script should be run
                    if (outputAssetNames.length === 1) {
                        // if theres only 1 file in output assets choose it
                        this.scriptName = outputAssetNames[0];
                        this.scriptPath = outputAssets[this.scriptName].existsAt;
                    } else {
                        // otherwise try to find scripts named 'server.js' or 'index.js'
                        this.scriptName =
                            findMatchingScriptName('server.js', outputAssetNames) ||
                            findMatchingScriptName('index.js', outputAssetNames);
                        if (this.scriptName) {
                            this.scriptPath = outputAssets[this.scriptName].existsAt;
                        }
                    }
                }
            }

            if (!this.scriptPath) {
                Logger.error(LoggerMessages.NO_SCRIPT_PATH1 + outputAssetNames + LoggerMessages.NO_SCRIPT_PATH2);
                return;
            }

            if (this.scriptProcess && this.scriptProcess.connected) {
                // if scriptProcess is running then kill it and start once again after it closes
                Logger.info(LoggerMessages.RESTARTING + this.scriptName);
                this.scriptProcess.on('close', () => (this.scriptProcess = fork(this.scriptPath)));
                try {
                    this.scriptProcess.kill('SIGKILL');
                } catch (error) {
                    console.error(error);
                }
            } else {
                Logger.info(LoggerMessages.STARTING + this.scriptName);
                try {
                    this.scriptProcess = fork(this.scriptPath);
                } catch (error) {
                    console.error(error);
                }
            }
        });
    }
}

function findMatchingScriptName(scriptNameToFind, scriptNames): string {
    // check for literal matching
    for (const name of scriptNames) {
        if (name === scriptNameToFind) {
            return name;
        }
    }

    // if the above method fails check file names more liberally
    for (const name of scriptNames) {
        if (name.indexOf(scriptNameToFind) !== -1) {
            return name;
        }
    }

    return null;
}
