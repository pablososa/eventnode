#!/bin/env node
var express = require('express');
var http = require('http');
var io = require('socket.io');

/**
 *  Define the sample application.
 */
var EventsApp = function () {

    //  Scope.
    var self = this;

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function () {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP || "192.168.0.104";
        self.port = process.env.OPENSHIFT_NODEJS_PORT || 8000;
    };

    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function (sig) {
        if (typeof sig === "string") {
            console.log('%s: Received %s - terminating sample app ...',
                Date(Date.now()), sig);
            process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()));
    };

    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function () {
        //  Process on exit and signals.
        process.on('exit', function () {
            self.terminator();
        });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
            'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function (element, index, array) {
                process.on(element, function () {
                    self.terminator(element);
                });
            });
    };

    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function () {
        self.app = express();

        self.http = http.Server(self.app);
        self.io = io.listen(self.http);

        self.io.on('connection', function (socket) {
            var channel = null;
            if (typeof socket.request._query.empresa_id != 'undefined') {
                channel = 'empresa_' + socket.request._query.empresa_id;
            } else if (typeof socket.request._query.viaje_id != 'undefined') {
                channel = 'viaje_' + socket.request._query.viaje_id;
            }
            if(channel !== null) {
                console.log('Connected to: ' + channel)
                socket.join(channel);
                socket.on('notificate', function (event) {
                    self.io.to(channel).emit(event.type, event.data);
                });
                socket.on('disconnect', function () {
                });
            } else {
                console.log("empresa_ID or viaje_ID must be present in the request");
            }
        });
    };

    /**
     *  Initializes the sample application.
     */
    self.initialize = function () {
        self.setupVariables();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };

    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function () {
        self.http.listen(self.port, self.ipaddress, function () {
            console.log('listening on ' + self.ipaddress + ':' + self.port);
        });
    };

};

/**
 *  main():  Main code.
 */
var eApp = new EventsApp();
eApp.initialize();
eApp.start();

