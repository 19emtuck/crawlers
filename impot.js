/****************************************************************************************************************************/
/*                                         impot crawler                                                                    */
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

var casper = require("casper").create({
    verbose: true});

var root_url = 'https://www.impots.gouv.fr';
var utils    = require('utils');
var fs       = require('fs');

var lst_documents = [];
var lst_annees    = [];

var identifiant = casper.cli.raw.get('id').toString();
var password    = casper.cli.raw.get('pwd').toString();
var aim_path    = casper.cli.get('path').toString();

function read_documents(casper){
  casper.then(function(){
    var _lst_documents = this.evaluate(function(){
      String.prototype.sansAccent = function(){
          var accent = [
                  /[\300-\306]/g, /[\340-\346]/g, // A, a
                  /[\310-\313]/g, /[\350-\353]/g, // E, e
                  /[\314-\317]/g, /[\354-\357]/g, // I, i
                  /[\322-\330]/g, /[\362-\370]/g, // O, o
                  /[\331-\334]/g, /[\371-\374]/g, // U, u
                  /[\321]/g, /[\361]/g, // N, n
                  /[\307]/g, /[\347]/g, // C, c
              ];
          var noaccent = ['A','a','E','e','I','i','O','o','U','u','N','n','C','c'];
           
          var str = this;
          for(var i = 0; i < accent.length; i++){
                  str = str.replace(accent[i], noaccent[i]);
              }
           
          return str;
      }
      var link;
      var url='';
      var annee='';
      var full_text_link='';
      var text_link ='';
      var result_list = [];
      var lst_links = document.querySelectorAll('a.cssLienTable');
      var type = '';

      for(var i=0;i<lst_links.length;i++){
        link = lst_links[i];
        if(i===0){
          annee     = link.parentElement.previousElementSibling.previousElementSibling.innerText;
          text_link = link.parentElement.previousElementSibling.innerText;
        }
        full_text_link = 'annee_' + annee + '_' + text_link + '_' + link.innerText;
        full_text_link = full_text_link.sansAccent().toLowerCase();
        full_text_link = full_text_link.replace(/ /g, '_');
        full_text_link = full_text_link.replace(/\s/g,'_');
        full_text_link = full_text_link.replace(/-/g,'_');
        full_text_link = full_text_link.replace(/[^a-z0-9A-Z]/g,'_');
        full_text_link = full_text_link.replace(/'/g,'');
        full_text_link = full_text_link.replace(/_{2,}/g,'_')+'.pdf';

        url = link.getAttribute('onclick');
        url = url.split("'")[1].split("'")[0];

        type = '';
        if(/habitation/.test(full_text_link)){
          type='taxe_habitation';
        } else if(/foncieres/.test(full_text_link)){
          type='taxe_foncieres';
        } else if(/revenus/.test(full_text_link)){
          type='impot_sur_les_revenus';
        }

        result_list.push({ 'annee'         : annee,
                           'name'          : full_text_link,
                           'url'           : url,
                           'type_document' : type });
      }
      return result_list;
    });
    lst_documents = [];
    Array.prototype.push.apply(lst_documents, _lst_documents);
  });


  casper.then(function(){
    this.each(lst_documents, function(casp, doc, i){

      casp.then(function(){
        this.evaluate(function(url){
          win = ouvreDocument(url);
        }, doc.url);
      });
      casp.then(function(){
        this.evaluate(function(url){
          win = ouvreDocument(url);
        }, doc.url);
      });

      casp.waitForPopup(/ConsultationDocument/, function(){});

      casp.withPopup(/ConsultationDocument/, function(){
        var __url = this.evaluate(function(){
          return lancer.toString().split('\n')[1].split(' = ')[1].split('"')[1];
        });
        if(!fs.isFile(aim_path+doc.annee+'/'+doc.type_document+'/'+doc.name)){
          if(fs.makeTree(aim_path+doc.annee+'/'+doc.type_document+'/')){
            this.download(__url, aim_path+doc.annee+'/'+doc.type_document+'/'+doc.name);
          } else {
            this.echo('bad:'+aim_path+doc.annee+'/'+doc.type_document+'/');
          }
        }
      });

    });
  });
}

casper.on('step.complete', function(){
   var indice = 0;
   if(casper.cli.has('indice')){
     indice = casper.cli.get('indice');
   }
   if(casper.cli.has('screenshot')){
     this.capture('images/sosh_' + casper.step +'_'+indice+'.jpg', undefined,{ format:'jpg', quality:100});
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
casper.userAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36');
casper.thenOpen(root_url);
casper.waitForSelector('a.btn.identificationpart');
casper.thenClick('a.btn.identificationpart');
casper.waitForSelector('input[name="LMDP_Spi_tmp"]');

casper.then(function(){
  this.fill('#LMDP_formulaire', {'LMDP_Spi_tmp':identifiant, 'LMDP_Password_tmp':password});
});
casper.thenClick('#LMDP_formulaire button[type="submit"]');
casper.waitForSelector('#personalInfo p');
casper.thenOpen('https://cfspart.impots.gouv.fr/acces-usager/cfs');
casper.waitForSelector('a[title="Acc\u00e9der aux avis et d\u00e9clarations"]');
casper.thenClick('a[title="Acc\u00e9der aux avis et d\u00e9clarations"]');
casper.waitForSelector('form[name="documentsForm"]');

casper.then(function(){

  var restricted = true;
  if(casper.cli.has('full')){
    restricted = false;
  }

  lst_annees = this.evaluate(function(restricted){
    var _item, i, lst_options, max_year;

    result = [];

    lst_options = document.querySelectorAll('select[name="annee"] option');
    
    max_year = 0;

    for(i=0;i<lst_options.length;i++){
      _item = lst_options[i];
      if(restricted){
        __item = parseInt(_item.value, 10);
        if(max_year<__item){
          max_year = __item;
        }

      } else {
        if(/[0-9]{4}/.test(_item.value)){
          result.push(_item.value);
        }
      }
    }
    if(restricted && max_year!==0){
      result.push(max_year.toString())
    }
    return result;

  }, restricted);
});


casper.then(function(){
  this.each(lst_annees, function(caper_main_loop, _annee, i){

    caper_main_loop.thenOpen('https://cfspart.impots.gouv.fr/acces-usager/cfs');
    caper_main_loop.waitForSelector('a[title="Acc\u00e9der aux avis et d\u00e9clarations"]');
    casper.wait(1000);
    caper_main_loop.thenClick('a[title="Acc\u00e9der aux avis et d\u00e9clarations"]');
    caper_main_loop.waitForSelector('form[name="documentsForm"]');

    // impot revenu
    caper_main_loop.then(function(){
      this.fill('form[name="documentsForm"]', {'typeImpot':'IR', 'typeDocument':'avis', 'annee':_annee});
    });
    caper_main_loop.thenClick('a.cssBouton');
    caper_main_loop.waitForSelector('form[name="documentsForm"]');
    read_documents(caper_main_loop);
    casper.wait(1000);

    // taxe habitation
    caper_main_loop.then(function(){
      this.fill('form[name="documentsForm"]', {'typeImpot':'TH', 'typeDocument':'avis', 'annee':_annee});
    });
    caper_main_loop.thenClick('a.cssBouton');
    caper_main_loop.waitForSelector('form[name="documentsForm"]');
    read_documents(caper_main_loop);
    casper.wait(1000);

    // taxe fonciere
    caper_main_loop.then(function(){
      this.fill('form[name="documentsForm"]', {'typeImpot':'TF', 'typeDocument':'avis', 'annee':_annee});
    });
    caper_main_loop.thenClick('a.cssBouton');
    caper_main_loop.waitForSelector('form[name="documentsForm"]');
    read_documents(caper_main_loop);
  });
});

casper.run();
