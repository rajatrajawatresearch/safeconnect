/**
 * End-to-end API test: sign-in, permissions, data scoping, the response chain, the live stream and
 * the audit trail. Needs the API running in demo mode against a database you do not mind resetting:
 *
 *   npm run api:dev        (in one terminal)
 *   npm run test:api       (in another)
 *
 * WARNING: it calls "Reset demo" first and leaves test records behind. Never point it at real data.
 * Set API=http://host:port to test a server somewhere other than localhost:4000.
 */
const BASE = process.env.API ?? "http://127.0.0.1:4000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0;
let fail = 0;
const check = (name, ok, extra = "") => {
  if (ok) pass += 1;
  else fail += 1;
  console.log(`${ok ? "  ok  " : " FAIL "} ${name}${extra ? ` — ${extra}` : ""}`);
};

async function call(token, method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data };
}
const login = async (personaId) => (await call(null, "POST", "/auth/login", { personaId })).data.token;

/** Opens the live stream and collects events. */
async function stream(token) {
  const { data } = await call(token, "POST", "/realtime/ticket");
  const res = await fetch(`${BASE}/realtime/stream?ticket=${data.ticket}`);
  const events = [];
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  (async () => {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let i;
      while ((i = buffer.indexOf("\n\n")) >= 0) {
        const block = buffer.slice(0, i);
        buffer = buffer.slice(i + 2);
        const ev = /^event: (.+)$/m.exec(block)?.[1];
        const dataLine = /^data: (.+)$/m.exec(block)?.[1];
        if (ev && dataLine) events.push({ event: ev, data: JSON.parse(dataLine) });
      }
    }
  })().catch(() => {});
  const waitFor = async (pred, ms = 6000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const hit = events.find(pred);
      if (hit) return hit;
      await sleep(100);
    }
    return null;
  };
  return { events, waitFor, close: () => reader.cancel().catch(() => {}) };
}

const health = await call(null, "GET", "/health");
check("health", health.status === 200 && health.data.ok, JSON.stringify(health.data));

// Start from a known state.
const admin = await login("stf-admin");
await call(admin, "POST", "/demo/reset");
await call(admin, "PUT", "/demo/simulation", { paused: true });

const aarav = await login("cit-aarav");
const kavya = await login("cit-kavya");
const meera = await login("stf-meera");
const arjun = await login("stf-arjun");
const neha = await login("stf-neha");
check("sign-in issues tokens", [aarav, kavya, meera, arjun, neha, admin].every((t) => typeof t === "string" && t.length > 40));
check("no token → 401", (await call(null, "POST", "/realtime/ticket")).status === 401);
check("bad stream ticket → 401", (await fetch(`${BASE}/realtime/stream?ticket=nope`)).status === 401);

// ── Data scoping in the snapshot
const sAarav = await stream(aarav);
const sMeera = await stream(meera);
const sArjun = await stream(arjun);
const sAdmin = await stream(admin);
const snapA = (await sAarav.waitFor((e) => e.event === "snapshot")).data.state;
const snapM = (await sMeera.waitFor((e) => e.event === "snapshot")).data.state;
const snapO = (await sArjun.waitFor((e) => e.event === "snapshot")).data.state;
const snapAd = (await sAdmin.waitFor((e) => e.event === "snapshot")).data.state;
check("citizen sees only own incidents", snapA.incidents.length >= 1 && snapA.incidents.every((i) => i.citizenId === "cit-aarav"), `${snapA.incidents.length} incidents`);
check("citizen gets no staff notes, triage, audit or other units", snapA.incidents.every((i) => i.notes.length === 0 && !i.ai) && snapA.audit.length === 0 && snapA.staff.length === 0);
check("citizen sees only own complaints and contacts", snapA.complaints.length === 3 && snapA.contacts.every((c) => c.citizenId === "cit-aarav"));
check("operator sees the whole queue", snapM.incidents.length === 26 && snapM.units.length === 16, `${snapM.incidents.length} incidents`);
const restrictedM = snapM.evidence.filter((e) => e.classification === "restricted");
check("operator's restricted evidence is redacted", restrictedM.length > 0 && restrictedM.every((e) => e.hash === "" && e.title === "Restricted item"));
check("operator without audit permission gets incident trail only", snapM.audit.length > 0 && snapM.audit.every((e) => e.incidentId));
check("officer gets own assignment in full, others reduced", snapO.incidents.some((i) => i.id.endsWith("28491") && i.reporterName !== "Withheld") && snapO.incidents.filter((i) => !i.id.endsWith("28491")).every((i) => i.reporterName === "Withheld"));
check("admin gets configuration and audit, no incidents or evidence", snapAd.incidents.length === 0 && snapAd.evidence.length === 0 && snapAd.roles.length === 8 && snapAd.audit.length > 100);

// ── Permissions on commands
const anyIncident = snapM.incidents.find((i) => i.status === "new");
check("citizen cannot acknowledge an incident", (await call(aarav, "POST", `/incidents/${anyIncident.id}/acknowledge`)).status === 403);
check("citizen cannot assign a unit", (await call(aarav, "POST", `/incidents/${anyIncident.id}/units`, { unitId: "u-01" })).status === 403);
check("citizen cannot read another citizen's incident audit", (await call(aarav, "GET", `/audit?incidentId=${anyIncident.id}`)).status === 403);
check("officer cannot accept for another unit", (await call(arjun, "POST", `/incidents/${anyIncident.id}/units/u-01/accept`)).status === 403);
check("admin cannot acknowledge an incident", (await call(admin, "POST", `/incidents/${anyIncident.id}/acknowledge`)).status === 403);
check("operator cannot change roles", (await call(meera, "PUT", "/admin/roles/operator/permissions", { permission: "audit.view", enabled: true })).status === 403);
check("operator cannot read the full audit log", (await call(meera, "GET", "/audit")).status === 403);
check("invalid body → 400", (await call(meera, "POST", `/incidents/${anyIncident.id}/escalate`, { level: 9, reason: "" })).status === 400);
const restrictedId = restrictedM[0].id;
check("operator opening restricted evidence → 403 and logged", (await call(meera, "POST", `/evidence/${restrictedId}/view`)).status === 403);
check("supervisor may open restricted evidence", (await call(neha, "POST", `/evidence/${restrictedId}/view`)).status === 200);
check("export without second factor → 403", (await call(neha, "POST", `/evidence/${restrictedId}/export`, { purpose: "Case hand-off" })).status === 403);
await call(neha, "POST", "/auth/mfa/verify", { code: "123456" });
check("export after second factor → 200", (await call(neha, "POST", `/evidence/${restrictedId}/export`, { purpose: "Case hand-off" })).status === 200);

// ── SOS travels citizen → operator → officer → citizen, live
const sos = await call(aarav, "POST", "/sos", {});
check("citizen raises SOS", sos.status === 200 && sos.data.status === "new" && sos.data.citizenId === "cit-aarav", sos.data?.id);
const id = sos.data.id;
check("operator's stream receives the new incident", Boolean(await sMeera.waitFor((e) => e.event === "patch" && e.data.upsert?.incidents?.some((i) => i.id === id))));
check("another citizen's stream does not", !(await (await stream(kavya)).waitFor((e) => e.event === "patch" && e.data.upsert?.incidents?.some((i) => i.id === id), 800)));

check("operator acknowledges", (await call(meera, "POST", `/incidents/${id}/acknowledge`)).status === 200);
check("citizen's stream shows control room connected", Boolean(await sAarav.waitFor((e) => e.event === "patch" && e.data.upsert?.incidents?.some((i) => i.id === id && i.status === "acknowledged"))));
const rec = await call(meera, "GET", `/incidents/${id}/recommended-units`);
check("operator gets ranked units", rec.status === 200 && rec.data.length > 0, rec.data?.slice(0, 2).map((r) => `${r.unit.callSign} ${r.distanceKm}km`).join(", "));
const unitId = rec.data[0].unit.id;
check("operator assigns the nearest unit", (await call(meera, "POST", `/incidents/${id}/units`, { unitId })).status === 200);
check("assigning the same busy unit again → 409", (await call(meera, "POST", `/incidents/${id}/units`, { unitId })).status === 409);
check("citizen's stream now includes the assigned unit", Boolean(await sAarav.waitFor((e) => e.event === "patch" && e.data.upsert?.units?.some((u) => u.id === unitId))));

// Chat both ways
check("citizen sends a message", (await call(aarav, "POST", `/incidents/${id}/messages`, { channel: "citizen", text: "They are still outside" })).status === 200);
check("citizen cannot post to the internal channel", (await call(aarav, "POST", `/incidents/${id}/messages`, { channel: "internal", text: "x" })).status === 403);
check("operator sees the citizen's message live", Boolean(await sMeera.waitFor((e) => e.event === "patch" && e.data.upsert?.messages?.some((m) => m.text === "They are still outside"))));
await call(meera, "POST", `/incidents/${id}/messages`, { channel: "internal", text: "Caller sounds calm" });
await sleep(400);
check("internal note never reaches the citizen's stream", !sAarav.events.some((e) => JSON.stringify(e.data).includes("Caller sounds calm")));

// Officer flow on the seeded critical assignment
const hero = snapO.incidents.find((i) => i.id.endsWith("28491")).id;
check("officer accepts own assignment", (await call(arjun, "POST", `/incidents/${hero}/units/u-17/accept`)).status === 200);
check("officer marks arrived", (await call(arjun, "POST", `/incidents/${hero}/units/u-17/arrive`)).status === 200);
const ev = await call(arjun, "POST", "/evidence", { incidentId: hero, type: "photo", title: "Scene photo", fileName: "scene.jpg", sizeBytes: 1200000 });
check("officer uploads evidence", ev.status === 200 && ev.data.source === "officer" && ev.data.uploadedByName === "PSI Arjun Patel");
check("officer cannot upload to an incident that is not theirs", (await call(arjun, "POST", "/evidence", { incidentId: id, type: "photo", title: "x", fileName: "x.jpg", sizeBytes: 1 })).status === 403);
check("officer completes the response", (await call(arjun, "POST", `/incidents/${hero}/units/u-17/complete`, { resolution: "Citizen escorted home safely." })).status === 200);
check("officer files the report", (await call(arjun, "POST", `/incidents/${hero}/units/u-17/report`, { report: "Preliminary response report text." })).status === 200);
const sKavya2 = await stream(kavya);
const snapK = (await sKavya2.waitFor((e) => e.event === "snapshot")).data.state;
check("the citizen on that incident sees it resolved", snapK.incidents.some((i) => i.id === hero && i.status === "resolved"));

// Citizen-side records
const tip = await call(aarav, "POST", "/incidents", {
  source: "tip", categoryId: "drug_dealing", description: "Evening hand-offs near the gate", anonymous: true,
  location: { lat: 23.0063, lng: 72.601, address: "Kankaria", area: "Kankaria", districtId: "d-ahd", stationId: "st-man", source: "citizen_entered" },
});
check("confidential tip stores no identity", tip.status === 200 && !tip.data.citizenId && tip.data.reporterName === "Confidential source" && tip.data.anonymous === true);
const journey = await call(aarav, "POST", "/journeys", { from: { label: "Home", lat: 23.03, lng: 72.55 }, destination: { label: "Maninagar", lat: 22.99, lng: 72.6 }, durationMin: 30, checkIntervalMin: 10, contactIds: ["ec-1", "ec-3"] });
check("journey starts with only the citizen's own contacts", journey.status === 200 && journey.data.contactIds.join() === "ec-1", journey.data?.contactIds?.join());
check("another citizen cannot touch that journey", (await call(kavya, "POST", `/journeys/${journey.data.id}/stop`)).status === 403);
const cancel = await call(aarav, "POST", `/incidents/${id}/cancel`, { kind: "safe", reason: "I am home" });
check("citizen marks themselves safe", cancel.status === 200);

// Admin: role change takes effect at once
check("admin grants audit.view to operators", (await call(admin, "PUT", "/admin/roles/operator/permissions", { permission: "audit.view", enabled: true })).status === 200);
check("operator may now read the full audit log", (await call(meera, "GET", "/audit?category=admin")).status === 200);
check("role change pushed a fresh snapshot to the operator", sMeera.events.filter((e) => e.event === "snapshot").length >= 2);
await call(admin, "PUT", "/admin/roles/operator/permissions", { permission: "audit.view", enabled: false });
check("system role cannot be edited", (await call(admin, "PUT", "/admin/roles/admin/permissions", { permission: "incident.read.all", enabled: true })).status === 403);
check("suspending a user blocks them", (await call(admin, "POST", "/admin/users/stf-neha/status", { status: "suspended" })).status === 200 && (await call(neha, "GET", "/auth/session")).status === 403);
await call(admin, "POST", "/admin/users/stf-neha/status", { status: "active" });

// Audit: real query + chain
const trail = await call(neha, "GET", `/audit?incidentId=${hero}`);
check("audit trail for the incident comes from the database", trail.status === 200 && trail.data.length >= 8, `${trail.data?.length} entries`);
const verify = await call(neha, "GET", "/audit/verify");
check("audit hash chain verifies", verify.status === 200 && verify.data.intact === true, `${verify.data?.checked} entries`);
check("analytics scoped by permission", (await call(meera, "GET", "/analytics/overview?scope=station")).status === 200 && (await call(meera, "GET", "/analytics/overview?scope=state")).status === 403);
const found = await call(meera, "GET", "/search?q=GJ-AHD-17");
check("search finds a unit", found.status === 200 && found.data.some((r) => r.group === "Units"));
check("citizen search returns no incidents", (await call(aarav, "GET", "/search?q=Harassment")).data.every((r) => r.group !== "Incidents"));

for (const s of [sAarav, sMeera, sArjun, sAdmin, sKavya2]) s.close();
await call(admin, "PUT", "/demo/simulation", { paused: false });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
