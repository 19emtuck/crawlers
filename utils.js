/****************************************************************************************************************************/
/*                                      additionals toos                                                                    */
/*                                                                                                                          */
/* this code is under MIT license  :                                                                                        */
/* author: stéphane bard  <stephane.bard@gmail.com>                                                                         */
/*                                                                                                                          */
/*                                                                                                                          */
/* Copyright © <date>, <copyright holders> Permission is hereby granted, free of charge, to any person obtaining a copy of  */
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
/* <copyright holders>.                                                                                                     */
/*                                                                                                                          */
/****************************************************************************************************************************/

var exports = module.exports = {};
/**
 * usage : await page.$$eval('button', click_label, 'my label');
 *
 */
exports.click_label = (lst_spans, remote_path) => {
  var lst_result = [];
  for(var _i=0;_i<lst_spans.length;_i++){
    if(lst_spans[_i].textContent===remote_path){
      lst_spans[_i].click();
      break;
    }
  }
};

/*
 * download it via ajax
 *
 * sample usage :
 *    await page.evaluate(utils.download_it, 'http://www.orimi.com/pdf-test.pdf', './test.pdf').then(utils.save_download).catch(function(error){if(error){console.log(error);}});
 *
 */
exports.download_it = (document_url, document_file_name, post_data) => {
  function base64ArrayBuffer(arrayBuffer) {
    var base64    = ''
    var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    var bytes         = new Uint8Array(arrayBuffer)
    var byteLength    = bytes.byteLength
    var byteRemainder = byteLength % 3
    var mainLength    = byteLength - byteRemainder
    var a, b, c, d
    var chunk
    for (var i = 0; i < mainLength; i = i + 3) {
        chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
        a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
        b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
        c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
        d = chunk & 63               // 63       = 2^6 - 1
        base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
      }
    if (byteRemainder == 1) {
        chunk = bytes[mainLength]
        a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2
        b = (chunk & 3)   << 4 // 3   = 2^2 - 1
        base64 += encodings[a] + encodings[b] + '=='
      } else if (byteRemainder == 2) {
          chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]
          a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
          b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4
          c = (chunk & 15)    <<  2 // 15    = 2^4 - 1
          base64 += encodings[a] + encodings[b] + encodings[c] + '='
        }
    return base64
  }

  function handleErrors(error) {
    console.error('Something went wrong ', error);
  }

  function request(url, post_data) {
    return new Promise(function(resolve, reject) {
        const xhr = new XMLHttpRequest();
        try {
          xhr.onreadystatechange = function(e) {
             try {
               if (xhr.readyState === 4) {
                 if (xhr.status === 200) {
                     let content_type = xhr.getResponseHeader("Content-Type");
                     let file_name = null;
                     if(typeof(xhr.getResponseHeader("Content-Disposition"))!=='undefined'){
                       file_name = xhr.getResponseHeader("Content-Disposition");
                       if(/="[^]+"/.test(file_name)){
                         file_name = file_name.split('="')[1].split('"')[0];
                       }
                     }

                     // transform content into base64
                     let content = base64ArrayBuffer(e.currentTarget.response);
                     resolve({'content'            : content,
                              'file_name'          : file_name,
                              'document_file_name' : document_file_name});
                 } else {
                   reject(xhr.status)
                 }
               }
             } catch (error) {
               reject(error);
             }
          };

          xhr.ontimeout = function(){
            reject('timeout');
          }
          xhr.responseType = 'arraybuffer';
          if(typeof(post_data)!=='undefined'){
            xhr.open('post', url);
            var data, lst_keys, _i, _key, _val;

            data = new FormData();
            lst_keys = Object.keys(post_data);

            for(_i=0;_i<lst_keys.length;_i++){
              _key = lst_keys[_i];
              _val = post_data[_key];

              data.append(_key, _val);
            }

            xhr.send(data);
          } else {
            xhr.open('get', url);
            xhr.send();
          }
        } catch (error) {
          reject(error);
        }
     });
  }

  // return a promise
  if(typeof(post_data)!=='undefined'){
    return request(document_url, post_data);
  } else {
    return request(document_url);
  }
};

exports.save_download = (response_container) => {
  let fs = require('fs');
  let pdf_content        = response_container.content;
  let file_name          = response_container.file_name;
  let document_file_name = response_container.document_file_name;

  if(document_file_name!==null && !fs.existsSync(document_file_name)){
    fs.writeFile(document_file_name, pdf_content, 'base64', function(err) {
      if(err) {
          console.log(err);
          return;
      }
    });
  }
};
