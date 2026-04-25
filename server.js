const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
// Data base initialization
const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");
//const { use } = require("react");
const db = new Database("chat.db");

// Create users table if it doesn't exist
db.prepare(`
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender TEXT,
  receiver TEXT,
  message TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();

// Create global messages table if it doesn't exist
db.prepare(`
CREATE TABLE IF NOT EXISTS global_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender TEXT,
  message TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();

// Password for user
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT
)
`).run();

const PORT = 3000;

// Serve index.html, style.css, style.js
const server = http.createServer((req, res) => {
  let filePath = "." + (req.url === "/" ? "/index.html" : req.url);
  const ext = path.extname(filePath).toLowerCase();

  const contentTypes = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript"
  };

  const contentType = contentTypes[ext] || "text/plain";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("File not found");
      return;
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
});

const wss = new WebSocket.Server({ server });

// username -> websocket
const clients = new Map();

function sendJSON(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function broadcastActiveUsers() {
  const usernames = [...clients.keys()];

  for (const [, ws] of clients.entries()) {
    sendJSON(ws, {
      type: "active_users",
      users: usernames
    });
  }
}

function broadcastGlobalMessage(messageObj) {
  for (const [, ws] of clients.entries()) {
    sendJSON(ws, messageObj);
  }
}

wss.on("connection", (ws) => {
  ws.username = null;

  ws.on("message", (raw) => {
    let data;

    try {
      data = JSON.parse(raw.toString());
    } catch (err) {
      sendJSON(ws, {
        type: "error",
        message: "Invalid JSON"
      });
      return;
    }

    switch (data.type) {
      case "login": {
        const username = (data.username || "").trim();
        const password = (data.password || "").trim();

        if (!username || !password) {
          sendJSON(ws, {
            type: "error",
            message: "Username and password are required"
          });
          return;
        }

        const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

        if (!user) {
          sendJSON(ws, {
            type: "error",
            message: "User not found"
          });
          return;
        }

        const valid = bcrypt.compareSync(password, user.password);

        if(!valid) {
          sendJSON(ws, {
            type: "error",
            message: "Incorrect Password"
          });
          return
        }


        if (clients.has(username)) {
          sendJSON(ws, {
            type: "error",
            message: "Username already in use"
          });
          return;
        }

        ws.username = username;
        clients.set(username, ws);

        sendJSON(ws, {
          type: "login_success",
          username: username
        });

        // below it will load old messages
        const users = [...clients.keys()].filter(u => u !== username);

        if (users.length > 0) {
          const firstUser = users[0];

          const rows = db.prepare(`
            SELECT * FROM messages
            WHERE (sender = ? AND receiver = ?)
              OR (sender = ? AND receiver = ?)
            ORDER BY timestamp ASC
          `).all(username, firstUser, firstUser, username);

          sendJSON(ws, {
            type: "chat_history",
            user: firstUser,
            messages: rows
          });
        }


        broadcastActiveUsers();
        break;
      }

      case "register": {
        const username = (data.username || "").trim();
        const password = (data.password || "").trim();

        if (!username || !password) {
          sendJSON(ws, {
            type: "error",
            message: "Enter username and password"
          });
          return;
        }

        const existing = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

        if(existing) {
          sendJSON(ws, {
            type: "error",
            message: "Username already exists, please type new username"
          });
          return;
        }

        const securedPassword = bcrypt.hashSync(password, 10);

        db.prepare(`
          INSERT INTO users (username, password)
          VALUES (?, ?)
        `).run(username,securedPassword);

        sendJSON(ws, {
          type: "login_success",
          message: "Account created! Please login"
        });

        break;

      }

      case "private_message": {
        if (!ws.username) {
          sendJSON(ws, {
            type: "error",
            message: "Login first"
          });
          return;
        }

        const to = (data.to || "").trim();
        const text = (data.text || "").trim();

        if (!to || !text) {
          sendJSON(ws, {
            type: "error",
            message: "Recipient and message are required"
          });
          return;
        }

        const messageObj = {
          type: "private_message",
          from: ws.username,
          to: to,
          text: text
        };

        // Save message to database
        db.prepare(`
        INSERT INTO messages (sender, receiver, message)
        VALUES (?, ?, ?)
        `).run(ws.username, to, text);

        // send to recipient if online
        if (clients.has(to)) {
          sendJSON(clients.get(to), {
            ...messageObj,
            messageType: "received"
          });
        }

        // echo back to sender
        sendJSON(ws, {
          ...messageObj,
          messageType: "sent"
        });

        break;
      }

      case "global_message": {
        if (!ws.username) {
          sendJSON(ws, {
            type: "error",
            message: "Login first"
          });
          return;
        }

        const text = (data.text || "").trim();

        if (!text) {
          sendJSON(ws, {
            type: "error",
            message: "Message cannot be empty"
          });
          return;
        }

        db.prepare(`
          INSERT INTO global_messages (sender, message)
          VALUES (?, ?)
        `).run(ws.username, text);

        const messageObj = {
          type: "global_message",
          from: ws.username,
          text: text
        };

        broadcastGlobalMessage(messageObj);
        break;
      }

      case "typing": {
        if (!ws.username) return;

        const to = (data.to || "").trim();
        if (!to || !clients.has(to)) return;

        sendJSON(clients.get(to), {
          type: "typing",
          from: ws.username
        });

        break;
      }

      case "chat_history": {
        const user1 = ws.username;
        const user2 = data.user;

        const rows = db.prepare(`
          SELECT * FROM messages
          WHERE (sender = ? AND receiver = ?)
            OR (sender = ? AND receiver = ?)
          ORDER BY timestamp ASC
        `).all(user1, user2, user2, user1);

        sendJSON(ws, {
          type: "chat_history",
          user: user2,
          messages: rows
        });

        break;
      }

      case "global_history": {
        if (!ws.username) {
          sendJSON(ws, {
            type: "error",
            message: "Login first"
          });
          return;
        }

        const rows = db.prepare(`
          SELECT * FROM global_messages
          ORDER BY timestamp ASC
        `).all();

        sendJSON(ws, {
          type: "global_history",
          messages: rows
        });

        break;
      }

      default:
        sendJSON(ws, {
          type: "error",
          message: "Unknown message type"
        });
    }
  });

  ws.on("close", () => {
    if (ws.username && clients.has(ws.username)) {
      clients.delete(ws.username);
      broadcastActiveUsers();
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});