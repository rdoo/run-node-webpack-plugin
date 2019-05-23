"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Logger = /** @class */ (function () {
    function Logger() {
    }
    Logger.info = function (message) {
        console.log(this.INFO_COLOR, this.PREFIX + message);
    };
    Logger.error = function (message) {
        console.log(this.ERROR_COLOR, this.PREFIX + message);
    };
    Logger.INFO_COLOR = '\x1b[32m%s\x1b[0m';
    Logger.ERROR_COLOR = '\x1b[31m%s\x1b[0m';
    Logger.PREFIX = '[RunNodeWebpackPlugin] ';
    return Logger;
}());
exports.Logger = Logger;
