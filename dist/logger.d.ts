export declare class Logger {
    static readonly INFO_COLOR: string;
    static readonly ERROR_COLOR: string;
    static readonly PREFIX: string;
    static info(message: string): void;
    static error(message: string): void;
}
export declare const enum LoggerMessages {
    STARTING = "Starting node script: ",
    RESTARTING = "Restarting node script: ",
    NO_OUTPUT_ASSETS = "There are no output assets. Is your webpack config correct?",
    NO_SCRIPT_NAME1 = "Given script name '",
    NO_SCRIPT_NAME2 = "' could not be found among webpack ouput assets: ",
    NO_SCRIPT_NAME3 = " or in the file system",
    NO_SCRIPT_PATH1 = "Can not determine which script to run. Choose a script among given list: ",
    NO_SCRIPT_PATH2 = " or provide a path to a file"
}
