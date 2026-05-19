# ⛵ Windjammers – Multiplayer Kartenspiel

Ein rundenbasiertes Echtzeit-Kartenspiel im Browser.  
Mehrere Spieler treten einem Raum bei, der Host startet das Spiel – dann werden Karten ausgeteilt und abwechselnd gelegt.

---

## 📁 Projektstruktur

```
windjammers/
├── backend/
│   ├── package.json
│   └── server.js        ← Node.js + Express + Socket.io
└── frontend/
    └── index.html       ← Komplettes Frontend (eine Datei)
```

---

## 🚀 Lokal starten

### 1. Backend starten

```bash
cd backend
npm install
npm start
# Server läuft auf http://localhost:3001
```

Für Entwicklung mit Auto-Reload:
```bash
npm run dev
```

### 2. Frontend öffnen

Einfach `frontend/index.html` im Browser öffnen – oder über einen lokalen Server:

```bash
# Mit Python (im frontend/-Ordner)
python3 -m http.server 8080
# → http://localhost:8080
```

### 3. Spielen

1. Browser-Tab öffnen → Name eingeben + Raumcode (z.B. **ANKER**)
2. Zweiten Tab (oder anderen Spieler) → gleichen Raumcode
3. Der erste Spieler ist automatisch **Kapitän** und sieht den "Spiel starten"-Button

---

## ☁️ Kostenlos deployen

### Backend → Render.com

1. Konto erstellen auf [render.com](https://render.com)
2. Neuen **Web Service** anlegen → GitHub-Repo verbinden
3. Einstellungen:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
4. Nach dem Deploy bekommst du eine URL wie `https://windjammers-xyz.onrender.com`

### Frontend → Netlify

1. Konto erstellen auf [netlify.com](https://netlify.com)
2. `frontend/`-Ordner per Drag & Drop auf Netlify hochladen
3. In `index.html` die `BACKEND_URL` anpassen:

```javascript
// Zeile ~183 in index.html
const BACKEND_URL = 'https://windjammers-xyz.onrender.com';
```

---

## 🎮 Socket.io Events (Übersicht)

### Client → Server
| Event | Daten | Beschreibung |
|---|---|---|
| `join-room` | `{ name, roomCode }` | Raum beitreten oder erstellen |
| `start-game` | — | Spiel starten (nur Host) |
| `play-card` | `{ cardId }` | Karte legen (wenn man dran ist) |

### Server → Client
| Event | Daten | Beschreibung |
|---|---|---|
| `joined` | `{ player, players }` | Erfolgreich beigetreten |
| `lobby-update` | `{ players }` | Spielerliste aktualisiert |
| `game-started` | `{ hand, currentPlayer, players, round }` | Spiel beginnt |
| `card-played` | `{ playerId, playerName, card, currentPlayer, roundCards }` | Karte gelegt |
| `hand-update` | `{ hand }` | Aktualisierte Hand |
| `round-complete` | `{ roundCards, round }` | Runde beendet |
| `new-round` | `{ hand, currentPlayer, players, round }` | Neue Runde |
| `game-over` | `{ message }` | Spiel beendet |
| `player-left` | `{ playerName, players }` | Spieler hat verlassen |
| `error` | `{ message }` | Fehlermeldung |

---

## 🔧 Auswertelogik einbauen

Die Rundenauswertung gehört in `backend/server.js` in diesen Bereich:

```javascript
// ~Zeile 90 in server.js
io.to(code).emit('round-complete', {
  roundCards: room.roundCards,
  round: room.round,
  // ← Hier dein Ergebnis einfügen:
  // winner: evaluateRound(room.roundCards),
  // points: calculatePoints(room.roundCards),
});
```

Und schreibe deine eigene Funktion:

```javascript
function evaluateRound(roundCards) {
  // roundCards = [{ playerId, playerName, card: { id, suit, value } }, ...]
  // Deine Windjammers-Logik hier
  return roundCards[0].playerId; // Beispiel
}
```

Das Ergebnis wird dann automatisch ans Frontend übertragen und im Runden-Modal angezeigt.

---

## 🃏 Deck anpassen

Das Standard-Deck (52 Karten) kannst du in `server.js` in der `createDeck()`-Funktion anpassen:

```javascript
function createDeck() {
  // Hier dein Windjammers-spezifisches Deck definieren
  // Beispiel für ein kleineres Deck:
  const suits  = ['⛵', '🌊', '💨', '⚓'];
  const values = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  // ...
}
```

---

## 🛠️ Tech Stack

- **Backend:** Node.js · Express · Socket.io
- **Frontend:** Vanilla HTML/CSS/JS · Socket.io Client
- **Schriften:** Cinzel + Crimson Text (Google Fonts)
- **Hosting:** Render (Backend) · Netlify (Frontend)
