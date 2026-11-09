'use strict';

var Buffer     = require('safe-buffer').Buffer,
    Stream     = require('stream').Stream,
    url        = require('url'),
    util       = require('util'),
    Base       = require('./base'),
    Headers    = require('./headers'),
    HttpParser = require('../http_parser');

var PORTS = { 'ws:': 80, 'wss:': 443 };

var Proxy = function(client, origin, options) {
  this._client  = client;
  this._http    = new HttpParser('response');
  this._origin  = Proxy.parseUrl(client.url);
  this._url     = Proxy.parseUrl(origin);
  this._options = options || {};
  this._state   = 0;

  this.readable = this.writable = true;
  this._paused  = false;

  this._headers = new Headers();
  this._headers.set('Host', this._origin.host);
  this._headers.set('Connection', 'keep-alive');
  this._headers.set('Proxy-Connection', 'keep-alive');

  var auth = Proxy.urlAuthorization(this._url);
  if (auth) this._headers.set('Proxy-Authorization', auth);
};
util.inherits(Proxy, Stream);

Proxy.parseUrl = function(uri) {
  if (typeof uri === 'object') uri = uri.href;
  if (typeof uri !== 'string') return null;

  try {
    return (typeof URL === 'function') ? new URL(uri) : url.parse(uri);
  } catch (error) {
    return null;
  }
};

Proxy.urlAuthorization = function(uri) {
  if (!uri) return null;

  var auth = null;
  if (uri.auth) auth = uri.auth;
  if (uri.username && uri.password) auth = uri.username + ':' + uri.password;
  if (!auth) return null;

  return 'Basic ' + Buffer.from(auth, 'utf8').toString('base64');
};

var instance = {
  setHeader: function(name, value) {
    if (this._state !== 0) return false;
    this._headers.set(name, value);
    return true;
  },

  start: function() {
    if (this._state !== 0) return false;
    this._state = 1;

    var origin = this._origin,
        port   = origin.port || PORTS[origin.protocol],
        start  = 'CONNECT ' + origin.hostname + ':' + port + ' HTTP/1.1';

    var headers = [start, this._headers.toString(), ''];

    this.emit('data', Buffer.from(headers.join('\r\n'), 'utf8'));
    return true;
  },

  pause: function() {
    this._paused = true;
  },

  resume: function() {
    this._paused = false;
    this.emit('drain');
  },

  write: function(chunk) {
    if (!this.writable) return false;

    this._http.parse(chunk);
    if (!this._http.isComplete()) return !this._paused;

    this.statusCode = this._http.statusCode;
    this.headers    = this._http.headers;

    if (this.statusCode === 200) {
      this.emit('connect', new Base.ConnectEvent());
    } else {
      var message = "Can't establish a connection to the server at " + this._origin.href;
      this.emit('error', new Error(message));
    }
    this.end();
    return !this._paused;
  },

  end: function(chunk) {
    if (!this.writable) return;
    if (chunk !== undefined) this.write(chunk);
    this.readable = this.writable = false;
    this.emit('close');
    this.emit('end');
  },

  destroy: function() {
    this.end();
  }
};

for (var key in instance)
  Proxy.prototype[key] = instance[key];

module.exports = Proxy;
