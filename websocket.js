module.exports = function(httpServer) {
    var WebSocketServer = require('websocket').server;
    var http = require('http');

    // var server = http.createServer(function(request, response) {
    //     console.log((new Date()) + ' Received request for ' + request.url);
    //     response.writeHead(404);
    //     response.end();
    // });
    // server.listen(8080, function() {
    //     console.log((new Date()) + ' Server is listening on port 8080');
    // });

    wsServer = new WebSocketServer({
        httpServer: httpServer
    });

    function originIsAllowed(origin) {
        // put logic here to detect whether the specified origin is allowed. 
        return true;
    }

    wsServer.on('request', function(request) {
        var connection = request.accept('p1', request.origin);
        console.log((new Date()) + ' Connection accepted.');

        connection.on('message', function(message) {
            if (message.type === 'utf8') {
                var data;
                try {
                    data = JSON.parse(message.utf8Data);
                } catch (e) {
                    console.log('ERROR parsing data from client', err);
                }
                if (data) {
                    posUpdate(data, connection);
                }
            } else {
                console.log('Received bad message type');
            }
        });
        connection.on('close', function(reasonCode, description) {
            console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        });
    });

    // called when a web client needs updated event data
    // fn will be a function to call with the events to send back

    var posUpdateCallback = function(pos, fn) {
        console.log('Dummy', pos, fn);
    }

    function posUpdate(pos, con) {
        if (pos.initialPos) {
            posUpdateCallback(pos.initialPos, sendEvents);
        } else if (pos.newPos) {
            posUpdateCallback(pos.newPos, sendEvents);
        } else {
            console.log('Invalid pos object received', pos);
        }

        function sendEvents(events) {
            con.send(JSON.stringify(events));
        }
    }

    return {
        onNewPos: function(fn) {
            posUpdateCallback = fn;
        }
    }
};

if (!module.parent) {
    console.log('Starting as standalone');
    var t = module.exports();
    t.onNewPos(function(pos, fn) {
        console.log(pos, fn(pos));
    });
}