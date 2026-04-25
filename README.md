<p align="center">
  <img src="docs/assets/caosmos-ui_banner_1.png" alt="Caosmos Logo" width="100%" />
</p>

<h1 align="center">Caosmos UI</h1>

<p align="center">
  <strong>The High-Performance Visualization Engine for AI-Driven Simulations.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=for-the-badge" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white&style=for-the-badge" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white&style=for-the-badge" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.0-06B6D4?logo=tailwind-css&logoColor=white&style=for-the-badge" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/PixiJS-8.17-E91E63?logo=pixijs&logoColor=white&style=for-the-badge" alt="PixiJS" />
  <img src="https://img.shields.io/badge/License-AGPL--3.0-blue?style=for-the-badge" alt="License: AGPL-3.0" />
  <a href="mailto:alexpicode@proton.me"><img src="https://img.shields.io/badge/Contact-alexpicode%40proton.me-blue?style=for-the-badge&logo=protonmail" alt="Email"></a>
</p>

---

## 🌌 Overview

**Caosmos UI** is the official frontend companion for the [Caosmos Engine](https://github.com/alexpicode/caosmos). While the engine handles the complex AI cognition, spatial logic, and simulation physics, this dashboard provides a high-performance, real-time visualization layer.

It is designed to be used in tandem with the backend engine to provide developers, researchers, and users with a deep look into the autonomous behavior of AI "Citizens" within the simulated world.

Designed with **Clean Architecture** principles and built for extreme performance, Caosmos UI leverages PixiJS for smooth 2D rendering and React 19 for a modern, responsive interface.

## ✨ Key Features

-   **🛰️ Real-time Map Visualization**: High-performance 2D viewport using PixiJS, capable of rendering thousands of entities, zones, and environmental effects.
-   **🧠 Cognition Monitoring**: Visualize the internal thought processes, goal hierarchies, and decision-making logic of AI agents in real-time.
-   **👤 Citizen Insights**: Detailed tracking of individual agents, including vitality status, inventory, equipment, and movement history.
-   **🌍 World State Tracking**: Monitor environmental conditions, time cycles, and dynamic zone interactions.
-   **📊 Data Analytics**: Integrated charts and metrics for simulation-wide performance and population health.
-   **🛠️ Interaction Tools**: Directly influence the simulation through a dedicated command and control interface.

## 🚀 Tech Stack

-   **Framework**: [React 19](https://react.dev/)
-   **Build Tool**: [Vite 6](https://vitejs.dev/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Rendering Engine**: [PixiJS 8](https://pixijs.com/)
-   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
-   **State Management**: [Zustand](https://github.com/pmndrs/zustand) & [React Query](https://tanstack.com/query)
-   **Data Flow**: [Immer](https://immerjs.github.io/immer/) for immutable state updates.

## 🏗️ Architecture

The project follows a strict **Clean Architecture** pattern to ensure maintainability and testability:

-   **`core`**: Pure domain logic and entity definitions. No external dependencies.
-   **`data`**: Data providers, mappers, and API implementations.
-   **`presentation`**: UI components, hooks, and PixiJS renderers.
-   **`store`**: Global state management using Zustand.
-   **`shared`**: Utilities and common types.

## 🛠️ Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v20 or higher recommended)
-   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
-   [Docker](https://www.docker.com/) (Optional, for containerized deployment)

---

## 🐳 Docker Deployment (Recommended)

The easiest way to run Caosmos UI in a production-ready environment is using Docker.

### Running with Docker Compose

1.  Ensure you have Docker and Docker Compose installed.
2.  Run the following command to build and start the container:
    ```bash
    docker compose up -d --build
    ```
3.  The UI will be available at `http://localhost:5173` (by default).

### Configuration

You can customize the deployment using environment variables:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | The host port where the UI will be accessible. | `5173` |
| `VITE_API_BASE_URL` | The URL of the running Caosmos Engine API. | `http://localhost:8080` |

---

## 🚀 Local Development

If you prefer to run the project directly on your machine without Docker:

### 1. Installation

```bash
git clone https://github.com/alexpicode/caosmos-ui.git
cd caosmos-ui
npm install
```

### 2. Environment Setup

Create a `.env` file based on `.env.example` and configure your `VITE_API_BASE_URL`.

> [!IMPORTANT]
> This UI requires a running instance of the **Caosmos Backend** to function.

### 3. Run Development Server

```bash
npm run dev
```

### 4. Manual Production Build

To generate a static build in the `dist/` folder:

```bash
npm run build
```

## 🤝 Contributing

We welcome explorers and architects! To get started, please read our [**Contributing Guide**](CONTRIBUTING.md).

1.  Open an issue for discussion before starting major changes.
2.  Submit a PR for bug fixes or new features.

---

## 📬 Contact

If you have any questions, suggestions, or would like to collaborate, feel free to reach out:

📧 **Email**: [alexpicode@proton.me](mailto:alexpicode@proton.me)

---

<p align="center">
  Built with ❤️ for the AI community by <a href="https://github.com/alexpicode">alexpicode</a>
</p>
