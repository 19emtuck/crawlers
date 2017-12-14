/****************************************************************************************************************************/
/*                             free mobile crawler                                                                          */
/*                                                                                                                          */
/* this code is under MIT license  :                                                                                        */
/* author: stéphane bard   <stephane.bard@gmail.com>                                                                        */
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

var casper = require("casper").create({
    verbose: true});

var root_url = 'https://mobile.free.fr/moncompte';
var fs       = require('fs');

var identifiant  = casper.cli.raw.get('id').toString();
var password     = casper.cli.raw.get('pwd').toString();
var aim_path     = casper.cli.raw.get('path').toString();
var phone_number = casper.cli.raw.get('phone').toString();

var map_img_indice_keyboard;

casper.on('step.complete', function(){
   var indice = 0;
   if(casper.cli.has('indice')){
     indice = casper.cli.get('indice');
   }
   if(casper.cli.has('screenshot')){
     this.capture('images/free_' + casper.step +'_'+indice+'.jpg', undefined,{ format:'jpg', quality:100});
   }
});

casper.options.logLevel    = 'info';
casper.options.verbose     = false;
casper.options.waitTimeout = 80000;

casper.on('step.start', function(){
   this.evaluate(function(){document.body.bgColor = 'white';});
});

// log all webapp js log
casper.on('remote.message',function(message){
  if(casper.cli.has("console")){
      this.echo(message, "INFO");
  }
});

casper.start();
casper.viewport(1024, 768);
casper.userAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X)');

casper.thenOpen(root_url);
casper.waitForSelector('.ident_chiffre2');

casper.then(function(){
  var lst_url_imgs = this.evaluate(function(){
   var result, lst_img, i;
    result=[];
    lst_img = document.querySelectorAll('img[class="ident_chiffre_img pointer"]');

    for(i=0;i<lst_img.length;i++){
      result.push(lst_img[i].src);
    }
    return result;
  });

  var result = this.evaluate(function(){

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

  // dump
  // // Write decoded data to local file!
  // for(var k=0;k<result.imgs.length;k++){
  //   var img_data = result.imgs[k];
  //   var buf = new Buffer(img_data, "base64").toString('binary');
  //   fs.write("test_little_"+k+".png", buf, 'wb'); 
  // }
  // this.echo(JSON.stringify(result.map_id_image_num));
});

casper.then(function(){
  var lst_chars = identifiant.split('');
  this.each(lst_chars, function(casp, _c, i){

    casp.thenEvaluate(function(_i){
       document.querySelectorAll('img[class="ident_chiffre_img pointer"]')[_i].click();
    }, map_img_indice_keyboard[_c] );

    casp.wait(500);
  });
});

casper.wait(1000);
casper.then(function(){
  this.fill('#form_connect',{'pwd_abo' : password})
});
casper.wait(1000);

casper.thenClick('#ident_btn_submit');
casper.wait(2000);

casper.waitForSelector('#menuEspaceAbonne');

casper.then(function(){
  this.evaluate(function(){
    document.querySelector('a[href="index.php?page=suiviconso"]').click();
  });
});

casper.waitForSelector('img[src="/images/pdficon_small.png"]')
casper.then(function(){
  var lst_href_invoices = this.evaluate(function(){
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

  this.each(lst_href_invoices, function(casp, _doc, i){
    casp.then(function(){
      if(_doc.phone===phone_number){
        if(!fs.exists(aim_path+_doc.name)){
          this.download(_doc.href, aim_path+_doc.name);
        }
      }
    });
  });
});

casper.run();
