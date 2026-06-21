// server/utils/notify.js
// Use this in any controller to push real-time notifications.
//
// Usage:
//   const { notify } = require('../utils/notify')
//   await notify(req.io, { userId, type, title, body, link })

const { pushNotification } = require("../socket/socketHandler");

async function notify(io, { userId, type, title, body, link = "", meta = {} }) {
  if (!io) {
    console.warn("notify() called without io instance — notification not pushed");
    return;
  }
  return pushNotification(io, { userId, type, title, body, link, meta });
}

module.exports = { notify };