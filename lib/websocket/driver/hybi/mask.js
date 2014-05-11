var Stream = require('stream').Stream,
    util   = require('util');

var Mask = function(bytes) {
  this.readable = this.writable = true;

  this._bytes = bytes;
  this._index = 0;
};
util.inherits(Mask, Stream);

Mask.mask = function(payload, mask, offset, index) {
  offset = offset || 0;
  index  = index  || 0;

  for (var i = 0, n = payload.length - offset; i < n; i++)
    payload[offset + i] ^= mask[(index + i) % 4];
};

Mask.prototype.write = function(chunk) {
  Mask.mask(chunk, this._bytes, 0, this._index);
  this._index = (this._index + chunk.length) % 4;
  this.emit('data', chunk);
  return !this._paused;
};

Mask.prototype.end = function(chunk) {
  if (chunk) this.write(chunk);
  this.readable = this.writable = false;
  this.emit('end');
};

Mask.prototype.pause = function() {
  this._paused = true;
};

Mask.prototype.resume = function() {
  this._paused = false;
  this.emit('drain');
};

module.exports = Mask;

