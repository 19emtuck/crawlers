/****************************************************************************************************************************/
/*                                      free crawler                                                                        */
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

const root_url = 'https://mobile.free.fr/moncompte';

let aim_path     = null;
let identifiant  = null;
let password     = null;
let debug        = false;
let phone_number = null;
let map_img_indice_keyboard;

process.argv.forEach(function (val, index, array) {
  if(/--path=/.test(val)){ aim_path = val.split('=')[1]; }
  if(/--id=/.test(val)){ identifiant = val.split('=')[1]; }
  if(/--pwd=/.test(val)){ password = val.split('=')[1]; }
  if(/--debug/.test(val)){ debug = true; }
  // overrite default suffix
  if(/--phone/.test(val)){ phone_number = val.split('=')[1] }
});

if(aim_path!==null && identifiant !== null && password !== null && phone_number!==null){
  if(!/\/$/.test(aim_path)){
    aim_path = aim_path + '/';
  }
  (async () => {
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
    const page = await browser.newPage();

    await page.setViewport({width:1200, height:900});
    await page.setDefaultNavigationTimeout(90000);

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36');
    try {
      await page.goto(root_url);
      await page.waitFor(1000);

      await page.waitForSelector('.ident_chiffre2');

      let lst_url_imgs = await page.evaluate(() => {
       var result, lst_img, i;
        result=[];
        lst_img = document.querySelectorAll('img[class="ident_chiffre_img pointer"]');

        for(i=0;i<lst_img.length;i++){
          result.push(lst_img[i].src);
        }
        return result;
      });

      let result = await page.evaluate(() => {

        var symbols, result, i, img, context, pixel_data, r, g, b, j, n, buf, map_id_image_num, canvas, context, data_url,
          pixel_data, s, _width, best, symbo, match, bit, res_indice, _c, j;

        symbols = { '0': '001111111111110011111111111111111111111111111110000000000011110000000000011111111111111111011111111111111001111111111110',
                    '1': '001110000000000001110000000000001110000000000011111111111111111111111111111111111111111111000000000000000000000000000000',
                    '2': '011110000001111011110000111111111000001111111110000011110011110000111100011111111111000011011111110000011001111000000011',
                    '3': '011100000011110111100000011111111000110000111110000110000011110001110000011111111111111111011111111111110001110001111100',
                    '4': '000000011111000000001111111000000111110011000011110000011000111111111111111111111111111111111111111111111000000000011000',
                    '5': '111111110011110111111110011111111001110000111111001100000011111001100000011111001111111111111001111111111010000111111110',
                    '6': '001111111111110011111111111111111111111111111110001100000011110001100000011111001111111111111101111111111011100111111110',
                    '7': '111000000000000111000000000000111000000011111111000011111111111011111111111111111111000000111111000000000111100000000000',
                    '8': '001110001111110011111111111111111111111111111110000110000011110000110000011111111111111111011111111111111001111001111110',
                    '9': '001111111000110011111111100111111111111100111110000001100011110000001100011111111111111111011111111111111001111111111110'
                  };

        canvas = document.createElement('canvas');

        result           = [];
        map_id_image_num = {};

        lst_img = document.querySelectorAll('img[class="ident_chiffre_img pointer"]');

        for(i=0;i<lst_img.length;i++){
          img = lst_img[i];

          canvas.width  = 8;
          canvas.height = 15;

          // we copy starting coordinate x=15, y=12  we copy 8 pix width and  15 pix height
          context = canvas.getContext('2d');
          context.drawImage(img, 15, 12, 8, 15, 0, 0, 8, 15); 
          data_url    = canvas.toDataURL("image/png");
          buf = data_url.replace(/^data:image\/(png|jpg);base64,/, "");
          // Make it binary data inside Buffer and decode it

          pixel_data = context.getImageData(0,0,8,15).data;
          s="";
          _width = 8;

          for(x=0;x<8;x++){
            for(y=0;y<15;y++){
              r = pixel_data[(y*_width + x)*4];     // red
              g = pixel_data[((y*_width + x)*4)+1]; // green
              b = pixel_data[((y*_width + x)*4)+2]; // blue

              if(g + b < 450){
                s += "1";
              } else {
                s += "0";
              }
            }
          }

          best = 0;
          res_indice = null;

          for(_c in symbols){
            symbol = symbols[_c];
            match = 0;
            for(j=0;j<s.length;j++){
              bit = s[j];
              if(bit===symbol[j]){
                match++;
              }
            }
            if(match > best){
              best = match;
              res_indice = _c;
            }
          }
          map_id_image_num[res_indice] = i;
        }
        
        return { 'imgs'             : result,
                 'map_id_image_num' : map_id_image_num };
      });

      map_img_indice_keyboard = result.map_id_image_num;

      var _c        = '';
      var lst_chars = identifiant.split('');

      for(var __i=0;__i<lst_chars.length;__i++){
        _c = lst_chars[__i];
        await page.evaluate((_i) => {
           document.querySelectorAll('img[class="ident_chiffre_img pointer"]')[_i].click();
        }, map_img_indice_keyboard[_c] );
        await page.waitFor(500);
      }

      await page.waitFor(1000);
      await page.type('#form_connect input[name="pwd_abo"]', password);

      await page.waitFor(1000);

      await page.click('#ident_btn_submit');
      await page.waitFor(2000);

      await page.waitForSelector('#menuEspaceAbonne');

      await page.evaluate(function(){
        document.querySelector('a[href="index.php?page=suiviconso"]').click();
      });
      await page.waitForSelector('img[src="/images/pdficon_small.png"]');

      var lst_href_invoices = await page.evaluate(() => {
        var result = [];
        var lst_invoice_link = document.querySelectorAll('a.factBt');
        for(var i=0;i<lst_invoice_link.length;i++){
          var _link = lst_invoice_link[i];
          var phone_number = _link.parentElement.parentElement.querySelector('span.numero').innerText.replace(/ /g,'')

          result.push({'name':_link.parentElement.parentElement.getAttribute('data-fact_date').substr(0,6)+'_freemobile.pdf',
                       'href':_link.href,
                       'phone':phone_number});
        }
        return result;
      });

      var _doc, i;

      for(i=0;i<lst_href_invoices.length;i++){
        _doc = lst_href_invoices[i];
        if(_doc.phone===phone_number){
          if(!fs.existsSync(aim_path+_doc.name)){
            await page.evaluate(utils.download_it, _doc.href, aim_path+_doc.name).then(utils.save_download).catch(function(error){if(error){console.log(error);}});
          }
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
