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

// `tag` renders as a small status pill on each row. `href` "#" = no public page yet
// (detail pages with screenshots/video come later). NOTE: SAGE AI + Live4Fair copy is
// provisional — their repos had no README / no public detail to source from.
window.PROJECTS = [
  {
    n: "01",
    title: "LED Control App",
    sub: "LED Rental Control · iOS",
    href: "#",
    art: "led",
    tag: "iOS App"
  },
  {
    n: "02",
    title: "Inventory OS",
    sub: "Inventory & Creative Ops",
    href: "#",
    art: "inventory",
    tag: "Internal"
  },
  {
    n: "03",
    title: "InterMesh",
    sub: "Agent-Mediated Human Matching",
    href: "https://intermesh.network",
    art: "mesh",
    tag: "Live"
  },
  {
    n: "04",
    title: "Multiplium",
    sub: "Investment Intelligence",
    href: "https://vimo33.github.io/multiplium-research-lab/overview/",
    art: "vine",
    tag: "Live"
  },
  {
    n: "05",
    title: "WollyShare",
    sub: "Community Sharing Platform",
    href: "#",
    art: "share",
    tag: "Web App"
  },
  {
    n: "06",
    title: "Follow the Rabbit OS",
    sub: "Studio Operating System",
    href: "#",
    art: "ftros",
    tag: "Internal"
  },
  {
    n: "07",
    title: "AI Business Specialist",
    sub: "Curriculum · ict-bbag.ch",
    href: "https://www.ict-bbag.ch/",
    art: "teach",
    tag: "Teaching"
  },
  {
    n: "08",
    title: "Tourism Risk Monitor",
    sub: "Global Tourism Signal Desk",
    href: "https://vimo33.github.io/Tourism-Risk-Monitor/",
    art: "risk",
    tag: "Live"
  },
  {
    n: "09",
    title: "Rabbit Stack",
    sub: "Agentic Workflow Stack",
    href: "#",
    art: "stack",
    tag: "Open Source"
  },
  {
    n: "10",
    title: "Brain-OS",
    sub: "AI Knowledge System",
    href: "#",
    art: "brain",
    tag: "Internal"
  },
  {
    n: "11",
    title: "Take Me There",
    sub: "Immersive Installation",
    href: "work/take-me-there.html",
    art: "portal",
    tag: "Case Study"
  },
  {
    n: "12",
    title: "Live4Fair",
    sub: "Live Platform",
    href: "https://www.4fair.live",
    art: "live",
    tag: "Live"
  },
  {
    n: "13",
    title: "SAGE AI",
    sub: "AI Assistant",
    href: "#",
    art: "sage",
    tag: "Prototype"
  },
];

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
