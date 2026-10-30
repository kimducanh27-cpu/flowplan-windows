const mcpUrl = process.env.FLOWPLAN_MCP_URL || "http://127.0.0.1:3100/mcp";
const restBase = mcpUrl.replace(/\/mcp\/?$/, "");
const protocolVersion = "2025-06-18";
let sessionId = null;

function parseBody(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const data = trimmed
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");
  if (!data) throw new Error("Unparsed response: " + trimmed.slice(0, 200));
  return JSON.parse(data);
}

async function rpc(method, params, id) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "MCP-Protocol-Version": protocolVersion,
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;
  const body = { jsonrpc: "2.0", method };
  if (id !== undefined) body.id = id;
  if (params !== undefined) body.params = params;
  const res = await fetch(mcpUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const sid = res.headers.get("mcp-session-id");
  if (sid) sessionId = sid;
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  return parseBody(text);
}

async function deletePlan(planId) {
  const res = await fetch(`${restBase}/api/plans/${encodeURIComponent(planId)}`, {
    method: "DELETE",
    signal: AbortSignal.timeout(10000),
  });
  return res.ok;
}

let planId = null;
try {
  const health = await fetch(`${restBase}/health`, { signal: AbortSignal.timeout(5000) });
  if (!health.ok) throw new Error("health endpoint failed; is FlowPlan open?");
  const healthJson = await health.json();
  if (!healthJson.ok) throw new Error("health response was not ok");

  await rpc(
    "initialize",
    {
      protocolVersion,
      capabilities: {},
      clientInfo: { name: "flowplan-skill-smoke", version: "1.0" },
    },
    1,
  );
  await rpc("notifications/initialized");

  const toolList = await rpc("tools/list", {}, 2);
  const tools = toolList?.result?.tools || [];
  if (tools.length < 12) {
    throw new Error(`expected at least 12 tools, got ${tools.length}`);
  }

  const created = await rpc(
    "tools/call",
    {
      name: "create_plan",
      arguments: {
        title: `MCP smoke test ${new Date().toISOString()}`,
        icon: "",
        description: "Temporary plan created by the FlowPlan skill smoke test; safe to delete.",
      },
    },
    3,
  );
  planId = JSON.parse(created.result.content[0].text).planId;

  await rpc(
    "tools/call",
    {
      name: "add_cards",
      arguments: {
        plan_id: planId,
        cards: [
          {
            title: "Smoke step 1",
            description: "Temporary card",
            card_type: "research",
            repo: "smoke",
            files: [],
            dependencies: [],
          },
          {
            title: "Smoke step 2",
            description: "Temporary card",
            card_type: "test",
            repo: "smoke",
            files: [],
            dependencies: ["$0"],
          },
        ],
      },
    },
    4,
  );

  const cardsResponse = await rpc(
    "tools/call",
    { name: "get_cards", arguments: { plan_id: planId } },
    5,
  );
  const cardsPayload = JSON.parse(cardsResponse.result.content[0].text);
  const cardCount = Array.isArray(cardsPayload)
    ? cardsPayload.length
    : (cardsPayload.cards || []).length;
  if (cardCount !== 2) {
    throw new Error(`expected 2 cards, got ${cardCount}`);
  }

  const deleted = await deletePlan(planId);
  if (!deleted) throw new Error("plan was created but REST delete failed");
  console.log(`SMOKE OK: ${tools.length} tools, 2 cards created and deleted`);
} catch (error) {
  if (planId) {
    const deleted = await deletePlan(planId).catch(() => false);
    console.error(deleted ? `cleanup: deleted ${planId}` : `cleanup FAILED: delete plan ${planId} manually`);
  }
  console.error(`SMOKE FAILED: ${error.message}`);
  process.exit(1);
}
