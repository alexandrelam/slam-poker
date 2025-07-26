# SLAM Poker

A real-time poker planning application for agile teams built with Node.js, TypeScript, and React.

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
