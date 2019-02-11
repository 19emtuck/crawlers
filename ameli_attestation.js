/****************************************************************************************************************************/
/*                             ameli crawler                                                                                */
/*                                                                                                                          */
/* this code is under MIT license  :                                                                                        */
/* author: stéphane bard <stephane.bard@gmail.com>                                                                          */
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

var root_url = 'https://assure.ameli.fr';
var utils    = require('utils');
var fs       = require('fs');

var identifiant = casper.cli.raw.get('id').toString();
var password    = casper.cli.raw.get('pwd').toString();
var aim_path    = casper.cli.get('path').toString();
var key_date    = casper.cli.get('key').toString();

casper.on('step.complete', function(){
   var indice = 0;
   if(casper.cli.has('indice')){
     indice = casper.cli.get('indice');
   }
   if(casper.cli.has('screenshot')){
     this.capture('images/ameli_attestation_' + casper.step +'_'+indice+'.jpg', undefined,{ format:'jpg', quality:100});
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


casper.thenBypassIf(function(){return !this.exists('a.lien-connexion')}, 1);
casper.thenClick('a.lien-connexion');

casper.waitForSelector('form[name="connexionCompteForm"]');
casper.then(function(){
  this.fill('form[name="connexionCompteForm"]',{'connexioncompte_2numSecuriteSociale' : identifiant,
                                                'connexioncompte_2codeConfidentiel'   : password});
});
casper.thenClick('#id_r_cnx_btn_submit');


casper.waitForText('Attestation de droits');
casper.thenClick('#bpliable-header-attDroitsAccueilattDroitsItem');
casper.waitUntilVisible('#attDroitsAccueilidBenefs');

casper.thenEvaluate(function(){
  document.querySelector('#attDroitsAccueilidBenefs').value=key_date;
  var evt = document.createEvent("HTMLEvents");
  evt.initEvent("change", false, true);
  document.querySelector('#attDroitsAccueilidBenefs').dispatchEvent(evt);

});
casper.wait(100);
casper.thenClick('#attDroitsAccueilidBtValider');
casper.waitForSelector('a.r_lien_pdf');
casper.then(function(){
  var year_label  = new Date().getFullYear().toString();
  var month_label = new Date().getMonth()+1;
  month_label = month_label.toString();
  if(month_label.length===1){
    month_label='0'+month_label;
  }
  f_name = aim_path+'stephane_attestation_'+year_label+'_'+month_label+'.pdf';
  if(!fs.exists(f_name)){
    this.download(this.evaluate(function(){ return document.querySelector('a.r_lien_pdf').href }), f_name);
  }
});
casper.thenClick('input[name="attDroitsAccueilorg.apache.struts.taglib.html.CANCEL"]');
casper.run();
