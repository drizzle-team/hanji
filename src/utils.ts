import { erase, cursor } from "sisteransi";

const strip = (str: string) => {
  const pattern = [
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PRZcf-ntqry=><~]))",
  ].join("|");

  const RGX = new RegExp(pattern, "g");
  return typeof str === "string" ? str.replace(RGX, "") : str;
};

const stringWidth = (str: string) => [...strip(str)].length;

export const clear = function (prompt: string, perLine: number) {
  if (!perLine) return erase.line + cursor.to(0);

  let rows = 0;
  const lines = prompt.split(/\r?\n/);
  for (let line of lines) {
    rows += 1 + Math.floor(Math.max(stringWidth(line) - 1, 0) / perLine);
  }

  return erase.lines(rows);
};
