var casper = require("casper").create({
    ignoreSslErrors:true,
    verbose: true});

// your digiposte id
var identifiant = null;
var password    = null;
var aim_path    = null;
var remote_path = null;

if (!casper.cli.has('id')) {
    casper.echo("script argument error", "ERROR");
    casper.echo("id argument is required", "ERROR");
    casper.exit();
} else if (!casper.cli.has('pwd')) {
    casper.echo("script argument error", "ERROR");
    casper.echo("pwd argument is required", "ERROR");
    casper.exit();
} else if (!casper.cli.has('path')) {
    casper.echo("script argument error", "ERROR");
    casper.echo("path argument is required", "ERROR");
    casper.exit();
} else if (!casper.cli.has('remote')) {
    casper.echo("script argument error", "ERROR");
    casper.echo("remote argument is required", "ERROR");
    casper.exit();
} else {
  // your digiposte id
  identifiant = casper.cli.raw.get('id').toString();
  // your digiposte password
  password    = casper.cli.raw.get('pwd').toString();
  // the local path we check for update
  aim_path    = casper.cli.get('path').toString();
  // the remote path (only one level actually) we want to watch
  remote_path = casper.cli.raw.get('remote').toString();
}

var root_url = 'https://secure.digiposte.fr/identification-plus';

var utils         = require('utils');
var fs            = require('fs');
var lst_documents = [];
var xsrf_token    = null;

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

casper.on('step.complete', function(){
   var indice = 0;
   if(casper.cli.has('indice')){
     indice = casper.cli.get('indice');
   }
   if(casper.cli.has('screenshot')){
     this.capture('images/digiposte_' + casper.step +'_'+indice+'.jpg', undefined,{ format:'jpg', quality:100});
   }
});

casper.start();
casper.viewport(1600, 900);
casper.userAgent('Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:59.0) Gecko/20100101 Firefox/59.0');
casper.thenOpen(root_url);
casper.wait(1000);

casper.waitForSelector('#bt_loginPlus_submit');
casper.waitForSelector('#login_plus_login');
casper.waitForSelector('#login_plus_input');

casper.then(function(){
  this.sendKeys('#login_plus_login', identifiant);
});
casper.then(function(){
  this.sendKeys('#login_plus_input', password);
});

casper.thenClick('#bt_loginPlus_submit');

casper.wait(1000);
casper.waitForSelector('button.safeMenu_item_opener');

casper.thenClick('a[href="#!/mon-coffre"]');
casper.wait(100);
casper.waitForSelector('button[title="Mon Coffre"]');

// read xsrf token ...
casper.then(function(){
  var cookie_chunk
  var cookies = this.page.cookies;
  for(var i=0;i<cookies.length;i++){
    cookie_chunk = cookies[i];
    if(cookie_chunk['name']==='XSRF-TOKEN'){
      xsrf_token = cookie_chunk['value'];
    }
  }
});

casper.then(function(){
  this.clickLabel(remote_path)
});
casper.wait(100);

casper.waitForSelector('table.safeContent_container');
// shall wait until folder is fullfilled
casper.wait(6000);

casper.then(function(){
  lst_documents = this.evaluate(function(){
    var lst_result = [];
    var lst_files = document.querySelectorAll('button[title="Aperçu du fichier"]');
    for(var i=0; i<lst_files.length; i++){
      var _doc = {};
      var file = lst_files[i];
      var document_id = file.parentElement.parentElement.parentElement.parentElement.parentElement.id.split('_')[3];

      _doc.label         = file.innerText;
      _doc.id            = document_id;
      _doc.pdf_file_name = _doc.label.replace(/ /g,'_')+'.pdf';

      lst_result.push(_doc);

      // normalize content to avoid any CR or blank
      file.innerText = _doc.label;
    }
    return lst_result;
  });
});

casper.then(function(){
  this.each(lst_documents, function(casp, _doc, i){
    casp.then(function(){
      this.clickLabel(_doc.label, 'button');
    });
    casp.waitForSelector('span.modal_header_title--preview_inner');
    casp.waitForSelector('button.dataAction_link.dataAction_link--download');
    casp.wait(1000);
    casp.thenClick('button.dataAction_link.dataAction_link--download');
    casp.then(function(){
      if(!fs.exists(aim_path + _doc.pdf_file_name)){
        this.download('https://secure.digiposte.fr/rest/content/document/'+_doc.id+'?_xsrf_token='+xsrf_token, aim_path + _doc.pdf_file_name);
      }
    });
    casp.thenClick('button.modal_header_close');
    casp.waitWhileVisible('button.modal_header_close');
    casp.wait(500);
  });
});

casper.run();
