import { ReadStream, WriteStream } from "tty";
import { prepareReadLine } from "./readline";
import { cursor, erase } from "sisteransi";
import { clear } from "./utils";
import throttle from "lodash.throttle";

export interface Closable {
  close(): void;
}

export abstract class Prompt<RESULT> {
  protected terminal: ITerminal | undefined;
  private attachCallbacks: ((terminal: ITerminal) => void)[] = [];
  private detachCallbacks: ((terminal: ITerminal) => void)[] = [];
  private inputCallbacks: ((str: string | undefined, key: AnyKey) => void)[] =
    [];

  requestLayout() {
    this.terminal!.requestLayout();
  }

  on(type: "attach", callback: (terminal: ITerminal) => void): void;
  on(type: "detach", callback: (terminal: ITerminal) => void): void;
  on(
    type: "input",
    callback: (str: string | undefined, key: AnyKey) => void
  ): void;
  on(type: "attach" | "detach" | "input", callback: any): void {
    if (type === "attach") {
      this.attachCallbacks.push(callback);
    } else if (type === "detach") {
      this.detachCallbacks.push(callback);
    } else if (type === "input") {
      this.inputCallbacks.push(callback);
    }
  }

  attach(terminal: ITerminal) {
    this.terminal = terminal;
    this.attachCallbacks.forEach((it) => it(terminal));
  }

  detach(terminal: ITerminal) {
    this.detachCallbacks.forEach((it) => it(terminal));
    this.terminal = undefined;
  }

  input(str: string | undefined, key: AnyKey) {
    this.inputCallbacks.forEach((it) => it(str, key));
  }

  abstract result(): RESULT;
  abstract render(status: "idle" | "submitted" | "aborted"): string;
}

export class SelectState<T> {
  public selectedIdx = 0;
  constructor(public readonly items: T[]) {}

  bind(prompt: Prompt<any>) {
    prompt.on("input", (str, key) => {
      const invalidate = this.consume(str, key);
      if (invalidate) prompt.requestLayout();
    });
  }

  private consume(str: string | undefined, key: AnyKey): boolean {
    if (!key) return false;

    if (key.name === "down") {
      this.selectedIdx = (this.selectedIdx + 1) % this.items.length;
      return true;
    }

    if (key.name === "up") {
      this.selectedIdx -= 1;
      this.selectedIdx =
        this.selectedIdx < 0 ? this.items.length - 1 : this.selectedIdx;
      return true;
    }

    return false;
  }
}

export const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    resolve,
    reject,
    promise,
  };
};

export interface ITerminal {
  toggleCursor(state: "hide" | "show"): void;
  requestLayout(): void;
}

type AnyKey = {
  sequence: string;
  name: string | undefined;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
};

type Prompted<T> =
  | {
      data: undefined;
      status: "aborted";
    }
  | {
      data: T;
      status: "submitted";
    };

export class Terminal implements ITerminal {
  private text = "";
  private status: "idle" | "submitted" | "aborted" = "idle";
  private resolve: (value: Prompted<{}> | PromiseLike<Prompted<{}>>) => void;
  private promise: Promise<Prompted<{}>>;
  private renderFunc: (str: string) => void;

  constructor(
    private readonly view: Prompt<any>,
    private readonly stdin: ReadStream,
    private readonly stdout: WriteStream,
    private readonly closable: Closable
  ) {
    if (this.stdin.isTTY) this.stdin.setRawMode(true);

    const keypress = (str: string | undefined, key: AnyKey) => {
      // console.log(str, key);
      if (key.name === "c" && key.ctrl === true) {
        this.requestLayout();
        this.view.detach(this);
        this.tearDown(keypress);
        if (terminateHandler) {
          terminateHandler(this.stdin, this.stdout);
          return;
        }
        this.stdout.write(`\n^C\n`);
        process.exit(1);
      }

      if (key.name === "escape") {
        // this.stdout.write(beep);
        // this.stdout.write("\n");
        this.status = "aborted";
        this.requestLayout();
        this.view.detach(this);
        this.tearDown(keypress);
        this.resolve({ status: "aborted", data: undefined });
        return;
      }

      if (key.name === "return") {
        this.status = "submitted";
        this.requestLayout();
        this.view.detach(this);
        this.tearDown(keypress);
        this.resolve({ status: "submitted", data: this.view.result() });
        return;
      }

      view.input(str, key);
    };

    this.stdin.on("keypress", keypress);
    this.view.attach(this);

    const { resolve, promise } = deferred<Prompted<{}>>();
    this.resolve = resolve;
    this.promise = promise;

    this.renderFunc = throttle((str: string) => {
      this.stdout.write(str);
    });
  }

  private tearDown(keypress: (...args: any[]) => void) {
    this.stdout.write(cursor.show);
    this.stdin.removeListener("keypress", keypress);
    if (this.stdin.isTTY) this.stdin.setRawMode(false);
    this.closable.close();
  }

  result(): Promise<{}> {
    return this.promise;
  }

  toggleCursor(state: "hide" | "show") {
    if (state === "hide") {
      this.stdout.write(cursor.hide);
    } else {
      this.stdout.write(cursor.show);
    }
  }

  requestLayout() {
    const string = this.view.render(this.status);
    const clearPrefix = this.text ? clear(this.text, this.stdout.columns) : "";
    this.text = string;

    this.renderFunc(`${clearPrefix}${string}`);
  }
}

export function render<T>(view: Prompt<T>): Promise<Prompted<T>>;
export function render(view: string): void;
export function render(view: any): any {
  const { stdin, stdout, closable } = prepareReadLine();
  if (view instanceof Prompt) {
    const terminal = new Terminal(view, stdin, stdout, closable);
    terminal.requestLayout();
    return terminal.result();
  }

  stdout.write(`${view}\n`);
  closable.close()
  return;
}

let terminateHandler:
  | ((stdin: ReadStream, stdout: WriteStream) => void)
  | undefined;

export function onTerminate(
  callback: (stdin: ReadStream, stdout: WriteStream) => void | undefined
) {
  terminateHandler = callback;
}
