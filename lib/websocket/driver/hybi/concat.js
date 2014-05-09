var Stream = require('stream').Stream,
    util   = require('util');

var Concat = function(callback, context) {
  this._callback = callback;
  this._context  = context;
  this._chunks   = [];
  this._size     = 0;
  this.writable  = true;
};
util.inherits(Concat, Stream);

Concat.prototype.write = function(buffer) {
  if (!this.writable) return false;
  this._chunks.push(buffer);
  this._size += buffer.length;
  return true;
};

Concat.prototype.end = function(buffer) {
  if (buffer) this.write(buffer);
  this.writable = false;
  this._callback.call(this._context, Concat.concatBuffers(this._chunks, this._size));
};

Concat.concatBuffers = function(chunks, size) {
  if (size === undefined) {
    size = 0;
    var c = chunks.length;
    while (c--) size += chunks[c].length;
  }

  var concat = new Buffer(size),
      offset = 0;

  for (var i = 0, n = chunks.length; i < n; i++) {
    chunks[i].copy(concat, offset);
    offset += chunks[i].length;
  }
  return concat;
};

Concat.prototype.destroy = function() {};

module.exports = Concat;
