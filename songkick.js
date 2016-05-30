'use strict';

let songkickApikey = 'QNx6YgjKNSA5gGs5';
var googleApiKey = 'AIzaSyDbgYeUer3RCMYNeRR5yMV_t6RtNug_Hu4';
let lastfmApiKey = '87f6734e61f01465bdd78f72d81de0bd';
var fs = require('fs');


let request = require('request');

function getSongkickLocations(pos, callback) {
    let songkickLocationUrl = 'http://api.songkick.com/api/3.0/search/locations.json?location=geo:' +
        pos.lat + ',' + pos.lng +
        '&apikey=' + songkickApikey;
    request(songkickLocationUrl, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            let data = JSON.parse(body);
            if (data.resultsPage.status === 'ok') {
                callback(null, data.resultsPage.results);
            } else {
                callback('ERROR getting nearby locations');
            }
        } else {
            callback('ERROR ' + error + ' apistatus: ' + response.statusCode);
        }
    });
}

function getEventDataFromAreas(areas, callback) {
    var events = [];
    var cbInit = false;
    for (var areaName in areas) {
        let areaInfo = areas[areaName];

        getAreaConcertData(areaInfo, 1, (err, eventInfo) => {
            if (err) {
                console.log(err);
            } else {
                events.push(eventInfo);

                if (!cbInit) {
                    callback((cb2) => {
                        parseEventData(events[0], (err, d) => {
                            events.splice(0, 1);
                            cb2(d, events.length);
                        });
                    });
                    cbInit = true;
                }
            }
        });
    }
}


function parseLocations(pos, data, callback) {
    var areasToGet = {};
    for (var i in data.location) {
        let loc = data.location[i];
        let metroArea = loc.metroArea;
        let city = loc.city;
        let distToArea = getDistanceFromLatLonInKm(metroArea.lat, metroArea.lng, pos.lat, pos.lng);
        if (distToArea < 10) {
            areasToGet[metroArea.displayName] = metroArea;
        }
    }
    callback(areasToGet);
}

function eventUrl(id, page) {
    if (!page) page = 1;
    return 'http://api.songkick.com/api/3.0/metro_areas/' + id + '/calendar.json?apikey=' + songkickApikey + '&page=' + page;
}

function getAreaConcertData(area, page, callback) {
    request(eventUrl(area.id, page), function(err, resp, body) {
        if (err) {
            callback('ERROR getting event info ' + err);
        } else {
            let events = JSON.parse(body);
            if (events.resultsPage.status === 'ok') {
                for (var i in events.resultsPage.results.event) {
                    callback(null, events.resultsPage.results.event[i]);
                }

                let numEvents = events.resultsPage.totalEntries;
                let numPages = Math.ceil(numEvents / events.resultsPage.perPage);
                if (page < numPages) {
                    getAreaConcertData(area, page + 1, callback);
                }
            } else {
                callback('ERROR area event response ' + events.resultsPage.status);
            }
        }
    });
}


function parseEventData(event, callback) {
    let eventInfo = {};
    eventInfo.title = event.displayName;
    eventInfo.location = event.location;
    eventInfo.bands = [];

    eventInfo.eventInfo = {
        title: event.venue.displayName,
        ticketUrl: event.uri,
        venueUrl: event.venue.uri,
        address: '',
        date: event.start.date,
    };

    reverseGeocodeLatlng(eventInfo.location, parseBandInfo);

    function parseBandInfo(err, stringLocation) {
        if (err)
            console.log('SK ERROR reverse geo', err);
        eventInfo.eventInfo.address = stringLocation;

        let j = event.performance.length;
        for (var i in event.performance) {
            var band = event.performance[i];
            let bandName = band.artist.displayName;

            getArtistSongs(bandName, (err, uri) => {
                let artistSpotifyUri;
                let artistBio;
                let artistPic;

                if (err) {
                    artistSpotifyUri = null;
                } else {
                    artistSpotifyUri = uri;
                }

                getArtistInfo(bandName, (err, info) => {
                    if (err) {
                        artistBio = null;
                        artistPic = null;
                    } else {
                        artistBio = info.bio;
                        artistPic = info.artistPic;
                    }

                    eventInfo.bands.push({
                        name: bandName,
                        desc: artistBio,
                        spotifyUri: artistSpotifyUri,
                        fullimage: artistPic ? artistPic : 'images/placeholder.png',
                        thumbnail: artistPic ? artistPic : 'images/thumbnails/avatar.svg',
                    });

                    j--;
                    if (j === 0)
                        callback(null, eventInfo);
                });
            });
        }
    }
}


function getArtistSongs(artistName, callback) {
    artistName = escape(artistName);
    let spotifyUrl = 'https://api.spotify.com/v1/search?q=' + artistName + '&type=artist';

    request(spotifyUrl, function(err, resp, body) {
        if (err) {
            callback('ERROR getting spotify url ' + err);
        } else {
            let data;

            try {
                data = JSON.parse(body);
            } catch (e) {
                console.log('SPOTIFY ERROR JSON parse', e);
            }

            if (data) {
                if (data.error) {
                    callback('SPOTIFY ERROR api ' + data.error);
                } else {
                    if (data.artists.items.length > 0) {
                        let uri = data.artists.items[0].uri;
                        callback(null, uri);
                    } else {
                        callback('No results');
                    }
                }
            } else {
                callback('SPOTIFY ERROR parsing api body');
            }
        }
    });
}


function getArtistInfo(artistName, callback) {
    artistName = escape(artistName);
    var bioUrl = 'http://ws.audioscrobbler.com/2.0/\?method\=artist.getinfo\&artist\=' + artistName + '\&api_key\=' + lastfmApiKey + '\&format\=json';
    request(bioUrl, function(err, resp, body) {
        if (err) {
            console.log('ERROR getting artist bio from lastfm', err);
            callback(err);
        } else {
            let data;
            try {
                data = JSON.parse(body);
            } catch (e) {
                console.log('JSON parse error', e);
            }
            if (data) {
                if (data.artist) {
                    let bio = data.artist.bio.summary;
                    let artistPic;

                    for (var i in data.artist.image) {
                        var img = data.artist.image[i];
                        if (img.size === 'mega') artistPic = img['#text'];
                    }

                    callback(null, {
                        bio,
                        artistPic
                    });
                } else {
                    callback('No artist found');
                }
            } else {
                callback('JSON parse error');
            }
        }
    });
}

function reverseGeocodeLatlng(pos, callback) {
    var url = 'https://maps.googleapis.com/maps/api/geocode/json?latlng=' + pos.lat + ',' + pos.lng + '&key=' + googleApiKey;
    request(url, (err, resp, body) => {
        if (err) {
            callback(err);
        } else {
            var res = JSON.parse(body);
            if (res.error_message) {
                callback(res.error_message);
            } else if (res.results[0])
                callback(null, res.results[0].formatted_address);
            else
                callback('No reverse geo results');
        }
    })
}


// http://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1); // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

function getNextEvent(nextEvent, callback) {
    nextEvent((event, left) => {
        callback(false, event);
        if (left > 0) {
            setTimeout(() => {
                getNextEvent(nextEvent, callback);
            }, 20);
        } else {
            callback(true, null);
        }
    });
}

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

function addRandomLatlng(pos, n) {
    return {
        lat: pos.lat + getRandomArbitrary(0, n),
        lng: pos.lng + getRandomArbitrary(0, n),
    }
}

module.exports = (function() {
    let api = {};

    api.nearestAreas = function(coord, callback) {
        getSongkickLocations(coord, (err, locations) => {
            if (err) {
                callback(err);
            } else {
                parseLocations(coord, locations, (results) => {
                    callback(null, results);
                });
            }
        })
    };

    api.updateAreas = function(areas, db, callback) {
        getEventDataFromAreas(areas, (nextEvent) => {
            getNextEvent(nextEvent, (done, event) => {
                if (done) {
                    callback();
                } else {
                    if (event.location.lat && event.location.lng) {
                        event.location = addRandomLatlng(event.location, 0.001);
                        event.eventInfo.date = new Date(event.eventInfo.date);

                        db.addEvent(event, (err) => {
                            if (err)
                                console.log(err);
                        });
                    }
                }
            });
        });
    }
    return api;
})();


if (!module.parent) {
    console.log('Starting as standalone');
    var sk = module.exports;

    sk.nearestArea(currentpos, (err, metroArea) => {
        console.log(err, metroArea);
        var db = require('./mongowrapper.js');
        sk.updateAreas(metroArea, db, () => {
            console.log('done?');
        });
    });
}