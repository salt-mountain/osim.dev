---
title: "Reclaiming My Feed"
date: 2026-11-02
description: "Why and how I self-host an RSS reader to get away from algorithmic feeds."
---

## Why I left the feed

I set up my own RSS reader to get my time and attention back from algorithms. Every big platform I used was built to keep me scrolling: show me a little more, a little angrier, a little more anxious, then sell that attention to advertisers. I'm only half joking when I say I did this for my sanity.

RSS is the opposite deal. I pick the sources. New posts show up in the order they were published. Nothing gets ranked, boosted or slipped in because it might keep me around longer. When I've read everything, I'm done.

![Before: accounts I follow, ads and suggested posts are ranked by the platform to keep me scrolling, without end. After: sites I picked go into FreshRSS, newest first and unranked, until I'm all caught up.](./diagrams/saltrss-before-after.svg)

This post covers why I chose the software I did, how I set it up so it isn't exposed to the internet, and the parts that didn't work.

## Choosing the software

I picked FreshRSS over yarr, mainly because more apps can sync with it. Both are good self-hosted feed readers, but they differ in two ways that mattered to me.

|               | FreshRSS                        | yarr               |
| ------------- | ------------------------------- | ------------------ |
| License       | AGPL-3.0 (copyleft)             | MIT (permissive)   |
| Sync for apps | Google Reader API and Fever API | Fever API only     |
| Users         | Multiple                        | One                |
| Runs on       | PHP, plus a database            | A single Go binary |

The license question came first, because I wanted a repo of my own for my setup. A repo that only holds my deployment config, with no FreshRSS code in it, is mine to license however I like. If I ever patch FreshRSS itself and let other people use that version, AGPL says I have to share those changes. That's a fair trade.

Apps settled it. With FreshRSS I can use NetNewsWire, which is free and open source, on my Mac, iPhone and iPad. yarr would have limited me to a handful of mostly paid Fever apps.

## The week PHP caught fire

Right as I was deciding, PHP2Shell went public: two memory-safety bugs in PHP itself that let anyone on the internet run code on the server, without logging in. They were patched on October 21, 2026, and attackers were already using them before the fix landed.

FreshRSS runs on PHP, and I was about to put it on a cheap VPS that also runs other things. My first instinct was to switch to yarr, which is written in Go and can't have this kind of bug.

What I took from it instead: the problem wasn't PHP. It was exposure. FreshRSS shipped patched Docker images the same day, which is about as good a response as you can ask for. But anything sitting on the public internet will eventually have a bad bug. The fix that covers every future bug is not letting the internet reach the app at all.

So I kept FreshRSS and made the server private.

## How it's built

My reader lives on a small VPS, and only my own devices can reach it. Nothing about it is visible from the public internet.

- **Tailscale** connects my phone, iPad, Mac and Windows PC to the server over a private network. On my devices it only handles traffic to the server; everything else goes out normally.
- **Caddy** serves the site over HTTPS, but listens only on the server's private Tailscale address. The firewall blocks everything else.
- **The certificate** comes from Let's Encrypt using a DNS challenge through Cloudflare, so the server never has to be reachable from outside to get one. The site's name points to a private address that only my devices can use.
- **FreshRSS** runs in Docker, using the LinuxServer.io image, and is reachable only from the server itself. It fetches my feeds about once an hour, going out to the sites, never the other way round.
- **Upkeep is automatic.** A daily job pulls new images and restarts anything that changed, and another writes a backup. Ubuntu installs its own security updates.

Everything that isn't a secret lives in a Git repo, so I can rebuild it from scratch.

![My devices connect over Tailscale to Caddy and FreshRSS on a VPS. The VPS gets its certificate through Cloudflare DNS and fetches feeds from websites. The public internet is blocked.](./diagrams/saltrss-architecture.svg)

My devices reach FreshRSS only through Tailscale and Caddy; the server reaches out for certificates and feeds, and nothing from the public internet gets in.

## Living with it

Day to day, I read in NetNewsWire on my Mac, iPhone and iPad, and my read status follows me between them. The apps never talk to the websites. They sync with my server, and the server does the fetching.

![FreshRSS fetches a website's feed every hour, and NetNewsWire on my Mac, iPhone and iPad syncs with FreshRSS. The app never talks to the website.](./diagrams/saltrss-feed-flow.svg)

A few habits that keep it calm:

- **Start with what you depend on.** My first feeds were release notes and security notices for the software I run. If I'd been following PHP's news feed, PHP2Shell would have shown up in my reader the day it was announced.
- **Keep busy feeds in their own folder,** so a high-volume news site doesn't bury a blog that posts once a month.
- **Star what you want to keep.** FreshRSS deletes old articles after three months by default, but never starred ones.
- **Use "mark all as read" freely.** An unread count isn't an inbox, and nothing here has a deadline.
- **Unsubscribe from anything you keep skipping.** That's my algorithm now, and I run it.

For feeds that only publish a summary, FreshRSS can fetch the full article from the site itself. You point it at the part of the page that holds the text.

## What didn't work

The internet is closing exactly the doors this approach relies on.

**YouTube.** Every channel has a hidden RSS feed, and I wanted my subscriptions in my reader. When I tried, YouTube's feed addresses returned errors for every channel, YouTube's own official channel included, from my server and from my home connection alike. Other feed readers have reported the same problem, on and off, since late 2025. YouTube hasn't said whether it's temporary. For now I bookmark YouTube's Subscriptions page instead of its home page, and turned off watch history, which empties the recommendations on Home.

**Reddit.** Reddit is shutting down its RSS feeds on November 13, 2026, and closing its remaining public API through March 2027. It says scraping is the reason. There's no replacement for following a subreddit in a reader.

There are workarounds, like tools that scrape YouTube's channel pages, or reading Reddit with your own logged-in session. They're fragile, and the platforms are actively working against them. I'm not running any of them yet.

## What's next

It's early days, and the setup took a couple of evenings. Next on my list:

- Copying backups off the server, so losing the VPS doesn't mean losing my history.
- Getting an alert when the daily update or backup fails.
- Checking whether YouTube's feeds come back before I build anything around them.

If you run your own reader, or you've found a good way to follow YouTube or Reddit without the algorithm, I'd like to hear about it. Leave a comment below, or reply on LinkedIn.
