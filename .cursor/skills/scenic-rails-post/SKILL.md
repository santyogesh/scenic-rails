---
name: scenic-rails-post
description: Draft one honest Reddit post about Scenic Rails (scenicrails.info) for a single named community, for the maker to post by hand. Use when the user asks for a Reddit post, subreddit post, self-promotion post, or community write-up about this app. Do not use it to post, automate posting, or write the same post for many communities.
---

# Scenic Rails post

Draft one text post the maker can paste into one community. Stop there. Do not submit it, log into Reddit, create accounts, schedule posts, or produce a list of subreddits.

If the user asks to post it, to post it in many places, or to automate posting, refuse that part and hand back the single draft.

## Before writing

1. Confirm the community. If none was named, ask for one. Write for that community only.
2. If the user pasted that community's rules, follow them. If not, do not invent the rules. End the draft with a short checklist of what they must read on the community page before posting: whether self-promotion is allowed, whether links are allowed, and which flair to use.
3. Re-read the product before claiming a feature. Use `app/about/page.tsx`, `lib/site.ts`, `lib/countries.ts`, `lib/seo.ts`, and the matching entries in `data/routes.ts`. If a claim is not in those files, leave it out.

## What is true

Scenic Rails (https://scenicrails.info) is a site for looking out of the train window. It is not an official railway, and it does not sell tickets.

- Pick a country, then a train number (12951 in India, ICE 371 in Germany) or a list of stations. The map draws the route on the rail track and lists landmarks, rivers, mountains, forts, and towns within a few kilometres, on the left or the right.
- If the train is running, the map can follow its position. In India the position may be estimated from the timetable when live data is missing, and the map says so. Outside India, times come from Transitous (open GTFS). If a train is not found there, OpenStreetMap supplies the route and stops without times.
- Track geometry and many landmarks come from OpenStreetMap. Descriptions and photos come from Wikipedia and Wikimedia Commons. Timings, positions, and landmark details can be wrong. Say that travellers should check the official railway.
- Written guides live at `/routes`. Current regions include India, Switzerland, the United Kingdom, and Norway (Konkan, Kalka–Shimla, Darjeeling, Nilgiri, Kangra Valley, Visakhapatnam–Araku, Glacier Express, Bernina Express, West Highland Line, Bergen Line, Flåm). Mention a guide only if it is still in `data/routes.ts` and it fits the community.
- Guide pages show Google AdSense. The map itself does not. Mention ads only if someone would reasonably want to know.
- Countries the picker supports are the entries in `lib/countries.ts`. Do not claim worldwide coverage beyond what that file and the about page say.

## How to write it

Write as the maker, in the first sentence or the second. Never as a passenger who stumbled on the site, and never as a review.

Lead with something useful to that community: a train they ride, a side-of-the-window question, or one limitation of paper timetables and window seats. Put the link once, after that, as a normal URL. Do not ask for upvotes, comments, shares, or follows.

Match the community. An Indian rail community gets an Indian train and, if it fits, an Indian guide. A Scottish community gets the West Highland Line, not the Konkan Railway. If the community's country is not in `lib/countries.ts`, say the live lookup does not cover it and write about a guide or the general window map only if that is still useful. Otherwise say a post there would be off-topic and stop.

Length: about 150 to 350 words. Title states what the site does. No clickbait, no "game-changer", no "you won't believe", no countdown, no fake scarcity.

Say one real limitation in the post itself. Pick the one that matters for that community, for example estimated positions, missing times on the OpenStreetMap fallback, approximate track when no rail geometry matched, or data that can be out of date.

## Output

```markdown
**Community:** r/example

**Title:** ...

**Post:**
...

**Before you post:**
- Read the community rules for self-promotion and links.
- Use the flair they require.
- Post it yourself, once, in this community.
```

Do not add a second post, a crosspost, or alternate titles unless the user asks for a rewrite of this one.
