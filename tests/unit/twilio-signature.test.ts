import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { twilioSignatureValid } from "@/server/providers/twilio";

// Signed the way Twilio documents it: URL + sorted name/value pairs, HMAC-SHA1, base64.
const authToken = "test-auth-token";
const url = "https://app.test/api/twilio/inbound";
const params = { From: "+17185550101", To: "+15550000000", Body: "STOP" };
const signature = createHmac("sha1", authToken).update(`${url}Body${params.Body}From${params.From}To${params.To}`).digest("base64");

describe("Twilio webhook signature", () => {
  it("accepts a request Twilio signed", () => {
    expect(twilioSignatureValid({ authToken, url, params, signature })).toBe(true);
  });
  it("rejects forged, altered or unsigned requests", () => {
    expect(twilioSignatureValid({ authToken: "other", url, params, signature })).toBe(false);
    expect(twilioSignatureValid({ authToken, url, params: { ...params, Body: "START" }, signature })).toBe(false);
    expect(twilioSignatureValid({ authToken, url: `${url}?x=1`, params, signature })).toBe(false);
    expect(twilioSignatureValid({ authToken, url, params, signature: null })).toBe(false);
  });
});
