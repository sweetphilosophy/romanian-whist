"use client";

import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
import { BarChart3, Check, Copy, Crown, Languages, Play, RotateCcw, Users, X } from "lucide-react";
import { io, Socket } from "socket.io-client";
import clsx from "clsx";
import type { Card, PublicGameState, PublicPlayer } from "../src/shared/types";

type Lang = "ro" | "en";
type Ack = { ok: true; roomCode: string } | { ok: false; error: string };
type TrickView = NonNullable<PublicGameState["lastCompletedTrick"]>;

const text = {
  ro: {
    title: "Whist Romanesc",
    subtitle: "Camera locala pentru 4 jucatori",
    name: "Numele tau",
    room: "Cod camera",
    create: "Creeaza camera",
    join: "Intra in camera",
    start: "Start joc",
    waiting: "Asteptam jucatorii",
    players: "Jucatori",
    round: "Runda",
    cards: "carti",
    trump: "Atu",
    noTrump: "Fara atu",
    dealer: "Dealer",
    turn: "Rand",
    bid: "Liciteaza",
    bidNow: "Alege licitatia",
    playNow: "Joaca o carte",
    trick: "Mana",
    hand: "Cartile tale",
    scoreboard: "Scor",
    history: "Istoric scor",
    nextRound: "Runda urmatoare",
    gameOver: "Joc terminat",
    copy: "Copiaza codul",
    copied: "Copiat",
    connected: "conectat",
    disconnected: "deconectat",
    host: "gazda",
    roomHelp: "Telefoanele intra pe IP-ul calculatorului, cu acest cod.",
    exact: "Exact: 5 + licitatia. Ratat: minus diferenta.",
    illegal: "Urmeaza culoarea. Daca nu ai si ai atu, trebuie sa tai.",
    needFour: "Start disponibil cand sunt exact 4 jucatori.",
    you: "tu",
    total: "Total",
    made: "Facute",
    language: "Limba",
    bonus: "Bonus",
    delta: "Puncte",
    took: "A luat mana",
    youTook: "Ai luat mana",
    waitHost: "Asteptam gazda",
    close: "Inchide",
    noCards: "Fara carti",
    score: "Scor",
    streak: "Serie"
  },
  en: {
    title: "Romanian Whist",
    subtitle: "Local room for 4 players",
    name: "Your name",
    room: "Room code",
    create: "Create room",
    join: "Join room",
    start: "Start game",
    waiting: "Waiting for players",
    players: "Players",
    round: "Round",
    cards: "cards",
    trump: "Trump",
    noTrump: "No trump",
    dealer: "Dealer",
    turn: "Turn",
    bid: "Bid",
    bidNow: "Choose bid",
    playNow: "Play a card",
    trick: "Trick",
    hand: "Your hand",
    scoreboard: "Score",
    history: "Score history",
    nextRound: "Next round",
    gameOver: "Game over",
    copy: "Copy code",
    copied: "Copied",
    connected: "connected",
    disconnected: "disconnected",
    host: "host",
    roomHelp: "Phones join using this computer's LAN IP and this code.",
    exact: "Exact: 5 + bid. Missed: minus the difference.",
    illegal: "Follow suit. If void and holding trump, you must trump.",
    needFour: "Start is available with exactly 4 players.",
    you: "you",
    total: "Total",
    made: "Won",
    language: "Language",
    bonus: "Bonus",
    delta: "Points",
    took: "Took the trick",
    youTook: "You took the trick",
    waitHost: "Waiting for host",
    close: "Close",
    noCards: "No cards",
    score: "Score",
    streak: "Streak"
  }
} satisfies Record<Lang, Record<string, string>>;

const suitNames: Record<Lang, Record<string, string>> = {
  ro: { C: "trefla", D: "romb", H: "cupa", S: "pica" },
  en: { C: "clubs", D: "diamonds", H: "hearts", S: "spades" }
};

let socketSingleton: Socket | null = null;

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [state, setState] = useState<PublicGameState | null>(null);
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState<Lang>("ro");
  const [scoreOpen, setScoreOpen] = useState(false);
  const [revealedTrick, setRevealedTrick] = useState<TrickView | null>(null);
  const t = text[lang];

  useEffect(() => {
    const storedName = window.localStorage.getItem("whist:name");
    const storedLang = window.localStorage.getItem("whist:lang") as Lang | null;
    if (storedName) setName(storedName);
    if (storedLang === "ro" || storedLang === "en") setLang(storedLang);

    if (!window.localStorage.getItem("whist:clientId")) {
      window.localStorage.setItem("whist:clientId", makeClientId());
    }

    socketSingleton = io();
    setSocket(socketSingleton);
    socketSingleton.on("connect", () => {
      const savedRoomCode = window.localStorage.getItem("whist:roomCode");
      const clientId = window.localStorage.getItem("whist:clientId");
      if (!savedRoomCode || !clientId) return;

      socketSingleton?.emit(
        "joinRoom",
        {
          roomCode: savedRoomCode,
          name: window.localStorage.getItem("whist:name") || storedName || "",
          clientId
        },
        (ack: Ack) => {
          if (!ack?.ok) {
            window.localStorage.removeItem("whist:roomCode");
            return;
          }

          setRoomCode(ack.roomCode);
        }
      );
    });
    socketSingleton.on("state", (nextState: PublicGameState | null) => {
      if (nextState) setState(nextState);
    });

    return () => {
      socketSingleton?.disconnect();
      socketSingleton = null;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem("whist:lang", lang);
  }, [lang]);

  useEffect(() => {
    if (!state?.lastCompletedTrick) return;
    setRevealedTrick(state.lastCompletedTrick);
    const timer = window.setTimeout(() => setRevealedTrick(null), 1900);
    return () => window.clearTimeout(timer);
  }, [state?.lastCompletedTrick?.id]);

  const me = useMemo(() => state?.players.find((player) => player.clientId === state.meId) ?? null, [state]);
  const currentPlayer = useMemo(
    () => state?.players.find((player) => player.clientId === state.currentTurnId) ?? null,
    [state]
  );
  const dealer = useMemo(() => state?.players.find((player) => player.clientId === state.dealerId) ?? null, [state]);
  const isHost = Boolean(me?.host);

  const send = (event: string, payload: Record<string, unknown>) => {
    if (!socket) return;
    setError("");
    const clientId = window.localStorage.getItem("whist:clientId");
    socket.emit(event, { ...payload, clientId }, (ack: Ack) => {
      if (!ack?.ok) {
        setError(ack?.error || "Something went wrong.");
        return;
      }
      setRoomCode(ack.roomCode);
      window.localStorage.setItem("whist:roomCode", ack.roomCode);
    });
  };

  const createRoom = (event: FormEvent) => {
    event.preventDefault();
    window.localStorage.setItem("whist:name", name.trim());
    send("createRoom", { name });
  };

  const joinRoom = (event: FormEvent) => {
    event.preventDefault();
    window.localStorage.setItem("whist:name", name.trim());
    send("joinRoom", { roomCode, name });
  };

  const copyCode = async () => {
    if (!state?.code) return;
    const ok = await copyText(state.code);
    setCopied(ok);
    window.setTimeout(() => setCopied(false), 1200);
  };

  if (!state) {
    return (
      <main className="entry-shell">
        <section className="entry-top">
          <div>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
          <LanguagePicker lang={lang} setLang={setLang} label={t.language} />
        </section>

        <section className="entry-grid">
          <form className="panel entry-card" onSubmit={createRoom}>
            <h2>{t.create}</h2>
            <Field label={t.name} value={name} onChange={setName} autoComplete="name" />
            <button className="primary" type="submit" disabled={!name.trim()}>
              <Play size={18} />
              {t.create}
            </button>
          </form>

          <form className="panel entry-card" onSubmit={joinRoom}>
            <h2>{t.join}</h2>
            <Field label={t.name} value={name} onChange={setName} autoComplete="name" />
            <Field label={t.room} value={roomCode} onChange={(value) => setRoomCode(value.toUpperCase())} />
            <button className="primary" type="submit" disabled={!name.trim() || roomCode.trim().length < 4}>
              <Users size={18} />
              {t.join}
            </button>
          </form>
        </section>

        {error ? <div className="toast">{error}</div> : null}
      </main>
    );
  }

  return (
    <main className="table-shell">
      <GameHeader
        state={state}
        copied={copied}
        copyCode={copyCode}
        lang={lang}
        setLang={setLang}
        openScore={() => setScoreOpen(true)}
      />

      {state.phase === "lobby" ? (
        <LobbyTable state={state} isHost={isHost} send={send} lang={lang} />
      ) : (
        <PlayTable
          state={state}
          currentPlayer={currentPlayer}
          dealer={dealer}
          revealedTrick={revealedTrick}
          isHost={isHost}
          send={send}
          lang={lang}
        />
      )}

      {scoreOpen ? <ScoreModal state={state} close={() => setScoreOpen(false)} lang={lang} /> : null}
      {error ? <div className="toast">{error}</div> : null}
    </main>
  );
}

function GameHeader({
  state,
  copied,
  copyCode,
  lang,
  setLang,
  openScore
}: {
  state: PublicGameState;
  copied: boolean;
  copyCode: () => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
  openScore: () => void;
}) {
  const t = text[lang];
  const leader = [...state.players].sort((left, right) => right.score - left.score)[0];

  return (
    <header className="game-header">
      <div className="room-pill">
        <span>{t.room}</span>
        <strong>{state.code}</strong>
        <button className="icon-button" onClick={copyCode} aria-label={t.copy} title={t.copy}>
          {copied ? <Check size={18} /> : <Copy size={18} />}
        </button>
      </div>

      <div className="hud-strip">
        <HudItem label={t.round} value={`${state.roundIndex + 1}/${state.totalRounds}`} />
        <HudItem label={t.cards} value={String(state.handSize)} />
        <TrumpBadge trump={state.trump} lang={lang} />
      </div>

      <div className="header-actions">
        <button className="score-button" onClick={openScore}>
          <BarChart3 size={18} />
          <span>{leader ? `${t.score} ${leader.score}` : t.scoreboard}</span>
        </button>
        <LanguagePicker lang={lang} setLang={setLang} label={t.language} compact />
      </div>
    </header>
  );
}

function PlayTable({
  state,
  currentPlayer,
  dealer,
  revealedTrick,
  isHost,
  send,
  lang
}: {
  state: PublicGameState;
  currentPlayer: PublicPlayer | null;
  dealer: PublicPlayer | null;
  revealedTrick: TrickView | null;
  isHost: boolean;
  send: (event: string, payload: Record<string, unknown>) => void;
  lang: Lang;
}) {
  const t = text[lang];
  const positions = tablePositions(state.players, state.meId);
  const visiblePlays = revealedTrick?.plays ?? state.currentTrick;
  const winner = revealedTrick ? state.players.find((player) => player.clientId === revealedTrick.winnerId) : null;
  const turnLabel =
    state.phase === "gameEnd"
      ? t.gameOver
      : state.phase === "roundEnd"
        ? t.nextRound
        : currentPlayer?.clientId === state.meId
          ? state.phase === "bidding"
            ? t.bidNow
            : t.playNow
          : `${t.turn}: ${currentPlayer?.name ?? "-"}`;

  return (
    <section className="table-stage">
      {positions.map(({ player, position }) => (
        <SeatCard
          key={player.clientId}
          player={player}
          position={position}
          active={state.currentTurnId === player.clientId}
          dealer={dealer?.clientId === player.clientId}
          me={player.clientId === state.meId}
          lang={lang}
        />
      ))}

      <div className="felt">
        <div className="table-status">
          <span>{turnLabel}</span>
          <strong>{state.phase === "playing" ? t.illegal : t.exact}</strong>
        </div>

        <div className={clsx("trick-zone", revealedTrick && "trick-reveal")}>
          {visiblePlays.length === 0 ? <div className="table-empty">{t.trick}</div> : null}
          {visiblePlays.map((play) => {
            const position = positions.find((item) => item.player.clientId === play.playerId)?.position ?? "bottom";
            return (
              <div className={clsx("table-card", `trick-${position}`)} key={`${play.playerId}-${play.card.id}`}>
                <img src={`/cards/${play.card.id}.svg`} alt={play.card.id} />
                <span>{state.players.find((player) => player.clientId === play.playerId)?.name}</span>
              </div>
            );
          })}
        </div>

        {revealedTrick && winner ? (
          <div className={clsx("winner-flash", winner.clientId === state.meId && "mine")}>
            <span>{winner.clientId === state.meId ? t.youTook : t.took}</span>
            <strong>{winner.name}</strong>
          </div>
        ) : null}

        {state.phase === "bidding" ? <BidDock state={state} send={send} lang={lang} /> : null}
        {state.phase === "roundEnd" || state.phase === "gameEnd" ? (
          <RoundEndDock state={state} isHost={isHost} send={send} lang={lang} />
        ) : null}
      </div>

      <HandFan state={state} send={send} lang={lang} />
    </section>
  );
}

function LobbyTable({
  state,
  isHost,
  send,
  lang
}: {
  state: PublicGameState;
  isHost: boolean;
  send: (event: string, payload: Record<string, unknown>) => void;
  lang: Lang;
}) {
  const t = text[lang];
  return (
    <section className="lobby-stage">
      <div className="lobby-panel">
        <h2>{t.waiting}</h2>
        <div className="lobby-seats">
          {Array.from({ length: 4 }, (_, index) => {
            const player = state.players[index];
            return (
              <div className="lobby-seat" key={player?.clientId ?? index}>
                <strong>{player?.name ?? "-"}</strong>
                <span>
                  {player?.host ? `${t.host} / ` : ""}
                  {player ? t.connected : t.players}
                </span>
              </div>
            );
          })}
        </div>
        <button
          className="primary"
          disabled={!isHost || state.players.length !== 4}
          onClick={() => send("startGame", { roomCode: state.code })}
        >
          <Play size={18} />
          {t.start}
        </button>
        <p>{t.needFour}</p>
      </div>
    </section>
  );
}

function SeatCard({
  player,
  position,
  active,
  dealer,
  me,
  lang
}: {
  player: PublicPlayer;
  position: "top" | "right" | "bottom" | "left";
  active: boolean;
  dealer: boolean;
  me: boolean;
  lang: Lang;
}) {
  const t = text[lang];
  return (
    <div className={clsx("seat-card", `seat-${position}`, active && "active", !player.connected && "offline")}>
      <div>
        <strong>
          {player.name} {me ? `(${t.you})` : ""}
        </strong>
        <span>
          {dealer ? `${t.dealer} / ` : ""}
          {player.host ? `${t.host} / ` : ""}
          {player.connected ? t.connected : t.disconnected}
        </span>
      </div>
      <div className="seat-stats">
        <span>{player.handCount}</span>
        <span>{player.bid ?? "-"}</span>
        <span>{player.tricks}</span>
        <strong>{player.score}</strong>
      </div>
      {player.host ? <Crown className="seat-crown" size={15} /> : null}
    </div>
  );
}

function BidDock({
  state,
  send,
  lang
}: {
  state: PublicGameState;
  send: (event: string, payload: Record<string, unknown>) => void;
  lang: Lang;
}) {
  const t = text[lang];
  const isMyTurn = state.currentTurnId === state.meId;
  return (
    <div className="bid-dock">
      <span>{isMyTurn ? t.bidNow : t.bid}</span>
      <div>
        {Array.from({ length: state.handSize + 1 }, (_, bid) => (
          <button
            key={bid}
            disabled={!isMyTurn || !state.allowedBids.includes(bid)}
            onClick={() => send("placeBid", { roomCode: state.code, bid })}
          >
            {bid}
          </button>
        ))}
      </div>
    </div>
  );
}

function RoundEndDock({
  state,
  isHost,
  send,
  lang
}: {
  state: PublicGameState;
  isHost: boolean;
  send: (event: string, payload: Record<string, unknown>) => void;
  lang: Lang;
}) {
  const t = text[lang];
  const latest = state.history.at(-1);
  return (
    <div className="round-dock">
      <strong>{state.phase === "gameEnd" ? t.gameOver : t.scoreboard}</strong>
      {latest ? (
        <div className="round-summary">
          {latest.scores.map((score) => (
            <span key={score.clientId} className={clsx(score.delta >= 0 ? "positive" : "negative")}>
              {score.name}: {score.delta > 0 ? "+" : ""}
              {score.delta}
            </span>
          ))}
        </div>
      ) : null}
      {state.phase === "roundEnd" ? (
        <button className="primary compact" disabled={!isHost} onClick={() => send("nextRound", { roomCode: state.code })}>
          <RotateCcw size={16} />
          {isHost ? t.nextRound : t.waitHost}
        </button>
      ) : null}
    </div>
  );
}

function HandFan({
  state,
  send,
  lang
}: {
  state: PublicGameState;
  send: (event: string, payload: Record<string, unknown>) => void;
  lang: Lang;
}) {
  const t = text[lang];
  const canPlay = state.phase === "playing" && state.currentTurnId === state.meId;
  const count = state.hand.length;
  const mid = (count - 1) / 2;

  return (
    <section className="hand-fan-area" aria-label={t.hand}>
      <div className="hand-label">{count ? t.hand : t.noCards}</div>
      <div className="hand-fan">
        {state.hand.map((card, index) => {
          const legal = state.legalCardIds.includes(card.id);
          const angle = Math.max(-30, Math.min(30, (index - mid) * 8));
          const x = (index - mid) * Math.min(46, 260 / Math.max(count, 1));
          const lift = canPlay && legal ? -30 : 0;
          return (
            <button
              className={clsx("fan-card", canPlay && legal && "playable")}
              disabled={!canPlay || !legal}
              key={card.id}
              style={
                {
                  "--angle": `${angle}deg`,
                  "--x": `${x}px`,
                  "--lift": `${lift}px`,
                  zIndex: index + 1
                } as CSSProperties
              }
              onClick={() => send("playCard", { roomCode: state.code, cardId: card.id })}
              aria-label={card.id}
            >
              <img src={`/cards/${card.id}.svg`} alt={card.id} />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ScoreModal({ state, close, lang }: { state: PublicGameState; close: () => void; lang: Lang }) {
  const t = text[lang];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t.history}>
      <div className="score-modal">
        <div className="modal-head">
          <h2>{t.history}</h2>
          <button className="icon-button" onClick={close} aria-label={t.close} title={t.close}>
            <X size={18} />
          </button>
        </div>

        <div className="totals-grid">
          {state.players.map((player) => (
            <div key={player.clientId} className="total-card">
              <span>{player.name}</span>
              <strong>{player.score}</strong>
              <small>
                +{player.positiveStreak} / -{player.negativeStreak} {t.streak}
              </small>
            </div>
          ))}
        </div>

        <div className="history-list">
          {state.history.length === 0 ? <p>{t.scoreboard}</p> : null}
          {state.history.map((round) => (
            <section className="history-round" key={round.round}>
              <header>
                <strong>
                  {t.round} {round.round}
                </strong>
                <span>
                  {round.handSize} {t.cards} /{" "}
                  {round.trump ? `${t.trump}: ${round.trump.rank} ${suitNames[lang][round.trump.suit]}` : t.noTrump}
                </span>
              </header>
              <div className="history-table">
                <div className="history-row labels">
                  <span>{t.players}</span>
                  <span>{t.bid}</span>
                  <span>{t.made}</span>
                  <span>{t.delta}</span>
                  <span>{t.bonus}</span>
                  <span>{t.total}</span>
                </div>
                {round.scores.map((score) => (
                  <div className="history-row" key={score.clientId}>
                    <span>{score.name}</span>
                    <span>{score.bid}</span>
                    <span>{score.tricks}</span>
                    <span className={clsx(score.baseDelta >= 0 ? "positive" : "negative")}>
                      {score.baseDelta > 0 ? "+" : ""}
                      {score.baseDelta}
                    </span>
                    <span className={clsx(score.streakBonus > 0 && "positive", score.streakBonus < 0 && "negative")}>
                      {score.streakBonus > 0 ? "+" : ""}
                      {score.streakBonus}
                    </span>
                    <strong>{score.total}</strong>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrumpBadge({ trump, lang }: { trump: Card | null; lang: Lang }) {
  const t = text[lang];
  return (
    <div className="trump-badge">
      <span>{t.trump}</span>
      {trump ? (
        <>
          <img src={`/cards/${trump.id}.svg`} alt={trump.id} />
          <strong>
            {trump.rank} {suitNames[lang][trump.suit]}
          </strong>
        </>
      ) : (
        <strong>{t.noTrump}</strong>
      )}
    </div>
  );
}

function HudItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="hud-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function LanguagePicker({
  lang,
  setLang,
  label,
  compact
}: {
  lang: Lang;
  setLang: (lang: Lang) => void;
  label: string;
  compact?: boolean;
}) {
  return (
    <label className={clsx("language", compact && "compact-language")} aria-label={label}>
      <Languages size={18} />
      <select value={lang} onChange={(event) => setLang(event.target.value as Lang)}>
        <option value="ro">RO</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  autoComplete
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function tablePositions(players: PublicPlayer[], meId: string) {
  const meIndex = Math.max(0, players.findIndex((player) => player.clientId === meId));
  const ordered = [...players.slice(meIndex), ...players.slice(0, meIndex)];
  const positions = ["bottom", "left", "top", "right"] as const;
  return ordered.map((player, index) => ({ player, position: positions[index] }));
}

function makeClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

async function copyText(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall back for LAN HTTP clients where clipboard permissions are restricted.
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textArea);
  }
}
