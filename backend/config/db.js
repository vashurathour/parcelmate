const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/parcelmate.db');
let _db = null;

function wrapDb(raw) {
  const save = () => {
    fs.writeFileSync(DB_PATH, Buffer.from(raw.export()));
  };

  // Wrap prepare to return get/all/run helpers
  const origPrepare = raw.prepare.bind(raw);
  raw.prepare = (sql) => ({
    get: (...p) => {
      const s = origPrepare(sql);
      s.bind(p.flat());
      const row = s.step() ? s.getAsObject() : undefined;
      s.free();
      return row;
    },
    all: (...p) => {
      const rows = [];
      const s = origPrepare(sql);
      s.bind(p.flat());
      while (s.step()) rows.push(s.getAsObject());
      s.free();
      return rows;
    },
    run: (...p) => {
      raw.run(sql, p.flat());
      save();
    }
  });

  raw._save = save;
  return raw;
}

async function getDb() {
  if (_db) return _db;
  const SQL = await initSqlJs();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const raw = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();
  _db = wrapDb(raw);
  return _db;
}

module.exports = { getDb };
