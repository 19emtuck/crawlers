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
