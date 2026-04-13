import {introTemplate, dashboardLinkTemplate} from "./exchange/firstScreenTemplates.js";

const BASE_URL = "https://gift-exchange-generator.com";
const OG_IMAGE = `${BASE_URL}/Gift-Giving-Banner.webp`;

const FAVICON_LINKS = `    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="manifest" href="/site.webmanifest">`;

// Populated by `css.modules.getJSON` in vite.config.js. Keys are absolute file
// paths to *.module.css files; values are { originalClass: hashedClass }.
export const cssModuleClassMap = new Map();

function findClassMap(suffix) {
  for (const [file, json] of cssModuleClassMap) {
    if (file.endsWith(suffix)) return json;
  }
  return {};
}

function injectSlots(html, btnStyles) {
  return html
    .replace(
      '<div data-slot="instructions"></div>',
      `<div data-slot="instructions">${introTemplate(btnStyles)}</div>`
    )
    .replace(
      '<div data-slot="dashboard-link"></div>',
      `<div data-slot="dashboard-link">${dashboardLinkTemplate(btnStyles)}</div>`
    );
}

function deriveUrlPath(filePath) {
  if (filePath === "/index.html") return "/";
  return filePath.replace(/^\/pages/, "").replace(/\/index\.html$/, "");
}

function generateOgTags(html, filePath) {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
  if (!titleMatch || !descMatch) return "";

  const title = titleMatch[1];
  const description = descMatch[1];
  const url = BASE_URL + deriveUrlPath(filePath);

  return `    <link rel="canonical" href="${url}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${OG_IMAGE}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${url}">`;
}

function injectFavicons(html) {
  if (html.includes("apple-touch-icon")) return html;
  return html.replace(/<meta charset="[^"]*"[^>]*>/, (match) => `${match}\n${FAVICON_LINKS}`);
}

const BUTTONS_MODULE_SUFFIX = "exchange/components/buttons.module.css";

export function prerenderPlugin() {
  let devServer;

  return {
    name: "vite-prerender",

    configureServer(server) {
      devServer = server;
    },

    async transformIndexHtml(html, ctx) {
      const filePath = ctx.path || "/index.html";

      if (filePath === "/index.html") {
        // In dev, the CSS module hasn't been processed yet on the very first
        // request, so explicitly load it via SSR to populate cssModuleClassMap.
        if (devServer) {
          try {
            await devServer.ssrLoadModule(`/${BUTTONS_MODULE_SUFFIX.replace("exchange/", "assets/styles/exchange/")}`);
          } catch { /* best-effort warmup */ }
        }
        const btnStyles = findClassMap(BUTTONS_MODULE_SUFFIX);
        html = injectSlots(html, btnStyles);
      }

      html = injectFavicons(html);

      const ogTags = generateOgTags(html, filePath);
      if (ogTags) {
        html = html.replace("</head>", `${ogTags}\n</head>`);
      }

      return html;
    },
  };
}
