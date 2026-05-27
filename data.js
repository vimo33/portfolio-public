/* Data for projects, method steps, and timeline milestones */

window.METHOD_STEPS = [
  { num: "01", title: "Idea Expansion",                tip: "Rough idea → Expanded brief" },
  { num: "02", title: "Deep-Research Prompt Engineering", tip: "Brief → Research prompt" },
  { num: "03", title: "Multi-Model Research",          tip: "Gemini · ChatGPT · Claude" },
  { num: "04", title: "Synthesis",                     tip: "Compress to decisions" },
  { num: "05", title: "Document Creation",             tip: "Build-ready artifacts" },
  { num: "06", title: "Build in Claude Code",          tip: "Working software" },
  { num: "07", title: "Executor / Reviewer Loop",      tip: "Audited iteration" },
];

// Each row links to its detail page: project.html?id=<id>. Take Me There keeps
// its bespoke case page. Live/repo links live ON the detail page, not the row.
window.PROJECTS = [
  { n: "01", id: "led-control-app",       title: "LED Control App",       sub: "LED Rental Control · iOS",      href: "project.html?id=led-control-app",       art: "led",       tag: "iOS App" },
  { n: "02", id: "inventory-os",          title: "Inventory OS",          sub: "Inventory & Creative Ops",      href: "project.html?id=inventory-os",          art: "inventory", tag: "Live" },
  { n: "03", id: "intermesh",             title: "InterMesh",             sub: "Agent-Mediated Human Matching", href: "project.html?id=intermesh",             art: "mesh",      tag: "Live" },
  { n: "04", id: "multiplium",            title: "Multiplium",            sub: "Investment Intelligence",       href: "project.html?id=multiplium",            art: "vine",      tag: "Live" },
  { n: "05", id: "wollyshare",            title: "WollyShare",            sub: "Community Sharing Platform",    href: "project.html?id=wollyshare",            art: "share",     tag: "Web App" },
  { n: "06", id: "ftr-os",                title: "Follow the Rabbit OS",  sub: "Studio Operating System",       href: "project.html?id=ftr-os",                art: "ftros",     tag: "Live" },
  { n: "07", id: "ai-business-specialist",title: "AI Business Specialist",sub: "Curriculum · ict-bbag.ch",      href: "project.html?id=ai-business-specialist",art: "teach",     tag: "Teaching" },
  { n: "08", id: "tourism-risk-monitor",  title: "Tourism Risk Monitor",  sub: "Global Tourism Signal Desk",    href: "project.html?id=tourism-risk-monitor",  art: "risk",      tag: "Live" },
  { n: "09", id: "rabbit-stack",          title: "Rabbit Stack",          sub: "Agentic Workflow Stack",        href: "project.html?id=rabbit-stack",          art: "stack",     tag: "Open Source" },
  { n: "10", id: "brain-os",              title: "Brain-OS",              sub: "AI Knowledge System",           href: "project.html?id=brain-os",              art: "brain",     tag: "Internal" },
  { n: "11", id: "take-me-there",         title: "Take Me There",         sub: "Immersive Installation",        href: "work/take-me-there.html",               art: "portal",    tag: "Case Study" },
  { n: "12", id: "live4fair",             title: "Live4Fair",             sub: "Live Platform",                 href: "project.html?id=live4fair",             art: "live",      tag: "Live" },
  { n: "13", id: "sage-ai",               title: "SAGE AI",               sub: "AI Assistant",                  href: "project.html?id=sage-ai",               art: "sage",      tag: "Prototype" },
];

// Per-project detail content for project.html. `shot` = screenshot in assets/shots/
// (null → falls back to the SVG motif). `live`/`repo` render as CTAs on the page.
window.PROJECT_DETAILS = {
  "led-control-app": {
    num: "01", art: "led", tag: "iOS App",
    role: "Product & Engineering", year: "2026", status: "In development", team: "Bildspur",
    live: "", repo: "",
    shot: null,
    overview: "A customer-facing iOS app for Bildspur's modular LED tube rental kits. It pairs with a kit's brain box (Fritz!Box + 6-universe Art-Net node) and turns a complex lighting rig into a pair-and-play experience.",
    points: [
      "~30 curated patterns across named layouts",
      "Music-reactive auto-mode driven on-device",
      "Pairs to the kit's Art-Net node over local network",
      "Backed by Inventory OS for kit/asset data"
    ],
    stack: ["React Native", "Expo", "TypeScript", "Art-Net / DMX", "Inventory OS"]
  },
  "inventory-os": {
    num: "02", art: "inventory", tag: "Live · Internal",
    role: "Product & Engineering", year: "2026", status: "Live", team: "Bildspur",
    live: "https://inventory.followtherabbit.studio", repo: "",
    shot: "assets/shots/inventory-os.png",
    overview: "An internal, photo-first inventory and creative-operations system for Bildspur — built so a few photos of a shelf become structured, searchable, checkout-ready inventory.",
    points: [
      "AI photo-proposal queue (snap → review → confirm)",
      "Human-readable inventory IDs + QR-coded physical boxes",
      "Checkout / return + internal location tracking",
      "Backend for the LED Control App"
    ],
    stack: ["Next.js", "TypeScript", "Supabase", "Gemini"]
  },
  "intermesh": {
    num: "03", art: "mesh", tag: "Live",
    role: "Founder & Engineering", year: "2026", status: "Live", team: "Solo",
    live: "https://intermesh.network", repo: "",
    shot: "assets/shots/intermesh.png",
    overview: "Agent-mediated semantic matching for humans. InterMesh matches people by the actual content of their thinking — not job title or follower count. You write a profile in your own voice; your agent submits it; the mesh clusters you with 3–7 people whose signal resonates.",
    points: [
      "Profiles in your own words, submitted by your agent",
      "Clusters of 3–7 resonant people, then a 24h live session",
      "A synthesis closes each cluster; survivors form your mesh",
      "The platform never talks to you — your agent does"
    ],
    stack: ["TypeScript", "Next.js", "MCP", "Vector matching"]
  },
  "multiplium": {
    num: "04", art: "vine", tag: "Live",
    role: "Founder & Research Engineering", year: "2026", status: "Live", team: "Solo",
    live: "https://vimo33.github.io/multiplium-research-lab/overview/", repo: "",
    shot: "assets/shots/multiplium.png",
    overview: "Regenerative-viticulture investment intelligence. Multiplium maps a whole technology landscape, scores it against a structured investor model, and narrows it to the highest-conviction targets.",
    points: [
      "96 investable companies across a 9-segment value chain",
      "Five-part composite investor scoring model",
      "Ranked top-20 shortlist → top-3 deep research",
      "Evidence-linked, decision-grade output"
    ],
    stack: ["TypeScript", "Research workflow", "Multi-model"]
  },
  "wollyshare": {
    num: "05", art: "share", tag: "Web App",
    role: "Product & Engineering", year: "2025", status: "Prototype", team: "Solo",
    live: "", repo: "https://github.com/vimo33/wollyshare-hub",
    shot: null,
    overview: "A community item-sharing platform — members lend and borrow belongings within a trusted community, with a request-and-approval workflow and an admin dashboard.",
    points: [
      "Post, edit, and manage items available to borrow",
      "Borrow-request workflow with approvals",
      "Real-time Telegram notifications",
      "Admin dashboard for community management"
    ],
    stack: ["React", "TypeScript", "Supabase", "Telegram"]
  },
  "ftr-os": {
    num: "06", art: "ftros", tag: "Live",
    role: "Co-founder & Engineering", year: "2026", status: "Live", team: "Follow The Rabbit",
    live: "https://os.followtherabbit.studio", repo: "",
    shot: "assets/shots/ftr-os.png",
    overview: "The operating system for a two-founder studio — one AI-assisted command center for the work that makes the studio run: projects, tasks, knowledge, decisions, and every intelligence signal in a single surface.",
    points: [
      "Unified surface for projects, tasks, and decisions",
      "Knowledge + intelligence signals woven in",
      "Agent-assisted workflows and capture",
      "Invite-only, multi-stakeholder views"
    ],
    stack: ["TypeScript", "Nixpacks", "Coolify", "Agents"]
  },
  "ai-business-specialist": {
    num: "07", art: "teach", tag: "Teaching",
    role: "Curriculum & Coaching", year: "2026", status: "Ongoing", team: "ICT-BBAG",
    live: "https://www.ict-bbag.ch/", repo: "",
    shot: null,
    overview: "Curriculum design and coaching for a Business AI Specialist program at ICT-BBAG — building the modules and teaching practitioners how to put AI to work in real business contexts.",
    points: [
      "Module design from first principles",
      "Hands-on, practitioner-focused teaching",
      "Real business workflows, not theory",
      "Coaching toward build-ready outcomes"
    ],
    stack: ["Curriculum", "Workshops", "AI literacy"]
  },
  "tourism-risk-monitor": {
    num: "08", art: "risk", tag: "Live",
    role: "Research & Engineering", year: "2026", status: "Live", team: "Solo",
    live: "https://vimo33.github.io/Tourism-Risk-Monitor/", repo: "https://github.com/vimo33/Tourism-Risk-Monitor",
    shot: "assets/shots/tourism-risk.png",
    overview: "A Global Tourism Signal Desk — a static monitor that tracks and forecasts tourism-related risk signals across regions.",
    points: [
      "Signal desk for global tourism risk",
      "Forecast monitor with regional views",
      "Static, fast, zero-backend deployment"
    ],
    stack: ["JavaScript", "JSX", "GitHub Pages"]
  },
  "rabbit-stack": {
    num: "09", art: "stack", tag: "Open Source",
    role: "Founder & Engineering", year: "2026", status: "In progress", team: "Follow The Rabbit",
    live: "", repo: "https://github.com/vimo33/rabbit-stack",
    shot: null,
    overview: "Open-source primitives + a system layer for AI agentic workflows — skills, plugins, hooks, scripts, MCPs, memory, and personas, packaged for installation, sharing, and teaching.",
    points: [
      "Installable workflow packs (skills · plugins · hooks)",
      "MCPs, memory, and personas as first-class primitives",
      "Evidence-backed, continuously-updated methodology",
      "“So you don't have to be the human plugin.”"
    ],
    stack: ["Claude Code", "MCP", "Skills / Hooks", "Open source"]
  },
  "brain-os": {
    num: "10", art: "brain", tag: "Internal",
    role: "Founder & Engineering", year: "2026", status: "Live · Gated", team: "Follow The Rabbit",
    live: "https://brain.followtherabbit.studio", repo: "",
    shot: "assets/shots/brain-os.png",
    overview: "A research brain — semantic search over everything captured, fed by automatic capture pipelines, and queryable by agents over MCP.",
    points: [
      "Semantic search across all captured knowledge",
      "Capture pipelines: Telegram · voice · browser · YouTube",
      "MCP server so agents can query the brain",
      "pgvector substrate"
    ],
    stack: ["MCP", "pgvector", "Node.js", "Postgres"]
  },
  "live4fair": {
    num: "12", art: "live", tag: "Live",
    role: "Engineering", year: "2025", status: "Live", team: "Solo",
    live: "https://www.4fair.live", repo: "",
    shot: "assets/shots/live4fair.png",
    overview: "Live4Fair — a live platform at 4fair.live. (Summary provisional — confirm the one-liner and I'll finalize this copy.)",
    points: [],
    stack: []
  },
  "sage-ai": {
    num: "13", art: "sage", tag: "Prototype",
    role: "Engineering", year: "2025", status: "Prototype", team: "Solo",
    live: "", repo: "https://github.com/vimo33/Sage_AI",
    shot: null,
    overview: "SAGE AI — an AI assistant prototype. (Summary provisional — send me a one-liner and I'll finalize this copy.)",
    points: [],
    stack: []
  }
};

// Timeline ordered oldest → newest along the arc
window.TIMELINE = [
  { month: "OCT", title: "Early Systems & Foundations", desc: "Frameworks, tooling, and first principles." },
  { month: "DEC", title: "The Shape of Time",           desc: "A systems model for compounding impact." },
  { month: "JAN", title: "Bad Schinznach",              desc: "Strategy in action. Systems under pressure." },
  { month: "MAR", title: "Brain-OS",                    desc: "A knowledge system for clarity and leverage." },
  { month: "APR", title: "Take Me There",               desc: "Immersive experience design at scale." },
  { month: "MAY", title: "OpenAgent Protocol",          desc: "Connectivity layer for intelligent systems." },
  { month: "JUN", title: "Multiplium → Helios",         desc: "From orchestration to strategic intelligence." },
];

// AI-generated short films (rendered into the Films section + lightbox)
window.FILMS = [
  {
    title: "The Shape of Time",
    sub: "AI Short Film · Runway · Gen:48",
    type: "youtube",
    id: "jS0oPfoJ63c",
    poster: "https://img.youtube.com/vi/jS0oPfoJ63c/maxresdefault.jpg",
    desc: "A dreamlike, AI-generated short on memory and time, made for the Gen:48 AI short-film competition."
  },
  {
    title: "Ctrl + Cat + Del",
    sub: "AI Short Film",
    type: "local",
    src: "ctrl-cat-del.mp4",
    poster: "",
    desc: "An AI-generated short — directed, composited, and scored with generative tools."
  },
];
