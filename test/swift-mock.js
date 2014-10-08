'use strict';

exports.loadAngularMocks = function () {
    browser.clearMockModules();
    browser.addMockModule('swiftBrowserE2E', function () {
        var ngMocks = document.createElement('script');
        ngMocks.src = 'bower_components/angular-mocks/angular-mocks.js';
        document.body.appendChild(ngMocks);

        var swiftSim = document.createElement('script');
        swiftSim.src = 'js/test/swift-simulator.js';
        document.body.appendChild(swiftSim);
    });
    browser.addMockModule('swiftBrowserE2E', function() {
        angular.module('swiftBrowserE2E').run(function(swiftSim) {
            swiftSim.reset();
        });
    });
};

exports.setContainers = function(containers) {
    /* Testing with Firefox revealed that the array passed in
       arguments[0] loses its "own properties" when passed into the
       browser. That is, running

         Object.getOwnPropertyNames(arguments[0])
         Object.getOwnPropertyNames(arguments[0][0])

       both return empty arrays in the function below. We can convert
       arguments[0] to an array, but the objects in the array (the
       data about individual containers) will be empty since their
       properties are no longer defined. Converting to and from JSON
       is a work-around for this.
    */
    browser.addMockModule('swiftBrowserE2E', function(jsonContainers) {
        angular.module('swiftBrowserE2E').run(function(swiftSim) {
            swiftSim.setContainers(JSON.parse(jsonContainers));
        });
    }, JSON.stringify(containers));
};

exports.setObjects = function(container, objects) {
    browser.addMockModule('swiftBrowserE2E', function(container, jsonObjects) {
        angular.module('swiftBrowserE2E').run(function(swiftSim) {
            swiftSim.setObjects(container, JSON.parse(jsonObjects));
        });
    }, container, JSON.stringify(objects));
};