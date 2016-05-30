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
                    if (data.dateRange) {
                        data.dateRange = {
                            from: new Date(data.dateRange.from),
                            to: new Date(data.dateRange.to)
                        }
                    }
                } catch (e) {
                    console.log('ERROR parsing data from client', e);
                }
                if (data) {
                    posUpdate(data.pos, data.dateRange, connection);
                }
            } else {
                console.log('ERROR Received bad message type');
            }
        });
        connection.on('close', function(reasonCode, description) {
            console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
        });
    });

    var posUpdateCallback = function(pos, fn) {}

    function posUpdate(pos, dateRange, con) {
        if (pos.initialPos) {
            posUpdateCallback(pos.initialPos, dateRange, sendEvents);
        } else if (pos.newPos) {
            posUpdateCallback(pos.newPos, dateRange, sendEvents);
        } else {
            console.log('ERROR Invalid object received', pos);
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