import { expect } from 'chai';
import { join, normalize, parse } from 'path';
import { SinonStub, stub } from 'sinon';

import RunNodeWebpackPlugin, {
  RunNodeWebpackPluginOptions,
} from '../src/index';
import { Logger } from '../src/logger';

describe('RunNodeWebpackPlugin', () => {
  describe('Options', () => {
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

    it('should retain default options when no instance arguments are passed', () => {
      const instance = new RunNodeWebpackPlugin();

      expect(instance['options']).to.deep.equal(defaultOptions);
    });

    it('should retain default options when undefined is passed', () => {
      const instance = new RunNodeWebpackPlugin(undefined);

      expect(instance['options']).to.deep.equal(defaultOptions);
    });

    it('should retain default options when an empty object is passed', () => {
      const instance = new RunNodeWebpackPlugin({});

      expect(instance['options']).to.deep.equal(defaultOptions);
    });

    it('should override default options with passed argument', () => {
      const newOptions: RunNodeWebpackPluginOptions = {
        scriptToRun: 'sample.js',
        scriptsToWatch: ['sample.js'],
        runOnlyOnChanges: false,
        runOnlyInWatchMode: true,
        runOnlyInNormalMode: true,
        ignoreErrors: true,
        nodeArgs: [],
        processArgs: {},
      };
      const instance = new RunNodeWebpackPlugin(newOptions);

      expect(instance['options']).to.deep.equal(newOptions);
    });
  });

  describe('Logs', () => {
    let loggerInfoStub: SinonStub;
    let loggerErrorStub: SinonStub;
    let mockedCompiler: any;
    let mockedStats: any;

    beforeEach(() => {
      loggerInfoStub = stub(Logger, 'info');
      loggerErrorStub = stub(Logger, 'error');

      mockedCompiler = {
        watchRunFunction: undefined,
        doneFunction: undefined,
        hooks: {
          watchRun: {
            tap: (_: string, fn: Function) =>
              (mockedCompiler.watchRunFunction = fn),
          },
          done: {
            tap: (_: string, fn: Function) =>
              (mockedCompiler.doneFunction = fn),
          },
        },
      };

      mockedStats = {
        hasErrors: () => false,
        compilation: {
          compiler: {},
          getPath: () => 'test',
          assets: {
            'server.js': {},
            'test-script.js': {},
          },
          emittedAssets: new Set(['server.js', 'test-script.js']),
        },
      };
    });

    afterEach(() => {
      loggerInfoStub.restore();
      loggerErrorStub.restore();
    });

    it('should run normally with default options when webpack outputs only one file', () => {
      const instance = new RunNodeWebpackPlugin();
      instance.apply(mockedCompiler);
      mockedStats.compilation.assets = {
        'test-script.js': {},
      };
      mockedCompiler.doneFunction(mockedStats);

      const scriptName = Object.keys(mockedStats.compilation.assets)[0];
      expect(instance['scriptName']).to.be.equal(scriptName);
      expect(instance['scriptPath']).to.be.equal(join('test', scriptName));
      expect(loggerInfoStub.calledOnce).to.be.true;
      expect(
        loggerInfoStub.calledOnceWithExactly(
          Logger.getStartingMessage(scriptName)
        )
      ).to.be.true;
    });

    it("should run normally with default options when webpack outputs 'server.js' file", () => {
      const instance = new RunNodeWebpackPlugin();
      instance.apply(mockedCompiler);
      mockedCompiler.doneFunction(mockedStats);

      const scriptName = 'server.js';
      expect(instance['scriptName']).to.be.equal(scriptName);
      expect(instance['scriptPath']).to.be.equal(join('test', scriptName));
      expect(loggerInfoStub.calledOnce).to.be.true;
      expect(
        loggerInfoStub.calledOnceWithExactly(
          Logger.getStartingMessage(scriptName)
        )
      ).to.be.true;
    });

    it('should log error with default options when webpack outputs multiple not common file names', () => {
      const instance = new RunNodeWebpackPlugin();
      instance.apply(mockedCompiler);
      mockedStats.compilation.assets = {
        'not-common-file-name1.js': {},
        'not-common-file-name2.js': {},
      };
      mockedCompiler.doneFunction(mockedStats);

      expect(loggerErrorStub.calledOnce).to.be.true;
      expect(
        loggerErrorStub.calledOnceWithExactly(
          Logger.getNoScriptPathMessage(
            Object.keys(mockedStats.compilation.assets)
          )
        )
      ).to.be.true;
    });

    it('should run normally when scriptToRun is set to one of outputted asset names', () => {
      const scriptName = 'test-script.js';
      const instance = new RunNodeWebpackPlugin({
        scriptToRun: scriptName,
      });
      instance.apply(mockedCompiler);
      mockedCompiler.doneFunction(mockedStats);

      expect(instance['scriptName']).to.be.equal(scriptName);
      expect(instance['scriptPath']).to.be.equal(join('test', scriptName));
      expect(loggerInfoStub.calledOnce).to.be.true;
      expect(
        loggerInfoStub.calledOnceWithExactly(
          Logger.getStartingMessage(scriptName)
        )
      ).to.be.true;
    });

    it('should log error when scriptToRun is set to a non-existent asset name', () => {
      const scriptName = 'non-existent-script.js';
      const instance = new RunNodeWebpackPlugin({
        scriptToRun: scriptName,
      });
      instance.apply(mockedCompiler);
      mockedCompiler.doneFunction(mockedStats);

      expect(loggerErrorStub.calledOnce).to.be.true;
      expect(
        loggerErrorStub.calledOnceWithExactly(
          Logger.getNoScriptNameMessage(
            scriptName,
            Object.keys(mockedStats.compilation.assets)
          )
        )
      ).to.be.true;
    });

    it('should run normally when scriptToRun is set as a path to an existent file', () => {
      const scriptName = './test/test-script.js';
      const computedScriptName = parse(scriptName).base;
      const computedScriptPath = normalize(scriptName);
      const instance = new RunNodeWebpackPlugin({
        scriptToRun: scriptName,
      });
      instance.apply(mockedCompiler);
      mockedCompiler.doneFunction(mockedStats);

      expect(instance['scriptName']).to.be.equal(computedScriptName);
      expect(instance['scriptPath']).to.be.equal(computedScriptPath);
      expect(loggerInfoStub.calledOnce).to.be.true;
      expect(
        loggerInfoStub.calledOnceWithExactly(
          Logger.getStartingMessage(computedScriptName)
        )
      ).to.be.true;
    });

    it('should log error when scriptToRun is set set as a path to a non-existent file', () => {
      const scriptName = './path/to/non-existent-script.js';
      const instance = new RunNodeWebpackPlugin({
        scriptToRun: scriptName,
      });
      instance.apply(mockedCompiler);
      mockedCompiler.doneFunction(mockedStats);

      expect(loggerErrorStub.calledOnce).to.be.true;
      expect(
        loggerErrorStub.calledOnceWithExactly(
          Logger.getNoScriptNameMessage(
            scriptName,
            Object.keys(mockedStats.compilation.assets)
          )
        )
      ).to.be.true;
    });

    it('should do nothing when webpack is not in a watch mode and runOnlyInWatchMode option is set to true', () => {
      const instance = new RunNodeWebpackPlugin({
        runOnlyInWatchMode: true,
      });
      instance.apply(mockedCompiler);
      mockedCompiler.doneFunction(mockedStats);

      expect(loggerInfoStub.notCalled).to.be.true;
    });

    it('should do nothing when webpack is in a watch mode and runOnlyInNormalMode option is set to true', () => {
      const instance = new RunNodeWebpackPlugin({
        runOnlyInNormalMode: true,
      });
      instance.apply(mockedCompiler);
      mockedCompiler.watchRunFunction();
      mockedCompiler.doneFunction(mockedStats);

      expect(loggerInfoStub.notCalled).to.be.true;
    });

    it('should do nothing when there are compilation errors', () => {
      const instance = new RunNodeWebpackPlugin();
      instance.apply(mockedCompiler);
      mockedStats.hasErrors = () => true;
      mockedCompiler.doneFunction(mockedStats);

      expect(loggerInfoStub.notCalled).to.be.true;
    });

    it('should run normally when there are compilation errors but ignoreErrors option is set to true', () => {
      const instance = new RunNodeWebpackPlugin({
        ignoreErrors: true,
      });
      instance.apply(mockedCompiler);
      mockedStats.hasErrors = () => true;
      mockedCompiler.doneFunction(mockedStats);

      expect(loggerInfoStub.calledOnce).to.be.true;
      expect(
        loggerInfoStub.calledOnceWithExactly(
          Logger.getStartingMessage(instance['scriptName']!)
        )
      ).to.be.true;
    });

    it('should log error when webpack doesnt ouput any scripts', () => {
      const instance = new RunNodeWebpackPlugin();
      instance.apply(mockedCompiler);
      mockedStats.compilation.assets = {};
      mockedCompiler.doneFunction(mockedStats);

      expect(loggerErrorStub.calledOnce).to.be.true;
      expect(
        loggerErrorStub.calledOnceWithExactly(Logger.getNoOutputAssetsMessage())
      ).to.be.true;
    });

    it('should not restart script when outputted assets have not been changed', () => {
      const instance = new RunNodeWebpackPlugin();
      instance.apply(mockedCompiler);
      mockedStats.compilation.emittedAssets = new Set();
      mockedCompiler.doneFunction(mockedStats);

      expect(loggerInfoStub.calledOnce).to.be.true;
      expect(
        loggerInfoStub.calledOnceWithExactly(
          Logger.getStartingMessage(instance['scriptName']!)
        )
      ).to.be.true;

      mockedCompiler.doneFunction(mockedStats);

      expect(loggerInfoStub.calledOnce).to.be.true;
    });

    it('should restart script when outputted assets have not been changed but runOnlyOnChanges options is set to false', () => {
      const instance = new RunNodeWebpackPlugin({
        runOnlyOnChanges: false,
      });
      instance.apply(mockedCompiler);
      mockedStats.compilation.emittedAssets = new Set();
      mockedCompiler.doneFunction(mockedStats);

      expect(loggerInfoStub.calledOnce).to.be.true;
      expect(
        loggerInfoStub.calledOnceWithExactly(
          Logger.getStartingMessage(instance['scriptName']!)
        )
      ).to.be.true;

      mockedCompiler.doneFunction(mockedStats);

      expect(
        loggerInfoStub.calledWithExactly(
          Logger.getRestartingMessage(instance['scriptName']!)
        )
      ).to.be.true;
    });

    it('should restart script when scriptsToWatch option includes existent scripts', () => {
      const instance = new RunNodeWebpackPlugin({
        scriptsToWatch: ['server.js'],
      });
      instance.apply(mockedCompiler);
      mockedCompiler.doneFunction(mockedStats);

      expect(loggerInfoStub.calledOnce).to.be.true;
      expect(
        loggerInfoStub.calledOnceWithExactly(
          Logger.getStartingMessage(instance['scriptName']!)
        )
      ).to.be.true;

      mockedCompiler.doneFunction(mockedStats);

      expect(
        loggerInfoStub.calledWithExactly(
          Logger.getRestartingMessage(instance['scriptName']!)
        )
      ).to.be.true;
    });

    it('should not restart script when scriptsToWatch option includes only non-existent scripts', () => {
      const instance = new RunNodeWebpackPlugin({
        scriptsToWatch: ['non-existent-script.js'],
      });
      instance.apply(mockedCompiler);
      mockedCompiler.doneFunction(mockedStats);

      expect(loggerInfoStub.calledOnce).to.be.true;
      expect(
        loggerInfoStub.calledOnceWithExactly(
          Logger.getStartingMessage(instance['scriptName']!)
        )
      ).to.be.true;

      mockedCompiler.doneFunction(mockedStats);

      expect(loggerInfoStub.calledOnce).to.be.true;
    });
  });

  describe('Others', () => {
    it('should recognize when webpack is in a watch mode', () => {
      const mockedCompiler: any = {
        watchRunFunction: undefined,
        hooks: {
          watchRun: {
            tap: (_: string, fn: Function) =>
              (mockedCompiler.watchRunFunction = fn),
          },
          done: {
            tap: () => {},
          },
        },
      };

      const instance = new RunNodeWebpackPlugin();
      instance.apply(mockedCompiler);

      expect(instance['isWebpackInWatchMode']).to.be.false;
      mockedCompiler.watchRunFunction();
      expect(instance['isWebpackInWatchMode']).to.be.true;
    });
  });
});
