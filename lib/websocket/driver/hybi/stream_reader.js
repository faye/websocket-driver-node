var Stream = require('stream').Stream,
    Concat = require('./concat'),
    util   = require('util');

var defer = (typeof setImmediate === 'function')
          ? setImmediate
          : process.nextTick;

var StreamReader = function(options, parent) {
  this.readable   = !!parent;
  this.writable   = !parent;
  this._streams   = [];
  this._context   = options.context;
  this._parent    = parent;
  this._queue     = [];
  this._queueSize = 0;
  this._cursor    = 0;
};
util.inherits(StreamReader, Stream);

StreamReader.prototype.write = function(buffer) {
  if (!this.writable) return false;
  if (!buffer || buffer.length === 0) return !this._paused;

  if (!buffer.copy) buffer = new Buffer(buffer);

  this._queue.push(buffer);
  this._queueSize += buffer.length;
  this._flush();

  return !this._paused;
};

StreamReader.prototype.end = function(buffer) {
  if (buffer) this.write(buffer);
  this.writable = false;

  for (var i = 0, n = this._streams.length; i < n; i++) {
    this._streams[i].emit('end');
    this._streams[i].readable = false;
  }

  this._context = this._streams = this._queue = [];
};

StreamReader.prototype.pause = function() {
  this._paused = true;
  if (this._parent) this._parent.pause();
};

StreamReader.prototype.resume = function() {
  this._paused = false;
  this.emit('drain');
  if (this._parent) this._parent.resume();
};

StreamReader.prototype.fork = function(length) {
  if (!this.writable) return null;

  var stream = new StreamReader({context: this._context}, this),
      self   = this;

  stream._remaining = length;
  this._streams.push(stream);
  defer(function() { self._flush() });

  return stream;
};

StreamReader.prototype.read = function(length, callback) {
  if (!this.writable) return;

  if (this._queueSize >= length)
    return callback.call(this._context, this._readBytes(length));

  this.fork(length).pipe(new Concat(callback, this._context));
};

StreamReader.prototype._flush = function() {
  var streams = this._streams, stream, size, buffer;

  while (streams.length > 0) {
    stream = streams[0];
    size   = Math.min(stream._remaining, this._queueSize);
    buffer = this._readBytes(size);

    if (size > 0) stream.emit('data', buffer);
    stream._remaining -= size;

    if (stream._remaining > 0) break;

    stream.readable = false;
    stream.emit('end');
    streams.shift();
  }
};

StreamReader.prototype._readBytes = function(length) {
  var queue  = this._queue,
      remain = length,
      n      = queue.length,
      first  = queue[0],
      i      = 0,
      buffer, chunk, size;

  if (length === 0) return new Buffer(0);

  if (remain <= first.length - this._cursor) {
    buffer = first.slice(this._cursor, this._cursor + remain);

    this._queueSize -= remain;
    this._cursor     = (this._cursor + remain) % first.length;
    if (this._cursor === 0) this._queue.shift();

    return buffer;
  }

  buffer = new Buffer(length);

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
