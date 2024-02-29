import { Linked } from "../src";
import { expect, test } from "bun:test";

const linked = new Linked({ logging: true });

const getCrew = () => {
  return Promise.resolve([
    { name: "Pete", location: "3" },
    { name: "Steve", location: "7" },
  ]);
};

const getLocation = ({ id }: { id?: string } = {}) => {
  switch (id) {
    case "3":
      return Promise.resolve({ name: "Victoria" });
    case "7":
      return Promise.resolve({ name: "New South Wales" });
    default:
      return Promise.reject("Unknown Location");
  }
};

linked.add({ queries: { crew: () => getCrew() } });

test("function with no arguments is callable", async () => {
  const crew = await linked.call("crew");
  expect(crew).toEqual(await getCrew());
});

linked.add({ queries: { location: ({ id }) => getLocation({ id }) } });

test("function with arguments is callable", async () => {
  const location = await linked.call("location", { id: "7" });
  expect(location).toEqual({ name: "New South Wales" });
});

test("Linking between functions works", async () => {
  linked.add({
    links: {
      "crew.location": (crew, linked) =>
        linked.call("location", { id: crew.location }),
    },
  });
  const result: any = await linked.call("crew");

  expect(result?.[0].name).toEqual("Pete");
  expect(typeof result?.[1].location).toBe("function");
  const location = await result?.[1].location();
  expect(location.name).toEqual("New South Wales");
});

test("Connections should work", async () => {
  const linked2 = new Linked({ context: { setPong: true } });

  linked2.add({
    connections: {
      ping: ({ setPong }) =>
        Promise.resolve({
          ping: ({ name }) =>
            Promise.resolve({
              pong: setPong,
              name,
            }),
        }),
    },
    queries: {
      ping: ({ name }, linked) => linked.connection("ping").ping({ name }),
    },
  });

  await linked2.validate();

  const result: any = await linked2.call("ping", { name: "Tim" });

  expect(result.pong).toBe(true);
  expect(result.name).toBe("Tim");
});
