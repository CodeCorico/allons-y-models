module.exports = function() {
  'use strict';

  var isNode = typeof module != 'undefined' && typeof module.exports != 'undefined',
      events = isNode ? require('events-manager').EventsManager : window.EventsManager;

  DependencyInjection.service('$AbstractService', [function() {

    return function AbstractService() {

      var _RETRY_TIME = {
            INCREMENT: 1000,
            MAX: 3000
          },

          _this = this,
          _init = false,
          _config = {};

      events.call(this);

      this.isNode = function() {
        return isNode;
      };

      this.front = function(callback) {
        if (!isNode) {
          callback.apply(_this);
        }
      };

      this.back = function(callback) {
        if (isNode) {
          callback.apply(_this);
        }
      };

      this.frontBack = function(front, back) {
        return isNode ? back.apply(_this) : front.apply(_this);
      };

      this.methodFrontBack = function(front, back) {
        return isNode ? back : front;
      };

      this.isInit = function() {
        return _init;
      };

      this.init = function(args) {
        return new window.Ractive.Promise(function(fulfil) {
          if (_init) {
            return fulfil();
          }

          _init = true;

          _this.fire('init', args, fulfil);
        });
      };

      this.teardown = function(args, callback) {
        if (!_init) {
          if (callback) {
            callback();
          }

          return;
        }

        _init = false;

        _this.fire('beforeTeardown', args, function() {
          _this.fire('teardown', args, function() {
            if (callback) {
              callback();
            }
          });
        });
      };

      this.config = function(name, value) {
        if (typeof name == 'undefined') {
          return _config;
        }

        if (typeof value != 'undefined') {
          _config[name] = value;

          this.fire(name + 'ConfigChanged', {
            value: value
          });
        }

        return _config[name];
      };

      function _retryEmit(returnArgs, $socket, event, args, filterFunc, useFilterFunc) {
        useFilterFunc = typeof useFilterFunc == 'undefined' ? true : useFilterFunc;

        if (!returnArgs.error) {
          return;
        }

        returnArgs._message = returnArgs._message || {};
        returnArgs._message._tries = (returnArgs._message._tries || 0) + 1;

        if (_init && (!useFilterFunc || (filterFunc ? filterFunc(returnArgs) : true))) {
          args._tries = returnArgs._message._tries;

          setTimeout(function() {
            _this.retryEmitOnError($socket, event, args, filterFunc);
          }, Math.min(_RETRY_TIME.MAX, returnArgs._message._tries * _RETRY_TIME.INCREMENT));
        }
      }

      this.retryEmitOnError = function($socket, event, args, filterFunc) {
        var returnMessage = 'read(' + event.split('(')[1];

        if (!$socket.connected) {
          var returnArgs = {
            error: 'Server disconnected',
            isOwner: true,
            _message: $.extend(true, {}, args)
          };

          _retryEmit(returnArgs, $socket, event, args, filterFunc, true);

          var callbacks = $socket._callbacks['$' + returnMessage];
          if (callbacks) {
            callbacks.forEach(function(callback) {
              callback(returnArgs);
            });
          }

          return;
        }

        $socket.once(returnMessage, function(returnArgs) {
          _retryEmit(returnArgs, $socket, event, args, filterFunc, true);
        });

        $socket.emit(event, args);
      };

    };
  }]);

};
