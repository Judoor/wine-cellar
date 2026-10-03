// Container entrypoint.
// When started as root (the default), makes sure DATA_DIR belongs to PUID:PGID — Docker creates
// missing bind-mount folders as root — then drops privileges and starts the Next.js server.
// When started as another user (compose `user:`), it starts the server directly.
const fs = require("node:fs");
const path = require("node:path");

const dataDir = process.env.DATA_DIR || "/data";

if (process.getuid && process.getuid() === 0) {
  const uid = Number(process.env.PUID || 1000);
  const gid = Number(process.env.PGID || 1000);
  fs.mkdirSync(dataDir, { recursive: true });

  // Only touch entries with the wrong owner (cheap on every restart).
  const fix = (p) => {
    const st = fs.lstatSync(p);
    if (st.uid !== uid || st.gid !== gid) fs.lchownSync(p, uid, gid);
    if (st.isDirectory()) for (const name of fs.readdirSync(p)) fix(path.join(p, name));
  };
  try {
    fix(dataDir);
  } catch (e) {
    console.warn(`Could not set ownership of ${dataDir}: ${e.message}`);
  }

  process.setgroups?.([gid]);
  process.setgid(gid);
  process.setuid(uid);
}

require("./server.js");
