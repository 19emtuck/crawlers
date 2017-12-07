var casper = require("casper").create({
    ignoreSslErrors:true,
    verbose: true});

var root_url = 'https://assure.ameli.fr';
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
     this.capture('images/ameli_monthly_report_' + casper.step +'_'+indice+'.jpg', undefined,{ format:'jpg', quality:100});
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

casper.waitForSelector('form[name="connexionCompteForm"]');
casper.then(function(){
  this.fill('form[name="connexionCompteForm"]',{'connexioncompte_2numSecuriteSociale' : identifiant,
                                                'connexioncompte_2codeConfidentiel'   : password});
});

casper.thenClick('#id_r_cnx_btn_submit');

casper.waitForText('Mes paiements');
casper.thenClick('a[href*="as_paiements_page"]');
casper.wait(2000);

casper.waitForSelector('span.onoffswitch-inner');
casper.wait(2000);

casper.then(function(){
  this.evaluate(function(){
    document.querySelector('span.onoffswitch-inner').click();
  });
});

casper.wait(2000);

casper.then(function(){

  var lst_rembs = this.evaluate(function(){

    var month_labl_to_id, row, remb_rows, _i, result, lst_download_links,
        link, label, year_label, _i;

    month_labl_to_id = { 'JANVIER'   : '01',
                         'FEVRIER'   : '02',
                         'MARS'      : '03',
                         'AVRIL'     : '04',
                         'MAI'       : '05',
                         'JUIN'      : '06',
                         'JUILLET'   : '07',
                         'AOÛT'      : '08',
                         'SEPTEMBRE' : '09',
                         'OCTOBRE'   : '10',
                         'NOVEMBRE'  : '11',
                         'DÉCEMBRE'  : '12' };
    result = [];
    lst_download_links = document.querySelectorAll('a[id^="lienPDFReleve"]');

    for(_i=0;_i<lst_download_links.length;_i++){

      link        = lst_download_links[_i];
      label       = link.parentElement.parentElement.parentElement.querySelector('span.mois').innerText;
      year_label  = label.split(' ')[1];
      month_label = month_labl_to_id[label.split(' ')[0]];

      result.push({'name' : 'releveMensuel_'+month_label+'_'+year_label+'.pdf',
                   'href' : link.href});
    }
    return result;
  });

  this.each(lst_rembs, function(casp, node, i){
    casp.then(function(){
      if(!fs.exists(aim_path + node.name)){
        this.download(node.href, aim_path+node.name);
      }
    });
  });

});

casper.run();
