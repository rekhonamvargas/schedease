// =========================
// SCHED-EASE BACKEND SERVER
// =========================

const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");

const app = express();
const PORT = 4000; // backend runs on 4000
const DB_DIR = path.join(__dirname, "server_data");

// Ensure folder exists
fs.ensureDirSync(DB_DIR);

// Database file paths
const USERS_DB = path.join(DB_DIR, "users.json");
const SCHEDULES_DB = path.join(DB_DIR, "schedules.json");
const SUBJECTS_DB = path.join(DB_DIR, "subjects.json");

function readJSON(file, fallback) {
  try {
    return fs.readJsonSync(file);
  } catch {
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.writeJsonSync(file, data, { spaces: 2 });
}

// Load initial data
let users = readJSON(USERS_DB, []);
let schedules = readJSON(SCHEDULES_DB, {});
let subjects = readJSON(SUBJECTS_DB, {});

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// ============= GET ALL USERS (for compatibility) =============
app.get("/api/users", (req, res) => {
  // Return users without passwords for security
  const safeUsers = users.map(u => ({
    username: u.username,
    email: u.email,
    full_name: u.full_name
  }));
  res.json(safeUsers);
});

// ============= USER REGISTER =============
app.post("/api/users/register", async (req, res) => {
  const { username, email, password, full_name } = req.body;

  if (users.find((u) => u.username === username || u.email === email)) {
    return res.status(400).json({ message: "Username or email already exists" });
  }

  const hashed = await bcrypt.hash(password, 10);

  const newUser = {
    id: uuid(),
    username,
    email,
    password: hashed,
    full_name: full_name || "",
  };

  users.push(newUser);
  writeJSON(USERS_DB, users);

  res.json({ success: true, user: { username, email, full_name } });
});

// ============= USER LOGIN =============
app.post("/api/users/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.find((u) => u.email === email);
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ message: "Invalid credentials" });

  res.json({
    success: true,
    token: "secure-token-" + user.id,
    user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name },
  });
});

// ============= SAVE SCHEDULE =============
app.post("/api/schedules/save", (req, res) => {
  const { username, schedules: userSchedules } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  // Store schedules mapped by username
  if (!schedules[username]) {
    schedules[username] = [];
  }
  schedules[username] = userSchedules;
  
  writeJSON(SCHEDULES_DB, schedules);

  res.json({ success: true });
});

// ============= GET USER SCHEDULES =============
app.get("/api/schedules/:username", (req, res) => {
  const { username } = req.params;
  const userSchedules = schedules[username] || [];
  res.json(userSchedules);
});

// ============= SAVE SUBJECTS =============
app.post("/api/subjects/save", (req, res) => {
  const { username, subjects: userSubjects } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  // Store subjects mapped by username
  if (!subjects[username]) {
    subjects[username] = [];
  }
  subjects[username] = userSubjects;
  
  writeJSON(SUBJECTS_DB, subjects);

  res.json({ success: true });
});

// ============= GET USER SUBJECTS =============
app.get("/api/subjects/:username", (req, res) => {
  const { username } = req.params;
  const userSubjects = subjects[username] || [];
  res.json(userSubjects);
});

// ============= DELETE SCHEDULE =============
app.delete("/api/schedules/:id", (req, res) => {
  const { id } = req.params;
  let found = false;
  for (const username of Object.keys(schedules)) {
    const arr = schedules[username];
    if (Array.isArray(arr)) {
      const before = arr.length;
      schedules[username] = arr.filter((s) => s.schedule_id !== id);
      if (schedules[username].length < before) found = true;
    }
  }
  writeJSON(SCHEDULES_DB, schedules);
  res.json({ success: found });
});

// Start server
app.listen(PORT, () => {
  console.log(`SchedEase backend running on http://localhost:${PORT}`);
});
