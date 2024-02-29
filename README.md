# linkedjs

A simple library for linking data queries together and managing connections and context

## Example

```typescript
import { Linked } from "linkedjs";

const linked = new Linked();

linked.add({
  queries: {
    crew: () => [
      { name: "Pete", locationId: "3" },
      { name: "Steve", locationId: "7" },
    ],
    location: ({ id }) => {
      switch (id) {
        case "3":
          return { name: "Victoria" };
        case "7":
          return { name: "New South Wales" };
      }
    },
  },
  links: {
    "crew.location": (crew, linked) =>
      linked.call("location", { id: crew.locationId }),
  },
});

const result = linked.call("crew");

// result = [ { name: "Pete", location: Promise({ name: "Victoria "}) }, ... ];
```
