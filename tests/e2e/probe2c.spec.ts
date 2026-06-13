import { test } from "@playwright/test";
import { encodeAgendaState } from "../../lib/parser";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

test("probe 2c DOM", async ({ page }) => {
  const hash = encodeAgendaState({ text: "9:00 AM PT — Valid Session\nTalk — 26:00 UTC", sourceTimezone: "UTC" });
  const url = `${BASE}/#${hash}`;
  console.log("URL:", url);
  await page.goto(url);
  await page.waitForLoadState("networkidle");

  const alerts = await page.locator('[role="alert"]').all();
  console.log("Number of alerts:", alerts.length);
  for (const a of alerts) {
    const txt = await a.innerText().catch(() => "[error reading]");
    const cls = await a.getAttribute("class").catch(() => "[no class]");
    console.log("Alert text:", txt);
    console.log("Alert class:", cls);
  }

  const sessionCards = page.locator(".bg-white.border.border-slate-200.rounded-lg");
  console.log("Session cards:", await sessionCards.count());

  const body = await page.locator("body").innerText();
  console.log("Body (first 500):", body.substring(0, 500));

  // Get the outer HTML of alert elements
  for (const a of alerts) {
    const outer = await a.evaluate(el => el.outerHTML);
    console.log("Alert outerHTML:", outer.substring(0, 300));
    const isVisible = await a.isVisible();
    console.log("Alert isVisible:", isVisible);
  }
});
