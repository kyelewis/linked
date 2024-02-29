type QueryFunction = (
  argumentMap: Record<string, any>,
  linked: Linked,
) => Promise<any>;
type TaskFunction = (
  argumentMap: Record<string, any>,
  linked: Linked,
) => Promise<any>;
type LinkFunction = (result: any, linked: Linked) => Promise<any>;
type ConnectionFunction = (
  context: Record<string, any>,
  linked: Linked,
) => Promise<Record<string, (...args: Array<any>) => Promise<any>>>;

export interface LinkedOptions {
  logging?: boolean;
  context?: Record<string, any>;
}

export interface AddOptions {
  queries?: {
    [key: string]: QueryFunction;
  };
  tasks?: {
    [key: string]: TaskFunction;
  };
  connections?: {
    [key: string]: ConnectionFunction;
  };
  links?: {
    [key: string]: LinkFunction;
  };
}

export class Linked {
  public queries: Map<string, QueryFunction>;
  public tasks: Map<string, TaskFunction>;
  public connections: Map<string, ConnectionFunction>;
  public links: Map<string, LinkFunction>;

  constructor(public options: LinkedOptions = {}) {
    this.queries = new Map();
    this.tasks = new Map();
    this.connections = new Map();
    this.links = new Map();
    this.options = options;
    if (!this.options.context) this.options.context = {};
  }

  setContext(key: string, value: any) {
    if (!this.options.context) this.options.context = {};
    this.options.context[key] = value;
  }

  log(...messages: any) {
    if (!this.options.logging) return;
    for (const message of messages) {
      console.log(
        `[Linked] ${
          typeof message === "string" ? message : JSON.stringify(message)
        }`,
      );
    }
  }

  add(options: AddOptions) {
    if (options.queries) {
      for (const [key, queryFunction] of Object.entries(options.queries)) {
        this.queries.set(key, queryFunction);
      }
    }

    if (options.tasks) {
      for (const [key, taskFunction] of Object.entries(options.tasks)) {
        this.tasks.set(key, taskFunction);
      }
    }

    if (options.connections) {
      for (const [key, connectionFunction] of Object.entries(
        options.connections,
      )) {
        this.connections.set(key, connectionFunction);
      }
    }

    if (options.links) {
      for (const [key, linkFunction] of Object.entries(options.links)) {
        this.links.set(key, linkFunction);
      }
    }
  }

  connection(name: string) {
    const connection = this.connections.get(name);
    if (!connection) throw new Error("No connection named " + name);

    return new Proxy(connection, {
      get: (obj, prop) => {
        return async (...args: Array<any>) => {
          const context = await obj(this.options.context ?? {}, this);
          return context[String(prop)](...args);
        };
      },
    }) as any as Record<string, (...args: any) => Promise<any>>;
  }

  async call(name: string, argumentMap = {}): Promise<any> {
    this.log(`Call to ${name} with arguments ${JSON.stringify(argumentMap)}`);
    const linkedFunction = this.queries.get(name) || this.tasks.get(name);
    if (!linkedFunction)
      throw new Error(`Could not find a function with name ${name}`);

    const result: any = await linkedFunction(argumentMap, this);

    if (result === undefined || result === null) return null;

    if (Array.isArray(result)) {
      return result.map((oneResult) => {
        let links: Record<string, any> = {};
        for (const [linkName, linkFunction] of this.links.entries()) {
          const path = linkName.split(".");
          if (name === path[0]) {
            this.log(`Linking ${linkName} on ${name}`);
            links[path[1]] = () => linkFunction(oneResult, this);
          }
        }
        return {
          ...oneResult,
          ...links,
        };
      });
    } else {
      let links: Record<string, any> = {};
      for (const [linkName, linkFunction] of this.links.entries()) {
        const path = linkName.split(".");
        if (name === path[0]) {
          links[path[1]] = () => linkFunction(result, this);
        }
      }
      return {
        ...result,
        ...links,
      };
      return result;
    }
  }

  validate() {
    // @todo validate more
    // Validate links
    for (const [key, value] of this.links.entries()) {
      const path = key.split(".");
      if (path.length > 2)
        throw new Error(
          "Only two level links supported e.g. employee.location",
        );
      const linkedFunction = this.queries.get(path[0]);
      if (!linkedFunction)
        throw new Error(`Could not find a function with name ${path[0]}`);
    }
  }
}
