---
title: "Reclaiming My Feed"
date: 2026-11-06T09:00:00-07:00
description: "Why and how I self-host an RSS aggregator to get away from algorithmic feeds."
hero:
  src: "./diagrams/saltrss-hero.svg"
  alt: "Tangled feeds from a blog, news sites, release notes, a friend's site and a podcast go into FreshRSS and come out as one tidy list, newest first, until I'm all caught up."
---

## Why I left the feed

Something that I've been dealing with lately is a feeling of being unable to escape "the algorithm" that social media, news and other websites have on us. Doomscrolling has become a more prevalent problem for people (and me) to deal with. I find myself browsing from one content whirlpool to another. I decided to try to do something about it while at the same time aiming to build something in my spare time. I've been a very casual [homelabber](https://www.howtogeek.com/what-is-a-homelab-and-how-do-you-start-one/) and I've bought a couple of devices here and there to try to explore running my own services or being the steward of my own data.

So how do you build your own algorithm? Every big platform I use was built to keep me scrolling, showing me something a little angrier or a little more anxious and then selling that attention to advertisers. I'm only half joking when I say I did this for my sanity. For me, the appeal is that I only see the sources I chose, and new posts show up in the order they were published. Nothing gets ranked, boosted or slipped in because it might keep me around longer. When I've read everything, I'm done.

One possible answer, and the one I decided to go with, lies with [RSS](https://en.wikipedia.org/wiki/RSS). RSS is a simple way to follow websites that has been around since the late 1990s. A site that supports RSS publishes a feed, a small file at its own web address that lists its latest posts, each with a title, a link, a date and usually a summary or the full text. You subscribe by adding a site's feed address to an aggregator, and you don't need an account on the site. The aggregator checks each feed for new posts, stores them and remembers what you've read, and a reader app is where you read them.

![Before: accounts I follow, ads and suggested posts are ranked by the platform to keep me scrolling, without end. After: sites I picked go into FreshRSS, newest first and unranked, until I'm all caught up.](./diagrams/saltrss-before-after.svg)

I moved my reading to RSS, on a server I run myself, to get my time and attention back from algorithms.

To move my reading to RSS on a server I run myself, I had two things to choose:

- "Which aggregator would collect my feeds?"
- "Which app would I read them in?"

## Choosing the software

I looked at a few self-hosted RSS aggregators and narrowed it down to [FreshRSS](https://www.freshrss.org/) and [yarr](https://github.com/nkanaev/yarr).

|               | FreshRSS                        | yarr               |
| ------------- | ------------------------------- | ------------------ |
| Sync for apps | Google Reader API and Fever API | Fever API only     |
| Users         | Multiple                        | One                |
| Runs on       | PHP, plus a database            | A single Go binary |

I decided to go with FreshRSS as it seemed to offer more interesting integrations I could explore in the future as well as supporting more reader apps. Specifically, FreshRSS works with [NetNewsWire](https://netnewswire.com/), which is free and open source, and can run on my Mac, iPhone and iPad. With yarr I'd have been choosing from a handful of mostly paid Fever apps.

## The week PHP caught fire

Right as I was deciding, [PHP2Shell](https://en.wikipedia.org/wiki/PHP2Shell) was announced on October 20, 2026: two memory-safety bugs in PHP itself that let anyone on the internet run code on the server without logging in. PHP released emergency patches the next day, and attackers were already using the bugs before the fix landed.

FreshRSS runs on PHP, and I was about to put it on a cheap VPS that also runs other things. My first instinct was to switch to yarr, which is a single Go binary and doesn't run on PHP at all. FreshRSS shipped patched Docker images as soon as fixes were available, which is about as good a response as you can ask for, but it didn't immediately alleviate my concerns about how to configure this setup correctly. Anything sitting on the public internet will eventually have an exploitable vulnerability, and the fix that covers every future bug is to keep the internet from reaching the app at all. So I kept FreshRSS and made the server private.

## How it's built

FreshRSS runs on a small VPS that only my own devices can reach, and nothing about it is visible from the public internet.

- [Tailscale](https://tailscale.com/) connects my phone, iPad, Mac and Windows PC to the server over a private network. On my devices it only handles traffic to the server, and everything else goes out normally.
- [Caddy](https://caddyserver.com/) serves the site over HTTPS, but listens only on the server's private Tailscale address. The firewall blocks everything else.
- The certificate comes from [Let's Encrypt](https://letsencrypt.org/) through a [DNS challenge](https://letsencrypt.org/docs/challenge-types/#dns-01-challenge) on Cloudflare, so the server never has to be reachable from outside to get one. The site's name points to a private address that only my devices can use.
- FreshRSS runs in Docker, using the [LinuxServer.io](https://www.linuxserver.io/) image, and only the server itself can reach it. It fetches my feeds about once an hour by connecting out to each site. Nothing connects in.

Upkeep is automatic. A daily job pulls new images and restarts anything that changed, another writes a backup, and Ubuntu installs its own security updates. Everything that isn't a secret lives in a Git repo, so I can rebuild the whole setup from scratch.

![My devices connect over Tailscale to Caddy and FreshRSS on a VPS. The VPS gets its certificate through Cloudflare DNS and fetches feeds from websites. The public internet is blocked.](./diagrams/saltrss-architecture.svg)

## Living with it

Day to day, I read in NetNewsWire on my Mac, iPhone and iPad, and my read status follows me between devices. The reading apps never talk to the websites but instead sync with my server, and the server does the fetching.

![FreshRSS fetches a website's feed every hour, and NetNewsWire on my Mac, iPhone and iPad syncs with FreshRSS. The app never talks to the website.](./diagrams/saltrss-feed-flow.svg)

A few habits keep it calm:

- Start with what you already read. My first feeds were some of the websites that I visit on a daily basis as well as some "Top News" sections from different news websites.
- Keep busy feeds in their own folder, so a high-volume news site doesn't bury a blog that posts once a month.
- Star what you want to keep. FreshRSS deletes old articles after three months by default, but never starred ones.
- Use "mark all as read" freely. An unread count isn't an inbox, and nothing here has a deadline.
- Unsubscribe from anything you keep skipping. It's your algorithm and you can add and prune as you see fit.

The last two habits matter most. It's easy to see a number that lists "Unread" items and feel pressure to engage. A simple way to combat that is to turn the numbered badges in iOS off. The whole point of this venture is to reduce the pressure of trying to keep up with content and instead consume it at your own pace.

## What didn't work

Some of the sites I wanted to follow don't work well with RSS right now.

YouTube is a particular pain point. Every YouTube channel has a hidden RSS feed, and I wanted my various channel subscriptions in FreshRSS. When I tried, YouTube's feed addresses returned errors for every channel. This seems to be a change that's starting to affect more and more websites. The motivation for sites like YouTube to allow you to view their content without the surrounding framework they use to keep you engaged is very low. Reddit, similarly, is shutting down its RSS feeds on November 13, 2026, and closing what's left of its public API through March 2027. They cite AI scraping as the reason behind the changes but my guess is that it decreases the way that people are able to browse their content because that content is valuable but the real value is in controlling how you consume that content. Control is the underlying value. Without feeds, you have to read Reddit inside Reddit, where it decides what you see next.

Once the feeds are gone, there's no (easy) way to follow a subreddit through RSS unless you implement some manual workarounds and tie those workarounds to valid user sessions. A napkin-level idea would be a scraping job on my VPS that goes through my YouTube subscriptions and turns them into feed items. The problem with these workarounds is that they're typically fragile, and platforms are actively working against them, so I haven't tried any of them yet.

Paywalled sites like The New York Times are another gap. Most of them only offer a private feed once you pay for a subscription. For news, I've switched to sites that are free to read, like Yahoo! News, the BBC and Deutsche Welle.

## What's next

It's early days, and the setup took a couple of evenings. Next on my list:

- Copying backups off the server, so losing the VPS doesn't mean losing my history.
- Getting an alert when the daily update or backup fails.
- Exploring FreshRSS's integrations.
- Building a rough version of that YouTube scraping job.

If you run your own aggregator, or you've found a good way to follow YouTube or Reddit without the algorithm, I'd like to hear about it. Leave a comment below or reply on LinkedIn.
