var request = require('request');
var cheerio = require('cheerio');

exports.getUrlTitle = function(url, cb) {
  request(url, function(err, res, html) {
    if (err) {
      console.log('Error reading url heading: ', err);
      return cb(err);
    } else {
      var $ = cheerio.load(html);
      var tag = /<title>(.*)<\/title>/;
      var match = html.match(tag);
      var title = match ? match[1] : url;
      var foundIco = false;
      var targetIco;
      var src = $('link').each(function(i, element) {
        if (!foundIco) {
            var a = $(this).attr('href');
            if (a.toLowerCase().indexOf(".ico") > -1) {
              if (a.indexOf('http') === -1) {
                a = url + "/" + a;
              }
                targetIco = a;
                foundIco = true;
                //stop checking at this point
                //<meta property="og:image" content="/sy/dh/ap/default/130909/y_200_a.png">
            } 
        }
      });
      // console.log(src);
      return cb(err, title, targetIco);
    }
  });
};

var rValidUrl = /^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i;

exports.isValidUrl = function(url) {
  return url.match(rValidUrl);
};

/************************************************************/
// Add additional utility functions below
/************************************************************/