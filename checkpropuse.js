"use strict";
var cssprops = require('./cssproperties.js');
var csspropsaft = require('./cssproperties.js');
var fs = require('fs');

process.argv.splice(0, 2);
var args = process.argv;

if (args.length === 0) {
    console.log('not enought args');
}


args.forEach((val, index, somet) => {
    var file = fs.readFileSync('./' + val);

    if (!file) {
        console.log('error opening file', file, err);
    } else {
        csspropsaft = csspropsaft.filter((e) => {
            var property = e[1];
            var url = e[0];

            if (file.toString().indexOf(property) !== -1) {
                return false;
            } else {
                return true;
            }
        });
    }
});

var numCSSPropertiesUsed = cssprops.length - csspropsaft.length;
var unusedCSSProperties = csspropsaft;
console.log(numCSSPropertiesUsed, unusedCSSProperties.length);