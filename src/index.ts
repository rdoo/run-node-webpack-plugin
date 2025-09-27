import { ChildProcess, fork, ForkOptions } from 'child_process';
import { existsSync } from 'fs';
import { join, normalize, parse } from 'path';
import { Compiler, Stats } from 'webpack';

import { Logger } from './logger';

export interface RunNodeWebpackPluginOptions {
  scriptToRun?: string;
  scriptsToWatch?: string[];
  runOnlyOnChanges?: boolean;
  runOnlyInWatchMode?: boolean;
  runOnlyInNormalMode?: boolean;
  ignoreErrors?: boolean;
  nodeArgs?: string[];
  processArgs?: ForkOptions;
}

export default class RunNodeWebpackPlugin {
  private options: RunNodeWebpackPluginOptions;
  private isWebpackInWatchMode: boolean = false;
  private isFirstRun: boolean = true;
  private errorsInPrevCompilation: boolean = false;
  private scriptName: string | undefined;
  private scriptPath: string | undefined;
  private scriptProcess: ChildProcess | undefined;

  constructor(passedOptions?: RunNodeWebpackPluginOptions) {
    const defaultOptions: RunNodeWebpackPluginOptions = {
      scriptToRun: undefined,
      scriptsToWatch: undefined,
      runOnlyOnChanges: true,
      runOnlyInWatchMode: false,
      runOnlyInNormalMode: false,
      ignoreErrors: false,
      nodeArgs: [],
      processArgs: {},
    };
    this.options = Object.assign(defaultOptions, passedOptions);
  }

  apply(compiler: Compiler) {
    compiler.hooks.watchRun.tap(
      'RunNodeWebpackPlugin',
      () => (this.isWebpackInWatchMode = true)
    );

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
      if (stats.hasErrors() && !this.options.ignoreErrors) {
        this.errorsInPrevCompilation = true;
        return;
      }

      const { compilation } = stats;
      const { compiler, emittedAssets, assets: outputAssets } = compilation;
      const outputAssetNames = Object.keys(outputAssets);
      const outputPath = compilation.getPath(compiler.outputPath);

      // check if output assets dont exist. idk if this can really happen
      if (outputAssetNames.length === 0) {
        Logger.error(Logger.getNoOutputAssetsMessage());
        return;
      }

      let shouldRun = false;

      if (!this.options.runOnlyOnChanges || this.errorsInPrevCompilation) {
        // always run node script if runOnlyOnChanges option is falsy or there were errors in previous compilation
        shouldRun = true;
        this.errorsInPrevCompilation = false;
      } else {
        // else check watched scripts for changes
        if (
          this.options.scriptsToWatch &&
          this.options.scriptsToWatch.length > 0
        ) {
          // if scriptsToWatch option is set then check if any of the given scripts changed
          for (const scriptName of this.options.scriptsToWatch) {
            const matchedName = findMatchingScriptName(
              scriptName,
              outputAssetNames
            );
            if (
              matchedName &&
              emittedAssets &&
              emittedAssets.has(matchedName)
            ) {
              shouldRun = true;
              break;
            }
          }
        } else {
          // if scriptsToWatch option is NOT set then check if any of the output assets changed
          for (const assetName of outputAssetNames) {
            if (emittedAssets && emittedAssets.has(assetName)) {
              shouldRun = true;
              break;
            }
          }
        }
      }

      if (this.isFirstRun) {
        shouldRun = true;
        this.isFirstRun = false;
      }

      if (!shouldRun) {
        return;
      }

      if (!this.scriptPath) {
        if (this.options.scriptToRun) {
          // if scriptToRun option is set then check if it is in webpack output and get its exact path
          // if it can not be found in webpack output then check if it exists in the file system
          this.scriptName = findMatchingScriptName(
            this.options.scriptToRun,
            outputAssetNames
          );
          if (this.scriptName) {
            this.scriptPath = join(outputPath, this.scriptName);
          } else if (existsSync(this.options.scriptToRun)) {
            this.scriptName = parse(this.options.scriptToRun).base;
            this.scriptPath = normalize(this.options.scriptToRun);
          }

          if (!this.scriptPath) {
            Logger.error(
              Logger.getNoScriptNameMessage(
                this.options.scriptToRun,
                outputAssetNames
              )
            );
            return;
          }
        } else {
          // if scriptToRun option is NOT set then try to guess which script should be run
          if (outputAssetNames.length === 1) {
            // if theres only 1 file in output assets choose it
            this.scriptName = outputAssetNames[0];
            this.scriptPath = join(outputPath, this.scriptName);
          } else {
            // otherwise try to find scripts named 'server.js' or 'index.js'
            this.scriptName =
              findMatchingScriptName('server.js', outputAssetNames) ||
              findMatchingScriptName('index.js', outputAssetNames);
            if (this.scriptName) {
              this.scriptPath = join(outputPath, this.scriptName);
            }
          }
        }
      }

      if (!this.scriptPath) {
        Logger.error(Logger.getNoScriptPathMessage(outputAssetNames));
        return;
      }

      if (this.scriptProcess && this.scriptProcess.connected) {
        // if scriptProcess is running then kill it and start once again after it closes
        Logger.info(Logger.getRestartingMessage(this.scriptName!));
        this.scriptProcess.on('close', () => {
          this.launchScriptProcess(outputAssetNames);
        });
        try {
          this.scriptProcess.kill('SIGKILL');
        } catch (error) {
          console.error(error);
        }
      } else {
        Logger.info(Logger.getStartingMessage(this.scriptName!));
        try {
          this.launchScriptProcess(outputAssetNames);
        } catch (error) {
          console.error(error);
        }
      }
    });
  }

  private launchScriptProcess(outputAssetNames: string[]) {
    if (!this.scriptPath) {
      Logger.error(Logger.getNoScriptPathMessage(outputAssetNames));
      return;
    }

    this.scriptProcess = fork(
      this.scriptPath,
      this.options.nodeArgs,
      this.options.processArgs
    );
  }
}

function findMatchingScriptName(
  scriptNameToFind: string,
  scriptNames: string[]
): string | undefined {
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

  return undefined;
}
