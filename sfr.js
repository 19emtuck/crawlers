var casper = require("casper").create({
    verbose: true});

var root_url = 'https://www.sfr.fr/mon-espace-client';
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
     this.capture('images/sfr_' + casper.step +'_'+indice+'.jpg', undefined,{ format:'jpg', quality:100});
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

casper.waitForSelector('form[name="loginForm"]');
casper.then(function(){
  this.fill('form[name="loginForm"]',{'username' : identifiant,
                                      'password' : password});
});

casper.thenClick('#identifier');
casper.wait(300);
casper.waitForSelector('a[href*="logout"]')

casper.thenOpen('https://espace-client.sfr.fr/facture-fixe/consultation/infoconso')
casper.waitForSelector('#facture')
casper.thenClick('#facture');

casper.waitForSelector('#plusFac');

casper.then(function(){
  var invoice = this.evaluate(function(){
    var _date = document.querySelector('span.sr-text-grey-14 span').innerText.replace(/[ \n]*/g,'').replace(/\//g,'_');
    _date = [_date.split('_')[2], _date.split('_')[1], _date.split('_')[0]].join('');
    return {'name': +_date+'_SFR.pdf',
            'url' : document.querySelector('a[href*="facture-fixe/consultation/telecharger"]').href };
  });
  if(!fs.exists(aim_path+invoice.name)){
    this.download(invoice.url,aim_path+invoice.name);
  }
});

casper.then(function(){
  var lst_nodes = this.evaluate(function(){
    var lst_nodes, node, i, result;
    result = [];

    lst_nodes = document.querySelectorAll('#historique a[href*="/facture-fixe/consultation/facturette/facture"].sr-chevron');
    for(i=0;i<lst_nodes.length;i++){
      node = lst_nodes[i];
      var _date = node.parentElement.previousElementSibling.querySelector('span.sr-text-grey-14 span').innerText.replace(/[ \n]*/g,'').replace(/\//g,'_');
      result.push({'href':node.href,
                   'date':_date})
    }
    return result;
  });

  this.each(lst_nodes, function(casp, node, i){
    casp.thenOpen(node.href);
    casp.then(function(){
      var invoice = this.evaluate(function(){

      var _date = document.querySelector('span.sr-text-grey-14 span').innerText.replace(/[ \n]*/g,'').replace(/\//g,'_');
      _date = [_date.split('_')[2], _date.split('_')[1], _date.split('_')[0]].join('');

      return {'name': +_date+'_SFR.pdf',
              'url' : document.querySelector('a[href*="facture-fixe/consultation/telecharger"]').href };
      });
      if(!fs.exists(aim_path+invoice.name)){
        this.download(invoice.url,aim_path+invoice.name);
      }
    });
  });

});

casper.run();
