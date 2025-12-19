-- items table for basic CRUD

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- optional trigger to auto-update updated_at
CREATE TRIGGER IF NOT EXISTS items_updated_at
AFTER UPDATE ON items
FOR EACH ROW
BEGIN
  UPDATE items
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
END;
