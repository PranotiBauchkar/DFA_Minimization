# DFA Minimization — Interactive Live Simulation

An interactive simulation tool for Deterministic Finite Automata (DFA) Minimization featuring real-time BFS reachability, partition refinement (Myhill-Nerode theorem), transition signatures, step-by-step equivalence table verification, and dynamic graph visualization.

## Features

- **Interactive DFA Definition**: Custom states, alphabet symbols, transition table, initial state, and accepting states.
- **Preloaded Examples**: Classic automata problems (e.g., strings ending in `01`, odd/even parity, divisibility).
- **Step-by-step Minimization**:
  1. Unreachable state elimination (BFS reachability)
  2. 0-Equivalence partitioning (accepting vs non-accepting states)
  3. Iterative k-Equivalence refinement
  4. Minimized DFA construction and transition graph rendering
- **Interactive Graph Visualizer**: Drag-and-drop state canvas with active transition highlights.

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation
```bash
npm install
```

### Local Development
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Deploying to Netlify

### Option 1: Netlify Git Integration (Recommended)
1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In the [Netlify Dashboard](https://app.netlify.com/), click **Add new site** > **Import an existing project**.
3. Select your repository.
4. Netlify will automatically detect settings from [`netlify.toml`](./netlify.toml):
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Click **Deploy site**.

### Option 2: Netlify CLI
```bash
npm install -g netlify-cli
netlify deploy --build --prod
```

### Option 3: Netlify Drag and Drop
1. Run `npm run build` locally.
2. Drag and drop the generated `dist` folder into [Netlify Drop](https://app.netlify.com/drop).
