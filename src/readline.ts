import readline from "readline";
import { WriteStream, ReadStream } from "tty";
import { Closable } from ".";

export const stdin = process.stdin as ReadStream;
export const stdout = process.stdout as WriteStream;

readline.emitKeypressEvents(stdin);

export const createClosable = (): Closable => {
  return readline.createInterface({
    input: stdin,
    escapeCodeTimeout: 50,
  });
};
