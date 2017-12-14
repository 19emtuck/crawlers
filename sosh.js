/****************************************************************************************************************************/
/*                                 sosh crawler                                                                             */
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

var root_url = 'https://www.sosh.fr/';
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
casper.userAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X)');
casper.thenOpen(root_url);

casper.waitForSelector('#o-nav-item-login');
casper.thenClick('#o-nav-item-login');
// casper.waitForSelector('input.sc_button_content_2');
casper.waitForSelector('#AuthentForm input.submit');
casper.then(function(){
  this.fill('form#AuthentForm',{'credential' : identifiant,
                                  'password' : password});
});
casper.wait(300);
casper.thenClick('#AuthentForm input.submit');
casper.waitForSelector('#o-deconnect');
casper.thenClick('a.sosher_bills');
casper.waitForSelector('a[href^="/?page=facture-telecharger"]');

casper.then(function(){

  var last_invoice = this.evaluate(function(){
    var last_invoice  = null;
    var _lst_links = document.querySelectorAll('a[href^="/?page=facture-telecharger"]');
    for(var i=0;i<_lst_links.length;i++){
      // check container is last bill ...
      var parent_container = _lst_links[i].parentElement;
      // check the last bill
      if(typeof(parent_container.getAttribute('class'))!=='undefined' && parent_container.getAttribute('class').split(' ').indexOf('ec-lastBill-amount')!==-1){
        var lst_date = parent_container.querySelector('h2').innerText.split(' ');

        var _day   = lst_date[0];
        if(_day.length<2){
          _day = '0'+_day;
        }
        var _month = lst_date[1];
        if(_month==='janvier'){
          _month = '01';
        } else if(_month==='f\u00e9vrier' || _month==='fevrier'){
          _month = '02';
        } else if(_month==='mars'){
          _month = '03';
        } else if(_month==='avril'){
          _month = '04';
        } else if(_month==='mai'){
          _month = '05';
        } else if(_month==='juin'){
          _month = '06';
        } else if(_month==='juillet'){
          _month = '07';
        } else if(_month==='ao\u00fbt' || _month==='aout'){
          _month = '08';
        } else if(_month==='septembre'){
          _month = '09';
        } else if(_month==='octobre'){
          _month = '10';
        } else if(_month==='novembre'){
          _month = '11';
        } else if(_month==='d\u00e9cembre' || _month==='decembre'){
          _month = '12';
        }
        var _year  = lst_date[2];
        last_invoice = {'name': 'facture_'+_day+'_'+_month+'_'+_year+'.pdf',
                        'url' : _lst_links[i].getAttribute('href').toString() };
      }
    }
    return last_invoice;
  });

  if(last_invoice!==null){
    if(!fs.exists(aim_path+last_invoice.name)){
      this.download(last_invoice.url, aim_path+last_invoice.name);
    }
  }

});

casper.run();
