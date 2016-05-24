'use strict';

let currentpos = {
    lat: 51.45589225421975,
    lng: -2.602995037387154
};

let songikickApikey = 'QNx6YgjKNSA5gGs5';

let songkickLocationUrl = 'http://api.songkick.com/api/3.0/search/locations.json?location=geo:' +
    currentpos.lat + ',' + currentpos.lng +
    '&apikey=' + songikickApikey;

var fs = require('fs');


let request = require('request');

function getSongkickLocations() {
    request(songkickLocationUrl, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            let data = JSON.parse(body);
            if (data.resultsPage.status = 'ok') {
                parseLocations(data.resultsPage.results);
            } else {
                console.log('ERROR getting nearby locations');
            }

        } else {
            console.log('ERROR', error, response.statusCode);
        }
    });
}

getSongkickLocations();

function parseLocations(data) {
    var areasToGet = {};
    for (var i in data.location) {
        let loc = data.location[i];
        let metroArea = loc.metroArea;
        let city = loc.city;
        let distToArea = getDistanceFromLatLonInKm(metroArea.lat, metroArea.lng, currentpos.lat, currentpos.lng);
        if (distToArea < 10) {
            areasToGet[metroArea.displayName] = metroArea;
        }
    }

    for (var areaName in areasToGet) {
        let areaInfo = areasToGet[areaName];
        getAreaConcertData(areaInfo);
    }
}

function eventUrl(id, page) {
    if (!page) page = 1;
    return 'http://api.songkick.com/api/3.0/metro_areas/' + id + '/calendar.json?apikey=' + songikickApikey + '&page=' + page;
}

function getAreaConcertData(area, page) {
    if (!page) page = 1;
    request(eventUrl(area.id, page), function(err, resp, body) {
        if (err) {
            console.log('ERROR getting are info', err);
        } else {
            let events = JSON.parse(body);
            if (events.resultsPage.status === 'ok') {
                parseEventData(events.resultsPage.results.event);
                let numEvents = events.resultsPage.totalEntries;
                let numPages = Math.ceil(numEvents / events.resultsPage.perPage);
                if (page < numPages) {
                    getAreaConcertData(area, page + 1);
                }
            } else {
                console.log('ERROR area event response', events.resultsPage.status);
            }
        }
    });
}

var db = {};

function extractEventInfo(event) {
    var ret = {};
    ret.title = event.displayName;
    ret.location = event.location;
    ret.bands = [];
    for (var i in event.performance) {
        var band = event.performance[i];
        let bandName = band.artist.displayName;
        // let description = TODO
        // let fullimage = 

    }
    return ret;
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

/*
"Simon McBride at The Tunnels (May 18, 2016)": {
    "type": "Concert",
    "displayName": "Simon McBride at The Tunnels (May 18, 2016)",
    "ageRestriction": null,
    "status": "ok",
    "start": {
        "datetime": "2016-05-18T19:30:00+0100",
        "time": "19:30:00",
        "date": "2016-05-18"
    },
    "location": {
        "city": "Bristol, UK",
        "lat": 51.453,
        "lng": -2.593
    },
    "performance": [
        {
            "artist": {
                "displayName": "Simon McBride",
                "uri": "http://www.songkick.com/artists/747545-simon-mcbride?utm_source=38892&utm_medium=partner",
                "identifier": [
                    {
                        "href": "http://api.songkick.com/api/3.0/artists/mbid:cfa59bd9-af11-4dc3-8204-00c58bd009ba.json",
                        "mbid": "cfa59bd9-af11-4dc3-8204-00c58bd009ba"
                    }
                ],
                "id": 747545
            },
            "displayName": "Simon McBride",
            "billing": "headline",
            "id": 50249309,
            "billingIndex": 1
        }
    ],
    "venue": {
        "displayName": "The Tunnels",
        "lat": null,
        "lng": null,
        "uri": "http://www.songkick.com/venues/500681-tunnels?utm_source=38892&utm_medium=partner",
        "id": 500681,
        "metroArea": {
            "displayName": "Bristol",
            "uri": "http://www.songkick.com/metro_areas/24521-uk-bristol?utm_source=38892&utm_medium=partner",
            "country": {
                "displayName": "UK"
            },
            "id": 24521
        }
    },
    "uri": "http://www.songkick.com/concerts/25642839-simon-mcbride-at-tunnels?utm_source=38892&utm_medium=partner",
    "id": 25642839,
    "popularity": 0.000727
},
*/



function parseEventData(events) {
    for (var i in events) {
        let event = events[i];
        let artistSpotifyUri;
        let artistBio;
        let eventInfo = {};
        eventInfo.title = event.displayName;
        eventInfo.location = event.location;
        eventInfo.bands = [];
        for (var i in event.performance) {
            var band = event.performance[i];
            let bandName = band.artist.displayName;

            getArtistSongs(artist.displayName, (err, uri) => {
                if (err) {
                    artistSpotifyUri = null;
                } else {
                    artistSpotifyUri = uri;
                }

                getArtistBio(artist.displayName, (err, summary) => {
                    if (err) {
                        artistBio = null;
                    } else {
                        artistBio = summary;
                    }

                    console.log(artistSpotifyUri, artistBio);
                    eventInfo.bands.push({
                        name: bandName,
                        desc: artistBio,
                        fullimage: 'images/placeholder.jpg',
                        thumbnail: 'images/placeholder.jpg'
                    });
                });
            });
        }


        db[event.displayName] = event;
    }
    // console.log(db);
}


function getArtistSongs(artistName, callback) {
    artistName = escape(artistName);
    let spotifyUrl = 'https://api.spotify.com/v1/search?q=' + artistName + '&type=artist';

    request(spotifyUrl, function(err, resp, body) {
        if (err) {
            console.log('ERROR getting spotify url', err);
            callback(err);
        } else {
            let data;

            try {
                data = JSON.parse(body);
            } catch (e) {
                console.log('JSON parse error', e);
            }

            if (data) {
                if (data.error) {
                    console.log('ERROR in spotify api', data.error);
                } else {
                    if (data.artists.items.length > 0) {
                        let uri = data.artists.items[0].uri;
                        callback(null, uri);
                    } else {
                        callback('No resutlts');
                    }
                }
            } else {
                console.log('ERROR parsing spotify api body');
                callback('ERROR parsing spotify api body');
            }
        }
    });
}



let lastfmUrl = '87f6734e61f01465bdd78f72d81de0bd';
//http://ws.audioscrobbler.com/2.0/\?method\=artist.getinfo\&artist\=The%20Lumineers\&api_key\=87f6734e61f01465bdd78f72d81de0bd\&format\=json
function getArtistBio(artistName, callback) {
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
                    callback(null, bio);
                } else {
                    callback('No artist found');
                    console.log('ERROR no artist found on last.fm');
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



/*

    user opens page >
    sends position to server via websockets >
    server finds nearby events >
    sends them to client

    when user pans the page send new center coordinate >
    get db entries for new nearby events

*/