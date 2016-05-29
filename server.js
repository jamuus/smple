// Run a minimal node.js web server for local development of a web site.
// Put this program in a site folder and start it with "node server.js".
// Then visit the site at the addresses printed on the console.
// The server is configured to match the most restrictive publishing sites.

// Load the web-server, file-system and file-path modules.
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');


// The default port numbers are the standard ones [80,443] for convenience.
// Change them to e.g. [8080,8443] to avoid privilege or clash problems.
var ports = [8081, 8443];

// The most common standard file extensions are supported.
// The most common non-standard file extensions are excluded, with a message.
var types = {
    '.html': 'text/html, application/xhtml+xml',
    '.css': 'text/css',
    '.ico': 'image/x-icon',
    '.js': 'application/javascript',
    '.png': 'image/png',
    '.mp3': 'audio/mpeg', // audio
    '.aac': 'audio/aac', // audio
    '.mp4': 'video/mp4', // video
    '.webm': 'video/webm', // video
    '.gif': 'image/gif', // only if imported unchanged
    '.jpeg': 'image/jpeg', // only if imported unchanged
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain', // plain text only
    '.xhtml': '#not suitable for dual delivery, use .html',
    '.htm': '#proprietary, non-standard, use .html',
    '.jpg': '#common but non-standard, use .jpeg',
    '.rar': '#proprietary, non-standard, platform dependent, use .zip',
    '.doc': '#proprietary, non-standard, platform dependent, ' +
        'closed source, unstable over versions and installations, ' +
        'contains unsharable personal and printer preferences, use .pdf',
};

var clientService = require('./websocket.js');
var db = require('./mongowrapper');
var sk = require('./songkick.js');

// called when a client requests a new set of data, either new date or new center position
function updateEvents(pos, dateRange, fn) {
    db.getNearPlaces(pos, dateRange, (err, data) => {
        if (err) {
            console.log('ERROR getting nearby events', err);
        } else {
            fn(data);
        }
    });

    // check whether cache needs updating

    // get nearest area list
    sk.nearestAreas(pos, (err, areas) => {
        // go through and check each areas existance or last updated field
        for (var areaName in areas) {
            var area = areas[areaName];
            (function(area, areaName) {
                db.getAreaLastUpdated(area, (err, _area) => {
                    if (err) {
                        console.log('ERROR getting areas', err);
                    } else {
                        var updateDate = new Date();
                        updateDate.setDate(updateDate.getDate() - 1);

                        if (!_area || _area.lastUpdated < updateDate) {
                            var t = {};
                            t[areaName] = area;
                            sk.updateAreas(t, db, () => {});
                            console.log('Updating area', areaName);

                            db.addArea(area, (err, stats) => {
                                if (err) console.log('ERROR saving area', err);
                            });
                        }
                    }
                    // console.log('area2', err, _area);
                });
            })(area, areaName);
        }
    });
}

// Start both the http and https services.  Requests can only come from
// localhost, for security.  (This can be changed to a specific computer, but
// shouldn't be removed, otherwise the site becomes public.)
function start() {
    test();
    var httpService = http.createServer(serve);
    httpService.listen(ports[0], '0.0.0.0');

    var options = {
        key: key,
        cert: cert
    };
    var httpsService = https.createServer(options, serve);
    httpsService.listen(ports[1], '0.0.0.0');

    var clients = clientService(httpsService);
    clients.onNewPos(updateEvents);

    printAddresses();
}

// Print out the server addresses.
function printAddresses() {
    var httpAddress = "http://0.0.0.0";
    if (ports[0] != 80) httpAddress += ":" + ports[0];
    httpAddress += "/";
    var httpsAddress = "https://0.0.0.0";
    if (ports[1] != 443) httpsAddress += ":" + ports[1];
    httpsAddress += "/";
    console.log('Server running at', httpAddress, 'and', httpsAddress);
}

// Response codes: see http://en.wikipedia.org/wiki/List_of_HTTP_status_codes
var OK = 200,
    Redirect = 307,
    NotFound = 404,
    BadType = 415,
    Error = 500;

// Succeed, sending back the content and its type.
function succeed(response, type, content) {
    var typeHeader = {
        'Content-Type': type
    };
    response.writeHead(OK, typeHeader);
    response.write(content);
    response.end();
}

// Tell the browser to try again at a different URL.
function redirect(response, url) {
    var locationHeader = {
        'Location': url
    };
    response.writeHead(Redirect, locationHeader);
    response.end();
}

// Give a failure response with a given code.
function fail(response, code) {
    response.writeHead(code);
    response.end();
}

// Serve a single request.  A URL ending with / is treated as a folder and
// index.html is added.  A file name without an extension is reported as an
// error (because we don't know how to deliver it, or if it was meant to be a
// folder, it would inefficiently have to be redirected for the browser to get
// relative links right).
function serve(request, response) {
    var file = request.url;
    if (ends(file, '/')) file = file + 'index.html';
    file = "." + file;
    var type = findType(request, path.extname(file));
    if (!type) return fail(response, BadType);
    if (!inSite(file)) return fail(response, NotFound);
    if (!matchCase(file)) return fail(response, NotFound);
    if (!noSpaces(file)) return fail(response, NotFound);
    try {
        fs.readFile(file, ready);
    } catch (err) {
        return fail(response, Error);
    }

    function ready(error, content) {
        if (error) return fail(response, NotFound);
        succeed(response, type, content);
    }
}

// Find the content type (MIME type) to respond with.
// Content negotiation is used for XHTML delivery to new/old browsers.
function findType(request, extension) {
    var type = types[extension];
    if (!type) return type;
    if (extension != ".html") return type;
    var htmlTypes = types[".html"].split(", ");
    var accepts = request.headers['accept'] ? request.headers['accept'].split(",") : "";
    if (accepts.indexOf(htmlTypes[1]) >= 0) return htmlTypes[1];
    return htmlTypes[0];
}

// Check whether a string starts with a prefix, or ends with a suffix
function starts(s, x) {
    return s.lastIndexOf(x, 0) == 0;
}

function ends(s, x) {
    return s.indexOf(x, s.length - x.length) == 0;
}

// Check that a file is inside the site.  This is essential for security.
var site = fs.realpathSync('.') + path.sep;

function inSite(file) {
    var real;
    try {
        real = fs.realpathSync(file);
    } catch (err) {
        return false;
    }
    return starts(real, site);
}

// Check that the case of a path matches the actual case of the files.  This is
// needed in case the target publishing site is case-sensitive, and you are
// running this server on a case-insensitive file system such as Windows or
// (usually) OS X on a Mac.  The results are not (yet) cached for efficiency.
function matchCase(file) {
    var parts = file.split('/');
    var dir = '.';
    for (var i = 1; i < parts.length; i++) {
        var names = fs.readdirSync(dir);
        if (names.indexOf(parts[i]) < 0) return false;
        dir = dir + '/' + parts[i];
    }
    return true;
}

// Check that a name contains no spaces.  This is because spaces are not
// allowed in URLs without being escaped, and escaping is too confusing.
// URLS with other special characters are also not allowed.
function noSpaces(name) {
    return (name.indexOf(' ') < 0);
}

// Do a few tests.
function test() {
    if (!fs.existsSync('./index.html')) failTest('no index.html page found');
    if (!inSite('./index.html')) failTest('inSite failure 1');
    if (inSite('./../site')) failTest('inSite failure 2');
    if (!matchCase('./index.html')) failTest('matchCase failure');
    if (matchCase('./Index.html')) failTest('matchCase failure');
    if (!noSpaces('./index.html')) failTest('noSpaces failure');
    if (noSpaces('./my index.html')) failTest('noSpaces failure');
}

function failTest(s) {
    console.log(s);
    process.exit(1);
}

// A dummy key and certificate are provided for https.
// They should not be used on a public site because they are insecure.
// They are effectively public, which private keys should never be.
// var key =
//     "-----BEGIN RSA PRIVATE KEY-----\n" +
//     "MIICXAIBAAKBgQDGkGjkLwOG9gkuaBFj12n+dLc+fEFk1ns60vsE1LNTDtqe87vj\n" +
//     "3cTMPpsSjzZpzm1+xQs3+ayAM2+wkhdjhthWwiG2v2Ime2afde3iFzA93r4UPlQv\n" +
//     "aDVET8AiweE6f092R0riPpaG3zdx6gnsnNfIEzRH3MnPUe5eGJ/TAiwxsQIDAQAB\n" +
//     "AoGAGz51JdnNghb/634b5LcJtAAPpGMoFc3X2ppYFrGYaS0Akg6fGQS0m9F7NXCw\n" +
//     "5pOMMniWsXdwU6a7DF7/FojJ5d+Y5nWkqyg7FRnrR5QavIdA6IQCIq8by9GRZ0LX\n" +
//     "EUpgIqE/hFbbPM2v2YxMe6sO7E63CU2wzSI2aYQtWCUYKAECQQDnfABYbySAJHyR\n" +
//     "uxntTeuEahryt5Z/rc0XRluF5yUGkaafiDHoxqjvirN4IJrqT/qBxv6NxvKRu9F0\n" +
//     "UsQOzMpJAkEA25ff5UQRGg5IjozuccopTLxLJfTG4Ui/uQKjILGKCuvnTYHYsdaY\n" +
//     "cZeVjuSJgtrz5g7EKdOi0H69/dej1cFsKQJBAIkc/wti0ekBM7QScloItH9bZhjs\n" +
//     "u71nEjs+FoorDthkP6DxSDbMLVat/n4iOgCeXRCv8SnDdPzzli5js/PcQ9kCQFWX\n" +
//     "0DykGGpokN2Hj1WpMAnqBvyneXHMknaB0aXnrd/t7b2nVBiVhdwY8sG80ODBiXnt\n" +
//     "3YZUKM1N6a5tBD5IY2kCQDIjsE0c39OLiFFnpBwE64xTNhkptgABWzN6vY7xWRJ/\n" +
//     "bbMgeh+dQH20iq+O0dDjXkWUGDfbioqtRClhcyct/qE=\n" +
//     "-----END RSA PRIVATE KEY-----\n";

// var cert =
//     "-----BEGIN CERTIFICATE-----\n" +
//     "MIIClTCCAf4CCQDwoLa5kuCqOTANBgkqhkiG9w0BAQUFADCBjjELMAkGA1UEBhMC\n" +
//     "VUsxDTALBgNVBAgMBEF2b24xEDAOBgNVBAcMB0JyaXN0b2wxDDAKBgNVBAoMA1VP\n" +
//     "QjEZMBcGA1UECwwQQ29tcHV0ZXIgU2NpZW5jZTESMBAGA1UEAwwJbG9jYWxob3N0\n" +
//     "MSEwHwYJKoZIhvcNAQkBFhJub25lQGNzLmJyaXMuYWMudWswHhcNMTMwNDA4MDgy\n" +
//     "NjE2WhcNMTUwNDA4MDgyNjE2WjCBjjELMAkGA1UEBhMCVUsxDTALBgNVBAgMBEF2\n" +
//     "b24xEDAOBgNVBAcMB0JyaXN0b2wxDDAKBgNVBAoMA1VPQjEZMBcGA1UECwwQQ29t\n" +
//     "cHV0ZXIgU2NpZW5jZTESMBAGA1UEAwwJbG9jYWxob3N0MSEwHwYJKoZIhvcNAQkB\n" +
//     "FhJub25lQGNzLmJyaXMuYWMudWswgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGB\n" +
//     "AMaQaOQvA4b2CS5oEWPXaf50tz58QWTWezrS+wTUs1MO2p7zu+PdxMw+mxKPNmnO\n" +
//     "bX7FCzf5rIAzb7CSF2OG2FbCIba/YiZ7Zp917eIXMD3evhQ+VC9oNURPwCLB4Tp/\n" +
//     "T3ZHSuI+lobfN3HqCeyc18gTNEfcyc9R7l4Yn9MCLDGxAgMBAAEwDQYJKoZIhvcN\n" +
//     "AQEFBQADgYEAQo4j5DAC04trL3nKDm54/COAEKmT0PGg87BvC88S5sTsWTF4jZdj\n" +
//     "dgxV4FeBF6hW2pnchveJK4Kh56ShKF8SK1P8wiqHqV04O9p1OrkB6GxlIO37eq1U\n" +
//     "xQMaMCUsZCWPP3ujKAVL7m3HY2FQ7EJBVoqvSvqSaHfnhog3WpgdyMw=\n" +
//     "-----END CERTIFICATE-----\n";



// signed by letsencrypt for smple.uk
var cert = '-----BEGIN CERTIFICATE-----\n' +
    'MIIE9DCCA9ygAwIBAgISAzAOjysm7KpQH9yOFEVs2PT2MA0GCSqGSIb3DQEBCwUA\n' +
    'MEoxCzAJBgNVBAYTAlVTMRYwFAYDVQQKEw1MZXQncyBFbmNyeXB0MSMwIQYDVQQD\n' +
    'ExpMZXQncyBFbmNyeXB0IEF1dGhvcml0eSBYMzAeFw0xNjA1MjgxMzU2MDBaFw0x\n' +
    'NjA4MjYxMzU2MDBaMBMxETAPBgNVBAMTCHNtcGxlLnVrMIIBIjANBgkqhkiG9w0B\n' +
    'AQEFAAOCAQ8AMIIBCgKCAQEAwUtL/BQoeoihiRfx6WdJxFSpE9teCIXwaVN/WuzW\n' +
    'bq+pEghQ3gluV9H4GPoh6IXYo+saSw1+iliTRpturLOJv7LvHBdJ2h1ttzonNrta\n' +
    '094kPBC/S1tiyieiVdkeyM10tb4dFhPNKw+Loak1o1XYVwzgFNd3jaqMoxNUV3D7\n' +
    'MQGebuKI3xkeZVjIGtdBq/vBmwtg039emHUnj0lewRkIZ8a7dJlvvZnp1vOzMm8u\n' +
    '87GthUpyJ0D2RYvCRbcm5c7LS8rM7Cy97nQQjaHOv2LZMv1OLV1YbLmFRRz5N4s+\n' +
    'USb86DMaD9LZV++DBL5iws8ZrxMEGBa+Y7ppo3m2u0AhtQIDAQABo4ICCTCCAgUw\n' +
    'DgYDVR0PAQH/BAQDAgWgMB0GA1UdJQQWMBQGCCsGAQUFBwMBBggrBgEFBQcDAjAM\n' +
    'BgNVHRMBAf8EAjAAMB0GA1UdDgQWBBS91hzYYo6vXWXkGU6XL+1rrhoRkDAfBgNV\n' +
    'HSMEGDAWgBSoSmpjBH3duubRObemRWXv86jsoTBwBggrBgEFBQcBAQRkMGIwLwYI\n' +
    'KwYBBQUHMAGGI2h0dHA6Ly9vY3NwLmludC14My5sZXRzZW5jcnlwdC5vcmcvMC8G\n' +
    'CCsGAQUFBzAChiNodHRwOi8vY2VydC5pbnQteDMubGV0c2VuY3J5cHQub3JnLzAT\n' +
    'BgNVHREEDDAKgghzbXBsZS51azCB/gYDVR0gBIH2MIHzMAgGBmeBDAECATCB5gYL\n' +
    'KwYBBAGC3xMBAQEwgdYwJgYIKwYBBQUHAgEWGmh0dHA6Ly9jcHMubGV0c2VuY3J5\n' +
    'cHQub3JnMIGrBggrBgEFBQcCAjCBngyBm1RoaXMgQ2VydGlmaWNhdGUgbWF5IG9u\n' +
    'bHkgYmUgcmVsaWVkIHVwb24gYnkgUmVseWluZyBQYXJ0aWVzIGFuZCBvbmx5IGlu\n' +
    'IGFjY29yZGFuY2Ugd2l0aCB0aGUgQ2VydGlmaWNhdGUgUG9saWN5IGZvdW5kIGF0\n' +
    'IGh0dHBzOi8vbGV0c2VuY3J5cHQub3JnL3JlcG9zaXRvcnkvMA0GCSqGSIb3DQEB\n' +
    'CwUAA4IBAQCUnG3MSxeZCBtf5Y0Zf6yo/mcBeiX+r6J6U8HvlFG5TmbHl/lhhiRv\n' +
    'naTDidH90aS1KZw3iRHytG1fcC2rwgZPFr51j90IkSo1YuSuI5JmD63i7q8Fc3NV\n' +
    'hNAtwDK1nBMg+Plgec76YL7xc3ILvYrxKujC0CrkdUZ/NJqqUjssjVsbFxFTuuUW\n' +
    '9H2uZv9xcsIfXVfsTGWya3Z2EOnBaIO59/dQMTqErIOP+2KoPJIdnepWn4hjFQxR\n' +
    'v62vJMk/1S8vWswHu12KPELfNd8WQ0qMjMD6iEg8ouCmwvGdayULhQcYqq+yj96E\n' +
    'VycP9I9DhoJDpg6dDT8jUph1kTzurAZs\n' +
    '-----END CERTIFICATE-----\n';
var key = '-----BEGIN PRIVATE KEY-----\n' +
    'MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDBS0v8FCh6iKGJ\n' +
    'F/HpZ0nEVKkT214IhfBpU39a7NZur6kSCFDeCW5X0fgY+iHohdij6xpLDX6KWJNG\n' +
    'm26ss4m/su8cF0naHW23Oic2u1rT3iQ8EL9LW2LKJ6JV2R7IzXS1vh0WE80rD4uh\n' +
    'qTWjVdhXDOAU13eNqoyjE1RXcPsxAZ5u4ojfGR5lWMga10Gr+8GbC2DTf16YdSeP\n' +
    'SV7BGQhnxrt0mW+9menW87Myby7zsa2FSnInQPZFi8JFtyblzstLyszsLL3udBCN\n' +
    'oc6/Ytky/U4tXVhsuYVFHPk3iz5RJvzoMxoP0tlX74MEvmLCzxmvEwQYFr5jummj\n' +
    'eba7QCG1AgMBAAECggEAUilAXiDvZ85F43EjKdP2nhZiXAdlu/e6zfpo6uw65YeT\n' +
    'NRAF16tolLmyXGOOIDkscdiQL5DH1eR6jYuqCoyyI6LaUjVv9d+GcFiurGwM2nvV\n' +
    'KRbxSQXKQyV/sj/8/tueHVZ3JJg8IG6WKpwzKX9m2vGlGhbQQY5aA0NHGXfzvcs1\n' +
    'wvnoxrN62KQGl1XAha8ByvzOydA9N5JuxGXtUzPtSP0XpOi44TfOl6dXtzJ9YoGK\n' +
    'TPBjLyq1m44HEsFk55RWGRVH/azoJ2pbzMhukEpzHabC/8Lt0kRiahrESsVjWSfo\n' +
    'me5+GHgVDQHmaA4wJGmwh/mCpZ30jtN8WNYH4RkpLQKBgQDvJWVouU1VblQQTnL5\n' +
    'fzrziLN4w85GsdzbaEEuH+accOmDLZx6MO/s/WrJuSPVCTWy8tV2nNl1hDzI0NFM\n' +
    's3DRwiv+eHdvFSixwXuxg9QwGs+8smHQFzUICcqWc4Lf/z1gVt8cU/o3r31ropiz\n' +
    'qn8hp0XI0NZC/w4/MbLlCOb5fwKBgQDO6qc1OTF+GpDSyRblYWyV2TuFcvpfWmYQ\n' +
    'HfuclxOhpt9raMaOvBFdil2IZadkDWWhiXjjGZKycR8p0xIO7+w1RsxCK5QZALt3\n' +
    'I9E+SBxDJFiuSRw3HOW4WFwh7UUtGohSTnP/unKeucJ61fE6ERAsgdwv06Es5WS9\n' +
    'vEZZNUi2ywKBgHV75ang/sDthpbMM2emvYtOqPy3FOteDaYsPXkvateIEO/ExI6y\n' +
    '4+uFQ6T+M0BBWgQjkALJY3t8D3CIRYpszQv/XCWTgPktZ+SLrPy0StWnFk8ZQzw7\n' +
    'am4cgU4QSUdJ2RkvFESSbOZWbEMoieQZ6oLZ7kqNbfVT3+fjvoMOMIp5AoGADVh/\n' +
    'LmSg95Q5EQ9dRbAx87xOJX5T/cBz4sg8SU5JOtzrfh8E54Hj0NeyzrBXypE+o9ud\n' +
    'C3DD0HSRYP43JPV+k7UcSYxMAgzVCosp3M2D3STD/4HBqyBXBLvWPW3zT0Rt1Hkw\n' +
    '7CaXa/tpOsj/xRICrAw4KnGI7L9i7wXst6ZDKV8CgYBu+jl7Sy8/3xdotjMogOe4\n' +
    'ln9iWwuy1p8K0vu2ThUaPYniOVJ9NKWHyizYj7vaW/sABYmbW3PHxLfh6G0ezsf1\n' +
    'dvGV23ym4Z85iFbHdjFwGkns9bHaPUcrjixeQTvnjpJMrDQv7gQ5fp61gMIK4aCf\n' +
    '0ojh5ISJGvmItQoMtw3/5Q==\n' +
    '-----END PRIVATE KEY-----\n';

// Start everything going.
start();