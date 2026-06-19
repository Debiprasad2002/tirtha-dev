# Tirtha Site

Tirtha Site is a full-stack application for exploring and contributing to temple and heritage content. The repository is split into a Django backend and a React/Vite frontend.

The latest site code is currently on the `Task1-upload` branch in the upstream repository, and that branch name may change after the next team meeting.

## Project Structure

- `backend/` - Django 6 API, admin, media storage, and site management logic
- `frontend/` - React 19 application built with Vite
- `backend/media/` - Uploaded contributions and site request assets

## Prerequisites

- Node.js 24.6.0+
- npm 11.12.1+
- Python 3.14.6+
- `uv`

## Version Baseline

Use these versions when generating code or suggesting commands for this repository:

- Frontend runtime: Node.js 24.6.0 with npm 11.12.1
- Frontend build tool: Vite 8.0.16
- Backend runtime: Python 3.14.6

Planned frontend packages include Tailwind CSS for styling and MapLibre GL for maps.

## Local Setup

### Backend

1. Change into the backend directory:

   ```bash
   cd backend
   ```

2. Install Python dependencies:

   ```bash
   uv sync
   ```

3. Run database migrations if needed:

   ```bash
   uv run manage.py migrate
   ```

4. Start the Django development server:

   ```bash
   uv run manage.py runserver localhost:9000
   ```

### Frontend

1. Change into the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the Vite development server:

   ```bash
   npm run dev
   ```

The frontend usually runs on `http://localhost:5173`, while the backend runs on `http://localhost:9000`.

## Environment Variables

The backend reads optional values from `backend/.env`.

If no SMTP credentials are provided in local development, Django falls back to the console email backend.

## Useful Commands

### Backend

```bash
uv run manage.py makemigrations
uv run manage.py migrate
uv run manage.py createsuperuser
uv run manage.py runserver localhost:9000
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Notes

- The backend uses SQLite for local development.
- Frontend API calls should target the Django server running on port `9000`.
- CORS is configured for local frontend development on port `5173`.
