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

    bands: [{
        name: "The Lumineers",
        desc: "The Lumineers are an American folk rock band based in Denver, Colorado, who formed as early as 2005 but didn’t release their self-titled debut record until April of 2012.",
        fullimage: "images/bg.jpg",
        thumbnail: "images/circle.jpg"
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
    google.maps.event.addListener(map, 'zoom_changed', mapMoved);

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

function updateSearchResults(events) {
    // events = [0, 0, 0, 0, 0, 0, 0, 0];

    var resultContainer = document.querySelector('#tableresults ul')
    resultContainer.innerHTML = "";
    for (var i in events) {
        // var eventName = events.bands[i]
        // var month = events.month
        // var day = events.day
        var red = document.createElement('div');
        red.innerHTML = "Jun";
        red.className = "redbox";
        var whit = document.createElement('div');
        whit.innerHTML = "19"
        whit.className = "whitebox";
        var li = document.createElement('li');
        red.appendChild(whit);
        li.appendChild(red);
        resultContainer.appendChild(li);
    }
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

// function search(artist, array){
//     for (var i=0; i < array.length; i++) {
//         alert(artist);
//         if (array[i].mainArtist === artist) {
//         }
//     }
// }

// var eventList = [];
// eventList[0] = event1;


// function searchKey(event) {
//     event = event || window;
//     if (event.keyCode == 13) {
//         alert('Error getting location');

//         var string = document.getElementById("search").value
//         search(string, eventList)
//         alert
//     }
//     return false;

// }

window.addEventListener('load', function() {
    var searchBar = document.querySelector('#search');
    searchBar.addEventListener('keypress', newSearch);

    function newSearch(event) {
        console.log(searchBar.value);
    }
});
