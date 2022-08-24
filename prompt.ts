"use strict";

import EventEmitter from "events";
import { beep, cursor } from "sisteransi";
import { WriteStream,ReadStream } from "tty";
import { prepareReadLine } from "./readline";

const action = (key) => {
  if (key.meta && key.name !== "escape") return;

  if (key.ctrl) {
    if (key.name === "a") return "first";
    if (key.name === "c") return "abort";
    if (key.name === "d") return "abort";
    if (key.name === "e") return "last";
    if (key.name === "g") return "reset";
  }

  if (key.name === "return") return "submit";
  if (key.name === "enter") return "submit"; // ctrl + J
  if (key.name === "backspace") return "delete";
  if (key.name === "delete") return "deleteForward";
  if (key.name === "abort") return "abort";
  if (key.name === "escape") return "exit";
  if (key.name === "tab") return "next";
  if (key.name === "pagedown") return "nextPage";
  if (key.name === "pageup") return "prevPage";
  // TODO create home() in prompt types (e.g. TextPrompt)
  if (key.name === "home") return "home";
  // TODO create end() in prompt types (e.g. TextPrompt)
  if (key.name === "end") return "end";

  if (key.name === "up") return "up";
  if (key.name === "down") return "down";
  if (key.name === "right") return "right";
  if (key.name === "left") return "left";

  return false;
};



class Prompt extends EventEmitter {
  private in: ReadStream;
  private out: WriteStream;
  private rl: Closable;
  private keypress: (str: string, key: string) => void;

  constructor() {
    super();

    const { stdin, stdout, closable } = prepareReadLine()
    this.in = stdin;
    this.out = stdout;
    this.rl = closable

    if (this.in.isTTY) this.in.setRawMode(true);

    this.keypress = (str, key) => {
      console.log(str, key)
      let a = action(key);

    //   if (typeof this[a] === "function") {
    //     this[a](key);
    //   } else {
    //     this.bell();
    //   }
    };
    
    const close = () => {
        this.out.write(cursor.show);
        this.in.removeListener("keypress", this.keypress);
        if (this.in.isTTY) this.in.setRawMode(false);
        this.rl.close();
        // this.emit(
        //   this.aborted ? "abort" : this.exited ? "exit" : "submit",
        //   this.value
        // );
        // this.closed = true;
      };

    this.in.on("keypress", this.keypress);
  }

  close = () => {
    this.out.write(cursor.show);
    this.in.removeListener("keypress", this.keypress);
    if (this.in.isTTY) this.in.setRawMode(false);
    this.rl.close();
    // this.emit(
    //   this.aborted ? "abort" : this.exited ? "exit" : "submit",
    //   this.value
    // );
    // this.closed = true;
  };

  fire() {
    // this.emit("state", {
    //   value: this.value,
    //   aborted: !!this.aborted,
    //   exited: !!this.exited,
    // });
  }

  bell() {
    this.out.write(beep);
  }
}

export default Prompt;
