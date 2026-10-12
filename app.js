const state = {
  mode: "pat",
  theme: localStorage.getItem("nat-rechner-theme") || "light",
  vendor: "cisco-ios",
  bulkRules: [],
};

const els = {
  form: document.getElementById("nat-form"),
  modeButtons: [...document.querySelectorAll(".mode-button")],
  modeLabel: document.getElementById("mode-label"),
  modeDescription: document.getElementById("mode-description"),
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
  cgnatFields: document.getElementById("cgnat-fields"),
  twiceFields: document.getElementById("twice-fields"),
  nptv6Fields: document.getElementById("nptv6-fields"),
  nat64Fields: document.getElementById("nat64-fields"),
  cgnatPool: document.getElementById("cgnat-pool"),
  portsPerSubscriber: document.getElementById("ports-per-subscriber"),
  destinationNetwork: document.getElementById("destination-network"),
  translatedDestinationNetwork: document.getElementById("translated-destination-network"),
  ipv6InsidePrefix: document.getElementById("ipv6-inside-prefix"),
  ipv6OutsidePrefix: document.getElementById("ipv6-outside-prefix"),
  nat64Prefix: document.getElementById("nat64-prefix"),
  nat64IPv4Target: document.getElementById("nat64-ipv4-target"),
  validationList: document.getElementById("validation-list"),
  vendorProfile: document.getElementById("vendor-profile"),
  flowBeforeSource: document.getElementById("flow-before-source"),
  flowBeforeDestination: document.getElementById("flow-before-destination"),
  flowAfterSource: document.getElementById("flow-after-source"),
  flowAfterDestination: document.getElementById("flow-after-destination"),
  flowType: document.getElementById("flow-type"),
  presetList: document.getElementById("preset-list"),
  transferStatus: document.getElementById("transfer-status"),
  importData: document.getElementById("import-data"),
};

const modeLabels = {
  pat: "Port Address Translation",
  static: "1:1 Address Translation",
  pool: "Dynamischer NAT-Pool",
  cgnat: "Carrier-Grade NAT",
  twice: "Bidirektionales Twice NAT",
  nptv6: "IPv6 Prefix Translation",
  nat64: "IPv6 zu IPv4 Übersetzung",
};

const modeDescriptions = {
  pat: "<strong>PAT</strong> steht für Port Address Translation: Viele interne Hosts teilen eine öffentliche IPv4-Adresse über unterschiedliche Ports.",
  static: "<strong>Statisches NAT</strong> bildet eine private Adresse dauerhaft auf genau eine öffentliche Adresse ab ($1:1$).",
  pool: "<strong>Dynamisches NAT</strong> vergibt bei Bedarf eine freie öffentliche Adresse aus einem definierten Adresspool.",
  cgnat: "<strong>CGNAT</strong> steht für Carrier-Grade NAT: Provider teilen öffentliche IPv4-Adressen über feste Portblöcke zwischen vielen Abonnenten.",
  twice: "<strong>Twice NAT</strong> übersetzt Quelle und Ziel in derselben Regel, etwa für überlappende Netze nach einer Firmenfusion.",
  nptv6: "<strong>NPTv6</strong> steht für Network Prefix Translation für IPv6: Es ersetzt nur den IPv6-Präfix, nicht die Host-ID oder Ports.",
  nat64: "<strong>NAT64</strong> ermöglicht IPv6-Clients den Zugriff auf IPv4-Ziele; <strong>DNS64</strong> erzeugt dafür passende IPv6-Antworten aus A-Records.",
};

const workNetworkMappings = [
  { name: "wab-live-front", source: "10.192.0.0/26", target: "172.29.79.64/26" },
  { name: "wab-live-app", source: "10.192.64.0/26", target: "172.29.67.128/26" },
  { name: "wab-live-db", source: "10.192.128.0/26", target: "172.29.76.128/26" },
  { name: "wab-int-front", source: "10.194.0.0/26", target: "172.29.66.64/26" },
  { name: "wab-int-app", source: "10.194.64.0/26", target: "172.29.71.64/26" },
  { name: "wab-int-db", source: "10.194.128.0/26", target: "172.29.65.192/26" },
  { name: "wab-int2-front", source: "10.195.0.0/26", target: "172.29.77.64/26" },
  { name: "wab-int2-app", source: "10.195.64.0/26", target: "172.29.77.0/26" },
  { name: "wab-int2-db", source: "10.195.128.0/26", target: "172.29.76.192/26" },
  { name: "wab-mgmt-cd", source: "10.195.240.0/28", target: "172.29.2.224/28" },
  { name: "wab-aws-3", source: "10.158.66.64/26", target: "172.29.67.192/26" },
  { name: "wab-aws-1", source: "10.158.66.128/26", target: "172.29.79.0/26" },
  { name: "wab-aws-2", source: "10.158.66.192/26", target: "172.29.53.128/26" },
];

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

function isSpecialIPv4(ip) {
  if (ip >= 0xe0000000 && ip <= 0xefffffff) return "Multicast-Adressen dürfen nicht für NAT verwendet werden.";
  if (ip >= 0x7f000000 && ip <= 0x7fffffff) return "Loopback-Adressen dürfen nicht für NAT verwendet werden.";
  if ((ip >= 0xc0000200 && ip <= 0xc00002ff) || (ip >= 0xc6336400 && ip <= 0xc63364ff) || (ip >= 0xcb007100 && ip <= 0xcb0071ff)) return "Dokumentationsnetz erkannt: nur für Labor und Beispiele verwenden.";
  if (ip === 0 || ip === 0xffffffff) return "Diese IPv4-Sonderadresse ist nicht routbar.";
  return "";
}

function parseIPv6Prefix(value) {
  const [address, rawPrefix] = String(value).trim().split("/");
  const prefix = Number(rawPrefix);
  if (!address || !address.includes(":") || !Number.isInteger(prefix) || prefix < 0 || prefix > 128) return null;
  return { address: address.toLowerCase(), prefix };
}

function networksOverlap(first, second) {
  return first && second && first.network <= second.broadcast && second.network <= first.broadcast;
}

function renderValidations(items) {
  els.validationList.innerHTML = "";
  for (const item of items) {
    const node = document.createElement("li");
    node.className = item.level || "info";
    node.textContent = item.text;
    els.validationList.appendChild(node);
  }
}

function clearDerivedOutput(message) {
  els.networkAddress.textContent = "–";
  els.broadcastAddress.textContent = "–";
  els.usableHosts.textContent = "–";
  els.hostRange.textContent = "–";
  els.capacityTitle.textContent = "Keine Berechnung";
  els.capacityValue.textContent = "–";
  els.capacityUnit.textContent = "Eingabe prüfen";
  els.capacityMeter.style.width = "0%";
  els.capacityDetail.textContent = message;
  els.configTitle.textContent = "Konfiguration nicht verfügbar";
  els.configOutput.textContent = `! ${message}`;
  els.flowBeforeSource.textContent = "–";
  els.flowBeforeDestination.textContent = "–";
  els.flowAfterSource.textContent = "–";
  els.flowAfterDestination.textContent = "–";
  els.flowType.textContent = "Prüfung erforderlich";
}

function updateFlow(network, forwards) {
  const source = state.mode === "nptv6" ? els.ipv6InsidePrefix.value.trim() : state.mode === "nat64" ? els.nat64Prefix.value.trim() : `${formatIPv4(network.network + 1)}:49152`;
  const target = state.mode === "nat64" ? els.nat64IPv4Target.value.trim() : state.mode === "twice" ? `${els.destinationNetwork.value.trim()}` : forwards[0] ? `${forwards[0].privateIP}:${forwards[0].privatePort}` : "198.51.100.42:443";
  let afterSource = els.publicIP.value.trim();
  let afterTarget = target;
  let flowType = "SNAT";
  if (state.mode === "static") afterSource = els.staticPublicIP.value.trim();
  if (state.mode === "pool") afterSource = `${els.poolStart.value.trim()} (Pool)`;
  if (state.mode === "cgnat") afterSource = `${els.publicIP.value.trim()}:Portblock`;
  if (state.mode === "twice") { afterTarget = els.translatedDestinationNetwork.value.trim(); flowType = "SNAT + DNAT"; }
  if (state.mode === "nptv6") { afterSource = els.ipv6OutsidePrefix.value.trim(); flowType = "NPTv6"; }
  if (state.mode === "nat64") { afterTarget = els.nat64IPv4Target.value.trim(); flowType = "NAT64"; }
  els.flowBeforeSource.textContent = source;
  els.flowBeforeDestination.textContent = target;
  els.flowAfterSource.textContent = afterSource;
  els.flowAfterDestination.textContent = afterTarget;
  els.flowType.textContent = flowType;
}

function calculate() {
  const network = parseCIDR(els.insideNetwork.value);
  const publicIP = parseIPv4(els.publicIP.value);
  const notices = [];
  if (!network) { setValidation("Ungültiges CIDR-Netz", false); renderValidations([{ level: "error", text: "Inside Local muss eine gültige IPv4-CIDR-Angabe sein." }]); clearDerivedOutput("Ungültiges Inside-Local-Netz."); return; }
  if (publicIP === null && !["nptv6", "nat64"].includes(state.mode)) { setValidation("Ungültige öffentliche Adresse", false); renderValidations([{ level: "error", text: "Inside Global muss eine gültige IPv4-Adresse sein." }]); clearDerivedOutput("Ungültige öffentliche Adresse."); return; }
  if (!isPrivateIPv4(network.network)) notices.push({ level: "warning", text: "Inside Local liegt nicht im RFC-1918-Privatbereich." });
  const publicNotice = publicIP === null ? "" : isSpecialIPv4(publicIP);
  if (publicNotice) notices.push({ level: publicNotice.includes("dürfen") ? "error" : "warning", text: publicNotice });
  if (publicIP !== null && isPrivateIPv4(publicIP)) notices.push({ level: "warning", text: "Inside Global ist privat und nicht direkt internet-routbar." });

  const forwards = getForwards();
  if (forwards.some(forward => !validPort(forward.publicPort) || !validPort(forward.privatePort) || parseIPv4(forward.privateIP) === null)) {
    setValidation("Portweiterleitung unvollständig", false); renderValidations([{ level: "error", text: "Jede Portweiterleitung benötigt gültige Ports und eine IPv4-Zieladresse." }]); clearDerivedOutput("Portweiterleitung unvollständig."); return;
  }
  const duplicatePorts = new Set();
  forwards.forEach(forward => { const key = `${forward.protocol}:${forward.publicPort}`; if (duplicatePorts.has(key)) notices.push({ level: "error", text: `Port-Konflikt: ${key} ist mehrfach belegt.` }); duplicatePorts.add(key); });

  const usable = network.prefix >= 31 ? network.addresses : Math.max(0, network.addresses - 2);
  const firstHost = network.prefix >= 31 ? network.network : network.network + 1;
  const lastHost = network.prefix >= 31 ? network.broadcast : network.broadcast - 1;
  els.cidrBadge.textContent = `/${network.prefix}`;
  els.networkAddress.textContent = formatIPv4(network.network);
  els.broadcastAddress.textContent = formatIPv4(network.broadcast);
  els.usableHosts.textContent = formatNumber(usable);
  els.hostRange.textContent = usable ? `${formatIPv4(firstHost)} - ${formatIPv4(lastHost)}` : "Keine nutzbaren Hosts";

  let capacity = 64512; let capacityLabel = "TCP/UDP-Ports"; let capacityTitle = "PAT-Kapazität"; let detail = "einer einzelnen öffentlichen Adresse";
  if (state.mode === "static") {
    if (parseIPv4(els.privateHost.value) === null || parseIPv4(els.staticPublicIP.value) === null) { setValidation("Statische NAT-Adresse ungültig", false); notices.push({ level: "error", text: "Private und öffentliche Host-Adresse müssen gültige IPv4-Adressen sein." }); renderValidations(notices); clearDerivedOutput("Statische NAT-Adresse ungültig."); return; }
    capacity = 0; capacityLabel = "keine Portteilung"; capacityTitle = "Statisches NAT"; detail = "einer festen öffentlichen Adresse";
  } else if (state.mode === "pool") {
    const start = parseIPv4(els.poolStart.value); const end = parseIPv4(els.poolEnd.value); const pool = start === null || end === null ? null : { network: start, broadcast: end };
    if (!pool || start > end) { setValidation("NAT-Pool ungültig", false); notices.push({ level: "error", text: "Pool-Anfang und Pool-Ende müssen gültige IPv4-Adressen in aufsteigender Reihenfolge sein." }); renderValidations(notices); clearDerivedOutput("NAT-Pool ungültig."); return; }
    if (networksOverlap(network, pool)) notices.push({ level: "error", text: "NAT-Pool überlappt mit dem Inside-Local-Netz." });
    if (isSpecialIPv4(start) || isSpecialIPv4(end)) notices.push({ level: "warning", text: "Der NAT-Pool enthält reservierte oder Dokumentationsadressen." });
    capacity = end - start + 1; capacityLabel = "öffentliche Adressen"; capacityTitle = "Pool-Kapazität"; detail = "des konfigurierten NAT-Pools";
  } else if (state.mode === "cgnat") {
    const pool = parseCIDR(els.cgnatPool.value); const block = Number(els.portsPerSubscriber.value);
    if (!pool || !validPort(block) || block % 64 !== 0) { setValidation("CGNAT-Pool oder Portblock ungültig", false); notices.push({ level: "error", text: "CGNAT-Pool muss gültig sein; die Portblock-Größe muss zwischen 64 und 65.535 liegen und durch 64 teilbar sein." }); renderValidations(notices); clearDerivedOutput("CGNAT-Pool oder Portblock ungültig."); return; }
    if (pool.network < 0x64400000 || pool.broadcast > 0x647fffff) notices.push({ level: "warning", text: "CGNAT-Pool liegt nicht vollständig im RFC-6598-Bereich 100.64.0.0/10." });
    capacity = Math.floor(64512 / block) * pool.addresses; capacityLabel = "Abonnenten"; capacityTitle = "CGNAT-Kapazität"; detail = `bei ${formatNumber(block)} Ports pro Abonnent`;
  } else if (state.mode === "twice") {
    const destination = parseCIDR(els.destinationNetwork.value); const translated = parseCIDR(els.translatedDestinationNetwork.value);
    if (!destination || !translated || destination.prefix !== translated.prefix) { setValidation("Twice-NAT-Zielnetze ungültig", false); notices.push({ level: "error", text: "Beide Twice-NAT-Zielnetze müssen gültige CIDR-Netze mit derselben Präfixlänge sein." }); renderValidations(notices); clearDerivedOutput("Twice-NAT-Zielnetze ungültig."); return; }
    if (networksOverlap(network, translated)) notices.push({ level: "error", text: "Übersetztes Zielnetz überlappt mit dem Inside-Local-Netz." });
    capacity = usable; capacityLabel = "gleich große Host-Zuordnungen"; capacityTitle = "Twice-NAT-Bereich"; detail = "der symmetrischen Netzübersetzung";
  } else if (state.mode === "nptv6") {
    const inside6 = parseIPv6Prefix(els.ipv6InsidePrefix.value); const outside6 = parseIPv6Prefix(els.ipv6OutsidePrefix.value);
    if (!inside6 || !outside6 || inside6.prefix !== outside6.prefix) { setValidation("NPTv6-Präfixe ungültig", false); notices.push({ level: "error", text: "Interne und externe IPv6-Präfixe müssen gültig sein und dieselbe Präfixlänge haben." }); renderValidations(notices); clearDerivedOutput("NPTv6-Präfixe ungültig."); return; }
    if (!inside6.address.startsWith("fd") && !inside6.address.startsWith("fc")) notices.push({ level: "warning", text: "Das interne IPv6-Präfix ist kein ULA-Präfix (fc00::/7)." });
    capacity = 2 ** Math.min(32, 128 - inside6.prefix); capacityLabel = "IPv6-Hostadressen (angezeigt begrenzt)"; capacityTitle = "NPTv6-Präfix"; detail = `für ${inside6.address}/${inside6.prefix}`;
  } else if (state.mode === "nat64") {
    const prefix = parseIPv6Prefix(els.nat64Prefix.value); const target = parseIPv4(els.nat64IPv4Target.value);
    if (!prefix || prefix.prefix !== 96 || target === null) { setValidation("NAT64-Präfix oder IPv4-Ziel ungültig", false); notices.push({ level: "error", text: "NAT64 benötigt ein gültiges IPv6-Präfix der Länge /96 und eine gültige IPv4-Zieladresse." }); renderValidations(notices); clearDerivedOutput("NAT64-Präfix oder IPv4-Ziel ungültig."); return; }
    if (prefix.address !== "64:ff9b::") notices.push({ level: "warning", text: "Es wird nicht das Well-Known NAT64 Prefix 64:ff9b::/96 verwendet." });
    capacity = 4294967296; capacityLabel = "einbettbare IPv4-Ziele"; capacityTitle = "NAT64 / DNS64"; detail = `unter ${prefix.address}/${prefix.prefix}`;
  }

  const connections = Math.max(0, Number(els.connections.value) || 0);
  const utilization = capacity ? Math.min(100, Math.round((connections / capacity) * 10000) / 100) : 0;
  if (capacity && connections > capacity) notices.push({ level: "error", text: "Kapazitätsüberschreitung: erwartete Translations übersteigen die verfügbare Kapazität." });
  else if (capacity && utilization > 80) notices.push({ level: "warning", text: "Hohe Auslastung: Port- oder Pool-Erweiterung einplanen." });
  if (!notices.length) notices.push({ level: "info", text: "Adressbereiche, Ports und Kapazität sind plausibel." });
  const hasError = notices.some(item => item.level === "error");
  setValidation(hasError ? "Prüfung mit Fehlern" : notices.some(item => item.level === "warning") ? "Prüfung mit Hinweisen" : "Eingaben gültig", !hasError);
  renderValidations(notices);
  els.capacityTitle.textContent = capacityTitle; els.capacityValue.textContent = capacity ? formatNumber(capacity) : "1:1"; els.capacityUnit.textContent = capacityLabel;
  els.capacityMeter.style.width = `${capacity ? Math.max(utilization, connections ? 1 : 0) : 100}%`; els.capacityMeter.parentElement.setAttribute("aria-valuenow", String(utilization));
  els.capacityDetail.textContent = capacity ? `${formatNumber(connections)} erwartete Translations belegen ${utilization.toLocaleString("de-DE", { maximumFractionDigits: 2 })} % ${detail}.` : "Verbindungen werden nicht über einen gemeinsamen Port- oder Adresspool limitiert; jede Zuordnung verwendet eine feste öffentliche Adresse.";
  updateFlow(network, forwards); renderConfig(network, forwards);
}

function wildcard(mask) { return formatIPv4((~mask) >>> 0); }

function renderConfig(network, forwards) {
  const inside = formatIPv4(network.network); const outside = els.publicIP.value.trim(); const vendor = els.vendorProfile.value;
  const targets = forwards.length ? forwards : [{ protocol: "TCP", publicPort: 0, privateIP: `${inside}`, privatePort: 0 }];
  const title = { "cisco-ios": "Cisco IOS", "cisco-asa": "Cisco ASA / Firepower", juniper: "Juniper Junos", fortigate: "Fortinet FortiGate", iptables: "Linux iptables", nftables: "Linux nftables" }[vendor];
  const staticSource = state.mode === "static" ? els.privateHost.value.trim() : inside;
  const staticGlobal = state.mode === "static" ? els.staticPublicIP.value.trim() : outside;
  const forwardingGlobal = state.mode === "static" ? staticGlobal : outside;
  let lines = [];
  if (["nptv6", "nat64"].includes(state.mode)) {
    lines = state.mode === "nptv6"
      ? [`! NPTv6 ist plattformabhängig. ${els.ipv6InsidePrefix.value.trim()} wird auf ${els.ipv6OutsidePrefix.value.trim()} übersetzt.`, "! Verwende eine Firewall oder einen Router mit expliziter NPTv6-Unterstützung."]
      : [`! NAT64 / DNS64 ist plattformabhängig. Präfix: ${els.nat64Prefix.value.trim()}, IPv4-Ziel: ${els.nat64IPv4Target.value.trim()}`, "! Verwende eine Firewall oder einen Router mit stateful NAT64- und DNS64-Unterstützung."];
  } else if (vendor === "cisco-ios") {
    lines = ["! NAT-Konfiguration - Interfaces und ACL vor Einsatz prüfen", "ip access-list standard NAT-INSIDE", ` permit ${inside} ${wildcard(network.mask)}`, "!"];
    if (state.mode === "pat" || state.mode === "cgnat") lines.push("ip nat inside source list NAT-INSIDE interface <OUTSIDE-INTERFACE> overload");
    if (state.mode === "static") lines.push(`ip nat inside source static ${staticSource} ${staticGlobal}`);
    if (state.mode === "pool") lines.push(`ip nat pool NAT-POOL ${els.poolStart.value.trim()} ${els.poolEnd.value.trim()} netmask 255.255.255.224`, "ip nat inside source list NAT-INSIDE pool NAT-POOL");
    if (state.mode === "twice") lines.push(`! SNAT ${inside} -> ${outside}`, `! DNAT ${els.destinationNetwork.value.trim()} -> ${els.translatedDestinationNetwork.value.trim()}`);
    if (state.mode === "nptv6") lines.push(`! NPTv6 ${els.ipv6InsidePrefix.value.trim()} -> ${els.ipv6OutsidePrefix.value.trim()}`);
    if (state.mode === "nat64") lines.push(`! NAT64 ${els.nat64Prefix.value.trim()} -> ${els.nat64IPv4Target.value.trim()}`);
    targets.filter(target => target.publicPort).forEach(target => lines.push(`ip nat inside source static ${target.protocol.toLowerCase()} ${target.privateIP} ${target.privatePort} ${forwardingGlobal} ${target.publicPort}`));
    lines.push("!", "interface <INSIDE-INTERFACE>", " ip nat inside", "interface <OUTSIDE-INTERFACE>", " ip nat outside");
  } else if (vendor === "cisco-asa") {
    lines = [`object network INSIDE-NET`, ` subnet ${inside} ${formatIPv4(network.mask)}`];
    lines.push(state.mode === "static" ? ` nat (inside,outside) static ${staticGlobal}` : ` nat (inside,outside) dynamic interface`);
    if (state.mode === "twice") lines.push(`nat (inside,outside) source static INSIDE-NET INSIDE-NET destination static ${els.destinationNetwork.value.trim()} ${els.translatedDestinationNetwork.value.trim()}`);
  } else if (vendor === "juniper") {
    lines = ["set security nat source rule-set NAT-RULES from zone trust", "set security nat source rule-set NAT-RULES to zone untrust", `set security nat source rule-set NAT-RULES rule NAT-INSIDE match source-address ${els.insideNetwork.value.trim()}`, `set security nat source rule-set NAT-RULES rule NAT-INSIDE then source-nat interface`];
  } else if (vendor === "fortigate") {
    lines = ["config firewall policy", " edit 0", '  set name "NAT-INSIDE"', "  set srcintf \"inside\"", "  set dstintf \"outside\"", `  set srcaddr "${els.insideNetwork.value.trim()}"`, "  set nat enable", " next", "end"];
    if (state.mode === "twice") lines = ["config firewall central-snat-map", " edit 0", `  set src-addr "${els.insideNetwork.value.trim()}"`, `  set dst-addr "${els.destinationNetwork.value.trim()}"`, `  set orig-addr "${els.translatedDestinationNetwork.value.trim()}"`, `  set nat-ippool "${outside}"`, " next", "end"];
  } else if (vendor === "iptables") {
    lines = [`iptables -t nat -A POSTROUTING -s ${els.insideNetwork.value.trim()} -o <outside-interface> -j MASQUERADE`, ...targets.filter(target => target.publicPort).map(target => `iptables -t nat -A PREROUTING -i <outside-interface> -p ${target.protocol.toLowerCase()} --dport ${target.publicPort} -j DNAT --to-destination ${target.privateIP}:${target.privatePort}`)];
    if (state.mode === "twice") lines = [`iptables -t nat -A PREROUTING -d ${els.destinationNetwork.value.trim()} -j DNAT --to-destination ${els.translatedDestinationNetwork.value.trim()}`, `iptables -t nat -A POSTROUTING -s ${els.insideNetwork.value.trim()} -d ${els.translatedDestinationNetwork.value.trim()} -j SNAT --to-source ${outside}`];
  } else {
    lines = ["table ip nat {", " chain postrouting {", "  type nat hook postrouting priority srcnat;", `  ip saddr ${els.insideNetwork.value.trim()} oifname \"<outside-interface>\" masquerade`, " }", "}"];
  }
  if (state.bulkRules.length) lines.push("", "! Importierte Bulk-Regeln", ...state.bulkRules);
  els.configTitle.textContent = ["nptv6", "nat64"].includes(state.mode) ? `Plattformhinweis: ${modeLabels[state.mode]}` : `${title}: ${modeLabels[state.mode]}`;
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
  els.modeDescription.innerHTML = modeDescriptions[mode];
  els.staticFields.classList.toggle("hidden", mode !== "static");
  els.poolFields.classList.toggle("hidden", mode !== "pool");
  els.cgnatFields.classList.toggle("hidden", mode !== "cgnat");
  els.twiceFields.classList.toggle("hidden", mode !== "twice");
  els.nptv6Fields.classList.toggle("hidden", mode !== "nptv6");
  els.nat64Fields.classList.toggle("hidden", mode !== "nat64");
  calculate();
}

function calculateWorkNetwork() {
  const networkName = document.getElementById("work-network-select").value;
  const input = document.getElementById("work-network-ip").value.trim();
  const error = document.getElementById("work-network-error");
  const result = document.getElementById("work-network-result");
  const mapping = workNetworkMappings.find(item => item.name === networkName);

  error.hidden = true;
  result.hidden = true;
  if (!networkName && !input) return;
  if (!mapping) {
    error.textContent = "Bitte zuerst ein Arbeitsnetz auswählen.";
    error.hidden = false;
    return;
  }
  if (!input) return;

  const rawIP = parseIPv4(input);
  const source = parseCIDR(mapping.source);
  const target = parseCIDR(mapping.target);
  if (rawIP === null) {
    error.textContent = "Bitte eine gültige IPv4-Adresse mit vier Oktetten (je 0–255) eingeben.";
    error.hidden = false;
    return;
  }
  if (!source || !target || source.prefix !== target.prefix || rawIP < source.network || rawIP > source.broadcast) {
    error.textContent = `Die IP-Adresse liegt nicht im Quellnetz ${mapping.source}.`;
    error.hidden = false;
    return;
  }

  const translatedIP = target.network + (rawIP - source.network);
  document.getElementById("work-network-result-ip").textContent = formatIPv4(translatedIP);
  document.getElementById("work-network-result-name").textContent = `${mapping.name}: ${mapping.source} → ${mapping.target}`;
  result.hidden = false;
}

document.querySelectorAll(".view-tab").forEach(button => button.addEventListener("click", () => {
  const selectedView = button.dataset.view;
  document.querySelectorAll(".view-tab").forEach(tab => {
    const active = tab === button;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  document.getElementById("nat-calculator-view").hidden = selectedView !== "nat-calculator-view";
  document.getElementById("work-network-view").hidden = selectedView !== "work-network-view";
}));
document.getElementById("work-network-select").addEventListener("change", calculateWorkNetwork);
document.getElementById("work-network-ip").addEventListener("input", calculateWorkNetwork);

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
    setValidation("Kopieren nicht verfügbar", false);
  }
}

els.form.addEventListener("submit", event => { event.preventDefault(); calculate(); });
els.form.querySelectorAll("input, select").forEach(input => input.addEventListener("input", calculate));
els.modeButtons.forEach(button => button.addEventListener("click", () => setMode(button.dataset.mode)));
document.getElementById("add-forward").addEventListener("click", () => addForwarding());
document.getElementById("copy-config").addEventListener("click", event => copyText(els.configOutput.textContent, event.currentTarget));
document.getElementById("copy-summary").addEventListener("click", event => copyText(`NAT-Modus: ${modeLabels[state.mode]}\nInside-Netz: ${els.insideNetwork.value}\nInside Global: ${els.publicIP.value}\nKapazität: ${els.capacityValue.textContent} ${els.capacityUnit.textContent}\n${els.capacityDetail.textContent}`, event.currentTarget));
document.getElementById("reset").addEventListener("click", () => { els.form.reset(); els.forwardingList.innerHTML = ""; addForwarding({ protocol: "TCP", publicPort: 443, privateIP: "10.20.30.25", privatePort: 443 }); setMode("pat"); });
els.themeToggle.addEventListener("click", () => {
  const nextTheme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem("nat-rechner-theme", nextTheme);
  applyTheme(nextTheme);
});

applyTheme(state.theme);
addForwarding({ protocol: "TCP", publicPort: 443, privateIP: "10.20.30.25", privatePort: 443 });
calculate();

function snapshot() {
  const fields = {};
  els.form.querySelectorAll("input, select").forEach(field => { if (field.id) fields[field.id] = field.value; });
  return { name: "", mode: state.mode, vendor: els.vendorProfile.value, fields, forwards: getForwards(), bulkRules: state.bulkRules };
}

function applySnapshot(data) {
  if (!data || !data.fields) throw new Error("Unvollständige NAT-Vorlage");
  Object.entries(data.fields).forEach(([id, value]) => { const field = document.getElementById(id); if (field) field.value = value; });
  state.bulkRules = Array.isArray(data.bulkRules) ? data.bulkRules : [];
  els.forwardingList.innerHTML = "";
  (data.forwards || []).forEach(addForwarding);
  if (!els.forwardingList.children.length) addForwarding();
  els.vendorProfile.value = data.vendor || "cisco-ios";
  setMode(data.mode || "pat");
}

function presets() {
  try { const value = JSON.parse(localStorage.getItem("nat-rechner-presets") || "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
}

function renderPresets() {
  const stored = presets();
  els.presetList.innerHTML = "";
  if (!stored.length) { els.presetList.textContent = "Noch keine lokalen Vorlagen gespeichert."; return; }
  stored.forEach((preset, index) => {
    const item = document.createElement("div"); item.className = "preset-item";
    const load = document.createElement("button"); load.type = "button"; load.className = "preset-load"; load.textContent = preset.name || `Vorlage ${index + 1}`;
    load.addEventListener("click", () => { applySnapshot(preset); setTransferStatus(`Vorlage „${load.textContent}“ geladen.`); });
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "preset-delete"; remove.textContent = "×"; remove.title = "Vorlage löschen"; remove.setAttribute("aria-label", "Vorlage löschen");
    remove.addEventListener("click", () => { stored.splice(index, 1); localStorage.setItem("nat-rechner-presets", JSON.stringify(stored)); renderPresets(); });
    item.append(load, remove); els.presetList.appendChild(item);
  });
}

function setTransferStatus(message) { els.transferStatus.textContent = message; }

function downloadJSON(data, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  link.download = filename; link.click(); URL.revokeObjectURL(link.href);
}

function importCSV(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/).filter(Boolean);
  const columns = header.split(",").map(value => value.trim().toLowerCase());
  const privateIndex = columns.indexOf("private_ip"); const publicIndex = columns.indexOf("public_ip");
  if (privateIndex < 0 || publicIndex < 0) throw new Error("CSV benötigt die Spalten private_ip und public_ip.");
  state.bulkRules = rows.map(row => row.split(",").map(value => value.trim())).filter(row => parseIPv4(row[privateIndex]) !== null && parseIPv4(row[publicIndex]) !== null)
    .map(row => `ip nat inside source static ${row[privateIndex]} ${row[publicIndex]}`);
  if (!state.bulkRules.length) throw new Error("CSV enthält keine gültigen 1:1-NAT-Zuordnungen.");
  setTransferStatus(`${state.bulkRules.length} Bulk-Regeln importiert.`); calculate();
}

document.getElementById("save-preset").addEventListener("click", () => {
  const name = prompt("Name der Vorlage:", `${modeLabels[state.mode]} ${els.insideNetwork.value.trim()}`)?.trim();
  if (!name) return;
  const stored = presets(); const data = snapshot(); data.name = name; stored.push(data);
  localStorage.setItem("nat-rechner-presets", JSON.stringify(stored)); renderPresets(); setTransferStatus(`Vorlage „${name}“ gespeichert.`);
});
document.getElementById("export-data").addEventListener("click", () => { downloadJSON({ version: 1, exportedAt: new Date().toISOString(), current: snapshot(), presets: presets() }, "nat-rechner-export.json"); setTransferStatus("NAT-Planung als JSON exportiert."); });
els.vendorProfile.addEventListener("change", () => { state.vendor = els.vendorProfile.value; calculate(); });
els.importData.addEventListener("change", async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    const text = await file.text();
    if (file.name.toLowerCase().endsWith(".csv")) importCSV(text);
    else {
      const data = JSON.parse(text); const imported = data.current || data;
      applySnapshot(imported);
      if (Array.isArray(data.presets)) { localStorage.setItem("nat-rechner-presets", JSON.stringify(data.presets)); renderPresets(); }
      setTransferStatus("NAT-Planung aus JSON importiert.");
    }
  } catch (error) { setTransferStatus(error.message || "Import fehlgeschlagen."); }
  event.target.value = "";
});
renderPresets();