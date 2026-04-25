# Contributing to Caosmos UI

First off, thank you for considering contributing to **Caosmos UI**! It's people like you that make the simulation community such a great place.

This project is the high-performance visualization layer for the [Caosmos Engine](https://github.com/alexpicode/caosmos). We welcome explorers, architects, and developers who want to help us build the future of AI-driven simulation visualization.

## 🌈 How Can I Contribute?

### Reporting Bugs 🐛
- Search the [Issues](https://github.com/alexpicode/caosmos-ui/issues) to see if the bug has already been reported.
- If you can't find an open issue, [open a new one](https://github.com/alexpicode/caosmos-ui/issues/new).
- Include a clear title and description, as much relevant information as possible, and a code sample or an executable test case demonstrating the expected behavior that is not occurring.

### Suggesting Enhancements ✨
- Open an [issue](https://github.com/alexpicode/caosmos-ui/issues/new) to discuss the enhancement.
- Describe the current behavior and what you would like to see instead.
- Explain why this enhancement would be useful to most users.

### Pull Requests 🚀
- **Branching**: Create a feature branch from `develop`.
- **Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) (e.g., `feat: add new map layer`, `fix: handle null citizen state`).
- **Tests**: Ensure your changes don't break existing functionality. (Tests are being integrated, but please check the build).
- **Style**: Follow the existing coding style and ensure the linting passes (`npm run lint`).
- **PR Target**: Always open your PR against the `develop` branch.

## 🛠️ Development Setup

1. **Clone the repo**:
   ```bash
   git clone https://github.com/alexpicode/caosmos-ui.git
   cd caosmos-ui
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Set up Environment**:
   Copy `.env.example` to `.env` and configure `VITE_API_BASE_URL`.
4. **Run in development**:
   ```bash
   npm run dev
   ```

## 🏗️ Technical Stack

- **React 19**: Modern UI with React Compiler (experimental).
- **PixiJS 8**: High-performance WebGL rendering.
- **Tailwind CSS 4**: Utility-first styling.
- **Zustand & React Query**: State management and data fetching.
- **TypeScript**: Type safety is mandatory.

## 📏 Coding Standards

- Use **Functional Components** and **Hooks**.
- Follow **Clean Architecture** principles:
  - `core/`: Domain logic (no external dependencies).
  - `data/`: API and persistence logic.
  - `presentation/`: UI components and renderers.
  - `store/`: Shared state.
- Keep components small and focused.
- Ensure `npm run lint` passes before submitting.

## 💬 Community

If you want to discuss architectural decisions or just say hi, feel free to reach out via [email](mailto:alexpicode@proton.me).

---
*Happy coding, Architect!*
