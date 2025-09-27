export class Logger {
  static readonly INFO_COLOR: string = '\x1b[32m%s\x1b[0m';
  static readonly ERROR_COLOR: string = '\x1b[31m%s\x1b[0m';
  static readonly PREFIX: string = '[RunNodeWebpackPlugin] ';

  static info(message: string) {
    console.log(this.INFO_COLOR, this.PREFIX + message);
  }

  static error(message: string) {
    console.log(this.ERROR_COLOR, this.PREFIX + message);
  }

  static getStartingMessage(scriptName: string) {
    return `Starting node script: ${scriptName}`;
  }

  static getRestartingMessage(scriptName: string) {
    return `Restarting node script: ${scriptName}`;
  }

  static getNoOutputAssetsMessage() {
    return 'There are no output assets. Is your webpack config correct?';
  }

  static getNoScriptNameMessage(
    scriptName: string,
    outputAssetNames: string[]
  ) {
    return `Given script name '${scriptName}' could not be found among webpack ouput assets: ${outputAssetNames} nor in the file system`;
  }

  static getNoScriptPathMessage(outputAssetNames: string[]) {
    return `Can not determine which script to run. Choose a script among given list: ${outputAssetNames} or provide a path to a file`;
  }
}
