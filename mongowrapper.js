module.exports = function() {
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
            date: String,
        }
    });

    eventSchema.index({
        'location': '2dsphere'
    });

    var Event = mongoose.model('Event', eventSchema);

    function addEntry(e, callback) {
        if (!callback) callback = () => {};
        var t = new Event(e);
        t.save(err => {
            if (err) console.log('[MONGO] Error saving entry to db', err);
            callback(err);
        });
    }

    function getNearPlaces(pos, range, callback) {
        if (typeof(range) === 'function') {
            callback = range;
            range = 10;
        }

        if (!callback) callback = () => {};

        Event.find({
            location: {
                $geoWithin: {
                    $center: [
                        [pos.lat, pos.lng], range / 6378.1
                    ]
                }
            }
        }, (err, result) => {
            if (err) console.log('[MONGO] Error getting entries from db', err);
            callback(err, result);
        });
    }

    return {
        addEntry,
        getNearPlaces
    }
}

if (!module.parent) {
    var db = module.exports();
    // db.addEntry({
    //     title: "eyyyyy1",
    //     location: {
    //         lat: 51.5,
    //         lng: -2.599961
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

/*

save events, make sure no duplicates
get events near coords?

*/