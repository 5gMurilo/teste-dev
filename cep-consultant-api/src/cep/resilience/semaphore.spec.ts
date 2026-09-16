import { Semaphore } from "./semaphore.js";

describe("Semaphore", () => {
  it("resolves immediately when acquiring under the concurrency limit", async () => {
    const semaphore = new Semaphore(2);

    const release1 = await semaphore.acquire();
    const release2 = await semaphore.acquire();

    expect(release1).toBeInstanceOf(Function);
    expect(release2).toBeInstanceOf(Function);
  });

  it("queues acquisitions beyond the limit and calls onQueue", async () => {
    const onQueue = vi.fn();
    const semaphore = new Semaphore(1, onQueue);

    const release1 = await semaphore.acquire();

    let resolved = false;
    const pending = semaphore.acquire().then((release) => {
      resolved = true;
      return release;
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(resolved).toBe(false);
    expect(onQueue).toHaveBeenCalledTimes(1);

    release1();

    const release2 = await pending;
    expect(resolved).toBe(true);
    expect(release2).toBeInstanceOf(Function);
  });

  it("releases free a slot and let the next queued acquire proceed in FIFO order", async () => {
    const semaphore = new Semaphore(1);
    const order: number[] = [];

    const release1 = await semaphore.acquire();

    const p2 = semaphore.acquire().then((release) => {
      order.push(2);
      return release;
    });
    const p3 = semaphore.acquire().then((release) => {
      order.push(3);
      return release;
    });

    release1();
    const release2 = await p2;

    release2();
    await p3;

    expect(order).toEqual([2, 3]);
  });
});
