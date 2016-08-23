'use strict';

module.exports = {
  bootstrap: function($allonsy, $options, $done) {
    if ($options.owner == 'start') {
      $allonsy.watcher('Allons-y Express', 'models/*-@(model|factory|factory-back|service|service-back).js');
    }

    $done();
  }
};

