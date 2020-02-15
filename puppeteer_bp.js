/****************************************************************************************************************************/
/*                                            bp crawler                                                                    */
/*                                                                                                                          */
/* this code is under MIT license  :                                                                                        */
/* author: stéphane bard  <stephane.bard@gmail.com>                                                                         */
/*                                                                                                                          */
/*                                                                                                                          */
/* Copyright © <2020>, <Bard Stéphane> Permission is hereby granted, free of charge, to any person obtaining a copy of      */
/* this software and associated documentation files (the “Software”), to deal in the Software without restriction,          */
/*   including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell      */
/* copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following       */
/* conditions: The above copyright notice and this permission notice shall be included in all copies or substantial         */
/* portions of the Software.  The Software is provided "as is", without warranty of any kind, express or implied, including */
/* but not limited to the warranties of merchantability, fitness for a particular purpose and noninfringement. In no event  */
/* shall the authors or copyright holders X be liable for any claim, damages or other liability, whether in an action of    */
/* contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the */
/* Software.  Except as contained in this notice, the name of the <copyright holders> shall not be used in advertising or   */
/* otherwise to promote the sale, use or other dealings in this Software without prior written authorization from the       */
/* <Bard Stéphane>.                                                                                                         */
/*                                                                                                                          */
/****************************************************************************************************************************/

const puppeteer = require('puppeteer');
const fs        = require('fs');
const utils     = require('./utils.js')
const { exec }  = require('child_process');

const root_url = 'https://www.labanquepostale.fr/';
var suffix     = 'LA_BANQUE_POSTALE_E_RELEVE_';

let aim_path    = null;
let identifiant = null;
let password    = null;
let debug       = false;


process.argv.forEach(function (val, index, array) {
  if(/--path=/.test(val)){ aim_path = val.split('=')[1]; }
  if(/--id=/.test(val)){ identifiant = val.split('=')[1]; }
  if(/--pwd=/.test(val)){ password = val.split('=')[1]; }
  if(/--debug/.test(val)){ debug = true; }
  // overrite default suffix
  if(/--suffix/.test(val)){ suffix = val.split('=')[1] }
});

if(aim_path!==null && identifiant !== null && password !== null && suffix!==null){
  if(!/\/$/.test(aim_path)){
    aim_path = aim_path + '/';
  }
  (async () => {
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox'], timeout:90000});
    const page = await browser.newPage();

    await page.setViewport({width:1200, height:900});
    await page.setDefaultNavigationTimeout(90000);

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36');
    try {
      await page.goto(root_url);
      await page.waitFor(1000);

      await page.waitForSelector('#verifStatAccount');
      await page.click('#verifStatAccount');
      await page.waitForSelector('div.navmain-account');

      await page.waitForSelector('div.navmain-account iframe');
      await page.waitFor(1000);

      let iframe_index = 0;

      // let's scan all iframe in order to find the right iframe
      // the one that contains the numerical keyboard
      const virtual_key_board_selector = '#imageclavier';
      let frames = page.frames();
      let aim_frame = null
      let element_found;
     
      for(var _u=0;_u<frames.length;_u++){
        element_found = await frames[_u].$(virtual_key_board_selector);
        if(element_found!==null){
          iframe_index = _u;
          aim_frame = frames[_u];
          break;
        }
      }
      await page.waitFor(1000);

      let keyboard_img_url = 'https://voscomptesenligne.labanquepostale.fr/wsost/OstBrokerWeb/' + await aim_frame.evaluate(function(){
        return document.querySelectorAll('style')[0].innerHTML.split('\n').filter(function(item){
            if(/allunifie/.test(item)){return item;}
          })[0].split('url(')[1].split(')')[0];
      });

      await aim_frame.evaluate(function(keyboard_img_url){
           function loadCanvas(dataURL) {
             // made it global
             canvas = document.createElement('canvas');
             var context = canvas.getContext('2d');

             // load image from data url
             var imageObj = new Image();
             imageObj.onload = function() {
               __image_height = this.height;
               __image_width = this.width;

               canvas.height = __image_height;
               canvas.width  = __image_width;
               context.drawImage(this, 0, 0, __image_width, __image_height, 0, 0, __image_width, __image_height);
             };
             imageObj.src = dataURL;
           }
           loadCanvas(keyboard_img_url);
        }, keyboard_img_url);

      await page.waitFor(1000);

      let map_number_to_button_id = await aim_frame.evaluate(function(){
         function checkCanvas() {
           // canvas is global
           var context   = canvas.getContext('2d');

           var pixel_data = context.getImageData(0,0,__image_width, __image_height).data;


           var load_sympbols = function(coords){
             lst_keys = Object.keys(coords);

             var symbols={'0':'daa52d75287bea58f505823ef6c8b96c',
                          '1':'f5da96c2592803a8cdc5a928a2e4a3b0',
                          '2':'9ff78367d5cb89cacae475368a11e3af',
                          '3':'908a0a42a424b95d4d885ce91bc3d920',
                          '4':'3fc069f33b801b3d0cdce6655a65c0ac',
                          '5':'58a2afebf1551d45ccad79fad1600fc3',
                          '6':'7fedfd9e57007f2985c3a1f44fb38ea1',
                          '7':'389b8ef432ae996ac0141a2fcc7b540f',
                          '8':'bf357ff09cc29ea544991642cd97d453',
                          '9':'b744015eb89c1b950e13a81364112cd6',
                         };

             var reverse_symbols = {};
             var lst_sym_keys = Object.keys(symbols);

             for(var __u=0;__u<lst_sym_keys.length;__u++){

               var sym = lst_sym_keys[__u];
               var md  = symbols[sym];

               reverse_symbols[md] = sym;
             }

             for(var __i=0;__i<lst_keys.length;__i++){
               var _key = lst_keys[__i];
               var coord = get_symbol_coords(coords[_key]);

               if(coord.join(';')==='-1;-1;-1;-1'){
                 continue;
               }
               coords[_key] = coord;
               var checksum_md5 = checksum(coord);

               md5[_key] = checksum_md5;

               if(checksum_md5 in reverse_symbols){
                 md5_symbol[_key] = reverse_symbols[checksum_md5];
                 map_number_to_button_id[reverse_symbols[checksum_md5]] = parseInt(_key, 10);
               }
             }
           };

           var check_color = function(pixel){
             // var color=(0xff, 0xff, 0xff)
             return pixel[0] === 255 && pixel[1] === 255 && pixel[2] === 255;
           };

           var checksum = function(coords){

                         /*
                         * Add integers, wrapping at 2^32. This uses 16-bit operations internally
                         * to work around bugs in some JS interpreters.
                         */
                         function safeAdd (x, y) {
                           var lsw = (x & 0xffff) + (y & 0xffff);
                           var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
                           return (msw << 16) | (lsw & 0xffff);
                         }

                         /*
                         * Bitwise rotate a 32-bit number to the left.
                         */
                         function bitRotateLeft (num, cnt) {
                           return (num << cnt) | (num >>> (32 - cnt));
                         }

                         /*
                         * These functions implement the four basic operations the algorithm uses.
                         */
                         function md5cmn (q, a, b, x, s, t) {
                           return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
                         }
                         function md5ff (a, b, c, d, x, s, t) {
                           return md5cmn((b & c) | (~b & d), a, b, x, s, t);
                         }
                         function md5gg (a, b, c, d, x, s, t) {
                           return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
                         }
                         function md5hh (a, b, c, d, x, s, t) {
                           return md5cmn(b ^ c ^ d, a, b, x, s, t);
                         }
                         function md5ii (a, b, c, d, x, s, t) {
                           return md5cmn(c ^ (b | ~d), a, b, x, s, t);
                         }

                         /*
                         * Calculate the MD5 of an array of little-endian words, and a bit length.
                         */
                         function binlMD5 (x, len) {
                           /* append padding */
                           x[len >> 5] |= 0x80 << (len % 32);
                           x[((len + 64) >>> 9 << 4) + 14] = len;

                           var i;
                           var olda;
                           var oldb;
                           var oldc;
                           var oldd;
                           var a = 1732584193;
                           var b = -271733879;
                           var c = -1732584194;
                           var d = 271733878;

                           for (i = 0; i < x.length; i += 16) {
                             olda = a;
                             oldb = b;
                             oldc = c;
                             oldd = d;

                             a = md5ff(a, b, c, d, x[i], 7, -680876936);
                             d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
                             c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
                             b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
                             a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
                             d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
                             c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
                             b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
                             a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
                             d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
                             c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
                             b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
                             a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
                             d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
                             c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
                             b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);

                             a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
                             d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
                             c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
                             b = md5gg(b, c, d, a, x[i], 20, -373897302);
                             a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
                             d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
                             c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
                             b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
                             a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
                             d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
                             c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
                             b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
                             a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
                             d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
                             c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
                             b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);

                             a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
                             d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
                             c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
                             b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
                             a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
                             d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
                             c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
                             b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
                             a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
                             d = md5hh(d, a, b, c, x[i], 11, -358537222);
                             c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
                             b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
                             a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
                             d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
                             c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
                             b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);

                             a = md5ii(a, b, c, d, x[i], 6, -198630844);
                             d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
                             c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
                             b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
                             a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
                             d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
                             c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
                             b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
                             a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
                             d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
                             c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
                             b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
                             a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
                             d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
                             c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
                             b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);

                             a = safeAdd(a, olda);
                             b = safeAdd(b, oldb);
                             c = safeAdd(c, oldc);
                             d = safeAdd(d, oldd);
                           }
                           return [a, b, c, d];
                         }

                         /*
                         * Convert an array of little-endian words to a string
                         */
                         function binl2rstr (input) {
                           var i;
                           var output = '';
                           var length32 = input.length * 32;
                           for (i = 0; i < length32; i += 8) {
                             output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xff);
                           }
                           return output;
                         }

                         /*
                         * Convert a raw string to an array of little-endian words
                         * Characters >255 have their high-byte silently ignored.
                         */
                         function rstr2binl (input) {
                           var i;
                           var output = [];
                           output[(input.length >> 2) - 1] = undefined;
                           for (i = 0; i < output.length; i += 1) {
                             output[i] = 0;
                           }
                           var length8 = input.length * 8;
                           for (i = 0; i < length8; i += 8) {
                             output[i >> 5] |= (input.charCodeAt(i / 8) & 0xff) << (i % 32);
                           }
                           return output;
                         }

                         /*
                         * Calculate the MD5 of a raw string
                         */
                         function rstrMD5 (s) {
                           return binl2rstr(binlMD5(rstr2binl(s), s.length * 8));
                         }

                         /*
                         * Calculate the HMAC-MD5, of a key and some data (raw strings);
                         */
                         function rstrHMACMD5 (key, data) {
                           var i;
                           var bkey = rstr2binl(key);
                           var ipad = [];
                           var opad = [];
                           var hash;
                           ipad[15] = opad[15] = undefined;
                           if (bkey.length > 16) {
                             bkey = binlMD5(bkey, key.length * 8);
                           }
                           for (i = 0; i < 16; i += 1) {
                             ipad[i] = bkey[i] ^ 0x36363636;
                             opad[i] = bkey[i] ^ 0x5c5c5c5c;
                           }
                           hash = binlMD5(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
                           return binl2rstr(binlMD5(opad.concat(hash), 512 + 128));
                         }

                         /*
                         * Convert a raw string to a hex string
                         */
                         function rstr2hex (input) {
                           var hexTab = '0123456789abcdef';
                           var output = '';
                           var x;
                           var i;
                           for (i = 0; i < input.length; i += 1) {
                             x = input.charCodeAt(i);
                             output += hexTab.charAt((x >>> 4) & 0x0f) + hexTab.charAt(x & 0x0f);
                           }
                           return output;
                         }

                         /*
                         * Encode a string as utf-8
                         */
                         function str2rstrUTF8 (input) {
                           return unescape(encodeURIComponent(input));
                         }

                         /*
                         * Take string arguments and return either raw or hex encoded strings
                         */
                         function rawMD5 (s) {
                           return rstrMD5(str2rstrUTF8(s));
                         }
                         function hexMD5 (s) {
                           return rstr2hex(rawMD5(s));
                         }
                         function rawHMACMD5 (k, d) {
                           return rstrHMACMD5(str2rstrUTF8(k), str2rstrUTF8(d));
                         }
                         function hexHMACMD5 (k, d) {
                           return rstr2hex(rawHMACMD5(k, d));
                         }

                         function md5 (string, key, raw) {
                           if (!key) {
                             if (!raw) {
                               return hexMD5(string);
                             }
                             return rawMD5(string);
                           }
                           if (!raw) {
                             return hexHMACMD5(key, string);
                           }
                           return rawHMACMD5(key, string);
                         }


             var x1 = coords[0];
             var y1 = coords[1];
             var x2 = coords[2];
             var y2 = coords[3];

             var s = '';

             for(y=y1;y<Math.min(y2+1, __image_height);y++){
               for(x=x1; x<Math.min(x2+1, __image_width); x++){
                 r = pixel_data[(y*__image_width + x)*4];     // red
                 g = pixel_data[((y*__image_width + x)*4)+1]; // green
                 b = pixel_data[((y*__image_width + x)*4)+2]; // blue
                 if (check_color([r,g,b])){
                   s += ".";
                 } else {
                   s += " ";
                 }
               }
             }
             return md5(s);
           };

           var get_symbol_coords = function(coords){
             var x,y;

             var x1 = coords[0];
             var y1 = coords[1];
             var x2 = coords[2];
             var y2 = coords[3];

             var newY1 = -1;
             var newY2 = -1;

             for(y=y1;y<Math.min(y2+1, __image_height);y++){
               var empty_line = true;

               for(x=x1; x<Math.min(x2+1, __image_width); x++){
                 r = pixel_data[(y*__image_width + x)*4];     // red
                 g = pixel_data[((y*__image_width + x)*4)+1]; // green
                 b = pixel_data[((y*__image_width + x)*4)+2]; // blue

                 if (check_color([r,g,b])){
                   empty_line = false;
                   if (newY1 < 0 ){
                     newY1 = y;
                   }
                   break;
                 }
               }

               if(newY1>=0 && !empty_line){
                 newY2 = y;
               }
             }

             newX1 = -1;
             newX2 = -1;

             for(x=x1; x<Math.min(x2+1, __image_width); x++){
               var empty_column = true;
               for(y=y1;y<Math.min(y2+1, __image_height);y++){
                 r = pixel_data[(y*__image_width + x)*4];     // red
                 g = pixel_data[((y*__image_width + x)*4)+1]; // green
                 b = pixel_data[((y*__image_width + x)*4)+2]; // blue

                 if (check_color([r,g,b])){
                   empty_column = false;
                   if (newX1 < 0){
                     newX1 = x;
                   }
                   break;
                 }
               }

               if(newX1>=0 && !empty_column){
                 newX2 = x;
               }
             }

             return [newX1, newY1, newX2, newY2];
           };

           var md5    = {};
           md5_symbol = {};

           var size = __image_width;
           var x = 0;
           var y = 0;
           var width = parseInt(size / 4, 10);
           var height = parseInt(size / 4, 10);

           var lst_buttons = document.querySelectorAll('#imageclavier button');

           coords                  = {};
           map_number_to_button_id = {};

           for(var i=0;i<lst_buttons.length;i++){
               var code = i.toString();

               if(code.length<2){
                 code = '0'+code;
               }

               coords[code] = [x+4, y+4, x+width-8, y+height-8];

               if ((x + width + 1) >= size){
                 y += height + 1;
                 x = 0;
               } else {
                 x += width + 1;
               }
           }
           load_sympbols(coords);
           return map_number_to_button_id;
         }
         var map_number_to_button_id = checkCanvas();
         return map_number_to_button_id;
      });

      await aim_frame.type('form[name="formAccesCompte"] input[name="username"]', identifiant);

      for(var i=0;i<password.length;i++){
        await aim_frame.waitForSelector('#val_cel_'+map_number_to_button_id[password[i]]);
        await aim_frame.click('#val_cel_'+map_number_to_button_id[password[i]]);
        await aim_frame.waitFor(1000);
      }

      await aim_frame.evaluate(()=>{ $('#valider').click(); });
      await page.waitForSelector('i.icon-power');
      await page.waitFor(1000);

      if(await page.$('div.modalContent') !== null){
        await page.waitForSelector('div.modalContent i.icon-cross', {visible:true});
        await page.click('div.modalContent i.icon-cross');
        await page.waitFor(5000);
        // wait modal to disappear
        await page.waitForSelector('i.icon-power');
        await page.waitFor(2000);
      }
      await page.waitForSelector('abbr[title="E-Relev\u00e9s"]');
      await page.click('abbr[title="E-Relev\u00e9s"]');
      await page.waitFor(5000);

      await page.waitForSelector('div.main-content-ereleves');
      await page.waitForSelector('div.main-content-ereleves a[href*="collapse"]');
      await page.waitFor(1000);
      await page.click('div.main-content-ereleves a[href*="collapse"]');

      await page.waitForSelector('ul.mbm.liste-cpte li', {visible:true});
      await page.waitForSelector('a[href^="refPDF-syntheseRelevesPDF.ea"]', {visible:true});


      let lst_documents = await page.evaluate((suffix) => {
        var i, node, lst_nodes, _doc, result, node_label;

        result = [];

        lst_nodes = document.querySelectorAll('a[href^="refPDF-syntheseRelevesPDF.ea"]');

        for(i=0;i<lst_nodes.length;i++){
          node = lst_nodes[i];

          // compute pdf label
          node_label = node.querySelector('span.date').innerText;
          node_label = suffix+node_label.replace(/\//g,'_').replace(/([0-9]{2})_([0-9]{4})/,'$2$1');
          node_label = node_label+'.pdf';

          // create document
          _doc = { 'url'   : node.href,
                   'label' : node_label };

          // push it into result list
          result.push(_doc);
        }
        return result;
      }, suffix);

      let _doc, _final_url;

      for(var _i=0;_i<lst_documents.length;_i++){
        _doc = lst_documents[_i];
        if(typeof(_doc.url)!=='undefined' && _doc.url!=='' && _doc.url!==null && !fs.existsSync(aim_path+_doc.label)){
          await page.goto(_doc.url);
          await page.waitForSelector('iframe');
          await page.waitFor(1000);
          _final_url = await page.evaluate(()=>{return document.querySelector('iframe').src;});
          await page.evaluate(utils.download_it, _final_url, aim_path+_doc.label).then(utils.save_download).catch(function(error){if(error){console.log(error);}});
          // wait correctly to get download achieved
          await page.waitFor(2000);
        }
      }
    } catch (error) {
      console.log(error);
    }
    await browser.close();
  })();
} else {
  console.log('aim_path or identifiant or password or remote_path missing');
}
