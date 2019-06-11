'use strict';

var net       = require('net'),
    url       = require('url'),
    websocket = require('..'),
    deflate   = require('permessage-deflate');

var DEFAULT_PORTS = { 'ws:': 80, 'wss:': 443 };

var uri  = url.parse(process.argv[2]),
    port = uri.port || DEFAULT_PORTS[uri.protocol],
    conn = net.connect({ host: uri.hostname, port: port });

var driver = websocket.client(uri.href);
driver.addExtension(deflate);

driver.on('open', function() {
  driver.text('Hello, world');
});

driver.on('message', function(event) {
  console.log(['message', event.data]);
});

driver.on('close', function(event) {
  console.log(['close', event.code, event.reason]);
  conn.end();
});

conn.pipe(driver.io);
driver.io.pipe(conn);

driver.start();
