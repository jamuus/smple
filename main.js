function initMap() {
    var customMapType = new google.maps.StyledMapType([{
        "featureType": "landscape.man_made",
        "elementType": "geometry",
        "stylers": [{
            "color": "#f7f1df"
        }]
    }, {
        "featureType": "landscape.natural",
        "elementType": "geometry",
        "stylers": [{
            "color": "#d0e3b4"
        }]
    }, {
        "featureType": "landscape.natural.terrain",
        "elementType": "geometry",
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
        "featureType": "poi.business",
        "elementType": "all",
        "stylers": [{
            "visibility": "off"
        }]
    }, {
        "featureType": "poi.medical",
        "elementType": "geometry",
        "stylers": [{
            "color": "#fbd3da"
        }]
    }, {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [{
            "color": "#bde6ab"
        }]
    }, {
        "featureType": "road",
        "elementType": "geometry.stroke",
        "stylers": [{
            "visibility": "off"
        }]
    }, {
        "featureType": "road",
        "elementType": "labels",
        "stylers": [{
            "visibility": "off"
        }]
    }, {
        "featureType": "road.highway",
        "elementType": "geometry.fill",
        "stylers": [{
            "color": "#ffe15f"
        }]
    }, {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [{
            "color": "#efd151"
        }]
    }, {
        "featureType": "road.arterial",
        "elementType": "geometry.fill",
        "stylers": [{
            "color": "#ffffff"
        }]
    }, {
        "featureType": "road.local",
        "elementType": "geometry.fill",
        "stylers": [{
            "color": "black"
        }]
    }, {
        "featureType": "transit.station.airport",
        "elementType": "geometry.fill",
        "stylers": [{
            "color": "#cfb2db"
        }]
    }, {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{
            "color": "#a2daf2"
        }]
    }], {
        name: 'map style'
    });

    var customMapTypeId = 'map_style';
    var map = new google.maps.Map(document.getElementById('map'), {
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
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    alert('Error getting location');
    console.log(browserHasGeolocation, infoWindow, pos);
}
