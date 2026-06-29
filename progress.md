# Progress

Last updated: 2026-06-29

This file is a compact project status note. Agent instructions now live in `.codex/skills/romanian-whist/`, with reusable skills under `.agents/skills/`.

## Current State

Romanian Whist is a working local-network app for exactly four players. `server.ts` runs Next.js and Socket.IO together on port `3000` by default, card SVGs are served from `/cards`, and the game state is authoritative in `src/server/game.ts`.

The client in `app/page.tsx` supports room creation, joining by code, local-storage reconnects, bilingual Romanian/English UI, a polished table-style play surface, bidding, card play, trick feedback, round history, and scoring views.

## Implemented

- Four-player lobby, host-only start, and host-only next round.
- Round sequence: `1, 1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 8, 8, 8, 7, 6, 5, 4, 3, 2, 1, 1, 1, 1`.
- No trump on hand sizes `1` and `8`; trump on other hand sizes.
- Server-side validation for bidding order, last-bidder restriction, turn order, follow suit, trump enforcement, and trick winner calculation.
- Round scoring with exact-bid bonus, missed-bid penalties, running totals, and streak tracking for hand sizes `2` through `7`.
- Responsive table UI for desktop, mobile portrait, and short landscape screens, with labeled seat stats, phase context, card motion feedback, and a card-based create/join screen.
- Four-seat card-table presentation with opponent card-back fans around the felt, a raised local hand fan, clearer score/bid docks, and mobile-first spacing tuned from full-game screenshots.
- Trick collection animation now sends played cards toward the player who won the trick, and round/game score updates render in the empty hand area with a compact per-player score panel.
- Windows launcher that installs dependencies when needed and prints LAN IP addresses.

## Known Limitations

- Rooms are in memory only and are lost on server restart.
- No persistent database, accounts, saved history, or spectator mode.
- No automated tests yet for rules, Socket.IO events, or UI behavior.
- No automatic room cleanup, leave-room flow, seat replacement, host transfer, or restart/new-game action.
- Socket.IO CORS is open for local-network convenience.
- LAN play still depends on firewall and network reachability.

## Suggested Next Work

- Add focused rule tests for bidding, legal cards, trick winners, scoring, and round transitions.
- Add stale-room cleanup for abandoned lobbies or games.
- Add room management for disconnects, host transfer, and post-game restart.
- Consider extracting larger UI sections from `app/page.tsx` once behavior stabilizes.

## Recent QA

- 2026-06-29: Automated four independent browser seats through a full 24-round game after the table UI pass. Result: 96 bids, 376 card plays, 23 round advances, no browser console/page errors, and no blocked card-click fallbacks.
- 2026-06-29: Re-ran the four-seat full-game flow after score/collection animation changes and captured a targeted trick animation screenshot. Result: full game completed, no browser console/page errors, and trick cards visibly collect toward the winning seat.
