var Stream = require('stream').Stream,
    util   = require('util');

var defer = (typeof setImmediate === 'function')
          ? setImmediate
          : process.nextTick;

var StreamReader = function(context) {
  this.writable   = true;
  this._ops       = [];
  this._context   = context;
  this._queue     = [];
  this._queueSize = 0;
  this._cursor    = 0;
};
util.inherits(StreamReader, Stream);

StreamReader.prototype.write = function(buffer) {
  if (!this.writable) return false;
  if (!buffer || buffer.length === 0) return true;

  if (!buffer.copy) buffer = new Buffer(buffer);

  this._queue.push(buffer);
  this._queueSize += buffer.length;
  this._flush();

  return true;
};

StreamReader.prototype.end = function(buffer) {
  if (buffer) this.write(buffer);
};

StreamReader.prototype.destroy = function() {
  this.writable = false;
  this._context = this._ops = this._queue = null;
};

StreamReader.prototype.read = function(length, callback) {
  if (!this.writable) return;

  var handler = function(self, buffer) {
    defer(function() { callback.call(self, buffer) });
  };

  if (length <= this._queueSize)
    handler(this._context, this._readBytes(length));
  else
    this._ops.push([length, handler]);
};

StreamReader.prototype._flush = function() {
  var ops = this._ops, op;

  while (ops.length > 0 && this._queueSize >= ops[0][0]) {
    op = ops.shift();
    op[1](this._context, this._readBytes(op[0]));
  }
};

StreamReader.prototype._readBytes = function(length) {
  var buffer = new Buffer(length),
      queue  = this._queue,
      remain = length,
      n      = queue.length,
      i      = 0,
      chunk, size;

  while (remain > 0 && i < n) {
    chunk = queue[i];
    size  = Math.min(remain, chunk.length - this._cursor);

    chunk.copy(buffer, length - remain, this._cursor, this._cursor + size);

    remain          -= size;
    this._queueSize -= size;
    this._cursor     = (this._cursor + size) % chunk.length;

    i += 1;
  }

  queue.splice(0, this._cursor === 0 ? i : i - 1);

  return buffer;
};

module.exports = StreamReader;
