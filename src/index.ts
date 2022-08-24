import { ReadStream, WriteStream } from "tty";
import { prepareReadLine } from "./readline";
import { cursor } from "sisteransi";
import { clear } from "./utils";

export interface Closable {
  close(): void
}

export abstract class View {
  abstract render(): string;
}

export abstract class PromptView<RESULT> {
  protected terminal: ITerminal | undefined;

  protected requestLayout() {
    this.terminal!.requestLayout();
  }

  attach(terminal: ITerminal) {
    this.terminal = terminal;
    this.onAttach(terminal);
  }

  detach(terminal: ITerminal) {
    this.onDetach(terminal);
    this.terminal = undefined;
  }

  onInput(str: string | undefined, key: any) {}

  abstract result(): RESULT;
  abstract onAttach(terminal: ITerminal): void;
  abstract onDetach(terminal: ITerminal): void;
  abstract render(status: "idle" | "submitted" | "aborted"): string;
}

export class SelectViewData {
  public selectedIdx = 0;
  constructor(public readonly items: string[]) {}

  consume(str: string | undefined, key: any): boolean {
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

export class Terminal implements ITerminal {
  private text = "";
  private status: "idle" | "submitted" | "aborted" = "idle";
  private resolve: (value: {} | PromiseLike<{}>) => void;
  private reject: (reason?: any) => void;
  private promise: Promise<{}>;

  constructor(
    private readonly view: PromptView<any>,
    private readonly stdin: ReadStream,
    private readonly stdout: WriteStream,
    private readonly closabel: Closable
  ) {
    if (this.stdin.isTTY) this.stdin.setRawMode(true);

    const keypress = (str: string | undefined, key: any) => {
      if (key["name"] === "c" && key["ctrl"] === true) {
        // this.stdout.write(beep);
        // this.stdout.write("\n");
        this.view.detach(this);
        this.closabel.close();
        return;
      }

      if (key.name === "return") {
        this.status = "submitted";
        this.requestLayout();
        this.view.detach(this);
        this.closabel.close();
        this.stdin.removeListener("keypress", keypress);
        if (this.stdin.isTTY) this.stdin.setRawMode(false);
        this.resolve(this.view.result());
        return;
      }

      view.onInput(str, key);
    };

    this.stdin.on("keypress", keypress);
    this.view.attach(this);

    const { resolve, reject, promise } = deferred<{}>();
    this.resolve = resolve;
    this.reject = reject;
    this.promise = promise;
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
    if (this.text) this.stdout.write(clear(this.text, this.stdout.columns));
    const string = this.view.render(this.status);

    this.text = string;
    this.stdout.write(string);
  }
}

export function render(view: PromptView<any>): Promise<any>;
export function render(view: View): void;
export function render(view: string): void;
export function render(view: any): any {
  const { stdin, stdout, closable } = prepareReadLine();
  if (view instanceof PromptView) {
    const terminal = new Terminal(view, stdin, stdout, closable);
    terminal.requestLayout();
    return terminal.result();
  }

  const data = view instanceof View ? view.render() : view;
  stdout.write(data);
  stdout.write("\n");
  return;
}
