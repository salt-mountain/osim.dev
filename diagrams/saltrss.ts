import { DEVICE, Sketch, icon } from "./sketch";

function architecture(): string {
  const s = new Sketch(
    960,
    470,
    "saltrss architecture: devices reach Caddy and FreshRSS over Tailscale; the public internet is blocked.",
  );

  s.box(500, 120, 430, 300, { fill: "host", strokeWidth: 1.8 });
  s.box(525, 20, 160, 66);
  s.box(745, 20, 160, 66);
  s.box(20, 220, 200, 86);
  s.box(525, 220, 160, 86);
  s.box(745, 220, 160, 86);
  s.box(280, 360, 160, 66);
  s.pill(360, 263, 176, 84, "net", "net");

  s.arrow(222, 263, 270, 263, { color: "net", strokeWidth: 2.2 });
  s.arrow(449, 263, 522, 263, { color: "net", strokeWidth: 2.2 });
  s.arrow(687, 263, 742, 263);
  s.arrow(605, 216, 605, 90, { dash: [3, 7] });
  s.arrow(825, 216, 825, 90, { dash: [3, 7] });
  s.line(442, 393, 497, 393, { color: "block", dash: [7, 6] });
  s.cross(470, 393);

  s.badge(20, 220, DEVICE, "ink");
  s.badge(296, 232, icon("tailscale"), "net");
  s.badge(500, 120, icon("ubuntu"), "host");
  s.badge(525, 20, icon("cloudflare"), "host");
  s.badge(745, 20, icon("rss"), "host");
  s.badge(525, 220, icon("caddy"), "ink");
  s.badge(745, 220, icon("freshrss"), "ink");

  s.text("grp", 526, 152, "VPS · Ubuntu 24.04", "start");
  s.text("t1", 605, 50, "Cloudflare DNS");
  s.text("t2", 605, 72, "+ Let's Encrypt");
  s.text("t1", 825, 50, "Websites & feeds");
  s.text("t2", 825, 72, "blogs, NASA, Ars…");
  s.text("t1", 120, 258, "My devices");
  s.text("t2", 120, 282, "iPhone · iPad · Mac · PC");
  s.text("t1", 360, 260, "Tailscale");
  s.text("t2", 360, 282, "private network");
  s.text("t1", 605, 258, "Caddy");
  s.text("t2", 605, 282, "HTTPS on Tailscale IP");
  s.text("t1", 825, 258, "FreshRSS");
  s.text("t2", 825, 282, "feeds · read state");
  s.text("t1", 360, 400, "Public internet");
  s.text("lbl-net", 249, 250, "HTTPS");
  s.text("lbl-net", 470, 250, "tunnel");
  s.text("lbl", 714, 250, "local");
  s.text("lbl", 614, 178, "certificate via", "start");
  s.text("lbl", 614, 198, "DNS challenge", "start");
  s.text("lbl", 834, 178, "fetches", "start");
  s.text("lbl", 834, 198, "hourly", "start");
  s.text("lbl-block", 525, 400, "blocked", "start");
  return s.render();
}

function beforeAfter(): string {
  const s = new Sketch(
    960,
    400,
    "Before: accounts, ads and suggested posts are ranked by the platform into an endless scroll. After: sites I picked go to FreshRSS, newest first, until I'm caught up.",
  );

  s.line(480, 20, 480, 380, { color: "muted", dash: [3, 7] });

  s.text("lbl-block", 240, 34, "Before: an algorithmic feed");
  s.box(30, 60, 200, 64);
  s.box(250, 60, 200, 64);
  s.box(90, 180, 300, 80, { fill: "block" });
  s.box(90, 304, 300, 72);
  s.arrow(130, 126, 200, 176);
  s.arrow(350, 126, 280, 176);
  s.arrow(240, 262, 240, 300);
  s.text("t1", 130, 99, "Accounts I follow");
  s.text("t1", 350, 99, "Ads & suggested posts");
  s.text("t1", 240, 214, "The platform ranks it");
  s.text("t2", 240, 240, "to keep me scrolling");
  s.text("t1", 240, 336, "Endless scroll");
  s.text("t2", 240, 360, "never finished");

  s.text("lbl-net", 720, 34, "RSS: my own, chosen feeds");
  s.box(620, 60, 200, 64);
  s.box(570, 180, 300, 80, { fill: "net" });
  s.box(570, 304, 300, 72);
  s.arrow(720, 126, 720, 176);
  s.arrow(720, 262, 720, 300);
  s.badge(620, 60, icon("rss"), "host");
  s.badge(570, 180, icon("freshrss"), "ink");
  s.text("t1", 720, 99, "Sites I picked");
  s.text("t1", 720, 214, "FreshRSS");
  s.text("t2", 720, 240, "newest first, nothing ranked");
  s.text("t1", 720, 336, "All caught up");
  s.text("t2", 720, 360, "then I'm done");
  return s.render();
}

function feedFlow(): string {
  const s = new Sketch(
    960,
    250,
    "How a feed flows: FreshRSS fetches a website's feed hourly, and NetNewsWire syncs with FreshRSS. The app never talks to the website.",
  );

  s.box(30, 60, 220, 86);
  s.box(370, 60, 220, 86, { fill: "host" });
  s.box(710, 60, 220, 86);
  s.arrow(252, 103, 366, 103);
  s.arrow(594, 103, 706, 103, { color: "net", strokeWidth: 2.2, both: true });
  s.line(820, 150, 820, 196, { color: "muted", dash: [3, 7] });
  s.line(820, 196, 140, 196, { color: "muted", dash: [3, 7] });
  s.line(140, 196, 140, 150, { color: "muted", dash: [3, 7] });
  s.cross(480, 196);

  s.badge(30, 60, icon("rss"), "host");
  s.badge(370, 60, icon("freshrss"), "ink");
  s.badge(710, 60, DEVICE, "ink");

  s.text("t1", 140, 96, "A website");
  s.text("t2", 140, 122, "publishes a feed");
  s.text("t1", 480, 96, "FreshRSS");
  s.text("t2", 480, 122, "on my server");
  s.text("t1", 820, 96, "NetNewsWire");
  s.text("t2", 820, 122, "Mac · iPhone · iPad");
  s.text("lbl", 309, 90, "fetched hourly");
  s.text("lbl-net", 650, 90, "syncs");
  s.text("lbl", 480, 230, "the app never talks to the site");
  return s.render();
}

/** Output file name to SVG markup. */
export function renderSaltrss(): Record<string, string> {
  return {
    "saltrss-architecture.svg": architecture(),
    "saltrss-before-after.svg": beforeAfter(),
    "saltrss-feed-flow.svg": feedFlow(),
  };
}
