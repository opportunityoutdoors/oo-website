import { describe, expect, it } from "vitest";
import { formatPhone } from "./WelcomePacket";

describe("formatPhone", () => {
  it("formats the 10 digits phones are stored as", () => {
    expect(formatPhone("9196496907")).toBe("919-649-6907");
  });
  it("reads digits out of other shapes, and drops a leading 1", () => {
    expect(formatPhone("919.649.6907")).toBe("919-649-6907");
    expect(formatPhone("+1 (919) 649-6907")).toBe("919-649-6907");
  });
  it("leaves anything else as typed", () => {
    expect(formatPhone("649-6907")).toBe("649-6907");
  });
});
