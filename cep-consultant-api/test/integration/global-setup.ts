import {
  RedisContainer,
  type StartedRedisContainer,
} from "@testcontainers/redis";
import type { TestProject } from "vitest/node";

let container: StartedRedisContainer;

export async function setup(project: TestProject) {
  container = await new RedisContainer("redis:7-alpine").start();
  project.provide("redisUrl", container.getConnectionUrl());
}

export async function teardown() {
  await container?.stop();
}

declare module "vitest" {
  export interface ProvidedContext {
    redisUrl: string;
  }
}
