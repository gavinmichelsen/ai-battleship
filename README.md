# Naval Command: Battleship

A fully interactive, browser-based Battleship game built entirely with AI-assisted development using **Windsurf (Cascade)** and **Devin**.

![Naval Command](https://img.shields.io/badge/Built%20With-Windsurf%20%26%20Devin-06b6d4?style=for-the-badge)

## Overview

Naval Command is a modern take on the classic Battleship board game. Play against an AI opponent with three difficulty levels, deploy your fleet with an intuitive click-to-place system, and enjoy a fully procedural audio soundscape — all running in the browser with zero dependencies.

## Features

### Gameplay
- **5-ship fleet**: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2)
- **3 AI difficulty levels**: Easy (random), Medium (hunt & target), Hard (strategic)
- **Click-to-place ship deployment**: Select a ship from the Shipyard, hover to preview placement, click to deploy
- **Ship repositioning**: Click any placed ship to pick it up and move it
- **Randomize Fleet**: One-click random placement for quick games
- **Rotate ships**: Press `R` or click the Rotate button to toggle orientation
- **Turn tracking & score**: Live turn counter, hit counters for both sides
- **Fleet status panel**: Track which ships are still afloat or sunk

### UI / Design
- **Naval Command theme**: Dark ocean color palette with cyan accents
- **Coordinate labels**: A–J columns and 1–10 rows on both boards
- **Pill-shaped status bar**: Live phase, ship count, and difficulty indicators
- **Refined board panels**: Gradient accent lines, rounded corners, subtle borders
- **Visual hit/miss/sunk states**: Red circles for hits, subtle dots for misses, dark red for sunk ships
- **Responsive layout**: Adapts to smaller screens
- **Google Fonts**: Outfit (UI) + Space Mono (labels/numbers)

### Audio (Procedural — Web Audio API)
All sounds are generated in real-time using the Web Audio API. No audio files are loaded.

- **Ambient soundscape**: Ocean waves, deep submarine hum, periodic sonar pings, distant hull creaks
- **Hit SFX**: Hollywood-style fiery explosion with distortion crackle, fire sizzle, and deep thud
- **Miss SFX**: Gentle water splash + plop
- **Ship Sunk SFX**: Massive cinematic double-boom with sub-bass rumble (1.5s tail)
- **Battle Horn**: Two-tone brass fanfare on game start
- **Victory Fanfare**: Ascending C major arpeggio
- **Defeat Sound**: Descending minor chord fade
- **Mute toggle**: Click the Sound button to mute/unmute all audio

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Structure | HTML5 |
| Styling | CSS3 (custom properties, grid, flexbox) |
| Logic | Vanilla JavaScript (ES6+) |
| Audio | Web Audio API (procedural synthesis) |
| Fonts | Google Fonts (Outfit, Space Mono) |
| Hosting | GitHub Pages |

**Zero dependencies. No frameworks. No build step.**

## File Structure

```
├── index.html    # Page structure and layout
├── style.css     # Naval Command theme and responsive styles
├── game.js       # Game engine (Ship, GameBoard, Game classes)
├── ai.js         # AI opponent (Easy, Medium, Hard strategies)
├── audio.js      # Procedural audio engine (ambient + SFX)
├── main.js       # UI logic, event handling, game flow
└── README.md
```

## How to Play

1. **Deploy your fleet**: Click a ship in the Shipyard, then click on your board to place it. Press `R` to rotate.
2. **Start the game**: Once all 5 ships are placed, click **Start Game**.
3. **Fire at the enemy**: Click cells on the Enemy Fleet board to attack.
4. **Sink all enemy ships** before they sink yours!

## Running Locally

No build step required. Just serve the files:

```bash
# Python
python3 -m http.server 8000

# Then open http://localhost:8000
```

## Built With

This project was developed entirely through AI pair programming:

- **[Windsurf (Cascade)](https://windsurf.com)** — AI-powered IDE used for all code generation, debugging, and iterative development
- **[Devin](https://devin.ai)** — AI software engineer used for development assistance

Every line of code — game logic, AI strategies, UI design, procedural audio synthesis, and bug fixes — was written through collaborative AI-assisted development.

## License

MIT
