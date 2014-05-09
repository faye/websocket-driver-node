var Headers = function() {
  this._sent  = {};
  this._lines = [];
};

Headers.parseHeader = function(header) {
  if (!header) return [];

  return header.split(/\s*,\s*/).map(function(value) {
    var parts  = value.split(/\s*;\s*/),
        name   = parts.shift(),
        params = {};

    parts.forEach(function(part) {
      var pair = part.split(/\s*=\s*/);
      params[pair[0]] = pair[1] || true;
    });
    return {name: name, params: params};
  });
};

Headers.prototype.ALLOWED_DUPLICATES = ['set-cookie', 'set-cookie2', 'warning', 'www-authenticate']

Headers.prototype.set = function(name, value) {
  if (value === undefined) return;

  name = this._strip(name);
  value = this._strip(value);

  var key = name.toLowerCase();
  if (!this._sent.hasOwnProperty(key) || this.ALLOWED_DUPLICATES.indexOf(key) < 0) {
    this._sent[key] = true;
    this._lines.push(name + ': ' + value + '\r\n');
  }
};

Headers.prototype.toString = function() {
  return this._lines.join('');
};

Headers.prototype._strip = function(string) {
  return string.toString().replace(/^ */, '').replace(/ *$/, '');
};

module.exports = Headers;

