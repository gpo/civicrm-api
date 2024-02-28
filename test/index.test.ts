import { DeferredPromise } from "@open-draft/deferred-promise";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { createClient } from "../src";
import { server } from "./mock-server";

const client = createClient({
  baseUrl: "https://example.com",
  apiKey: "mock-api-key",
  entities: {
    contact: "Contact",
    activity: "Activity",
  },
});

let request: DeferredPromise<Request>;

beforeEach(() => {
  request = new DeferredPromise();

  server.events.on("request:start", (req) => {
    request.resolve(req.request);
  });
});

afterEach(() => {
  server.events.removeAllListeners();
});

test("requires baseUrl", () => {
  expect(() => {
    // @ts-ignore
    createClient({ apiKey: "mock-api-key" });
  }).toThrow("baseUrl is required");
});

test("requires apiKey", () => {
  expect(() => {
    // @ts-ignore
    createClient({ baseUrl: "https://example.com" });
  }).toThrow("apiKey is required");
});

test("creates methods for specified entities", () => {
  expect(client.contact).toBeDefined();
  expect(client.activity).toBeDefined();
});

test("makes a request", async () => {
  await client.contact().get();
  const req = await request;

  expect(req.url).toBe("https://example.com/civicrm/ajax/api4/Contact/get");
});

test("sets request headers", async () => {
  await client.contact().get();
  const req = await request;

  expect(req.headers.get("Authorization")).toBe("Bearer mock-api-key");
  expect(req.headers.get("X-Requested-With")).toBe("XMLHttpRequest");
  expect(req.headers.get("Content-Type")).toBe(
    "application/x-www-form-urlencoded",
  );
});

test("accepts request options", async () => {
  await client
    .contact({
      cache: "no-cache",
    })
    .get();
  const req = await request;

  expect(req.cache).toBe("no-cache");
});

test("accepts additional headers", async () => {
  await client
    .contact({
      headers: {
        "X-Correlation-Id": "mock-correlation-id",
      },
    })
    .get();
  const req = await request;

  expect(req.headers.get("Authorization")).toBe("Bearer mock-api-key");
  expect(req.headers.get("X-Correlation-Id")).toBe("mock-correlation-id");
});

test("parses response", () => {
  expect(client.contact().get()).resolves.toEqual("Mock response");
});

test("accepts params", async () => {
  await client.contact().get({
    select: ["name"],
    where: [["id", "=", 1]],
  });
  const req = await request;

  const searchParams = new URL(req.url).searchParams;
  const params = JSON.parse(searchParams.get("params"));

  expect(params).toEqual({
    select: ["name"],
    where: [["id", "=", 1]],
  });
});

test("requests a single resource", async () => {
  await client.contact().get().one();
  const req = await request;

  const searchParams = new URL(req.url).searchParams;

  expect(searchParams.get("index")).toBe("0");
});

test("makes chained requests", async () => {
  await client
    .contact()
    .get({
      where: [["id", "=", 1]],
    })
    .chain(
      "activity",
      client
        .activity()
        .get({
          where: [["id", "=", 2]],
        })
        .one(),
    );
  const req = await request;

  const searchParams = new URL(req.url).searchParams;
  const params = JSON.parse(searchParams.get("params"));

  expect(params).toEqual({
    where: [["id", "=", 1]],
    chain: {
      activity: [
        "Activity",
        "get",
        {
          where: [["id", "=", 2]],
        },
        0,
      ],
    },
  });
});

test("makes nested chained requests", async () => {
  await client
    .contact()
    .get({
      where: [["id", "=", 1]],
    })
    .chain(
      "activity",
      client
        .activity()
        .get({
          where: [["id", "=", 2]],
        })
        .chain(
          "contact",
          client
            .contact()
            .get({ where: [["id", "=", 3]] })
            .one(),
        ),
    );
  const req = await request;

  const searchParams = new URL(req.url).searchParams;
  const params = JSON.parse(searchParams.get("params"));

  expect(params).toEqual({
    where: [["id", "=", 1]],
    chain: {
      activity: [
        "Activity",
        "get",
        {
          where: [["id", "=", 2]],
          chain: {
            contact: [
              "Contact",
              "get",
              {
                where: [["id", "=", 3]],
              },
              0,
            ],
          },
        },
        null,
      ],
    },
  });
});

describe("request methods", () => {
  test("makes a get request", async () => {
    await client.contact().get();
    const req = await request;

    expect(req.url).toBe("https://example.com/civicrm/ajax/api4/Contact/get");
  });

  test("makes a create request", async () => {
    await client.contact().create();
    const req = await request;

    expect(req.url).toBe(
      "https://example.com/civicrm/ajax/api4/Contact/create",
    );
  });

  test("makes a update request", async () => {
    await client.contact().update();
    const req = await request;

    expect(req.url).toBe(
      "https://example.com/civicrm/ajax/api4/Contact/update",
    );
  });

  test("makes a save request", async () => {
    await client.contact().save();
    const req = await request;

    expect(req.url).toBe("https://example.com/civicrm/ajax/api4/Contact/save");
  });

  test("makes a delete request", async () => {
    await client.contact().delete();
    const req = await request;

    expect(req.url).toBe(
      "https://example.com/civicrm/ajax/api4/Contact/delete",
    );
  });

  test("makes a getChecksum request", async () => {
    await client.contact().getChecksum();
    const req = await request;

    expect(req.url).toBe(
      "https://example.com/civicrm/ajax/api4/Contact/getChecksum",
    );
  });
});
