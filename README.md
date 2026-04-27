# Network & API Simulator (Net API Lab)

An interactive, browser-based simulator built to demonstrate how various network conditions and API responses impact application behavior and user experience. 

This educational tool allows developers, QA testers, and students to visually experiment with latency, bandwidth constraints, and packet loss without needing complex backend infrastructure.

![Deployment Status](https://github.com/vatsal302/net-api-lab/actions/workflows/static.yml/badge.svg)

## 🌐 Live Demo
The application is deployed as a static site via GitHub Pages.
**[View Live App](https://vatsal302.github.io/net-api-lab/)**

## ✨ Features

- **Network Simulation**: Slide controls to dynamically adjust latency (0ms to 2000ms+), toggle bandwidth speeds (Fast, Medium, Slow), and introduce packet loss (0% to 100%).
- **API Response Scenarios**: Instantly test how your front-end handles various HTTP states:
  - `200 OK` (Happy Path)
  - `200 OK (Delayed)`
  - `404 Not Found` (Missing Resource)
  - `500 Server Error` (Backend Exploded)
  - `Timeout` (Hanging Requests)
- **Hyper-Detailed Console**: A built-in terminal that generates rich, multi-line logs breaking down the exact state of the connection, data integrity, and anticipated user experience for every request.
- **Visual App Preview**: A mock feed that reacts in real-time to the chosen network conditions, complete with loading states, partial data rendering, and error boundaries.

## 🛠️ Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite (Strictly Static Build)
- **Styling**: Tailwind CSS
- **Routing**: TanStack Router
- **Icons**: Lucide React
- **Deployment**: GitHub Actions -> GitHub Pages

## 🚀 Getting Started

This project is a completely static frontend application. No backend or server-side rendering is required.

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/vatsal302/net-api-lab.git
   cd net-api-lab
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to the local server URL provided in the terminal (usually `http://localhost:5173`).

### Building for Production

To create a static production build:
```bash
npm run build
```
This will generate the optimized static files in the `dist` directory.

## 📦 Deployment

This project uses a GitHub Actions workflow (`.github/workflows/static.yml`) to automatically deploy the `main` branch to GitHub Pages.

**Important Note for Forks/Clones:**
If you deploy this yourself, ensure you update the `base` property in `vite.config.ts` and the `basepath` in `src/main.tsx` to match your repository name.

## 📝 License
This project is open-source and available under the MIT License.
