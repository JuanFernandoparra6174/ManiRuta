// js/company_stats.js
import { supabase } from "./supabaseClient.js";

function esc(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// Paleta (coherente con tu app)
const COLORS = {
  green: "#3a6357",
  cyan: "#54bcbd",
  soft: "#d4dfe2",
  red: "#ef4444",
  amber: "#f59e0b",
  slate: "#0f172a"
};

function donutSvg(items, total){
  // items: [{label, value, color}]
  const size = 140;
  const r = 54;
  const cx = size/2;
  const cy = size/2;
  const C = 2 * Math.PI * r;

  let acc = 0;
  const rings = items.map(it => {
    const val = it.value || 0;
    const frac = total ? (val / total) : 0;
    const dash = frac * C;
    const gap = C - dash;
    const offset = -acc * C;
    acc += frac;

    return `
      <circle cx="${cx}" cy="${cy}" r="${r}"
        fill="none"
        stroke="${it.color}"
        stroke-width="16"
        stroke-linecap="round"
        stroke-dasharray="${dash} ${gap}"
        stroke-dashoffset="${offset}"
        transform="rotate(-90 ${cx} ${cy})"
        opacity="0.95"
      />`;
  }).join("");

  const center = `
    <circle cx="${cx}" cy="${cy}" r="${r-18}" fill="rgba(255,255,255,.92)"></circle>
    <text x="${cx}" y="${cy-2}" text-anchor="middle" font-size="18" font-weight="900" fill="${COLORS.slate}">
      ${total}
    </text>
    <text x="${cx}" y="${cy+18}" text-anchor="middle" font-size="11" font-weight="900" fill="rgba(15,23,42,.65)">
      total
    </text>`;

  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(212,223,226,.55)" stroke-width="16"></circle>
    ${rings}
    ${center}
  </svg>`;
}

function legendHtml(items, total){
  return items.map(it => {
    const pct = total ? Math.round((it.value / total) * 100) : 0;
    return `
      <div class="leg">
        <span><span class="dot" style="background:${it.color}"></span>${esc(it.label)}</span>
        <span>${it.value} · ${pct}%</span>
      </div>`;
  }).join("");
}

function barHtml(items, total){
  // items: [{value, color}]
  return items.map(it => {
    const w = total ? (it.value / total) * 100 : 0;
    return `<div class="seg" style="width:${w}%; background:${it.color};"></div>`;
  }).join("");
}

async function fetchBuses(companyId){
  const { data, error } = await supabase
    .from("buses")
    .select("id, plate, status, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

async function fetchDrivers(companyId){
  const { data, error } = await supabase
    .from("drivers")
    .select("id, full_name, status, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

function groupCount(arr, key){
  const map = new Map();
  for (const x of arr){
    const k = x?.[key] ?? "UNKNOWN";
    map.set(k, (map.get(k) || 0) + 1);
  }
  return map;
}

function topList(arr, filterFn, formatter, limit=10){
  return arr.filter(filterFn).slice(0, limit).map(formatter);
}

export async function loadCompanyStats(companyId){
  const [buses, drivers] = await Promise.all([
    fetchBuses(companyId),
    fetchDrivers(companyId)
  ]);

  // BUSES
  const busCounts = groupCount(buses, "status");
  const busActive = busCounts.get("ACTIVE") || 0;
  const busInactive = busCounts.get("INACTIVE") || 0;
  const busMaint = busCounts.get("MAINTENANCE") || 0;
  const busTotal = buses.length;

  const busItems = [
    { label: "ACTIVE", value: busActive, color: COLORS.green },
    { label: "MAINTENANCE", value: busMaint, color: COLORS.amber },
    { label: "INACTIVE", value: busInactive, color: COLORS.red },
  ];

  // DRIVERS
  const drvCounts = groupCount(drivers, "status");
  const drvActive = drvCounts.get("ACTIVE") || 0;
  const drvInactive = drvCounts.get("INACTIVE") || 0;
  const drvTotal = drivers.length;

  const drvItems = [
    { label: "ACTIVE", value: drvActive, color: COLORS.cyan },
    { label: "INACTIVE", value: drvInactive, color: COLORS.red },
  ];

  // Lists (cuales)
  const busList = {
    active: topList(buses, b => b.status === "ACTIVE", b => `🚌 ${esc(b.plate)}`),
    maintenance: topList(buses, b => b.status === "MAINTENANCE", b => `🧰 ${esc(b.plate)}`),
    inactive: topList(buses, b => b.status === "INACTIVE", b => `⛔ ${esc(b.plate)}`),
  };

  const driverList = {
    active: topList(drivers, d => d.status === "ACTIVE", d => `👨‍✈️ ${esc(d.full_name)}`),
    inactive: topList(drivers, d => d.status === "INACTIVE", d => `⛔ ${esc(d.full_name)}`),
  };

  return {
    buses: {
      total: busTotal,
      active: busActive,
      inactive: busInactive,
      maintenance: busMaint,
      donutSvg: donutSvg(busItems, busTotal),
      legendHtml: legendHtml(busItems, busTotal),
      barHtml: barHtml(busItems, busTotal),
      list: busList,
    },
    drivers: {
      total: drvTotal,
      active: drvActive,
      inactive: drvInactive,
      donutSvg: donutSvg(drvItems, drvTotal),
      legendHtml: legendHtml(drvItems, drvTotal),
      barHtml: barHtml(drvItems, drvTotal),
      list: driverList,
    }
  };
}
