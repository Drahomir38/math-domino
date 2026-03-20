# 🎲 Math Match Domino – Návod na nasazení

## Lokální spuštění (pro testování)

### Požadavky
- Node.js 18+ (https://nodejs.org)

### Kroky

```bash
# 1. Otevři složku math-domino v terminálu

# 2. Nainstaluj závislosti serveru
cd server
npm install
cd ..

# 3. Nainstaluj závislosti klienta
cd client
npm install
cd ..

# 4. Spusť server (v jednom terminálu)
cd server
node index.js
# Server běží na http://localhost:3001

# 5. Spusť klienta (v druhém terminálu)
cd client
npm start
# Aplikace se otevře na http://localhost:3000
```

Hráči na stejné WiFi sítí se mohou připojit přes IP adresu počítače, např. `http://192.168.1.x:3000`

---

## Nasazení online – Railway.app (ZDARMA)

Railway.app nabízí bezplatný hosting. Hra bude přístupná přes URL celému světu.

### Kroky

1. **Vytvoř účet** na https://railway.app (přihlásit se lze přes GitHub)

2. **Nahraj kód na GitHub:**
   - Vytvoř nový repozitář na github.com
   - Vlož tam celou složku `math-domino`

3. **Nasaď na Railway:**
   - Klikni na "New Project" → "Deploy from GitHub repo"
   - Vyber svůj repozitář
   - Railway automaticky detekuje Node.js a nasadí aplikaci

4. **Nastav proměnné prostředí** (v Railway dashboardu):
   - `NODE_ENV` = `production`
   - `PORT` = `3000` (Railway to nastavuje automaticky)

5. **Hotovo!** Railway ti dá URL ve formátu `https://xxx.railway.app`

   Tuto URL sdílej s hráči – jednoduše ji zadají do prohlížeče.

---

## Nasazení online – Render.com (ZDARMA)

Alternativa k Railway:

1. Registrace na https://render.com
2. "New" → "Web Service"
3. Připoj GitHub repozitář
4. Nastavení:
   - **Build Command:** `npm run postinstall`
   - **Start Command:** `npm start`
5. Klikni "Create Web Service"

---

## Jak hrát

1. Všichni hráči otevřou stejnou URL
2. Zadají své jméno a **stejný kód místnosti** (např. `SKOLA1`)
3. Hostitel (první hráč) nastaví:
   - Jaká znaménka se budou používat (+, -, ×, ÷)
   - Obtížnost (Lehká: příklad=číslo / Těžká: příklad=příklad)
4. Hostitel klikne **Spustit hru!**
5. Každý hráč dostane 10 kostiček
6. Na tahu vybereš kostičku, pak klikneš kam ji chceš umístit
7. Kdo první vyloží všechny kostičky, vyhrává! 🏆

---

## Struktura projektu

```
math-domino/
├── server/
│   ├── index.js        # Socket.io server, správa místností
│   └── gameLogic.js    # Generování kostiček, herní pravidla
├── client/
│   ├── public/
│   └── src/
│       ├── App.js              # Hlavní komponenta
│       ├── socket.js           # Socket.io připojení
│       └── components/
│           ├── LobbyScreen.js  # Přihlášení a nastavení
│           ├── GameScreen.js   # Herní plocha
│           ├── DominoTile.js   # Kostička
│           └── GameOverScreen.js  # Konec hry
└── package.json        # Kořenový package.json pro deployment
```
