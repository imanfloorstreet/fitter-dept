# Fitter App

Express + better-sqlite3 API using a route → controller → service architecture.

## Setup
```bash
npm install
cp .env.example .env
npm run dev      # or: npm start
```
The SQLite file is created automatically at `data/app.db` on first run.

## Structure
```
src/
  server.js              # entry: loads env, connects DB, starts server
  app.js                 # express app, middleware, /api mount
  config/db.js           # better-sqlite3 connection + table creation
  routes/                # URL -> controller (asyncHandler wrappers)
  controllers/           # req/res handling, { data } / { message } responses
  services/              # business logic + SQL
  middleware/            # 404 + fallback error handler
  utils/                 # AppError, sendError, DB helpers
```

## Endpoints (all under /api)
| Method | Path | Body / Query |
|---|---|---|
| GET | /fitter | ?status=active |
| GET | /fitter/:id | |
| POST | /fitter | name, email (required), businessName, address, mobile, status |
| PUT | /fitter/:id | any fitter fields (partial update) |
| DELETE | /fitter/:id | |
| GET | /fitter-dates/available | ?date=YYYY-MM-DD |
| GET | /fitter-dates/:fitterId | |
| GET | /fitter-dates/:fitterId/check | ?date=YYYY-MM-DD |
| POST | /fitter-dates/:fitterId | { dates: [...] } add |
| PUT | /fitter-dates/:fitterId | { dates: [...] } replace all |
| DELETE | /fitter-dates/:fitterId | { dates: [...] } remove |
| GET | /job | ?status=&fitterId= |
| GET | /job/fitter/:fitterId | |
| GET | /job/:id | |
| POST | /job | cmName (required), fitterId, fst, description, quote, bookingFee, daysNeeded, status |
| PUT | /job/:id | any job fields (partial update) |
| PATCH | /job/:id/status | { status } |
| PATCH | /job/:id/assign | { fitterId } (null to unassign) |
| DELETE | /job/:id | |
