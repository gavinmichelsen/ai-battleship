<div align="center">

# Naval Command: Battleship

### A modern browser-based Battleship game built entirely with AI

<br>

[![Built With AI](https://img.shields.io/badge/Built%20With-AI%20Pair%20Programming-06b6d4?style=for-the-badge&logo=robot&logoColor=white)](https://github.com/gavinmichelsen/ai-battleship)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-10b981?style=for-the-badge&logo=checkmarx&logoColor=white)](https://github.com/gavinmichelsen/ai-battleship)
[![GitHub Pages](https://img.shields.io/badge/Hosted%20On-GitHub%20Pages-181717?style=for-the-badge&logo=github&logoColor=white)](https://gavinmichelsen.github.io/ai-battleship)

<br>

<a href="https://devin.ai"><img src="https://img.shields.io/badge/Devin-AI%20Software%20Engineer-4f46e5?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNOCA4aDh2OEg4eiIgZmlsbD0iIzRmNDZlNSIvPjwvc3ZnPg==&logoColor=white" alt="Devin" /></a>
<a href="https://windsurf.com"><img src="https://img.shields.io/badge/Windsurf-Cascade%20IDE-06b6d4?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNNiAxMmw2LTYgNiA2LTYgNnoiIGZpbGw9IiMwNmI2ZDQiLz48L3N2Zz4=&logoColor=white" alt="Windsurf" /></a>

<br>
<br>

*Play against an AI opponent with three difficulty levels, deploy your fleet with drag-and-drop, and enjoy a fully procedural audio soundscape -- all running in the browser with zero dependencies.*

</div>

---

## Features

### Gameplay
- **5-ship fleet** -- Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2)
- **3 AI difficulty levels** -- Easy (random), Medium (hunt & target), Hard (strategic probability)
- **AI Strategic Advisor** -- Toggle an on-screen advisor that highlights the optimal square to attack in green with confidence scores and contextual tips
- **Click-to-place deployment** -- Select a ship from the Shipyard, hover to preview, click to deploy
- **Ship repositioning** -- Click any placed ship to pick it up and move it
- **Randomize Fleet** -- One-click optimized random placement
- **Rotate ships** -- Press `R` or click the Rotate button
- **Turn tracking & score** -- Live turn counter and hit counters for both sides
- **Fleet status panel** -- Track which ships are still afloat or sunk

### UI / Design
- **Naval Command theme** -- Dark ocean color palette with cyan accents
- **Coordinate labels** -- A-J columns and 1-10 rows on both boards
- **Pill-shaped status bar** -- Live phase, ship count, and difficulty indicators
- **Refined board panels** -- Gradient accent lines, rounded corners, subtle borders
- **Visual hit/miss/sunk states** -- Red circles for hits, subtle dots for misses, dark red for sunk ships
- **Responsive layout** -- Adapts to smaller screens
- **Google Fonts** -- Outfit (UI) + Space Mono (labels/numbers)

### Audio (Procedural -- Web Audio API)
All sounds are generated in real-time using the Web Audio API. No audio files are loaded.

| Sound | Description |
|-------|-------------|
| Ambient | Ocean waves, submarine hum, sonar pings, hull creaks |
| Hit | Hollywood-style fiery explosion with distortion crackle |
| Miss | Gentle water splash + plop |
| Ship Sunk | Massive cinematic double-boom with sub-bass rumble |
| Battle Horn | Two-tone brass fanfare on game start |
| Victory | Ascending C major arpeggio |
| Defeat | Descending minor chord fade |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Structure | HTML5 |
| Styling | CSS3 (custom properties, grid, flexbox) |
| Logic | Vanilla JavaScript (ES6+) |
| Audio | Web Audio API (procedural synthesis) |
| Fonts | Google Fonts (Outfit, Space Mono) |
| Hosting | GitHub Pages |

> **Zero dependencies. No frameworks. No build step.**

## File Structure

```
ai-battleship/
  index.html      # Page structure and layout
  style.css       # Naval Command theme and responsive styles
  game.js         # Game engine (Ship, GameBoard, Game classes)
  ai.js           # AI opponent (Easy, Medium, Hard strategies)
  advisor.js      # AI strategic advisor with probability analysis
  audio.js        # Procedural audio engine (ambient + SFX)
  main.js         # UI logic, event handling, game flow
  README.md
```

## How to Play

1. **Deploy your fleet** -- Click a ship in the Shipyard, then click on your board to place it. Press `R` to rotate.
2. **Start the game** -- Once all 5 ships are placed, click **Start Game**.
3. **Enable the Advisor** *(optional)* -- Click **Advisor: OFF** to toggle the AI advisor. It highlights the best square to attack in green.
4. **Fire at the enemy** -- Click cells on the Enemy Fleet board to attack.
5. **Sink all enemy ships** before they sink yours!

## Running Locally

No build step required. Just serve the files:

```bash
# Python
python3 -m http.server 8000

# Then open http://localhost:8000
```

---

<div align="center">

## Built With

This project was developed entirely through AI pair programming.

<a href="https://windsurf.com"><img src="https://img.shields.io/badge/Windsurf_(Cascade)-AI--Powered_IDE-06b6d4?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNNiAxMmw2LTYgNiA2LTYgNnoiIGZpbGw9IiMwNmI2ZDQiLz48L3N2Zz4=&logoColor=white" alt="Windsurf" /></a>
&nbsp;&nbsp;
<a href="https://devin.ai"><img src="https://img.shields.io/badge/Devin-AI_Software_Engineer-4f46e5?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNOCA4aDh2OEg4eiIgZmlsbD0iIzRmNDZlNSIvPjwvc3ZnPg==&logoColor=white" alt="Devin" /></a>

Every line of code -- game logic, AI strategies, UI design, procedural audio synthesis, and bug fixes -- was written through collaborative AI-assisted development.

<br>

## License

MIT

</div>
