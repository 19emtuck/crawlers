/****************************************************************************************************************************/
/*                                      mgen crawler                                                                        */
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
    ignoreSslErrors:true,
    verbose: true});

var root_url = 'https://www.mgen.fr/login-adherent/';

var utils    = require('utils');
var fs       = require('fs');

var identifiant = casper.cli.raw.get('id').toString();
var password    = casper.cli.raw.get('pwd').toString();
var aim_path    = casper.cli.get('path').toString();

casper.on('step.complete', function(){
   var indice = 0;
   if(casper.cli.has('indice')){
     indice = casper.cli.get('indice');
   }
   if(casper.cli.has('screenshot')){
     this.capture('images/mgen_monthly_report_' + casper.step +'_'+indice+'.jpg', undefined,{ format:'jpg', quality:100});
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
casper.wait(1000);

casper.waitForText('votre espace personnel');
casper.then(function(){
  this.fill('form[name="formConnexion"]',{'user' : identifiant,
                                          'pass' : password});
});

casper.thenClick('#formConnexion input[name="submit"]');
casper.waitForText('Mes remboursements sant\u00e9');
casper.wait(2000);

casper.thenBypassIf(function(){return !this.exists('#fermetureTutoriel');}, 2);
casper.thenClick('#fermetureTutoriel');
casper.wait(2000);

casper.then(function(){
  this.clickLabel('Mes remboursements sant\u00e9');
});

casper.waitForSelector('#sectionAjaxListeRemboursements');
// we need to wait a bit until table content is correctly loaded
casper.wait(5000);


casper.then(function(){
  var lst_documents = this.evaluate(function(){
    var result = [];
    var lst_rows =  document.querySelectorAll('tr.ligne-remboursement');

    for(var i=0;i<lst_rows.length;i++){
      var row                = lst_rows[i];
      var date_soins         = row.querySelectorAll('td')[0].innerText.replace(/\//g,'')
      var date_remboursement = row.querySelectorAll('td')[3].innerText.replace(/\//g,'')
      var pdf_url            = null;
      var link_html_element  = row.querySelector('a.pdf_download');

      if(link_html_element!==null){
        pdf_url = link_html_element.href;
      } else {
        // no pdf means that's not a refund
        continue
      }
      var montant            = parseFloat(row.querySelectorAll('td')[2].innerText.replace(/\//g,'').split(' ')[0].replace(',','.'));
      var file_name          = 'remboursement_soins_'+date_soins+'_remb_'+date_remboursement+'.pdf';
      var obj_remb           = {  date_soins         : date_soins,
                                  date_remboursement : date_remboursement,
                                  pdf_url            : pdf_url,
                                  montant            : montant,
                                  file_name          : file_name
                               };
      result.push(obj_remb);
    }
    return result;
  });

  this.each(lst_documents, function(casp, _document, i){
    casp.then(function(){

      if(!fs.exists(aim_path+_document.file_name)){
        this.download(_document.pdf_url, aim_path+_document.file_name);
      }

    })
  });
});
casper.wait(1000);
casper.run();
