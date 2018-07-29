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
}

export const enum LoggerMessages {
    STARTING = 'Starting node script: ',
    RESTARTING = 'Restarting node script: ',
    NO_OUTPUT_ASSETS = 'There are no output assets. Is your webpack config correct?',
    NO_SCRIPT_NAME1 = "Given script name '",
    NO_SCRIPT_NAME2 = "' could not be found among webpack ouput assets: ",
    NO_SCRIPT_NAME3 = ' or in the file system',
    NO_SCRIPT_PATH1 = 'Can not determine which script to run. Choose a script among given list: ',
    NO_SCRIPT_PATH2 = ' or provide a path to a file'
}
