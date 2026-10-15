import { newId, type MockEndpoint } from "./types";

export function seedEndpoints(): MockEndpoint[] {
  const now = Date.now();
  return [
    {
      id: newId(),
      name: "List users",
      method: "GET",
      path: "/mock-api/users",
      status: 200,
      headers: {},
      body: JSON.stringify(
        {
          users: [
            { id: "{{faker.uuid}}", name: "{{faker.name}}", email: "{{faker.email}}" },
            { id: "{{faker.uuid}}", name: "{{faker.name}}", email: "{{faker.email}}" },
          ],
        },
        null,
        2
      ),
      delayMs: 250,
      failureRate: 0,
      enabled: true,
      createdAt: now,
    },
    {
      id: newId(),
      name: "Get user by id",
      method: "GET",
      path: "/mock-api/users/:id",
      status: 200,
      headers: {},
      body: JSON.stringify(
        {
          id: "{{params.id}}",
          name: "{{faker.name}}",
          email: "{{faker.email}}",
          score: "{{faker.int(1, 100)}}",
        },
        null,
        2
      ),
      delayMs: 120,
      failureRate: 0,
      enabled: true,
      createdAt: now + 1,
    },
    {
      id: newId(),
      name: "Create user",
      method: "POST",
      path: "/mock-api/users",
      status: 201,
      headers: {},
      body: JSON.stringify(
        { id: "{{faker.uuid}}", name: "{{body.name}}", created: true },
        null,
        2
      ),
      delayMs: 400,
      failureRate: 10,
      enabled: true,
      createdAt: now + 2,
    },
  ];
}
