"use client";

import { CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Check, Copy, Crown, Languages, Play, RotateCcw, Users, X } from "lucide-react";
import { io, Socket } from "socket.io-client";
import clsx from "clsx";
import type { Card, PublicGameState, PublicPlayer } from "../src/shared/types";

type Lang = "ro" | "en";
type Ack = { ok: true; roomCode: string } | { ok: false; error: string };
type TrickView = NonNullable<PublicGameState["lastCompletedTrick"]>;
type TablePosition = "top" | "right" | "bottom" | "left";

const text = {
  ro: {
    title: "Whist Romanesc",
    subtitle: "Camera locala pentru 4 jucatori",
    entryKicker: "Masa de sufragerie, reguli pe server",
    entrySignal: "4 locuri / Wi-Fi local",
    createHint: "Deschide masa si trimite codul camerei.",
    joinHint: "Intra cu numele tau si codul primit.",
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
    phase: "Faza",
    phaseLobby: "Lobby",
    phaseBidding: "Licitatia",
    phasePlaying: "Joc",
    phaseRoundEnd: "Scor",
    phaseGameEnd: "Final",
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
    streak: "Serie",
    cardsShort: "Carti",
    bidShort: "Lic",
    wonShort: "Luat",
    scoreShort: "Scor",
    waitingTurn: "Urmareste masa"
  },
  en: {
    title: "Romanian Whist",
    subtitle: "Local room for 4 players",
    entryKicker: "Living-room table, server-held rules",
    entrySignal: "4 seats / local Wi-Fi",
    createHint: "Open the table and share the room code.",
    joinHint: "Enter your name and the code you were given.",
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
    phase: "Phase",
    phaseLobby: "Lobby",
    phaseBidding: "Bidding",
    phasePlaying: "Playing",
    phaseRoundEnd: "Score",
    phaseGameEnd: "Final",
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
    streak: "Streak",
    cardsShort: "Cards",
    bidShort: "Bid",
    wonShort: "Won",
    scoreShort: "Score",
    waitingTurn: "Watch the table"
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
  const lastCelebratedRoundRef = useRef<number | null>(null);
  const t = text[lang];

  useEffect(() => {
    const storedName = window.localStorage.getItem(storageKey("name"));
    const storedLang = window.localStorage.getItem(storageKey("lang")) as Lang | null;
    const soloSeat = soloSeatLabel();
    if (storedName) {
      setName(storedName);
    } else if (soloSeat) {
      const testName = `Seat ${soloSeat}`;
      setName(testName);
      window.localStorage.setItem(storageKey("name"), testName);
    }
    if (storedLang === "ro" || storedLang === "en") setLang(storedLang);

    if (!window.localStorage.getItem(storageKey("clientId"))) {
      window.localStorage.setItem(storageKey("clientId"), makeClientId());
    }

    socketSingleton = io();
    setSocket(socketSingleton);
    socketSingleton.on("connect", () => {
      const savedRoomCode = window.localStorage.getItem(storageKey("roomCode"));
      const clientId = window.localStorage.getItem(storageKey("clientId"));
      if (!savedRoomCode || !clientId) return;

      socketSingleton?.emit(
        "reconnectRoom",
        {
          roomCode: savedRoomCode,
          name: window.localStorage.getItem(storageKey("name")) || storedName || "",
          clientId
        },
        (ack: Ack) => {
          if (!ack?.ok) {
            window.localStorage.removeItem(storageKey("roomCode"));
            setRoomCode("");
            return;
          }

          setRoomCode(ack.roomCode);
        }
      );
    });
    socketSingleton.on("state", (nextState: PublicGameState | null) => {
      if (nextState) {
        setState(nextState);
        return;
      }

      setState(null);
      setRoomCode("");
      window.localStorage.removeItem(storageKey("roomCode"));
    });

    return () => {
      socketSingleton?.disconnect();
      socketSingleton = null;
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey("lang"), lang);
  }, [lang]);

  useEffect(() => {
    if (!state?.lastCompletedTrick) return;
    setRevealedTrick(state.lastCompletedTrick);
    haptic(state.lastCompletedTrick.winnerId === state.meId ? [18, 34, 26] : 10);
    const timer = window.setTimeout(() => setRevealedTrick(null), 1900);
    return () => window.clearTimeout(timer);
  }, [state?.lastCompletedTrick?.id, state?.meId]);

  useEffect(() => {
    const latest = state?.history.at(-1);
    if (!latest || (state?.phase !== "roundEnd" && state?.phase !== "gameEnd")) return;
    if (lastCelebratedRoundRef.current === latest.round) return;
    lastCelebratedRoundRef.current = latest.round;

    const myScore = latest.scores.find((score) => score.clientId === state.meId);
    if (!myScore) return;
    haptic(myScore.streakBonus !== 0 ? [18, 28, 18, 28, 30] : myScore.delta > 0 ? [14, 36, 20] : 18);
  }, [state?.history, state?.meId, state?.phase]);

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
    haptic(event === "playCard" ? 8 : event === "placeBid" ? 6 : 4);
    const clientId = window.localStorage.getItem(storageKey("clientId"));
    socket.emit(event, { ...payload, clientId }, (ack: Ack) => {
      if (!ack?.ok) {
        haptic([28, 24, 28]);
        setError(ack?.error || "Something went wrong.");
        return;
      }
      setRoomCode(ack.roomCode);
      window.localStorage.setItem(storageKey("roomCode"), ack.roomCode);
    });
  };

  const createRoom = (event: FormEvent) => {
    event.preventDefault();
    window.localStorage.setItem(storageKey("name"), name.trim());
    send("createRoom", { name });
  };

  const joinRoom = (event: FormEvent) => {
    event.preventDefault();
    window.localStorage.setItem(storageKey("name"), name.trim());
    send("joinRoom", { roomCode, name });
  };

  const copyCode = async () => {
    if (!state?.code) return;
    const ok = await copyText(state.code);
    setCopied(ok);
    if (ok) haptic(10);
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
          <div className="entry-showcase" aria-hidden="true">
            <div className="entry-card-stack">
              <img src="/cards/AH.svg" alt="" />
              <img src="/cards/10S.svg" alt="" />
              <img src="/cards/QD.svg" alt="" />
            </div>
            <div className="entry-signal">
              <span>{t.entryKicker}</span>
              <strong>{t.entrySignal}</strong>
            </div>
          </div>

          <form className="panel entry-card" onSubmit={createRoom}>
            <h2>{t.create}</h2>
            <p>{t.createHint}</p>
            <Field label={t.name} value={name} onChange={setName} autoComplete="name" />
            <button className="primary" type="submit" disabled={!name.trim()}>
              <Play size={18} />
              {t.create}
            </button>
          </form>

          <form className="panel entry-card" onSubmit={joinRoom}>
            <h2>{t.join}</h2>
            <p>{t.joinHint}</p>
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
        <HudItem label={t.phase} value={phaseLabel(state.phase, lang)} />
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
  const winnerPosition = winner
    ? positions.find((item) => item.player.clientId === winner.clientId)?.position ?? "bottom"
    : "bottom";
  const isScorePhase = state.phase === "roundEnd" || state.phase === "gameEnd";
  const tableCue =
    state.phase === "playing"
      ? currentPlayer?.clientId === state.meId
        ? t.illegal
        : t.waitingTurn
      : state.phase === "bidding"
        ? currentPlayer?.clientId === state.meId
          ? t.exact
          : t.waitingTurn
        : state.phase === "roundEnd"
          ? t.scoreboard
          : state.phase === "gameEnd"
            ? t.gameOver
            : t.waiting;
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
    <section className={clsx("table-stage", isScorePhase && "score-stage")}>
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

      <div className={clsx("felt", isScorePhase && "score-phase")}>
        {positions.map(({ player, position }) =>
          player.clientId === state.meId ? null : (
            <TableHandFan
              key={`${player.clientId}-fan`}
              player={player}
              position={position}
              dealing={state.phase === "bidding" && player.handCount > 0}
            />
          )
        )}

        <div className="table-status">
          <span>{turnLabel}</span>
          <strong>{tableCue}</strong>
        </div>

        <div className={clsx("trick-zone", revealedTrick && "trick-reveal")}>
          {visiblePlays.length === 0 ? <div className="table-empty">{t.trick}</div> : null}
          {visiblePlays.map((play) => {
            const position = positions.find((item) => item.player.clientId === play.playerId)?.position ?? "bottom";
            const fly = flyFromPosition(position);
            const collect = collectionVector(position, winnerPosition);
            return (
              <div
                className={clsx(
                  "table-card",
                  `trick-${position}`,
                  revealedTrick && `collect-${winnerPosition}`
                )}
                key={`${play.playerId}-${play.card.id}`}
                style={
                  {
                    "--fly-x": fly.x,
                    "--fly-y": fly.y,
                    "--fly-rot": fly.rotate,
                    "--collect-x": collect.x,
                    "--collect-y": collect.y,
                    "--collect-rot": collect.rotate
                  } as CSSProperties
                }
              >
                <div className="table-card-inner">
                  <img src={`/cards/${play.card.id}.svg`} alt={play.card.id} />
                  <span>{state.players.find((player) => player.clientId === play.playerId)?.name}</span>
                </div>
              </div>
            );
          })}
        </div>

        <TableParticles active={Boolean(revealedTrick)} mine={winner?.clientId === state.meId} />

        {revealedTrick && winner ? (
          <div className={clsx("winner-flash", winner.clientId === state.meId && "mine")}>
            <span>{winner.clientId === state.meId ? t.youTook : t.took}</span>
            <strong>{winner.name}</strong>
          </div>
        ) : null}

        {state.phase === "bidding" ? <BidDock state={state} send={send} lang={lang} /> : null}
      </div>

      {isScorePhase ? (
        <RoundEndDock state={state} isHost={isHost} send={send} lang={lang} />
      ) : (
        <HandFan state={state} send={send} lang={lang} />
      )}
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
        <p>{t.roomHelp}</p>
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
      <div className="seat-stats" aria-label={`${player.name} ${t.scoreboard}`}>
        <span data-label={t.cardsShort} title={t.cardsShort}>
          {player.handCount}
        </span>
        <span data-label={t.bidShort} title={t.bidShort}>
          {player.bid ?? "-"}
        </span>
        <span data-label={t.wonShort} title={t.wonShort}>
          {player.tricks}
        </span>
        <strong data-label={t.scoreShort} title={t.scoreShort}>
          {player.score}
        </strong>
      </div>
      {player.host ? <Crown className="seat-crown" size={15} /> : null}
    </div>
  );
}

function TableHandFan({
  player,
  position,
  dealing
}: {
  player: PublicPlayer;
  position: "top" | "right" | "bottom" | "left";
  dealing: boolean;
}) {
  const backCount = Math.min(player.handCount, 8);
  const backMid = (backCount - 1) / 2;
  if (backCount === 0) return null;

  return (
    <div className={clsx("table-hand-fan", `table-hand-${position}`, dealing && "dealing")} aria-hidden="true">
      {Array.from({ length: backCount }, (_, index) => (
        <img
          key={index}
          src="/cards/BLUE_BACK.svg"
          alt=""
          style={
            {
              "--fan-index": index,
              "--fan-mid": backMid,
              "--deal-delay": `${index * 34}ms`
            } as CSSProperties
          }
        />
      ))}
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
      <span>
        <strong>{isMyTurn ? t.bidNow : t.bid}</strong>
        <small>{t.exact}</small>
      </span>
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
  const celebratoryScores = latest?.scores.filter((score) => score.delta > 0 || score.streakBonus !== 0).slice(0, 4) ?? [];
  return (
    <div className={clsx("round-dock", state.phase === "gameEnd" && "game-over-dock", celebratoryScores.length > 0 && "score-celebrate")}>
      <header className="round-dock-head">
        <span>{latest ? `${t.round} ${latest.round}` : t.scoreboard}</span>
        <strong>{state.phase === "gameEnd" ? t.gameOver : t.scoreboard}</strong>
      </header>
      {latest ? (
        <div className="scoreline-grid">
          {latest.scores.map((score) => (
            <div key={score.clientId} className={clsx("scoreline", score.delta >= 0 ? "positive-scoreline" : "negative-scoreline")}>
              <span>{score.name}</span>
              <strong>
                {score.delta > 0 ? "+" : ""}
                {score.delta}
              </strong>
              <small>
                {t.total} {score.total}
              </small>
            </div>
          ))}
        </div>
      ) : null}
      {celebratoryScores.length > 0 ? (
        <div className="score-burst" aria-hidden="true">
          {celebratoryScores.map((score) => (
            <span key={score.clientId} className={clsx(score.streakBonus !== 0 && "streak-pop")}>
              {score.name} +{score.delta}
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
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const count = state.hand.length;
  const mid = (count - 1) / 2;

  useEffect(() => {
    if (selectedCardId && !state.hand.some((card) => card.id === selectedCardId)) {
      setSelectedCardId(null);
    }
  }, [selectedCardId, state.hand]);

  return (
    <section className="hand-fan-area" aria-label={t.hand}>
      <div className="hand-label">{count ? t.hand : t.noCards}</div>
      <div className="hand-fan">
        {state.hand.map((card, index) => {
          const legal = state.legalCardIds.includes(card.id);
          const angle = Math.max(-30, Math.min(30, (index - mid) * 8));
          const lift = canPlay && legal ? -30 : 0;
          return (
            <button
              className={clsx("fan-card", canPlay && legal && "playable", selectedCardId === card.id && "selected")}
              disabled={!canPlay || !legal}
              key={card.id}
              style={
                {
                  "--angle": `${angle}deg`,
                  "--fan-index": index,
                  "--fan-mid": mid,
                  "--lift": `${lift}px`,
                  "--deal-delay": `${index * 42}ms`,
                  zIndex: canPlay && legal ? 100 + index : index + 1
                } as CSSProperties
              }
              onPointerDown={() => setSelectedCardId(card.id)}
              onFocus={() => setSelectedCardId(card.id)}
              onBlur={() => setSelectedCardId(null)}
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

function TableParticles({ active, mine }: { active: boolean; mine: boolean }) {
  if (!active) return null;

  return (
    <div className={clsx("table-particles", mine && "mine")} aria-hidden="true">
      {Array.from({ length: 16 }, (_, index) => (
        <span
          key={index}
          style={
            {
              "--particle-angle": `${index * 22.5}deg`,
              "--particle-distance": `${42 + (index % 4) * 12}px`,
              "--particle-delay": `${(index % 5) * 32}ms`
            } as CSSProperties
          }
        />
      ))}
    </div>
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

function phaseLabel(phase: PublicGameState["phase"], lang: Lang) {
  const t = text[lang];
  switch (phase) {
    case "lobby":
      return t.phaseLobby;
    case "bidding":
      return t.phaseBidding;
    case "playing":
      return t.phasePlaying;
    case "roundEnd":
      return t.phaseRoundEnd;
    case "gameEnd":
      return t.phaseGameEnd;
  }
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

function storageKey(key: "name" | "lang" | "clientId" | "roomCode") {
  if (typeof window === "undefined") return `whist:${key}`;

  const seat = soloSeatLabel();
  return seat ? `whist:seat:${seat}:${key}` : `whist:${key}`;
}

function soloSeatLabel() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const seat = params.get("seat") || params.get("Seat") || params.get("player") || params.get("Player") || "";
  return seat.trim().slice(0, 12);
}

function flyFromPosition(position: TablePosition) {
  switch (position) {
    case "top":
      return { x: "0px", y: "-112px", rotate: "8deg" };
    case "right":
      return { x: "132px", y: "4px", rotate: "12deg" };
    case "left":
      return { x: "-132px", y: "4px", rotate: "-12deg" };
    case "bottom":
    default:
      return { x: "0px", y: "150px", rotate: "-8deg" };
  }
}

function collectionVector(from: TablePosition, to: TablePosition) {
  const start = tableMotionPoint(from, "card");
  const end = tableMotionPoint(to, "winner");
  const rotate = to === "left" ? "-16deg" : to === "right" ? "16deg" : to === "top" ? "8deg" : "-8deg";
  return {
    x: `${end.x - start.x}px`,
    y: `${end.y - start.y}px`,
    rotate
  };
}

function tableMotionPoint(position: TablePosition, kind: "card" | "winner") {
  const distance = kind === "winner" ? 178 : 92;
  switch (position) {
    case "top":
      return { x: 0, y: -distance };
    case "right":
      return { x: distance, y: 0 };
    case "left":
      return { x: -distance, y: 0 };
    case "bottom":
    default:
      return { x: 0, y: distance };
  }
}

function haptic(pattern: number | number[]) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  navigator.vibrate(pattern);
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
