function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[ʻʼ’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseIntent(text) {
  const t = normalize(text);

  if (/^(to'?xta|stop|bekor qil|vazifani bekor qil)$/.test(t)) return { type: "STOP", priority: 1000 };
  if (/^(davom et|resume|qayta davom et)$/.test(t)) return { type: "RESUME", priority: 900 };
  if (/^(to'?xtab tur|pause)$/.test(t)) return { type: "PAUSE", priority: 900 };
  if (/^(qani|status|holat)$/.test(t)) return { type: "STATUS", priority: 500 };
  if (/nima bo'?lyapti/.test(t)) return { type: "STATUS", priority: 500 };
  if (/nima ko'?ryapsan/.test(t)) return { type: "LOOK", priority: 500 };
  if (/^(avtomatik o'?yna|o'?zing mustaqil harakat qil|autonomous)/.test(t)) return { type: "AUTONOMOUS", priority: 700 };
  if (/^(inventory|inventar|inventoryni ko'?rsat)/.test(t)) return { type: "INVENTORY", priority: 500 };
  if (/chatga yoz|chatga .* deb yoz/.test(t)) {
    const m = t.match(/chatga\s+(.+?)(?:\s+deb yoz)?$/);
    return { type: "CHAT", message: m ? m[1] : "", priority: 700 };
  }

  const follow = t.match(/(?:steve|alex|player|odam)?\s*(?:ni\s+)?kuzat|(?:ortidan|orqasidan)\s+(?:bor|yur)/);
  if (follow) {
    const m = t.match(/(?:kuzat|ortidan|orqasidan)\s+([a-z0-9_]+)?/);
    const target = m?.[1] && !["bor","yur"].includes(m[1]) ? m[1] : null;
    return { type: "FOLLOW", target, priority: 800 };
  }

  const move = t.match(/(\d+)?\s*blok\s*oldinga\s*yur|oldinga\s*yur|oldinga\s*bor|menga\s*kel|oldimga\s*kel|bu\s*yoqqa\s*kel/);
  if (move) return { type: "MOVE_FORWARD", blocks: Number(move[1] || 5), priority: 850 };

  if (/uy qur|house build/.test(t)) return { type: "BUILD", priority: 600 };
  if (/atrofni kuzat|shu hududni kuzat|watch/.test(t)) return { type: "WATCH", priority: 500 };
  if (/players|playerlar|kimlar bor/.test(t)) return { type: "PLAYERS", priority: 500 };

  return { type: "AI", priority: 400 };
}

module.exports = { parseIntent };
