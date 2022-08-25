Hanji is a designless command line user interface builder for nodejs+typescript.
by [@_alexblokh](https://twitter.com/_alexblokh)

You can create your own static views by extending `View`. You're free to use any 
cli text styling libraries like `chalk` or `kleur` or `ansiicolors` or any other.
```typescript
import kleur from "kleur";
import chalk from "chalk";

export class TextView extends View {
  constructor(private readonly text: string) {
    super();
  }

  render(): string {
    return this.text;
  }
}

render(new TextView("Static text"))
render(new TextView(chalk.bold().blue("Static text")))
render(new TextView(kleur.bold().blue("Static text")))
```

You can incapsulate styling in your custom views
```typescript
import chalk from "chalk";
export class BoldBlueTextView extends View {
  constructor(private readonly text: string) {
    super();
  }

  render(): string {
    return chalk.bold().blue(this.text);
  }
}

render(new BoldBlueTextView("Static bold blue text"))
```

You can implement prompts by extending `PromptView` class.
Below is an example of how to implement `SelectView` with utility `SelectViewData` bundle provided from the library.
I will provide more view agnostic datasets to make implementing custom views like `input` a breath.
```typescript
import color from "kleur";
import { ITerminal, PromptView, render, SelectViewData } from "armin";

export class SelectView extends PromptView<{ index: number; value: string }> {
  private readonly data: SelectViewData;

  constructor(items: string[]) {
    super();
    this.data = new SelectViewData(items);
  }

  onAttach(terminal: ITerminal) {
    terminal.toggleCursor("hide");
  }

  onDetach(terminal: ITerminal) {
    terminal.toggleCursor("show");
  }

  override onInput(str: string | undefined, key: any) {
    super.onInput(str, key);
    const invlidate = this.data.consume(str, key);
    if (invlidate) {
      this.requestLayout();
      return;
    }

    console.log(str, key);
  }

  render(status: "idle" | "submitted" | "aborted"): string {
    if (status === "submitted") {
      return "";
    }

    let text = "";
    this.data.items.forEach((it, idx) => {
      text += idx === this.data.selectedIdx ? `${color.green("❯ "+it)}` : `  ${it}`;
      text += idx != this.data.items.length-1 ?"\n" : "";
    });
    return text;
  }

  result() {
    return {
      index: this.data.selectedIdx,
      value: this.data.items[this.data.selectedIdx]!,
    };
  }
}

const result = await render(
  new SelectView(["users", "abusers"])
);

console.log(result);
// { index: 0, value: 'users' }
```