import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const afterMock = vi.fn();
vi.mock("next/server", () => ({ after: (cb: () => unknown) => afterMock(cb) }));
const run = vi.fn();
vi.mock("@/server/senders", () => ({ sendingWorker: () => ({ run }) }));

import { drainSoon } from "@/server/drain-soon";

describe("drainSoon", () => {
  beforeEach(() => {
    afterMock.mockReset();
    run.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("drains after the response, scoped when shopIds are given", async () => {
    afterMock.mockImplementation(() => {});
    run.mockResolvedValue({});
    drainSoon({ shopIds: ["s1"] });
    await afterMock.mock.calls[0][0]();
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ shopIds: ["s1"] }));
  });

  it("swallows a drain error", async () => {
    afterMock.mockImplementation(() => {});
    run.mockRejectedValue(new Error("boom"));
    drainSoon();
    await expect(afterMock.mock.calls[0][0]()).resolves.toBeUndefined();
  });

  it("swallows after() throwing outside a request", () => {
    afterMock.mockImplementation(() => {
      throw new Error("outside request scope");
    });
    expect(() => drainSoon()).not.toThrow();
  });
});
