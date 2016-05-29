module.exports = (function() {
    'use strict';
    var status = 'init';

    let mongoose = require('mongoose');
    mongoose.connect('mongodb://localhost/smple');

    var db = mongoose.connection;

    db.on("error", err => {
        console.log('[MONGO] Error', err);
    });
    db.once("open", function(callback) {
        console.log("[MONGO] Connection succeeded.");
        status = 'connected';
    });

    var Schema = mongoose.Schema;

    var eventSchema = new Schema({
        title: String,
        location: {
            lat: Number,
            lng: Number,
        },
        bands: [{
            name: String,
            desc: String,
            fullimage: String,
            thumbnail: String,
            spotifyUri: String,
        }],
        eventInfo: {
            title: String,
            address: String,
            venueUrl: String,
            ticketUrl: String,
            date: Date,
        }
    });

    eventSchema.index({
        'location': '2dsphere'
    });

    var Event = mongoose.model('Event', eventSchema);

    var areaSchema = new Schema({
        name: String,
        lat: Number,
        lng: Number,
        id: Number,
        lastCached: Date
    });

    var Area = mongoose.model('Area', areaSchema);



    function addEvent(e, callback) {
        if (!callback) callback = () => {};
        Event.update({
            title: e.title
        }, e, {
            upsert: true
        }, (err, stats) => {
            callback(err);
        });
    }

    function addArea(area, callback) {
        area.lastCached = new Date();
        Area.update({
            id: area.id
        }, area, {
            upsert: true
        }, (err, stats) => {
            if (err) {
                console.log('MONGO ERROR upserting', err)
                callback(err);
            } else {
                callback(null, stats);
            }
        });
    }


    function getAreaLastUpdated(area, callback) {
        Area.findOne({
            id: area.id
        }, (err, area) => {
            callback(err, area);
        });
    }

    function getNearPlaces(pos, dateRange, range, callback) {
        if (typeof(range) === 'function') {
            callback = range;
            range = 1000;
        }
        if (!callback) callback = () => {};

        if (!(dateRange.to instanceof Date) || !(dateRange.from instanceof Date) || !(pos.lat) || !(pos.lng)) {
            callback('Invalid args');
            return;
        }

        Event.find({
            location: {
                $geoWithin: {
                    $center: [
                        [pos.lat, pos.lng], range / 6378.1
                    ]
                }
            },
            'eventInfo.date': {
                "$gte": dateRange.from,
                "$lt": dateRange.to
            }
        }, (err, result) => {
            if (err) console.log('[MONGO] Error getting entries from db', err);
            callback(err, result);
        });
    }

    return {
        addEvent,
        getNearPlaces,
        addArea,
        getAreaLastUpdated
    }
})();

if (!module.parent) {
    var db = module.exports();
    // db.addEntry({
    //     title: "eyyyyy1",
    //     location: {
    //         lat: 51.5,
    //         lng: -2.6
    //     },
    //     bands: [{
    //         name: "The Lumineers",
    //         desc: "The Lumineers are an American folk rock band based in Denver, Colorado, who formed as early as 2005 but didn’t release their self-titled debut record until April of 2012.",
    //         fullimage: "images/bandimages/fkatwigs.jpg",
    //         thumbnail: "images/thumbnails/fkatwigs.jpg",
    //         spotifyUri: ""
    //     }, {
    //         name: "Supporting Band",
    //         desc: "hey boss",
    //         fullimage: "https://pbs.twimg.com/profile_images/642798007621185536/Y6x_U5gS.jpg",
    //         thumbnail: "https://pbs.twimg.com/profile_images/642798007621185536/Y6x_U5gS.jpg",
    //         spotifyUri: ""
    //     }],
    //     eventInfo: {
    //         title: "O2 Academy Bristol",
    //         address: "O2 Academy Bristol\nFrogmore Street\nBS1 5NA\nBristol, UK\n0117 927 9227",
    //         venueUrl: "http://www.o2academybristol.co.uk",
    //         ticketUrl: "http://www.songkick.com/tickets/20220218",
    //         date: "2016-03-01"
    //     }
    // }, err => {
    //     console.log(err);
    // });
    // db.getNearPlaces({
    //     lat: 51.4,
    //     lng: -2.6
    // }, 1000, (err, results) => {
    //     if (err)
    //         console.log('rip', err);
    //     else
    //         console.log(results);
    // });
}