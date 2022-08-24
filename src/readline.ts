import { WriteStream, ReadStream } from "tty";
import { Closable } from "./prompt";

export const prepareReadLine = (): {
  stdin: ReadStream;
  stdout: WriteStream;
  closable: Closable;
} => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    const readline = require("readline");
    const rl = readline.createInterface({
      input: stdin,
      escapeCodeTimeout: 50,
    });

    readline.emitKeypressEvents(stdin, rl);
    
    return {
      stdin,
      stdout,
      closable: rl,
    };
};
