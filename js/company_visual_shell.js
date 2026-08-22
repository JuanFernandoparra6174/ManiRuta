/*
  Shared visual shell for Empresa pages.

  This module only creates presentation markup for the future visual migration.
  It does not read or write data, does not call Supabase, and does not change
  authentication, permissions, CRUD flows, routes, or validations.
*/

export const companyNavigationItems = [
  { id: "dashboard", label: "Inicio", href: "home_company.html", icon: "grid" },
  { id: "fleet", label: "Mi Flota", href: "buses.html", icon: "bus" },
  { id: "drivers", label: "Conductores", href: "drivers.html", icon: "users" },
  { id: "routes", label: "Rutas", href: "company_routes.html", icon: "map" },
  { id: "trips", label: "Viajes", href: "company_trips.html", icon: "route" },
  { id: "stats", label: "Estadisticas", href: "company_stats.html", icon: "chart" },
  { id: "settings", label: "Configuracion", href: "company_settings.html", icon: "settings" }
];

const iconPaths = {
  grid: [
    "M4 4h7v7H4z",
    "M13 4h7v7h-7z",
    "M4 13h7v7H4z",
    "M13 13h7v7h-7z"
  ],
  bus: [
    "M6 19v2",
    "M18 19v2",
    "M5 11h14",
    "M6 4h12a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2Z",
    "M7.5 16h.01",
    "M16.5 16h.01"
  ],
  users: [
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
    "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    "M22 21v-2a4 4 0 0 0-3-3.87",
    "M16 3.13a4 4 0 0 1 0 7.75"
  ],
  map: [
    "M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3z",
    "M9 3v15",
    "M15 6v15"
  ],
  route: [
    "M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    "M18 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    "M6 13V9a4 4 0 0 1 4-4h5",
    "M18 11v4a4 4 0 0 1-4 4H9"
  ],
  chart: [
    "M3 3v18h18",
    "M7 15l4-4 3 3 5-7"
  ],
  settings: [
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
    "M19.4 15a7.9 7.9 0 0 0 .1-2l2-1.2-2-3.4-2.3.7a7.4 7.4 0 0 0-1.7-1l-.3-2.4h-4.4l-.3 2.4a7.4 7.4 0 0 0-1.7 1l-2.3-.7-2 3.4 2 1.2a7.9 7.9 0 0 0 .1 2l-2 1.2 2 3.4 2.3-.7c.5.4 1.1.7 1.7 1l.3 2.4h4.4l.3-2.4c.6-.3 1.2-.6 1.7-1l2.3.7 2-3.4z"
  ],
  bell: [
    "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9",
    "M13.73 21a2 2 0 0 1-3.46 0"
  ],
  menu: [
    "M4 7h16",
    "M4 12h16",
    "M4 17h16"
  ]
};

function createIcon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("mr-nav-icon");

  for (const d of iconPaths[name] || iconPaths.grid) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.8");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.append(path);
  }

  return svg;
}

function createNavLink(item, activeId) {
  const link = document.createElement("a");
  link.className = "mr-nav-item";
  link.href = item.href;
  link.dataset.companyNav = item.id;

  if (item.id === activeId) {
    link.classList.add("is-active");
    link.setAttribute("aria-current", "page");
  }

  link.append(createIcon(item.icon));
  link.append(document.createTextNode(item.label));
  return link;
}

export function createCompanySidebar({ activeId = "" } = {}) {
  const sidebar = document.createElement("aside");
  sidebar.className = "mr-sidebar";
  sidebar.setAttribute("aria-label", "Navegacion Empresa");

  const brand = document.createElement("div");
  brand.className = "mr-sidebar-brand";

  const mark = document.createElement("span");
  mark.className = "mr-brand-mark";
  mark.textContent = "MR";

  const text = document.createElement("span");
  text.className = "mr-brand-text";
  text.textContent = "ManiRuta";

  brand.append(mark, text);

  const nav = document.createElement("nav");
  nav.className = "mr-sidebar-nav";

  const section = document.createElement("p");
  section.className = "mr-label-caps mr-nav-section";
  section.textContent = "Empresa";
  nav.append(section);

  for (const item of companyNavigationItems) {
    nav.append(createNavLink(item, activeId));
  }

  const footer = document.createElement("div");
  footer.className = "mr-sidebar-footer";

  const support = document.createElement("span");
  support.className = "mr-status mr-status-active";
  support.textContent = "Operacion activa";
  footer.append(support);

  sidebar.append(brand, nav, footer);
  return sidebar;
}

export function createCompanyTopbar({
  title = "Empresa",
  subtitle = "",
  userLabel = "",
  actions = []
} = {}) {
  const header = document.createElement("header");
  header.className = "mr-topbar";

  const menuButton = document.createElement("button");
  menuButton.className = "mr-icon-btn mr-mobile-menu";
  menuButton.type = "button";
  menuButton.setAttribute("aria-label", "Abrir menu");
  menuButton.append(createIcon("menu"));

  const titleWrap = document.createElement("div");
  titleWrap.className = "mr-topbar-title";

  const heading = document.createElement("h1");
  heading.textContent = title;
  titleWrap.append(heading);

  if (subtitle) {
    const sub = document.createElement("p");
    sub.textContent = subtitle;
    titleWrap.append(sub);
  }

  const actionWrap = document.createElement("div");
  actionWrap.className = "mr-topbar-actions";

  const status = document.createElement("span");
  status.className = "mr-status mr-status-active";
  status.textContent = "En servicio";
  actionWrap.append(status);

  for (const action of actions) {
    actionWrap.append(action);
  }

  if (userLabel) {
    const user = document.createElement("span");
    user.className = "mr-badge";
    user.textContent = userLabel;
    actionWrap.append(user);
  }

  header.append(menuButton, titleWrap, actionWrap);
  return header;
}

export function wrapCompanyPage({
  activeId = "",
  title = "Empresa",
  subtitle = "",
  userLabel = "",
  mainSelector = "main"
} = {}) {
  const main = document.querySelector(mainSelector);
  if (!main || main.closest(".mr-app")) return null;

  document.body.classList.add("company-theme");

  const app = document.createElement("div");
  app.className = "mr-app";

  const content = document.createElement("div");
  content.className = "mr-content";

  const topbar = createCompanyTopbar({ title, subtitle, userLabel });
  const inner = document.createElement("div");
  inner.className = "mr-main-inner";

  main.classList.add("mr-main");
  main.parentNode.insertBefore(app, main);
  inner.append(...main.childNodes);
  main.append(inner);

  app.append(createCompanySidebar({ activeId }), content);
  content.append(topbar, main);

  return { app, topbar, main };
}
