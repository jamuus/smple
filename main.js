"use strict";

var map;
var month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

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
    setupSearch();
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    alert('Error getting location');
    console.log(browserHasGeolocation, infoWindow, pos);
}



function setupMarkers() {
    for (var i in eventList) {
        var event = eventList[i];
        var marker = new google.maps.Marker({
            position: event.location,
            map: map,
            title: event.title
        });

        event.marker = marker;

        marker.addListener('click', (function(event) {
            return function() {
                openEvent(event);
            }
        })(event));
    }

    google.maps.event.addListener(map, 'drag', mapMoved);
    google.maps.event.addListener(map, 'zoom_changed', mapMoved);
}

function openEvent(event) {
    map.panTo(event.marker.getPosition());
    updateInfoWindow(event);
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


function selectBand(event) {

    var defaultBand = eventList[0].bands[event.value];
    var bandimage = document.querySelector('.imagewithoverlay > img');
    bandimage.src = defaultBand.fullimage;

    var name = document.querySelector('.imagewithoverlay > div');
    name.innerHTML = defaultBand.name;

    var description = document.querySelector('.bandinfo > p');
    description.innerHTML = defaultBand.desc;

    var venueTitle = document.querySelector('#venuetitle');
    venueTitle.innerHTML = event.eventInfo.title;

    var venueAddress = document.querySelector('#venueAddress');
    venueAddress.innerHTML = event.eventInfo.address.replace(/(?:\r\n|\r|\n)/g, '<br />');

    var venueWebsite = document.querySelector('#venueWebsite');
    venueWebsite.href = event.eventInfo.venueUrl;

    var venueTicketUrl = document.querySelector('#venueTicketUrl');
    venueTicketUrl.href = event.eventInfo.ticketUrl;
}

function selectResult(event) {
    console.log(event);
    openEvent(event);
}

function updateInfoWindowContents(event) {
    // set thumbnails
    var thumbnailContainer = document.querySelector('.bandpics');
    thumbnailContainer.innerHTML = "";
    for (var i in event.bands) {
        var band = event.bands[i];
        var bandThumbnail = band.thumbnail;

        var cont = document.createElement('div');
        cont.className = "bandimage materialbox shadowbox";
        cont.addEventListener("click", function() {
            selectBand(this);
            band
        }, false);
        cont.value = i;
        var img = document.createElement('img');
        img.src = bandThumbnail;

        cont.appendChild(img);
        thumbnailContainer.appendChild(cont);
    }

    // set band info
    var defaultBand = event.bands[0];
    var bandimage = document.querySelector('.imagewithoverlay > img');
    bandimage.src = defaultBand.fullimage;

    var name = document.querySelector('.imagewithoverlay > div');
    name.innerHTML = defaultBand.name;

    var description = document.querySelector('.bandinfo > p');
    description.innerHTML = defaultBand.desc;

    // set event info

    var venueTitle = document.querySelector('#venuetitle');
    venueTitle.innerHTML = event.eventInfo.title;

    var venueAddress = document.querySelector('#venueAddress');
    venueAddress.innerHTML = event.eventInfo.address.replace(/(?:\r\n|\r|\n)/g, '<br />');

    var venueWebsite = document.querySelector('#venueWebsite');
    venueWebsite.href = event.eventInfo.venueUrl;

    var venueTicketUrl = document.querySelector('#venueTicketUrl');
    venueTicketUrl.href = event.eventInfo.ticketUrl;

}

function updateInfoWindow(event) {
    if (!infoWindowVisible) {
        infopanel.classList.remove('infoslideout');
        infopanel.classList.add('infoslidein');
        infoWindowVisible = true;
    }
    updateInfoWindowContents(event);
}



function updateSearchResults(events) {
    var resultContainer = document.querySelector('#tableresults ul')
    resultContainer.innerHTML = "";

    for (var i in events) {
        var event = events[i];

        var bandName0 = event.bands[0].name;
        var bandName1 = event.bands[1].name;

        var eDate = new Date(event.date);

        var red = document.createElement('div');

        red.innerHTML = month[eDate.getMonth()];
        red.className = "redbox";
        var whit = document.createElement('div');
        whit.innerHTML = eDate.getDate();
        whit.className = "whitebox";

        var li = document.createElement('li');
        li.addEventListener("click", (function(event) {
            return function() {
                selectResult(event);
            }
        })(event.event), false);

        red.appendChild(whit);
        li.appendChild(red);
        resultContainer.appendChild(li);

        var band0Container = document.createElement('div');
        band0Container.innerHTML = bandName0 + '<br /><i>' + bandName1 + '</i>';
        // var band1Container = document.createElement('h6');
        // band1Container.innerHTML = bandName1;


        li.appendChild(band0Container);
        // li.appendChild(band1Container);
    }
}


function fuzzySearch(pattern, text) {
    var patternLower = pattern.toLowerCase().split('');
    var textLower = text.toLowerCase().split('');

    pattern = pattern.split('');
    text = text.split('');

    var result = "";

    var j = 0;

    for (var i = 0; i < text.length && j <= pattern.length; i++) {
        if (patternLower[j] === textLower[i]) {
            result += '<b>' + text[i] + '</b>';
            j++;
        } else {
            result += text[i];
        }
    }
    return {
        result: result,
        match: j === pattern.length
    };
}

function search(query, events) {
    var results = events.map(function(event) {
        var match = false;

        var bands = event.bands.map(function(band) {
            var result = fuzzySearch(query, band.name);
            if (result.match)
                match = true;
            return {
                name: result.result,
            };
        });

        return {
            match: match,
            data: {
                bands: bands,
                date: event.eventInfo.date,
                event: event
            }
        };
    }).filter(function(event) {
        return event.match;
    }).map(function(event) {
        return event.data;
    });

    return results;
}

// window.addEventListener('load', function() {
function setupSearch() {
    var searchBar = document.querySelector('#search');
    searchBar.addEventListener('keyup', newSearch);

    function newSearch(event) {
        var query = searchBar.value;
        var results = search(query, eventList);
        updateSearchResults(results);
    }
}
