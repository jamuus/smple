"use strict";

var map;

function initMap() {
    var customMapType = new google.maps.StyledMapType([{
        "featureType": "landscape",
        "elementType": "labels",
        "stylers": [{
            "visibility": "off"
        }]
    }, {
        "featureType": "transit",
        "elementType": "labels",
        "stylers": [{
            "visibility": "off"
        }]
    }, {
        "featureType": "poi",
        "elementType": "labels",
        "stylers": [{
            "visibility": "off"
        }]
    }, {
        "featureType": "water",
        "elementType": "labels",
        "stylers": [{
            "visibility": "off"
        }]
    }, {
        "featureType": "road",
        "elementType": "labels.icon",
        "stylers": [{
            "visibility": "off"
        }]
    }, {
        "stylers": [{
            "hue": "#00aaff"
        }, {
            "saturation": -100
        }, {
            "gamma": 2.15
        }, {
            "lightness": 12
        }]
    }, {
        "featureType": "road",
        "elementType": "labels.text.fill",
        "stylers": [{
            "visibility": "on"
        }, {
            "lightness": 24
        }]
    }, {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [{
            "lightness": 57
        }]
    }], {
        name: 'map style'
    });

    var customMapTypeId = 'map_style';
    map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: 0,
            lng: 0
        },
        zoom: 16,
        mapTypeControlOptions: {
            mapTypeIds: [google.maps.MapTypeId.ROADMAP, customMapTypeId]
        },
        disableDefaultUI: true
    });
    map.mapTypes.set(customMapTypeId, customMapType);
    map.setMapTypeId(customMapTypeId);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            map.setCenter(pos);
        }, function() {
            handleLocationError(true, infoWindow, map.getCenter());
        });
    } else {
        // Browser doesn't support Geolocation
        handleLocationError(false, infoWindow, map.getCenter());
    }

    setupMarkers();
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    alert('Error getting location');
    console.log(browserHasGeolocation, infoWindow, pos);
}

var event1 = {
    title: "eyyyyy",
    location: {
        lat: 51.45436,
        lng: -2.599961
    },
    bands: {
        "The Lumineers": {
            desc: "The Lumineers are an American folk rock band based in Denver, Colorado, who formed as early as 2005 but didn’t release their self-titled debut record until April of 2012."
        },
        "Supporting Band": {
            desc: "hey boss"
        }
    },
    eventInfo: {
        desc: "ey boss",
        address: "O2 Academy Bristol\nFrogmore Street\nBS1 5NA\nBristol, UK\n0117 927 9227",
        venueUrl: "www.o2academybristol.co.uk",
        ticketUrl: "http://www.songkick.com/tickets/20220218"
    }
};

function setupMarkers() {
    var marker = new google.maps.Marker({
        position: event1.location,
        map: map,
        title: event1.title
    });

    marker.addListener('click', onMarkerClick);

    function onMarkerClick() {
        map.panTo(marker.getPosition());
        updateInfoWindow(event1);
    }

    onMarkerClick();

    google.maps.event.addListener(map, 'drag', mapMoved);

    // google.maps.event.addListener(map, 'click', function(event) {
    //     marker = new google.maps.Marker({
    //         position: event.latLng,
    //         map: map
    //     });
    //     console.log(event.latLng.lat(), event.latLng.lng());
    // });
}

var infopanel = document.getElementById('infopanel');
var infoWindowVisible = false;

function mapMoved(event) {
    if (infoWindowVisible) {
        infopanel.classList.remove('infoslidein');
        infopanel.classList.add('infoslideout');
        infoWindowVisible = false;
    }
}

function updateInfoWindowContents(event) {

}

function updateInfoWindow(event) {
    if (!infoWindowVisible) {
        infopanel.classList.remove('infoslideout');
        infopanel.classList.add('infoslidein');
        infoWindowVisible = true;
    }
    updateInfoWindowContents(event);
}
