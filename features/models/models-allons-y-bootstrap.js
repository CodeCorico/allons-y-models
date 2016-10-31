'use strict';

module.exports = {
  bootstrap: function($allonsy, $options, $done) {
    if (!$options.owner || $options.owner != 'start') {
      return $done();
    }

    $allonsy.watcher('Allons-y Express', 'models/*-@(model|factory|factory-back|service|service-back|after-init|before-init).js');

    $done();
  }
};

