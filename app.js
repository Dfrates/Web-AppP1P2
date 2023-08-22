#!/usr/bin/env node
const crypto = require("crypto");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = 3000;
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("data.db");
let currentLevel = "";


function sha256(data) {
  const hash = crypto.createHash("sha256");
  hash.update(data);
  return hash.digest("hex");
}
// Middleware
app.use(bodyParser.json());

// Authentication endpoint
app.post("/auth", (req, res) => {
  const { username, password } = req.body;
  // Search for the user in the database
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
    // If there was an error or no user was found, return an unauthorized error
    if (err || !row) {
      res.status(401).send("Unauthorized");
      return;
    }
    //console.log(row);
    currentLevel = row.level.toLowerCase();

    // Verify the password
    const hashedPassword = sha256(password);
    if (hashedPassword !== row.password) {
      res.status(401).send("Unauthorized");
      return;
    }

    // Successful authentication
    const token = "abc123";
    res.json({ username, token });
  });
});

// Unauthenticated Content endpoint
app.get("/content", (req, res) => {
  const content = "This is some content";
  res.send(content);
});

// Unauthenticated GET for items
app.get("/items", (req, res) => {
  // Retrieve all items from the database
  db.all("SELECT * FROM items", (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
    } else {
	console.log(rows)
      res.json(rows);
    }
  });
});

//Authenticated POST to items
app.post("/items", (req, res) => {
  // Authenticate token
  const token = req.headers.authorization.split(" ")[1];
  if (token !== "abc123") {
    res.status(401).send("Unauthorized");
    return;
  }

  // Extract data from request body
  const { name, description, who } = req.body;

  // Validate data
  if (!name || !description) {
    res.status(400).send("Name and description are required");
    return;
  }

  // Insert new item into database
  db.run(
    "INSERT INTO items (name, description, who) VALUES (?, ?, ?)",
    [name, description, who],
    (error) => {
      if (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
        return;
      }

      // Get the ID of the newly inserted item
      const newItemId = this.lastID;

      // Return the newly inserted item
      db.get("SELECT * FROM items WHERE id = ?", [newItemId], (error, row) => {
        if (error) {
          console.error(error);
          res.status(500).send("Internal Server Error");
          return;
        }
        res.status(201).json(row);
      });
    }
  );
});

// Authenticated PUT to items
app.put("/items/:id", (req, res) => {
  // Authenticate token
  const token = req.headers.authorization.split(" ")[1];
  if (token !== "abc123") {
    res.status(401).send("Unauthorized");
    return;
  }

  // Find item by id and update
  const { id } = req.params;
  db.get("SELECT * FROM items WHERE id = ?", [id], (error, row) => {
    if (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
      return;
    }

    if (!row) {
      res.status(404).send("Not found");
    } else {
      const updatedItem = { ...row, ...req.body };
      const { name, description, who } = updatedItem;
      db.run(
        "UPDATE items SET name = ?, description = ?, who = ? WHERE id = ?",
        [name, description, who, id],
        (error) => {
          if (error) {
            console.error(error);
            res.status(500).send("Internal Server Error");
            return;
          }
          res.status(201);
        }
      );
    }
  });
});

// Authenticated DELETE of items
app.delete("/items/:id", (req, res) => {
  // Authenticate token
  const token = req.headers.authorization.split(" ")[1];
  if (token !== "abc123") {
    res.status(401).send("Unauthorized");
    return;
  }

  // Find item by id and remove
  const { id } = req.params;
  db.get("SELECT * FROM items WHERE id = ?", [id], (error, row) => {
    if (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
      return;
    }

    if (!row) {
      res.status(404).send("Not found");
    } else {
      db.run("DELETE FROM items WHERE id = ?", [id], (error) => {
        if (error) {
          console.error(error);
          res.status(500).send("Internal Server Error");
          return;
        }
        res.sendStatus(204);
      });
    }
  });
});

// Credentials endpoint
app.post("/credentials", (req, res) => {
  // Authenticate token
  const token = req.headers.authorization.split(" ")[1];
  if (token !== "abc123") {
    res.status(401).send("Unauthorized");
    return;
  }
  // Create new credentials
  const { username, password, level } = req.body;
  db.get(
    `SELECT username FROM users WHERE username = ?`,
    [username],
    (error, row) => {
      if (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
        return;
      }
      if (currentLevel === "author") {
        res.status(401).send("Authors cannot create credentials");
        return;
      }
      if (!row) {
        db.run(
          `INSERT INTO users (username, password, level) VALUES (?, ?, ?)`,
          [username, sha256(password), level],
          (error, row) => {
            if (error) {
              console.error(error);
              res.status(500).send("Internal Server Error");
              return;
            }
            // Get the ID of the newly inserted user
            const newUserId = this.lastID;

            // Return the newly inserted user
            db.get(
              "SELECT username FROM users WHERE uid = ?",
              [newUserId],
              (error, name) => {
                if (error) {
                  console.error(error);
                  res.status(500).send("Internal Server Error");
                  return;
                }
                res.status(201).json(name);
                return;
              }
            );
          }
        );
      } else {
        res.status(400).send("username already exists");
        return;
      }
    }
  );
});

// Get all credentials
//app.get('/credentials', (req, res) => {
//	db.all('SELECT username, level FROM users', (err, rows) => {
//    if (err) {
//      res.status(500).send(err.message);
//    } else {
//      res.json(rows);
//    }
//  });
//
//})

// Start server
app.listen(port, () => {
  console.log("Server running on port ${port}");
});

