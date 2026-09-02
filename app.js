const state = { mode: "pat", theme: localStorage.getItem("nat-rechner-theme") || "light" };

const els = {
  form: document.getElementById("nat-form"),
  modeButtons: [...document.querySelectorAll(".mode-button")],
  modeLabel: document.getElementById("mode-label"),
  staticFields: document.getElementById("static-fields"),
  poolFields: document.getElementById("pool-fields"),
  insideNetwork: document.getElementById("inside-network"),
  publicIP: document.getElementById("public-ip"),
  protocol: document.getElementById("protocol"),
  connections: document.getElementById("connections"),
  privateHost: document.getElementById("private-host"),
  staticPublicIP: document.getElementById("static-public-ip"),
  poolStart: document.getElementById("pool-start"),
  poolEnd: document.getElementById("pool-end"),
  forwardingList: document.getElementById("forwarding-list"),
  forwardingTemplate: document.getElementById("forwarding-template"),
  validation: document.getElementById("validation-state"),
  cidrBadge: document.getElementById("cidr-badge"),
  networkAddress: document.getElementById("network-address"),
  broadcastAddress: document.getElementById("broadcast-address"),
  usableHosts: document.getElementById("usable-hosts"),
  hostRange: document.getElementById("host-range"),
  capacityTitle: document.getElementById("capacity-title"),
  capacityValue: document.getElementById("capacity-value"),
  capacityUnit: document.getElementById("capacity-unit"),
  capacityMeter: document.getElementById("capacity-meter"),
  capacityDetail: document.getElementById("capacity-detail"),
  configTitle: document.getElementById("config-title"),
  configOutput: document.getElementById("config-output"),
  themeToggle: document.getElementById("theme-toggle"),
};

const modeLabels = { pat: "Port Address Translation", static: "1:1 Address Translation", pool: "Dynamischer NAT-Pool" };

function parseIPv4(value) {
  const parts = String(value).trim().split(".");
  if (parts.length !== 4 || parts.some(part => !/^\d+$/.test(part) || Number(part) > 255)) return null;
  return parts.reduce((result, part) => (result << 8) + Number(part), 0) >>> 0;
}

function formatIPv4(value) {
  return [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join(".");
}

function parseCIDR(value) {
  const [address, rawPrefix] = String(value).trim().split("/");
  const ip = parseIPv4(address);
  const prefix = Number(rawPrefix);
  if (ip === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ip & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  return { prefix, mask, network, broadcast, addresses: 2 ** (32 - prefix) };
}

function isPrivateIPv4(ip) {
  return (ip >= 0x0a000000 && ip <= 0x0affffff) ||
    (ip >= 0xac100000 && ip <= 0xac1fffff) ||
    (ip >= 0xc0a80000 && ip <= 0xc0a8ffff);
}

function formatNumber(value) {
  return new Intl.NumberFormat("de-DE").format(value);
}

function setValidation(message, valid) {
  els.validation.textContent = message;
  els.validation.className = `status-chip ${valid ? "valid" : "invalid"}`;
}

function addForwarding(defaults = {}) {
  const row = els.forwardingTemplate.content.firstElementChild.cloneNode(true);
  row.querySelector(".forward-protocol").value = defaults.protocol || "TCP";
  row.querySelector(".forward-public-port").value = defaults.publicPort || "";
  row.querySelector(".forward-private-ip").value = defaults.privateIP || "";
  row.querySelector(".forward-private-port").value = defaults.privatePort || "";
  row.querySelector(".remove-forward").addEventListener("click", () => { row.remove(); calculate(); });
  row.querySelectorAll("input, select").forEach(input => input.addEventListener("input", calculate));
  els.forwardingList.appendChild(row);
}

function getForwards() {
  return [...els.forwardingList.querySelectorAll(".forward-row")]
    .map(row => ({
      protocol: row.querySelector(".forward-protocol").value,
      publicPort: Number(row.querySelector(".forward-public-port").value),
      privateIP: row.querySelector(".forward-private-ip").value.trim(),
      privatePort: Number(row.querySelector(".forward-private-port").value),
    }))
    .filter(forward => forward.publicPort || forward.privateIP || forward.privatePort);
}

function validPort(port) { return Number.isInteger(port) && port >= 1 && port <= 65535; }

function calculate() {
  const network = parseCIDR(els.insideNetwork.value);
  const publicIP = parseIPv4(els.publicIP.value);
  if (!network) {
    setValidation("Ungueltiges CIDR-Netz", false);
    return;
  }
  if (publicIP === null) {
    setValidation("Ungueltige oeffentliche Adresse", false);
    return;
  }
  if (!isPrivateIPv4(network.network)) {
    setValidation("Hinweis: kein RFC-1918-Netz", false);
  } else {
    setValidation("Eingaben gueltig", true);
  }

  const usable = network.prefix >= 31 ? network.addresses : Math.max(0, network.addresses - 2);
  const firstHost = network.prefix >= 31 ? network.network : network.network + 1;
  const lastHost = network.prefix >= 31 ? network.broadcast : network.broadcast - 1;
  els.cidrBadge.textContent = `/${network.prefix}`;
  els.networkAddress.textContent = formatIPv4(network.network);
  els.broadcastAddress.textContent = formatIPv4(network.broadcast);
  els.usableHosts.textContent = formatNumber(usable);
  els.hostRange.textContent = usable ? `${formatIPv4(firstHost)} - ${formatIPv4(lastHost)}` : "Keine nutzbaren Hosts";

  const forwards = getForwards();
  const forwardError = forwards.find(forward => !validPort(forward.publicPort) || !validPort(forward.privatePort) || parseIPv4(forward.privateIP) === null);
  if (forwardError) {
    setValidation("Portweiterleitung unvollstaendig", false);
    return;
  }

  let capacity = 64512;
  let capacityLabel = "TCP/UDP-Ports";
  let capacityTitle = "PAT-Kapazitaet";
  let detail = "einer einzelnen oeffentlichen Adresse";
  if (state.mode === "static") {
    const privateHost = parseIPv4(els.privateHost.value);
    const staticPublic = parseIPv4(els.staticPublicIP.value);
    if (privateHost === null || staticPublic === null) {
      setValidation("Statische NAT-Adresse ungueltig", false);
      return;
    }
    capacity = 1;
    capacityLabel = "1:1 Zuordnung";
    capacityTitle = "Statisches NAT";
    detail = "einer festen oeffentlichen Adresse";
  } else if (state.mode === "pool") {
    const start = parseIPv4(els.poolStart.value);
    const end = parseIPv4(els.poolEnd.value);
    if (start === null || end === null || start > end) {
      setValidation("NAT-Pool ungueltig", false);
      return;
    }
    capacity = end - start + 1;
    capacityLabel = "oeffentliche Adressen";
    capacityTitle = "Pool-Kapazitaet";
    detail = "des konfigurierten NAT-Pools";
  }

  const connections = Math.max(0, Number(els.connections.value) || 0);
  const utilization = Math.min(100, Math.round((connections / capacity) * 10000) / 100);
  els.capacityTitle.textContent = capacityTitle;
  els.capacityValue.textContent = formatNumber(capacity);
  els.capacityUnit.textContent = capacityLabel;
  els.capacityMeter.style.width = `${Math.max(utilization, connections ? 1 : 0)}%`;
  els.capacityMeter.parentElement.setAttribute("aria-valuenow", String(utilization));
  els.capacityDetail.textContent = `${formatNumber(connections)} erwartete Translations belegen ${utilization.toLocaleString("de-DE", { maximumFractionDigits: 2 })} % ${detail}.`;
  renderConfig(network, forwards);
}

function wildcard(mask) { return formatIPv4((~mask) >>> 0); }

function renderConfig(network, forwards) {
  const inside = formatIPv4(network.network);
  const insideMask = wildcard(network.mask);
  const publicIP = els.publicIP.value.trim();
  const protocol = els.protocol.value;
  const lines = ["! NAT-Konfiguration - vor Einsatz Interfaces und ACL pruefen", "ip access-list standard NAT-INSIDE", ` permit ${inside} ${insideMask}`, "!"];

  if (state.mode === "pat") {
    els.configTitle.textContent = "Cisco IOS: PAT";
    lines.push(`ip nat inside source list NAT-INSIDE interface <OUTSIDE-INTERFACE> overload`, "!");
  } else if (state.mode === "static") {
    els.configTitle.textContent = "Cisco IOS: Statisches NAT";
    lines.push(`ip nat inside source static ${els.privateHost.value.trim()} ${els.staticPublicIP.value.trim()}`, "!");
  } else {
    els.configTitle.textContent = "Cisco IOS: Dynamischer Pool";
    lines.push(`ip nat pool NAT-POOL ${els.poolStart.value.trim()} ${els.poolEnd.value.trim()} netmask 255.255.255.224`, "ip nat inside source list NAT-INSIDE pool NAT-POOL", "!");
  }

  for (const forward of forwards) {
    lines.push(`ip nat inside source static ${forward.protocol.toLowerCase()} ${forward.privateIP} ${forward.privatePort} ${publicIP} ${forward.publicPort}`);
  }
  if (forwards.length) lines.push("!");
  lines.push("interface <INSIDE-INTERFACE>", " ip nat inside", "!", "interface <OUTSIDE-INTERFACE>", " ip nat outside");
  if (protocol === "icmp") lines.push("! ICMP verwendet keine Portweiterleitungen.");
  els.configOutput.textContent = lines.join("\n");
}

function setMode(mode) {
  state.mode = mode;
  els.modeButtons.forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  els.modeLabel.textContent = modeLabels[mode];
  els.staticFields.classList.toggle("hidden", mode !== "static");
  els.poolFields.classList.toggle("hidden", mode !== "pool");
  calculate();
}

function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#111a21" : "#edf1f0");
  const darkMode = theme === "dark";
  els.themeToggle.textContent = darkMode ? "☀" : "◐";
  els.themeToggle.title = darkMode ? "Light Mode aktivieren" : "Dark Mode aktivieren";
  els.themeToggle.setAttribute("aria-label", els.themeToggle.title);
  els.themeToggle.setAttribute("aria-pressed", String(darkMode));
}

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const label = button.textContent;
    button.textContent = "Kopiert";
    setTimeout(() => { button.textContent = label; }, 1400);
  } catch {
    setValidation("Kopieren nicht verfuegbar", false);
  }
}

els.form.addEventListener("submit", event => { event.preventDefault(); calculate(); });
els.form.querySelectorAll("input, select").forEach(input => input.addEventListener("input", calculate));
els.modeButtons.forEach(button => button.addEventListener("click", () => setMode(button.dataset.mode)));
document.getElementById("add-forward").addEventListener("click", () => addForwarding());
document.getElementById("copy-config").addEventListener("click", event => copyText(els.configOutput.textContent, event.currentTarget));
document.getElementById("copy-summary").addEventListener("click", event => copyText(`NAT-Modus: ${modeLabels[state.mode]}\nInside-Netz: ${els.insideNetwork.value}\nInside Global: ${els.publicIP.value}\nKapazitaet: ${els.capacityValue.textContent} ${els.capacityUnit.textContent}\n${els.capacityDetail.textContent}`, event.currentTarget));
document.getElementById("reset").addEventListener("click", () => { els.form.reset(); els.forwardingList.innerHTML = ""; addForwarding({ protocol: "TCP", publicPort: 443, privateIP: "10.20.30.25", privatePort: 443 }); setMode("pat"); });
els.themeToggle.addEventListener("click", () => {
  const nextTheme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem("nat-rechner-theme", nextTheme);
  applyTheme(nextTheme);
});

applyTheme(state.theme);
addForwarding({ protocol: "TCP", publicPort: 443, privateIP: "10.20.30.25", privatePort: 443 });
calculate();