# SLAM Poker

A real-time poker planning application for agile teams built with Node.js, TypeScript, and React.

<img width="1216" height="1249" alt="image" src="https://github.com/user-attachments/assets/c6bdf2ae-0696-4f53-8390-18431e1b6f79" />
<img width="1216" height="1249" alt="image" src="https://github.com/user-attachments/assets/a9b776ea-05d1-4ed8-bfa3-5e416ca04bd1" />


## Features

- Real-time collaborative poker planning sessions
- WebSocket-based communication
- Room-based voting system
- Modern React frontend with TypeScript
- Dockerized deployment

## Running with Docker Compose

### Prerequisites

- [Docker](https://www.docker.com/get-started) (v20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2.0+)

### Quick Start

1. Clone the repository:

   ```bash
   git clone https://github.com/alexandrelam/slam-poker.git
   cd slam-poker
   ```

2. Create a `.env` file (optional):

   ```bash
   cp .env.example .env  # if you have an example file
   # or create manually with your preferred settings
   ```

3. Start the application:

   ```bash
   docker-compose up -d
   ```

4. Access the application at `http://localhost:3001`

### Configuration

The application can be configured using environment variables:

#### Backend Configuration (.env)

| Variable      | Default      | Description                  |
| ------------- | ------------ | ---------------------------- |
| `PORT`        | `3001`       | Port the application runs on |
| `NODE_ENV`    | `production` | Node.js environment          |
| `CORS_ORIGIN` | `*`          | CORS allowed origins         |

Create a `.env` file in the root directory to override defaults:

```env
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://localhost:3000
```

#### Frontend Configuration

The frontend requires WebSocket URL configuration for different environments:

**For Development (`web/.env.development`):**

```env
VITE_WS_URL=http://localhost:3001
```

**For Production (`web/.env.production`):**

```env
# Leave empty to use same origin as frontend (recommended for production)
VITE_WS_URL=
```

The frontend will automatically:

- Use `VITE_WS_URL` if specified
- Fall back to `window.location.origin` (same server as frontend) if not specified
- This ensures WebSocket connections work in both development and production environments

### Development

For development with hot reload:

```bash
# Stop the production container if running
docker-compose down

# Run in development mode (if you have a dev compose file)
# Otherwise, run locally with:
npm install
npm run dev
```

### Container Management

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f slam-poker

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up --build -d

# Health check status
docker-compose ps
```

The application includes built-in health checks accessible at `http://localhost:3001/health`.
