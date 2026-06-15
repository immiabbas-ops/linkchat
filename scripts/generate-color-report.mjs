import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const assets = path.join(root, 'assets');
const outPath = path.join(root, 'LinkChat-Color-Theme-Report.pdf');

const M = 50;
const CONTENT_W = 595.28 - M * 2;

const themes = [
  {
    id: 'current',
    file: 'linkchat-theme-current-whatsapp.png',
    name: 'Current — WhatsApp-like Green',
    primary: ['#25D366', '#008069', '#00A884'],
    neutrals: ['#EFEAE2', '#111B21', '#DCF8C6'],
    feel: 'Instantly familiar to billions of WhatsApp users.',
    psychology:
      'Green signals growth, approval, and “go.” In messaging, it has become almost owned by WhatsApp/Meta — users subconsciously read it as “this is WhatsApp,” not “this is LinkChat.”',
    pros: [
      'Zero learning curve for chat patterns (list, bubbles, ticks)',
      'Feels safe and proven for private messaging',
      'High contrast green-on-white works outdoors on phones',
    ],
    cons: [
      'Brand confusion: LinkChat looks like a WhatsApp skin, not its own product',
      'Hard to justify Link Hub (Taxi, Trip, Food) as part of one identity',
      'App store screenshots compete directly with WhatsApp visually',
      'Outgoing bubble green (#DCF8C6) and beige wallpaper (#EFEAE2) are trademark-adjacent patterns',
    ],
    competitors: 'WhatsApp, WhatsApp Business',
    hubFit: 'Poor — green header fights colored Hub tiles; feels like chat bolted onto another app',
    recommended: false,
    score: 4,
  },
  {
    id: 'indigo',
    file: 'linkchat-theme-indigo.png',
    name: 'Indigo / Violet — Recommended',
    primary: ['#6366F1', '#4F46E5', '#4338CA'],
    neutrals: ['#F4F4F5', '#18181B', '#EEF2FF'],
    feel: 'Modern, intelligent, connected — “one app for everything.”',
    psychology:
      'Indigo sits between blue (trust, stability) and violet (creativity, premium). It is widely used in productivity and communication tools without being tied to a single messenger giant. Users associate it with links, networks, and unified platforms — a strong semantic fit for “LinkChat” and “Link Hub.”',
    pros: [
      'Ownable brand color — distinct from WhatsApp, Telegram blue, and iMessage blue-green',
      'Pairs naturally with multicolor Link Hub tiles (Taxi yellow, Trip cyan, Food orange)',
      'Excellent accessibility when paired with neutral grays (WCAG-friendly combinations)',
      'Scales to dark mode with tinted charcoal (#1E1B4B accents) without feeling copy-pasted',
      'Reads as “super app” (chat + services), not “chat clone”',
    ],
    cons: [
      'Less “instant messaging warmth” than green on first glance',
      'Requires updating all CSS variables and bubble tints consistently',
    ],
    competitors: 'Discord (blurple adjacent), Slack, Linear, many SaaS dashboards — professional tier',
    hubFit: 'Excellent — accent unifies nav; Hub tiles keep their own gradients as secondary colors',
    recommended: true,
    score: 9,
  },
  {
    id: 'teal',
    file: 'linkchat-theme-teal.png',
    name: 'Teal / Cyan',
    primary: ['#0D9488', '#0891B2', '#0F766E'],
    neutrals: ['#F0FDFA', '#134E4A', '#CCFBF1'],
    feel: 'Fresh, calm, travel-friendly.',
    psychology:
      'Teal blends trust (blue) with renewal (green) but avoids WhatsApp’s exact hue. Often used in wellness, travel, and fintech. Feels approachable without childish brightness.',
    pros: [
      'Still “alive” and friendly for a consumer chat app',
      'Different enough from WhatsApp green (#25D366 vs #0D9488)',
      'Complements Trip (sky/cyan) and Link Chats emerald tile',
    ],
    cons: [
      'Can still feel “messaging app generic” next to Telegram',
      'Slightly less premium than indigo for a multi-service hub',
    ],
    competitors: 'Telegram (cyan hints), Mint, some travel apps',
    hubFit: 'Good — especially if Trip/travel becomes the hero feature',
    recommended: false,
    score: 7,
  },
  {
    id: 'blue',
    file: 'linkchat-theme-blue.png',
    name: 'Deep Blue',
    primary: ['#2563EB', '#1D4ED8', '#1E40AF'],
    neutrals: ['#F8FAFC', '#0F172A', '#DBEAFE'],
    feel: 'Professional, secure, global.',
    psychology:
      'Blue is the most accepted corporate color worldwide — banks, airlines, LinkedIn, Facebook. It communicates reliability and security, which helps OTP login and linked services feel trustworthy.',
    pros: [
      'Strong trust signal for payments, bookings, and account linking later',
      'Works well in UAE/international markets where blue = established brand',
      'Clear separation from WhatsApp green',
    ],
    cons: [
      'Crowded space — many apps already “default blue”',
      'Can feel cold or corporate for casual chat with friends',
      'Less distinctive in app store than indigo or coral',
    ],
    competitors: 'Facebook Messenger, LinkedIn, Twitter/X accents, many banking apps',
    hubFit: 'Good for Taxi/Trip seriousness; weaker for playful Food tile',
    recommended: false,
    score: 7,
  },
  {
    id: 'coral',
    file: 'linkchat-theme-coral.png',
    name: 'Coral / Orange',
    primary: ['#F97316', '#EA580C', '#C2410C'],
    neutrals: ['#FFF7ED', '#1C1917', '#FFEDD5'],
    feel: 'Warm, social, energetic.',
    psychology:
      'Orange/coral drives action and enthusiasm — used by food delivery, social discovery, and entertainment. It says “do something now” (book taxi, order food) more than “calm conversation.”',
    pros: [
      'Maximum differentiation from WhatsApp and Telegram',
      'Energetic match for Food and Taxi Hub tiles',
      'Memorable in marketing and app icon',
    ],
    cons: [
      'Can feel aggressive if overused on large headers',
      'Lower perceived “privacy/security” than blue/indigo for some users',
      'Fatigue risk — orange UI needs careful neutral balance',
    ],
    competitors: 'Swiggy, Zomato, Nickelodeon-energy apps, some dating/social apps',
    hubFit: 'Excellent for action/services; moderate for long chat sessions',
    recommended: false,
    score: 6,
  },
];

function ensureSpace(doc, needed) {
  if (doc.y + needed > doc.page.height - M) doc.addPage();
}

function heading(doc, text, size = 16, color = '#111827') {
  ensureSpace(doc, 40);
  doc.font('Helvetica-Bold').fontSize(size).fillColor(color).text(text, M, doc.y, { width: CONTENT_W });
  doc.moveDown(0.4);
}

function subheading(doc, text) {
  ensureSpace(doc, 28);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#374151').text(text, M, doc.y, { width: CONTENT_W });
  doc.moveDown(0.25);
}

function body(doc, text, opts = {}) {
  doc.font('Helvetica').fontSize(opts.size || 10).fillColor(opts.color || '#4B5563');
  doc.text(text, M, doc.y, { width: CONTENT_W, lineGap: opts.lineGap ?? 4, ...opts });
  doc.moveDown(opts.after ?? 0.5);
}

function bulletList(doc, items) {
  items.forEach((item) => {
    ensureSpace(doc, 20);
    doc.font('Helvetica').fontSize(10).fillColor('#4B5563');
    doc.text('•  ' + item, M + 8, doc.y, { width: CONTENT_W - 16, lineGap: 3 });
  });
  doc.moveDown(0.5);
}

function drawSwatches(doc, colors, labels) {
  ensureSpace(doc, 36);
  const startY = doc.y;
  const swatchW = 52;
  colors.forEach((hex, i) => {
    const x = M + i * (swatchW + 12);
    doc.rect(x, startY, swatchW, 22).fill(hex);
    doc.font('Helvetica').fontSize(7).fillColor('#374151');
    doc.text(labels?.[i] || hex, x, startY + 26, { width: swatchW, align: 'center' });
  });
  doc.y = startY + 44;
}

function addMockup(doc, filename, width = 280) {
  const imgPath = path.join(assets, filename);
  if (!fs.existsSync(imgPath)) {
    body(doc, `[Image missing: ${filename}]`, { color: '#DC2626' });
    return;
  }
  ensureSpace(doc, width * 1.85);
  const x = (doc.page.width - width) / 2;
  doc.image(imgPath, x, doc.y, { width });
  doc.y += width * 1.75;
  doc.moveDown(0.3);
}

const doc = new PDFDocument({
  size: 'A4',
  margin: M,
  info: {
    Title: 'LinkChat Color Theme Report — Detailed',
    Author: 'LinkChat Product Design',
    Subject: 'Brand color strategy with AI mockups',
    Keywords: 'LinkChat, UI, color, brand, indigo, WhatsApp',
  },
});

doc.pipe(fs.createWriteStream(outPath));

// ─── COVER ───
doc.font('Helvetica-Bold').fontSize(32).fillColor('#4F46E5').text('LinkChat', M, 120, { width: CONTENT_W, align: 'center' });
doc.fontSize(22).fillColor('#111827').text('Color & Brand Identity Report', { align: 'center', width: CONTENT_W });
doc.moveDown(0.8);
doc.font('Helvetica').fontSize(11).fillColor('#6B7280').text('Detailed analysis with AI-generated UI mockups', { align: 'center', width: CONTENT_W });
doc.text(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), { align: 'center', width: CONTENT_W });
doc.moveDown(2);
doc.rect(M, doc.y, CONTENT_W, 3).fill('#6366F1');
doc.moveDown(1.5);
body(
  doc,
  'Prepared for: LinkChat (messaging + Link Hub services)\nDocument type: Visual brand direction & implementation guide\nRecommendation: Indigo (#6366F1) as primary brand accent',
  { after: 1 },
);

doc.addPage();

// ─── EXECUTIVE SUMMARY ───
heading(doc, '1. Executive summary');
body(
  doc,
  'LinkChat today uses a WhatsApp-inspired palette — green accents (#25D366, #008069), beige chat wallpaper (#EFEAE2), and green outgoing bubbles (#DCF8C6). This helped ship a familiar chat UX quickly, but it weakens brand identity and makes Link Hub (Taxi, Trip, Food, Jobs, Link Chats) feel like separate products glued together.',
);
body(
  doc,
  'After evaluating five directions with AI mockups, we recommend switching to Indigo (#6366F1) as the primary accent, paired with neutral grays for surfaces and chat bubbles. This choice best matches the product name (“Link”), supports a super-app narrative, and avoids visual collision with WhatsApp while remaining modern and accessible.',
);
subheading(doc, 'Decision at a glance');
const summaryRows = [
  ['Option', 'Score /10', 'Verdict'],
  ['Current (WhatsApp-like)', '4', 'Replace — clone risk'],
  ['Indigo ★', '9', 'Adopt — recommended'],
  ['Teal', '7', 'Strong alternative if travel-first'],
  ['Deep blue', '7', 'Good if trust/compliance is priority'],
  ['Coral / orange', '6', 'Good if Food/Taxi is hero'],
];
doc.fontSize(9);
summaryRows.forEach((row, i) => {
  doc.font(i === 0 ? 'Helvetica-Bold' : 'Helvetica').fillColor('#374151');
  doc.text(row.join('     |     '), M, doc.y, { width: CONTENT_W });
});
doc.moveDown(1);

doc.addPage();

// ─── CONTEXT ───
heading(doc, '2. Product & brand context');
body(doc, 'LinkChat is not only a messenger. It includes:');
bulletList(doc, [
  'Real-time chat (private & group) with voice, media, presence',
  'Link Hub: Taxi, Trip (flights/hotels), Food, Jobs, Real Estate, News',
  'Link Chats: Telegram live bot, email/Discord shortcuts',
  'Future: unified inbox, more connectors, possible payments',
]);
body(
  doc,
  'The color system must therefore support two mental models: (1) intimate conversation, and (2) discovery/action across services. A single ownable accent color anchors both; service tiles can keep secondary gradients.',
);

heading(doc, '3. Problem with the current palette', 14);
body(doc, 'Current CSS (globals.css) explicitly mirrors WhatsApp:');
bulletList(doc, [
  'Light header: #008069 — WhatsApp green header',
  'Accent: #25D366 — WhatsApp brand green',
  'Wallpaper: #EFEAE2 — WhatsApp default chat background',
  'Outgoing bubble: #DCF8C6 — WhatsApp light green bubble',
  'Dark surfaces: #111B21, #202C33 — WhatsApp dark mode hex codes',
]);
body(
  doc,
  'Impact: Users may assume LinkChat is unofficial WhatsApp tooling. Investors and partners see a clone, not a platform. Marketing cannot own a color in the user’s mind.',
);

doc.addPage();

// ─── METHODOLOGY ───
heading(doc, '4. How we evaluated options');
bulletList(doc, [
  'Generated AI mockups of the chat list + navigation for each palette (see Section 5)',
  'Scored brand distinctiveness, Link Hub harmony, trust, warmth, and implementation cost',
  'Mapped competitor colors (WhatsApp, Telegram, Messenger, Discord)',
  'Checked contrast for mobile (headers, FAB, unread badges on white/dark)',
  'Aligned with product name semantics: “Link” → connection, network, indigo/link metaphor',
]);

doc.addPage();

// ─── EACH THEME ───
heading(doc, '5. Theme options (detailed)');

themes.forEach((theme, index) => {
  if (index > 0) doc.addPage();

  const titleColor = theme.recommended ? '#4F46E5' : '#111827';
  heading(doc, `5.${index + 1}  ${theme.name}${theme.recommended ? '  ★ RECOMMENDED' : ''}`, 15, titleColor);

  subheading(doc, 'AI mockup — chat list & navigation');
  addMockup(doc, theme.file);

  subheading(doc, 'Palette');
  drawSwatches(doc, theme.primary, ['Primary', 'Dark', 'Deeper']);
  drawSwatches(doc, theme.neutrals, ['Surface', 'Text/Dark', 'Tint/Bubble']);

  subheading(doc, 'First impression');
  body(doc, theme.feel);

  subheading(doc, 'Color psychology & meaning');
  body(doc, theme.psychology);

  subheading(doc, 'Strengths');
  bulletList(doc, theme.pros);

  subheading(doc, 'Weaknesses');
  bulletList(doc, theme.cons);

  subheading(doc, 'Similar apps in market');
  body(doc, theme.competitors);

  subheading(doc, 'Fit with Link Hub');
  body(doc, theme.hubFit);

  subheading(doc, 'Overall score');
  doc.font('Helvetica-Bold').fontSize(14).fillColor(theme.recommended ? '#4F46E5' : '#374151');
  doc.text(`${theme.score} / 10`, M, doc.y);
  doc.moveDown(0.8);
});

doc.addPage();

// ─── WHY INDIGO ───
heading(doc, '6. Why we choose Indigo (#6366F1)');
body(
  doc,
  'Indigo is the recommended primary brand color for LinkChat. This section explains the decision in depth — for stakeholders, designers, and developers implementing the change.',
);

subheading(doc, '6.1  Semantic fit with “LinkChat”');
body(
  doc,
  'The product name combines Link + Chat. Indigo/violet is culturally associated with hyperlinks, digital connection, and networks (the “link” metaphor). Green, by contrast, is now owned by WhatsApp in the messaging category. Indigo tells users: this is a connected platform, not a green-chat clone.',
);

subheading(doc, '6.2  Super-app architecture');
body(
  doc,
  'Link Hub already uses distinct tile colors (Taxi amber, Trip cyan, Food red-orange, Jobs blue). A neutral-indigo shell lets those tiles shine without clashing. WhatsApp-green headers compete with every colored tile; indigo recedes enough to act as frame, not competitor.',
);

subheading(doc, '6.3  Competitive differentiation');
body(doc, 'Major messenger color ownership today:');
bulletList(doc, [
  'WhatsApp — green (#25D366)',
  'Telegram — blue/cyan',
  'Messenger — Facebook blue',
  'iMessage — blue/green bubbles',
  'Signal — blue accents',
]);
body(
  doc,
  'Indigo occupies open territory: professional enough for Trip/Taxi bookings, warm enough for chat, memorable in app store screenshots.',
);

subheading(doc, '6.4  User trust & growth path');
body(
  doc,
  'LinkChat uses phone OTP login, will store connectors (Telegram bots), and may add payments later. Indigo reads more “platform/security” than orange, and more “consumer-friendly” than corporate navy — a balance for current and future features.',
);

subheading(doc, '6.5  Accessibility & dark mode');
body(
  doc,
  'Recommended pairings: Primary #6366F1 on white (passes large text); on dark #18181B use #818CF8 for accents. Replace green bubble #DCF8C6 with #EEF2FF (indigo tint) or neutral #F4F4F5 for outgoing messages — readable and on-brand.',
);

subheading(doc, '6.6  When NOT to choose indigo');
body(
  doc,
  'Choose teal if travel (Trip) becomes 80%+ of marketing. Choose deep blue if enterprise/B2B is the primary pitch. Choose coral if Food delivery is the hero product. Choose to keep green only if deliberate “WhatsApp familiarity” outweighs brand building.',
);

doc.addPage();

// ─── IMPLEMENTATION ───
heading(doc, '7. Implementation guide');
subheading(doc, '7.1  CSS variables to update (globals.css)');
const cssMap = [
  ['--accent', '#6366F1', '#25D366 today'],
  ['--accent-dark', '#4F46E5', '#008069 today'],
  ['--accent-light', '#818CF8', '#25D366 today'],
  ['--header (light)', '#4F46E5', '#008069 today'],
  ['--nav-active-pill', '#EEF2FF', '#E7FCE3 today'],
  ['--bubble-out (light)', '#EEF2FF or #F4F4F5', '#DCF8C6 today'],
  ['--bg-primary (light chat)', '#F4F4F5', '#EFEAE2 today'],
  ['--success', '#22C55E', 'Keep green for success toasts only'],
];
cssMap.forEach(([v, neu, old]) => {
  doc.font('Helvetica').fontSize(9).fillColor('#374151');
  doc.text(`${v}:  ${neu}  (was ${old})`, M + 8, doc.y, { width: CONTENT_W });
});

doc.moveDown(0.8);
subheading(doc, '7.2  Rollout phases');
bulletList(doc, [
  'Phase 1 — Accent & headers: FAB, tabs, links, login button',
  'Phase 2 — Chat surfaces: wallpaper, outgoing bubbles, ticks optional',
  'Phase 3 — Dark mode pass: tint panels #1E1B4B / #18181B',
  'Phase 4 — App icon & marketing assets aligned to indigo',
]);

subheading(doc, '7.3  What stays multicolor');
bulletList(doc, [
  'Link Hub service tiles (Taxi, Food, Trip, etc.)',
  'Telegram sky badge, success/error semantic colors',
  'User avatars and media — no change',
]);

doc.addPage();

// ─── APPENDIX ───
heading(doc, 'Appendix A — Mockup image files');
bulletList(doc, themes.map((t) => `${t.file} — ${t.name}`));

heading(doc, 'Appendix B — Disclaimer', 14);
body(
  doc,
  'UI mockups in this report are AI-generated concept art for directional decisions. Final production UI follows LinkChat components (ChatRoom, ChatList, Link Hub). Hex values should be validated on real devices before release.',
  { size: 9, color: '#6B7280' },
);

doc.end();
console.log('Detailed PDF written to:', outPath);
