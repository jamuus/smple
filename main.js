"use strict";

var month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
var currentPos, map, currentPositionMarker, svgDoc, svg, spotifyPlayer, musicWindowVisible;
var svgNS = "http://www.w3.org/2000/svg";
var svgButton;
var startDate = new Date();
var endDate = new Date();
endDate.setDate(endDate.getDate() + 7);

window.onload = function() {
    svg = document.getElementById("samplebutton");
    musicWindowVisible = false;
    spotifyPlayer = document.querySelector("#spotifyplayer")
    svgButton = document.querySelector("#svgcontainer")
    svgDoc = svg.contentDocument;

    var playClickRegion = svgDoc.getElementById("clickRegion");
    playClickRegion.onclick = function(evt) {
        musicDisplay();
        initPlay();
    };


    setupWebSocket();
    initDate();
};



function initDate() {
    var updateStartDate = function() {
        startPicker.setStartRange(startDate);
        endPicker.setStartRange(startDate);
        endPicker.setMinDate(startDate);
    };
    var updateEndDate = function() {
        startPicker.setEndRange(endDate);
        startPicker.setMaxDate(endDate);
        endPicker.setEndRange(endDate);
    };
    var startPicker = new Pikaday({
        field: document.getElementById('start'),
        theme: 'dark-theme',
        format: 'DD/MM/YYYY',
        minDate: new Date(),
        defaultDate: startDate,
        setDefaultDate: true,
        maxDate: new Date(2020, 12, 31),
        onSelect: function() {
            startDate = this.getDate();
            updateStartDate();
            updateMarkers();

        }
    });
    var endPicker = new Pikaday({
        field: document.getElementById('end'),
        minDate: new Date(),
        maxDate: new Date(2020, 12, 31),
        defaultDate: endDate,
        setDefaultDate: true,
        theme: 'dark-theme',
        format: 'DD/MM/YYYY',
        onSelect: function() {
            endDate = this.getDate();
            updateEndDate();
            updateMarkers();
        }
    });

    var _startDate = startPicker.getDate();
    var _endDate = endPicker.getDate();

    if (_startDate) {
        startDate = _startDate;
        updateStartDate();

    }
    if (_endDate) {
        endDate = _endDate;
        updateEndDate();
    }


}

function musicDisplay(event) {
    if (!musicWindowVisible) {
        spotifyPlayer.classList.remove('musichide');
        spotifyPlayer.classList.add('musicshow');
        svgButton.classList.remove('colorhide');
        svgButton.classList.add('colorshow');

        musicWindowVisible = true;
    } else {
        spotifyPlayer.classList.remove('musicshow');
        spotifyPlayer.classList.add('musichide');
        svgButton.classList.remove('colorshow');
        svgButton.classList.add('colorhide');

        musicWindowVisible = false;
    }
}


var spotifyPanelVisible = false;

function initPlay() {
    addRotateTransform('t1', 0.7, 1);
    addRotateTransform('t2', 0.5, 1);
}

function addRotateTransform(target_id, speed, direction) {
    var element_to_rotate = svgDoc.getElementById(target_id);
    var my_transform = svgDoc.createElementNS(svgNS, "animateTransform");

    var bb = element_to_rotate.getBBox();
    var cx = bb.x + bb.width / 3;
    var cy = bb.y + bb.height / 2;

    my_transform.setAttributeNS(null, "attributeName", "transform");
    my_transform.setAttributeNS(null, "attributeType", "XML");
    my_transform.setAttributeNS(null, "type", "rotate");
    my_transform.setAttributeNS(null, "dur", speed + "s");
    if (musicWindowVisible) {
        my_transform.setAttributeNS(null, "from", 0 + " " + cx + " " + cy);
        my_transform.setAttributeNS(null, "to", 120 + " " + cx + " " + cy);
    } else {
        my_transform.setAttributeNS(null, "from", 120 + " " + cx + " " + cy);
        my_transform.setAttributeNS(null, "to", 0 + " " + cx + " " + cy);
    }

    element_to_rotate.appendChild(my_transform);
    my_transform.beginElement();
}


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

    google.maps.event.addListener(map, 'drag', mapMoved);
    google.maps.event.addListener(map, 'zoom_changed', mapMoved);
    google.maps.event.addListener(map, 'dragend', updateMarkers);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                var pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                map.setCenter(pos);

                currentPos = pos;
                sendPosToServer();

                currentPositionMarker = new google.maps.Marker({
                    position: pos,
                    map: map,
                    title: "u r here",
                    icon: "/svg/markerhere.svg",
                });
                calculateDistanceAway(pos);
            },
            function() {
                handleLocationError(true, map.getCenter());
            }
        );
    } else {
        // Browser doesn't support Geolocation
        handleLocationError(false, map.getCenter());
    }

    setupMarkers();
    setupSearch();
}

function calculateDistanceAway(pos) {
    var origin = pos;
    var destinations = [];
    for (var i = 0; i < Math.min(eventList.length, 25); i++) {
        var event = eventList[i];
        destinations.push(event.location);
    }

    var service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix({
        origins: [origin],
        destinations: destinations,
        travelMode: google.maps.TravelMode.WALKING,
    }, callback);

    function callback(response, status) {
        if (response && response.rows[0]) {
            var results = response.rows[0].elements;
            for (var i in results) {
                var result = results[i];
                if (eventList[i])
                    eventList[i].distance = result;
            }
        } else {
            console.log('ERROR getting travel times', status);
        }
    }
}

function handleLocationError(browserHasGeolocation, pos) {
    console.log('ERROR getting location');
}

var serverConnection;

function setupWebSocket() {
    serverConnection = new WebSocket('wss://' + location.hostname + ':8443', 'p1');

    serverConnection.onopen = function() {
        sendPosToServer();
    };

    serverConnection.onerror = function(error) {
        console.log('web socket error', error);
    };

    serverConnection.onmessage = function(message) {
        var newData;
        try {
            newData = JSON.parse(message.data);
        } catch (e) {
            console.log('ERROR parsing json from socket', e);
        }
        if (newData) {
            for (var i in eventList) {
                if (eventList[i].marker)
                    eventList[i].marker.setMap(null);
            }
            eventList = newData;
            setupMarkers();
            calculateDistanceAway(currentPos);
        }
    };
}

var callsToWaitFor = 2;

function sendPosToServer() {
    callsToWaitFor--;
    if (callsToWaitFor === 0) {
        serverConnection.send(
            JSON.stringify(
                addDateRange({
                    initialPos: currentPos
                })
            )
        );
    }
}

function addDateRange(pos) {
    return {
        pos: pos,
        dateRange: {
            from: startDate,
            to: endDate
        }
    }
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

function toggleBounce(marker) {
    marker.setAnimation(null);
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(function() {
        marker.setAnimation(null);
    }, 740);
}

function setupMarkers() {
    if (!map) return;
    for (var i in eventList) {
        var event = eventList[i];

        var marker = new google.maps.Marker({
            position: event.location,
            map: map,
            title: event.title,
            icon: "/svg/marker.svg",
        });

        event.marker = marker;

        marker.addListener('click', (function(event) {
            return function() {
                openEvent(event);
                toggleBounce(event.marker);
            }
        })(event));
    }
}

function openEvent(event) {
    map.panTo(event.marker.getPosition());
    updateInfoWindow(event);
}

var infopanel = document.getElementById('infopanel');
var infoWindowVisible = false;


function updateMarkers() {
    var pos = {
        lat: map.getCenter().lat(),
        lng: map.getCenter().lng()
    };

    if (serverConnection) {
        serverConnection.send(
            JSON.stringify(
                addDateRange({
                    newPos: pos
                })
            )
        );
    }
}

function mapMoved(event) {
    if (infoWindowVisible) {
        infopanel.classList.remove('infoslidein');
        infopanel.classList.add('infoslideout');
        infoWindowVisible = false;
    }
}

function setBandInfo(event, band) {
    var bandimage = document.querySelector('.imagewithoverlay > img');
    bandimage.src = band.fullimage;

    var name = document.querySelector('.imagewithoverlay > div');
    name.innerHTML = funkyHtmlEscape(band.name) + '<span class="eventDate">' + dateToNise(new Date(event.eventInfo.date)) + '</span>';

    var description = document.querySelector('.bandinfo > p');
    description.innerHTML = funkyHtmlEscape(band.desc) || '';

    var spotifyPlayer = document.querySelector('#spotifyplayerframe');
    spotifyPlayer.src = 'https://embed.spotify.com/?uri=' + band.spotifyUri;
}

function selectBand(event, index) {
    setBandInfo(event, event.bands[index.value]);
}

function selectResult(event) {
    openEvent(event);
}

function dateToNise(date) {
    return '&#160;&#160;' + month[date.getMonth()] + ' ' + date.getDate();
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
            selectBand(event, this);
        }, false);
        cont.value = i;
        var img = document.createElement('img');
        img.src = bandThumbnail;

        cont.appendChild(img);
        thumbnailContainer.appendChild(cont);
    }

    setBandInfo(event, event.bands[0]);

    // set event info
    var venueTitle = document.querySelector('#venueTitle');
    venueTitle.innerHTML = event.eventInfo.title;

    var venueAddress = document.querySelector('#venueAddress');
    venueAddress.innerHTML = event.eventInfo.address.replace(/(?:\r\n|\r|\n|,)/g, '<br />');

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

function funkyHtmlEscape(body) {
    return body ? body.replace(/&/g, '&amp;') : '';
}


function updateSearchResults(events) {
    var resultContainer = document.querySelector('#tableresults ul')
    resultContainer.innerHTML = "";

    for (var i in events) {
        var event = events[i];

        var bandName0 = event.bands[0].name;
        var bandName1 = '';
        if (event.bands[1])
            bandName1 = event.bands[1].name;

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

        var bandNamesContainer = document.createElement('div');
        bandNamesContainer.className = "bandnamescontainer";

        var bandName0elem = document.createElement('div');
        bandName0elem.className = "bandnames";
        bandName0elem.innerHTML = funkyHtmlEscape(bandName0).substring(0, 40);

        var bandName1elem = document.createElement('div');
        bandName1elem.className = "bandnames1";
        bandName1elem.innerHTML = funkyHtmlEscape(bandName1).substring(0, 40);

        bandNamesContainer.appendChild(bandName0elem);
        bandNamesContainer.appendChild(bandName1elem);

        li.appendChild(bandNamesContainer);

        var walkTime = event.walkTime;

        var walkTimeElem = document.createElement('div');
        walkTimeElem.className = "walktime";
        walkTimeElem.innerHTML = walkTime;

        li.appendChild(walkTimeElem);
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
                walkTime: event.distance ? event.distance.duration.text + ' away' : '',
                event: event
            }
        };
    }).filter(function(event) {
        return event.match && query.length > 0;
    }).map(function(event) {
        return event.data;
    });

    return results;
}

function setupSearch() {
    var searchBar = document.querySelector('#search');
    searchBar.addEventListener('keyup', newSearch);

    function newSearch(event) {
        var query = searchBar.value;
        var results = search(query, eventList);
        updateSearchResults(results);
    }
}


document.body.setScaledFont = function(f) {
    var s = this.offsetWidth,
        fs = s * f;
    this.style.fontSize = fs + '%';
    return this;
};

document.body.setScaledFont(0.07);
window.onresize = function() {
    document.body.setScaledFont(0.07);
}