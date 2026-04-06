import { NextResponse } from "next/server";
import dns from "dns/promises";

export async function GET() {
  const host = "secure.directmailmac.com";
  const results: Record<string, unknown> = {};

  // 1. DNS resolution
  try {
    const addresses = await dns.resolve4(host);
    results.dns = { ok: true, addresses };
  } catch (err) {
    results.dns = { ok: false, error: (err as Error).message };
  }

  // 2. Try a simple GET to the API root
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const start = Date.now();

  try {
    const response = await fetch(`https://${host}/api/v2/`, {
      signal: controller.signal,
      headers: { "User-Agent": "OO-Website-Test/1.0" },
    });
    results.fetch = {
      ok: true,
      status: response.status,
      statusText: response.statusText,
      elapsed: `${Date.now() - start}ms`,
    };
  } catch (err) {
    results.fetch = {
      ok: false,
      error: (err as Error).message,
      code: (err as NodeJS.ErrnoException).code,
      elapsed: `${Date.now() - start}ms`,
    };
  } finally {
    clearTimeout(timeout);
  }

  // 3. Also try the alt hostname
  const altHost = "www.ethreemail.com";
  const controller2 = new AbortController();
  const timeout2 = setTimeout(() => controller2.abort(), 15000);
  const start2 = Date.now();

  try {
    const response = await fetch(`https://${altHost}/api/v2/`, {
      signal: controller2.signal,
      headers: { "User-Agent": "OO-Website-Test/1.0" },
    });
    results.fetchAlt = {
      ok: true,
      host: altHost,
      status: response.status,
      statusText: response.statusText,
      elapsed: `${Date.now() - start2}ms`,
    };
  } catch (err) {
    results.fetchAlt = {
      ok: false,
      host: altHost,
      error: (err as Error).message,
      code: (err as NodeJS.ErrnoException).code,
      elapsed: `${Date.now() - start2}ms`,
    };
  } finally {
    clearTimeout(timeout2);
  }

  return NextResponse.json(results);
}
