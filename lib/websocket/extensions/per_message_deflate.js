var PerMessageDeflate = function() {
  this.name = 'permessage-deflate';
};

PerMessageDeflate.create = function() {
  return new this();
};

PerMessageDeflate.prototype.createSession = function(params) {
  return new Session(this, params);
};

var Session = function(extension, params) {
  this._ext    = extension;
  this._params = params;
};

Session.prototype.responseHeader = function() {
  return this._ext.name;
};

module.exports = PerMessageDeflate;
