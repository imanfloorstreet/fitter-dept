import "dotenv/config"; // load .env before anything reads process.env
import "./src/config/db.js"; // connect + create tables on startup
import app from "./app.js";

const PORT = process.env.PORT || 4007;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
