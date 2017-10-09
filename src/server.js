const uuid = require('uuid');
const port = 1111;
const io = require('socket.io')().attach(port);

const LOG_VERBOSE = false;
const TRUNCATE_LENGTH = 50;

/**
 * Namespaces
 *   /browser - for browser clients (Chrome extension)
 *   /app - for clients requesting info from browsers
 */
const browsers = io.of('/browsers');
const apps = io.of('/apps');

let browserConnections = new Set();
let appConnections = new Set();

// Store state to provide either client.
const state = {
  inspected: null,
  document: null,
};

const log = msg => {
  const cols = process.stdout.columns;
  const divider = '-'.repeat(cols);
  console.log(divider);
  console.log(msg);
};

const logConnections = ({ connected, what, socketId, apps, browsers }) => {
  const status = connected ? 'Connected to' : 'Disconnected from';
  const lines = [
    `${status} ${what}: ${socketId}`,
    `Total apps: ${apps}`,
    `Total browsers: ${browsers}`,
  ];
  const cols = process.stdout.columns;
  const msg = lines
    .map(s => `| ${s}${' '.repeat(Math.max(0, cols - s.length - 4))} |`)
    .join('');
  log(msg);
};

// Used to push data.res and data.update.
const emitToApps = evt => res => {
  const resString = JSON.stringify(res, null, 2);
  if (LOG_VERBOSE) {
    log(resString);
  } else {
    log(evt, res.type, `${resString.substring(0, TRUNCATE_LENGTH)}...`);
  }

  // TODO: Refactor this to support multiple clients.
  apps.emit(evt, res);
};

/**
 * Browser clients (debugging pages).
 */
function onBrowserConnect(browser) {
  const socketId = browser.id;
  if (browserConnections.has(socketId)) {
    throw new Error('tried to connect a socket already added');
  }
  browserConnections.add(socketId);
  logConnections({
    connected: true,
    socketId,
    what: 'browser',
    apps: appConnections.size,
    browsers: browserConnections.size,
  });

  // Forward updates and responses from browser to the app clients.
  browser.on('data.res', emitToApps('data.res'));

  browser.on('data.update', onBrowserUpdate);
  browser.on('data.err', onBrowserError);
  browser.on('disconnect', onBrowserDisconnect(socketId));
}

function onBrowserError(err) {
  log(err);
  apps.emit('data.err', err);
}

function onBrowserUpdate(data) {
  // Store locally before forwarding to any connected apps.
  const dispatch = {
    UPDATE_ROOT: ({ node, nodeId, styles }) => {
      state.inspected = {
        node,
        nodeId,
        styles,
      };
      log(`Inspecting node ${nodeId}`);
    },
    UPDATE_DOCUMENT: ({ nodes }) => {
      state.nodes = nodes;
      log('Updated state.nodes');
    },
    UPDATE_STYLES: ({ updated }) => {
      // If the update contained updates to the currently selected
      // node, update our cached styles for that node.
      const { inspected } = state;
      if (inspected && updated[inspected.nodeId]) {
        inspected.styles = updated[inspected.nodeId];
      }
      log('Updated styles');
    },
  };
  const action = dispatch[data.type];
  if (action) {
    action(data);
  }

  // Updates need to be given a uuid, since they don't
  // have one from a corresponding request.
  const dataWithId = Object.assign({}, data, { id: uuid() });
  emitToApps('data.update')(dataWithId);
}

// TODO(slim): Should eventually refactor so that this doesn't need to be curried.
function onBrowserDisconnect(socketId) {
  return function() {
    if (browserConnections.has(socketId)) {
      browserConnections.delete(socketId);
      logConnections({
        connected: false,
        what: 'browser',
        socketId,
        apps: appConnections.size,
        browsers: browserConnections.size,
      });

      // Clear any relevant state.
      state.inspected = null;
    } else {
      throw new Error('tried to disconnect a socket that didnt exist');
    }
  };
}

browsers.on('connect', onBrowserConnect);

/**
 * When app clients send requests, we need to forward
 * to the browser client.
 */

function onClientConnect(app) {
  const socketId = app.id;
  if (appConnections.has(socketId)) {
    throw new Error('tried to connect a app already added');
  }
  appConnections.add(socketId);
  logConnections({
    connected: true,
    what: 'app',
    socketId,
    apps: appConnections.size,
    browsers: browserConnections.size,
  });

  // Send any initial data.
  if (state.inspected) {
    log('Sending inspected node...');
    const { node, nodeId, styles } = state.inspected;
    app.emit('data.update', {
      type: 'UPDATE_ROOT',
      id: uuid(),
      node,
      nodeId,
      styles,
    });
  }
  if (state.nodes) {
    log('Sending document nodes...');
    app.emit('data.update', {
      type: 'UPDATE_DOCUMENT',
      id: uuid(),
      nodes: state.nodes,
    });
  }

  // Forward requests from app clients to browsers.
  app.on('data.req', onClientRequest);

  app.on('disconnect', onClientDisconnect(socketId));
}

function onClientRequest(req) {
  if (browserConnections.size > 0) {
    const reqStr = JSON.stringify(req, null, 2);
    log(reqStr);
    browsers.emit('data.req', req);
  } else {
    log('No available browser clients');

    // If there are no connected browser clients, return
    // an error to the requesting app.
    // TODO(slim): Should this use the main `emitToApps` function?
    apps.emit('server.err', {
      type: 'SERVER_ERROR',
      id: req.id,
      message: 'No available browsers',
    });
  }
}

function onClientDisconnect(socketId) {
  return function() {
    if (appConnections.has(socketId)) {
      appConnections.delete(socketId);
      logConnections({
        connected: false,
        what: 'app',
        socketId,
        apps: appConnections.size,
        browsers: browserConnections.size,
      });
    } else {
      throw new Error('tried to disconnect a app that didnt exist');
    }
  };
}

apps.on('connect', onClientConnect);
