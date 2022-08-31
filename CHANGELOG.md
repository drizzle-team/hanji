
### v0.0.2
Added global `onTermite` callback to gracefully handle CLI termination
```typescript
import { onTerminate } from "hanji";

onTerminate((stdin: ReadStream, stdout: WriteStream) => {
  stdout.write(`\ngracefully abort\n^C\n`);
  process.exit(0);
});
```

32ms throttle for render events

Removed `onAttach` & `onDetach` callback functions to be overriden, now
we have more node-like api with `this.on("attach", (term) => ...)`.
That also provides `StateBundles` like `SelectState` ability to directly 
subscribe to lifecycle events.

Made `SelectState` generic, not string specific.
That provides an ability to write any `SelectState` you need like:
```typescript
private readonly data: SelectState<{ label: string; value: string }>;
// or
private readonly data: SelectState<{ label: string; value: {...} }>;
```

Provided type for keypress events and now `render()` returns a bundled object
```typescript
type Prompted<T> =
  | {
      data: undefined;
      status: "aborted";
    }
  | {
      data: T;
      status: "submitted";
    };
```

so you now can explicitly handle rejections:
```typescript
const result = await render(new Select(["user1", "user2", "user3", "user4"]));
if (result.status === "aborted") return;
console.log(result.data)

// or you can destructure
const { status, data} = await render(new Select(["user1", "user2", "user3", "user4"]));
if (status === "aborted") return;
console.log(data)
```

Removed `View` it's redundant