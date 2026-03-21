import {introTemplate, recipientSearchTemplate, reuseLinkTemplate} from "./exchange/firstScreenTemplates.js";

const BASE_URL = "https://gift-exchange-generator.com";
const OG_IMAGE = `${BASE_URL}/Gift-Giving-Banner.webp`;

const FAVICON_LINKS = `    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="manifest" href="/site.webmanifest">`;

function injectSlots(html) {
  return html
    .replace(
      '<div data-slot="instructions"></div>',
      `<div data-slot="instructions">${introTemplate()}</div>`
    )
    .replace(
      '<div data-slot="recipient-search"></div>',
      `<div data-slot="recipient-search">${recipientSearchTemplate()}</div>`
    )
    .replace(
      '<div data-slot="reuse-link"></div>',
      `<div data-slot="reuse-link">${reuseLinkTemplate()}</div>`
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

export function prerenderPlugin() {
  return {
    name: "vite-prerender",

    transformIndexHtml(html, ctx) {
      const filePath = ctx.path || "/index.html";

      if (filePath === "/index.html") {
        html = injectSlots(html);
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
