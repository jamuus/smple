'use strict';

let currentpos = {
    lat: 51.45589225421975,
    lng: -2.602995037387154,
};

let songkickApikey = 'QNx6YgjKNSA5gGs5';


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
                // parseLocations(pos, data.resultsPage.results);
            } else {
                callback('ERROR getting nearby locations');
            }
        } else {
            callback('ERROR ' + error + ' apistatus: ' + response.statusCode);
        }
    });
}
var i = 0;

function getEvents(pos, callback) {
    var events = [];
    var cbInit = false;
    getSongkickLocations(pos, (err, locations) => {
        if (err) {
            console.log(err);
        } else {
            parseLocations(pos, locations, (areas) => {
                for (var areaName in areas) {
                    let areaInfo = areas[areaName];

                    getAreaConcertData(areaInfo, 1, (err, eventInfo) => {
                        if (err) {
                            console.log(err);
                        } else {
                            events.push(eventInfo);

                            if (!cbInit) {
                                callback((fn) => {
                                    parseEventData(events[0], (err, d) => {
                                        events.splice(0, 1);
                                        fn(d, events.length);
                                    });
                                });
                                cbInit = true;
                            }
                        }
                    });
                }
            });
        }
    });
}

var db = require('./mongowrapper.js');

getEvents(currentpos, (nextEvent) => {
    setInterval(() => {
        nextEvent((event, left) => {
            db.addEntry(event, (err) => {
                console.log(err);
            });
        });
    }, 1000);
});

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

/*
var event1 = {
    title: "eyyyyy1",
    location: {
        lat: 51.45436,
        lng: -2.599961
    },
    bands: [{
        name: "The Lumineers",
        desc: "The Lumineers are an American folk rock band based in Denver, Colorado, who formed as early as 2005 but didn’t release their self-titled debut record until April of 2012.",
        fullimage: "images/bandimages/fkatwigs.jpg",
        thumbnail: "images/thumbnails/fkatwigs.jpg"
    }, {
        name: "Supporting Band",
        desc: "hey boss",
        fullimage: "https://pbs.twimg.com/profile_images/642798007621185536/Y6x_U5gS.jpg",
        thumbnail: "https://pbs.twimg.com/profile_images/642798007621185536/Y6x_U5gS.jpg"
    }],
    eventInfo: {
        title: "O2 Academy Bristol",
        address: "O2 Academy Bristol\nFrogmore Street\nBS1 5NA\nBristol, UK\n0117 927 9227",
        venueUrl: "http://www.o2academybristol.co.uk",
        ticketUrl: "http://www.songkick.com/tickets/20220218",
        date: "2016-03-01"
    }
};
*/



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
                    thumbnail: artistPic ? artistPic : 'images/placeholder.png',
                });

                j--;
                if (j === 0)
                    callback(null, eventInfo);
            });
        });
    }
}


function getArtistSongs(artistName, callback) {
    artistName = escape(artistName);
    let spotifyUrl = 'https://api.spotify.com/v1/search?q=' + artistName + '&type=artist';

    request(spotifyUrl, function(err, resp, body) {
        if (err) {
            // console.log('ERROR getting spotify url', err);
            callback('ERROR getting spotify url ' + err);
        } else {
            let data;

            try {
                data = JSON.parse(body);
            } catch (e) {
                console.log('JSON parse error', e);
            }

            if (data) {
                if (data.error) {
                    callback('ERROR in spotify api ' + data.error);
                } else {
                    if (data.artists.items.length > 0) {
                        let uri = data.artists.items[0].uri;
                        callback(null, uri);
                    } else {
                        callback('No resutlts');
                    }
                }
            } else {
                // console.log('ERROR parsing spotify api body');
                callback('ERROR parsing spotify api body');
            }
        }
    });
}



let lastfmUrl = '87f6734e61f01465bdd78f72d81de0bd';
//http://ws.audioscrobbler.com/2.0/\?method\=artist.getinfo\&artist\=The%20Lumineers\&api_key\=87f6734e61f01465bdd78f72d81de0bd\&format\=json
function getArtistInfo(artistName, callback) {
    artistName = escape(artistName);
    var bioUrl = 'http://ws.audioscrobbler.com/2.0/\?method\=artist.getinfo\&artist\=' + artistName + '\&api_key\=' + lastfmUrl + '\&format\=json';
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
                    // console.log('ERROR no artist found on last.fm');
                }
            } else {
                callback('JSON parse error');
            }
        }
    });
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