/****************************************************************************************************************************/
/*                                      sosh crawler                                                                        */
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
const utils     = require('utils.js')
const { exec } = require('child_process');

const root_url  = 'https://www.sosh.fr/';

let aim_path    = null;
let identifiant = null;
let password    = null;
let debug       = false;
let restricted  = true;

const base64ArrayBuffer = function (arrayBuffer) {
  var base64    = '';
  var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var bytes         = new Uint8Array(arrayBuffer);
  var byteLength    = bytes.byteLength;
  var byteRemainder = byteLength % 3;
  var mainLength    = byteLength - byteRemainder;
  var a, b, c, d;
  var chunk;

  for (var i = 0; i < mainLength; i = i + 3) {
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048)   >> 12; // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032)     >>  6; // 4032     = (2^6 - 1) << 6
    d = chunk & 63;              // 63       = 2^6 - 1
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
  }

  if (byteRemainder == 1) {
    chunk = bytes[mainLength];
    a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2
    b = (chunk & 3)   << 4; // 3   = 2^2 - 1
    base64 += encodings[a] + encodings[b] + '==';
  } else if (byteRemainder == 2) {
      chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
      a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
      b = (chunk & 1008)  >>  4; // 1008  = (2^6 - 1) << 4
      c = (chunk & 15)    <<  2; // 15    = 2^4 - 1
      base64 += encodings[a] + encodings[b] + encodings[c] + '=';
  }
  return base64;
};

process.argv.forEach(function (val, index, array) {
  if(/--path=/.test(val)){ aim_path = val.split('=')[1]; }
  if(/--id=/.test(val)){ identifiant = val.split('=')[1]; }
  if(/--pwd=/.test(val)){ password = val.split('=')[1]; }
  if(/--debug/.test(val)){ debug = true; }
  if(/--full/.test(val)){ restricted = false; }
});

if(aim_path!==null && identifiant !== null && password !== null){
  if(!/\/$/.test(aim_path)){
    aim_path = aim_path + '/';
  }

  (async () => {
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox'], timeout:90000});
    const page = await browser.newPage();
    // page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    await page.setRequestInterception(true);

    page.on('request', request => {
      request.continue();
    });

    page.on('requestfinished', async request => {
      if (/pdf.billDate/.test(request.url())) {

        try {
          let response = request.response();
          let buffer = await response.buffer();

          // two calls are performed
          // only the second one contains the pdf in the response body
          if(buffer.length>0){
            let response_headers = response.headers();
            let file_name = response_headers['content-disposition'].split('filename=')[1];

            // facture_5a1e5a2a2fa3a18aa0ca24aa3aac3a2a_2016-04-01.pdf
            // facture_01_04_2016.pdf
            let content = base64ArrayBuffer(buffer);
            // unpack it
            let [_y, _m, _d] = file_name.split('_')[2].split('.')[0].split('-');
            file_name = aim_path + 'facture_'+_d+'_'+_m+'_'+_y+'.pdf';

            if(file_name!==null && !fs.existsSync(file_name)){
              fs.writeFile(file_name, content, 'base64', function(err) {
                if(err) {
                    console.log(err);
                    return;
                }
              });
            }
          }

        } catch (e) {
          console.error(`- failed: ${e}`);
        } 
      }
    });


    await page.setViewport({width:1600, height:900});
    await page.setDefaultNavigationTimeout(90000);

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36');
    try {
      await page.goto(root_url);

      await page.waitForSelector('#o-nav-item-login');
      await page.click('#o-nav-item-login');
      await page.waitForSelector('#login');
      await page.type('#login', identifiant);
      await page.waitFor(500);
      await page.click('#btnSubmit');
      await page.waitForSelector('#password');
      await page.type('#password', password);
      await page.waitFor(500);
      await page.click('#btnSubmit');
      await page.waitFor(300);
      // wait with a `or` condition "later buton" or "invoices link"
      await page.waitForSelector('#btnLater, a[data-ga-nom="consulter_vos_factures"]');

      // landing page might contains a proposal
      // just need to click see you later button
      if(await page.$('#btnLater') !== null){
        // let's wait all js is loaded
        await page.waitFor(1000);
        await page.click('#btnLater');
        await page.waitForSelector('a[data-ga-nom="consulter_vos_factures"]');
      }

      await page.waitFor(300);
      await page.click('a[data-ga-nom="consulter_vos_factures"]');
      await page.waitFor(100);
      await page.waitForSelector('span.icon-Invoices-euro');
      await page.waitFor(1000);
      await page.click('span.icon-Invoices-euro');
      await page.waitFor(600);
      await page.waitForSelector('table.table tbody tr td');
      await page.waitFor(600);

      let pdf_buttons_list = await page.$$('table.table > tbody > tr > td.bp-iconContainer > a');
      if(restricted){
        pdf_buttons_list = pdf_buttons_list.slice(0,1);
      }

      for(let _i=0;_i<pdf_buttons_list.length;_i++){
        await page.evaluate((_b)=>{_b.click()}, pdf_buttons_list[_i]);
        await page.waitFor(1000);
      }
      await page.waitFor(3000);
    } catch (error) {
      console.log(error);
    }
    await browser.close();
  })();
}
