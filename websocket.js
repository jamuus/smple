module.exports = function(httpServer) {
    var WebSocketServer = require('websocket').server;

    wsServer = new WebSocketServer({
        httpServer: httpServer,
        options: {
            secure: true
        }
    });

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

    var posUpdateCallback = function(pos, fn) {}

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