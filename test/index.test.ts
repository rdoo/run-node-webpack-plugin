import { expect } from 'chai';
import { join, normalize, parse } from 'path';
import { spy } from 'sinon';

import RunNodeWebpackPlugin, { RunNodeWebpackPluginOptions } from '../src/index';
import { Logger, LoggerMessages } from '../src/logger';

const mockedCompiler: any = {
    watchRunFunction: null,
    doneFunction: null,
    hooks: {
        watchRun: {
            tap: (name: string, fn: Function) => (mockedCompiler.watchRunFunction = fn)
        },
        done: {
            tap: (name: string, fn: Function) => (mockedCompiler.doneFunction = fn)
        }
    }
};

describe('RunNodeWebpackPlugin', () => {
    describe('Options', () => {
        const defaultOptions: RunNodeWebpackPluginOptions = {
            scriptToRun: null,
            scriptsToWatch: null,
            runOnlyOnChanges: true,
            runOnlyInWatchMode: false,
            runOnlyInNormalMode: false,
            ignoreErrors: false
        };

        it('should retain default options when no instance arguments are passed', () => {
            const instance: RunNodeWebpackPlugin = new RunNodeWebpackPlugin();

            expect(instance.options).to.deep.equal(defaultOptions);
        });

        it('should retain default options when undefined is passed', () => {
            const instance: RunNodeWebpackPlugin = new RunNodeWebpackPlugin(undefined);

            expect(instance.options).to.deep.equal(defaultOptions);
        });

        it('should retain default options when an empty object is passed', () => {
            const instance: RunNodeWebpackPlugin = new RunNodeWebpackPlugin({});

            expect(instance.options).to.deep.equal(defaultOptions);
        });

        it('should override default options with passed argument', () => {
            const newOptions: RunNodeWebpackPluginOptions = {
                scriptToRun: 'sample.js',
                scriptsToWatch: ['sample.js'],
                runOnlyOnChanges: false,
                runOnlyInWatchMode: true,
                runOnlyInNormalMode: true,
                ignoreErrors: true
            };
            const instance: RunNodeWebpackPlugin = new RunNodeWebpackPlugin(newOptions);

            expect(instance.options).to.deep.equal(newOptions);
        });
    });

    describe('Logs', () => {
        let consoleLogSpy;
        let mockedStats;

        beforeEach(() => {
            consoleLogSpy = spy(console, 'log');
            mockedStats = {
                compilation: {
                    errors: [],
                    assets: {
                        'server.js': {
                            emitted: true,
                            existsAt: join('test', 'test-script.js')
                        },
                        'script.js': {
                            emitted: true,
                            existsAt: join('test', 'test-script.js')
                        }
                    }
                }
            };
        });

        afterEach(() => {
            consoleLogSpy.restore();
        });

        it('should run normally with default options when webpack outputs only one file', () => {
            const instance: RunNodeWebpackPlugin = new RunNodeWebpackPlugin();
            instance.apply(mockedCompiler);
            mockedStats.compilation.assets = {
                'only-one-file.js': {
                    emitted: true,
                    existsAt: join('test', 'test-script.js')
                }
            };
            mockedCompiler.doneFunction(mockedStats);

            const scriptName: string = Object.keys(mockedStats.compilation.assets)[0];
            expect(instance.scriptName).to.be.equal(scriptName);
            expect(instance.scriptPath).to.be.equal(mockedStats.compilation.assets[scriptName].existsAt);
            expect(consoleLogSpy.calledOnce).to.be.true;
            expect(
                consoleLogSpy.calledOnceWithExactly(
                    Logger.INFO_COLOR,
                    Logger.PREFIX + LoggerMessages.STARTING + instance.scriptName
                )
            ).to.be.true;
        });

        it("should run normally with default options when webpack outputs 'server.js' file", () => {
            const instance: RunNodeWebpackPlugin = new RunNodeWebpackPlugin();
            instance.apply(mockedCompiler);
            mockedCompiler.doneFunction(mockedStats);

            const scriptName: string = 'server.js';
            expect(instance.scriptName).to.be.equal(scriptName);
            expect(instance.scriptPath).to.be.equal(mockedStats.compilation.assets[scriptName].existsAt);
            expect(consoleLogSpy.calledOnce).to.be.true;
            expect(
                consoleLogSpy.calledOnceWithExactly(
                    Logger.INFO_COLOR,
                    Logger.PREFIX + LoggerMessages.STARTING + instance.scriptName
                )
            ).to.be.true;
        });

        it('should log error with default options when webpack outputs multiple not common file names', () => {
            const instance: RunNodeWebpackPlugin = new RunNodeWebpackPlugin();
            instance.apply(mockedCompiler);
            mockedStats.compilation.assets = {
                'not-common-file-name1.js': {
                    emitted: true,
                    existsAt: join('test', 'test-script.js')
                },
                'not-common-file-name2.js': {
                    emitted: true,
                    existsAt: join('test', 'test-script.js')
                }
            };
            mockedCompiler.doneFunction(mockedStats);

            expect(consoleLogSpy.calledOnce).to.be.true;
            expect(
                consoleLogSpy.calledOnceWithExactly(
                    Logger.ERROR_COLOR,
                    Logger.PREFIX +
                        LoggerMessages.NO_SCRIPT_PATH1 +
                        Object.keys(mockedStats.compilation.assets) +
                        LoggerMessages.NO_SCRIPT_PATH2
                )
            ).to.be.true;
        });

        it('should run normally when scriptToRun is set to one of outputted asset names', () => {
            const scriptName: string = 'script.js';
            const instance: RunNodeWebpackPlugin = new RunNodeWebpackPlugin({ scriptToRun: scriptName });
            instance.apply(mockedCompiler);
            mockedCompiler.doneFunction(mockedStats);

            expect(instance.scriptName).to.be.equal(scriptName);
            expect(instance.scriptPath).to.be.equal(mockedStats.compilation.assets[scriptName].existsAt);
            expect(consoleLogSpy.calledOnce).to.be.true;
            expect(
                consoleLogSpy.calledOnceWithExactly(
                    Logger.INFO_COLOR,
                    Logger.PREFIX + LoggerMessages.STARTING + instance.scriptName
                )
            ).to.be.true;
        });

        it('should log error when scriptToRun is set to a non-existent asset name', () => {
            const scriptName: string = 'non-existent-script.js';
            const instance: RunNodeWebpackPlugin = new RunNodeWebpackPlugin({ scriptToRun: scriptName });
            instance.apply(mockedCompiler);
            mockedCompiler.doneFunction(mockedStats);

            expect(consoleLogSpy.calledOnce).to.be.true;
            expect(
                consoleLogSpy.calledOnceWithExactly(
                    Logger.ERROR_COLOR,
                    Logger.PREFIX +
                        LoggerMessages.NO_SCRIPT_NAME1 +
                        instance.options.scriptToRun +
                        LoggerMessages.NO_SCRIPT_NAME2 +
                        Object.keys(mockedStats.compilation.assets) +
                        LoggerMessages.NO_SCRIPT_NAME3
                )
            ).to.be.true;
        });

        it('should run normally when scriptToRun is set as a path to an existent file', () => {
            const scriptName: string = './test/test-script.js';
            const computedScriptName: string = parse(scriptName).base;
            const computedScriptPath: string = normalize(scriptName);
            const instance: RunNodeWebpackPlugin = new RunNodeWebpackPlugin({ scriptToRun: scriptName });
            instance.apply(mockedCompiler);
            mockedCompiler.doneFunction(mockedStats);

            expect(instance.scriptName).to.be.equal(computedScriptName);
            expect(instance.scriptPath).to.be.equal(computedScriptPath);
            expect(consoleLogSpy.calledOnce).to.be.true;
            expect(
                consoleLogSpy.calledOnceWithExactly(
                    Logger.INFO_COLOR,
                    Logger.PREFIX + LoggerMessages.STARTING + computedScriptName
                )
            ).to.be.true;
        });

        it('should log error when scriptToRun is set set as a path to a non-existent file', () => {
            const scriptName: string = './path/to/non-existent-script.js';
            const instance: RunNodeWebpackPlugin = new RunNodeWebpackPlugin({ scriptToRun: scriptName });
            instance.apply(mockedCompiler);
            mockedCompiler.doneFunction(mockedStats);

            expect(consoleLogSpy.calledOnce).to.be.true;
            expect(
                consoleLogSpy.calledOnceWithExactly(
                    Logger.ERROR_COLOR,
                    Logger.PREFIX +
                        LoggerMessages.NO_SCRIPT_NAME1 +
                        instance.options.scriptToRun +
                        LoggerMessages.NO_SCRIPT_NAME2 +
                        Object.keys(mockedStats.compilation.assets) +
                        LoggerMessages.NO_SCRIPT_NAME3
                )
            ).to.be.true;
        });

        it('should do nothing when webpack is not in a watch mode and runOnlyInWatchMode option is set to true', () => {
            const instance: RunNodeWebpackPlugin = new RunNodeWebpackPlugin({ runOnlyInWatchMode: true });
            instance.apply(mockedCompiler);
            mockedCompiler.doneFunction(mockedStats);

            expect(consoleLogSpy.notCalled).to.be.true;
        });

        it('should do nothing when webpack is in a watch mode and runOnlyInNormalMode option is set to true', () => {
            const instance: RunNodeWebpackPlugin = new RunNodeWebpackPlugin({ runOnlyInNormalMode: true });
            instance.apply(mockedCompiler);
            mockedCompiler.watchRunFunction();
            mockedCompiler.doneFunction(mockedStats);

            expect(consoleLogSpy.notCalled).to.be.true;
        });

        it('should do nothing when there are compilation errors', () => {
            const instance: RunNodeWebpackPlugin = new RunNodeWebpackPlugin();
            instance.apply(mockedCompiler);
            mockedStats.compilation.errors = ['error'];
            mockedCompiler.doneFunction(mockedStats);

            expect(consoleLogSpy.notCalled).to.be.true;
        });

        it('should run normally when there are compilation errors but ignoreErrors option is set to true', () => {
            const instance: RunNodeWebpackPlugin = new RunNodeWebpackPlugin({ ignoreErrors: true });
            instance.apply(mockedCompiler);
            mockedStats.compilation.errors = ['error'];
            mockedCompiler.doneFunction(mockedStats);

            expect(consoleLogSpy.calledOnce).to.be.true;
            expect(
                consoleLogSpy.calledOnceWithExactly(
                    Logger.INFO_COLOR,
                    Logger.PREFIX + LoggerMessages.STARTING + instance.scriptName
                )
            ).to.be.true;
        });

        it('should log error when webpack doesnt ouput any scripts', () => {
            const instance: RunNodeWebpackPlugin = new RunNodeWebpackPlugin();
            instance.apply(mockedCompiler);
            mockedStats.compilation.assets = {};
            mockedCompiler.doneFunction(mockedStats);

            expect(consoleLogSpy.calledOnce).to.be.true;
            expect(
                consoleLogSpy.calledOnceWithExactly(Logger.ERROR_COLOR, Logger.PREFIX + LoggerMessages.NO_OUTPUT_ASSETS)
            ).to.be.true;
        });

        it('should do nothing when outputted assets have not been changed', () => {
            const instance: RunNodeWebpackPlugin = new RunNodeWebpackPlugin();
            instance.apply(mockedCompiler);
            for (const asset in mockedStats.compilation.assets) {
                mockedStats.compilation.assets[asset].emitted = false;
            }
            mockedCompiler.doneFunction(mockedStats);

            expect(consoleLogSpy.notCalled).to.be.true;
        });

        it('should run normally when outputted assets have not been changed but runOnlyOnChanges options is set to false', () => {
            const instance: RunNodeWebpackPlugin = new RunNodeWebpackPlugin({ runOnlyOnChanges: false });
            instance.apply(mockedCompiler);
            for (const asset in mockedStats.compilation.assets) {
                mockedStats.compilation.assets[asset].emitted = false;
            }
            mockedCompiler.doneFunction(mockedStats);

            expect(consoleLogSpy.calledOnce).to.be.true;
            expect(
                consoleLogSpy.calledOnceWithExactly(
                    Logger.INFO_COLOR,
                    Logger.PREFIX + LoggerMessages.STARTING + instance.scriptName
                )
            ).to.be.true;
        });

        it('should run normally when scriptsToWatch option includes existent scripts', () => {
            const instance: RunNodeWebpackPlugin = new RunNodeWebpackPlugin({ scriptsToWatch: ['server.js'] });
            instance.apply(mockedCompiler);
            mockedCompiler.doneFunction(mockedStats);

            expect(consoleLogSpy.calledOnce).to.be.true;
            expect(
                consoleLogSpy.calledOnceWithExactly(
                    Logger.INFO_COLOR,
                    Logger.PREFIX + LoggerMessages.STARTING + instance.scriptName
                )
            ).to.be.true;
        });

        it('should do nothing when scriptsToWatch option includes only non-existent scripts', () => {
            const instance: RunNodeWebpackPlugin = new RunNodeWebpackPlugin({
                scriptsToWatch: ['non-existent-script.js']
            });
            instance.apply(mockedCompiler);
            mockedCompiler.doneFunction(mockedStats);

            expect(consoleLogSpy.notCalled).to.be.true;
        });
    });

    describe('Others', () => {
        it('should recognize when webpack is in a watch mode', () => {
            const instance: RunNodeWebpackPlugin = new RunNodeWebpackPlugin();
            instance.apply(mockedCompiler);

            expect(instance.isWebpackInWatchMode).to.be.false;
            mockedCompiler.watchRunFunction();
            expect(instance.isWebpackInWatchMode).to.be.true;
        });
    });
});
