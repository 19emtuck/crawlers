/****************************************************************************************************************************/
/*                             diot crawler                                                                                 */
/*                                                                                                                          */
/* this code is under MIT license  :                                                                                        */
/* author: stéphane bard                                                                                                    */
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

var root_url = 'https://sante.diot.com';
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
     this.capture('images/diot_' + casper.step +'_'+indice+'.jpg', undefined,{ format:'jpg', quality:100});
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
casper.then(function(){
  this.fill('#formLogin',{'j_username':identifiant, 'j_password':password})
});

casper.thenClick('button.submit');
casper.waitForSelector('a.buttonContact.button');
casper.thenClick('a[href^="sante-list-decomptes.html"]');

casper.then(function(){
  var current_url = this.getCurrentUrl();
  var csrfToken = current_url.split('CSRF_TOKEN=')[1];
  var lst_documents = [];


  var url_data = 'json/sante-list-decomptes-table.html?CSRF_TOKEN='+csrfToken;
  var pages_count = this.evaluate(function(){ return parseInt($j('#sp_1_jqGrid_pager_decomptesTable').text(),10); });

  // utils.dump(lst_documents);
  this.repeat(pages_count, function(){

    casper.then(function(){
      var row_index=0;


      var rows_count = this.evaluate(function(){
        return $j('tr[role=row].jqgrow').size();
      });


      this.repeat(rows_count, function(){
        var _doc;

        this.then(function(){
          _doc = this.evaluate(function(csrfToken, row_index){
            var $item = $j($j('tr[role=row].jqgrow').get(row_index));

            var _date = $item.find('td').get(2).innerText;
            var _y    = _date.split('/')[2];
            var _m    = _date.split('/')[1];
            var _d    = _date.split('/')[0];

            return {'name'     : _y+_m+_d+'_DIOT.pdf',
                    'id'       : $item.attr('id'),
                    's_amount' : $item.find('td').get(4).innerText,
                    'f_amount' : parseFloat($item.find('td').get(4).innerText.split(' ')[0].replace(',','.')),
                    'aim'      : $item.find('td').get(3).innerText,
                    'date'     : $item.find('td').get(2).innerText,
                    'details'  : null,
                    'token'    : csrfToken};
          }, csrfToken, row_index );

        });

        this.thenEvaluate(function(row_index){
            var $item = $j($j('tr[role=row].jqgrow').get(row_index));
              $item.find('span.ui-icon-plus').click();
          }, row_index);
        this.waitForSelector('span.ui-icon-carat-1-sw');

        this.then(function(){
          lst_details = this.evaluate(function(row_index){
            var $item = $j($j('tr[role=row].jqgrow').get(row_index));
            var $row_details = $item.next('tr.ui-subgrid');

            lst_details = $row_details.find('tr[role="row"]').not(':first').map(function(_j,jtem){

            var _date = $j(jtem).find('td').get(1).innerText;

            return { 'date'          : _date,
                     'nature'        : $j(jtem).find('td').get(2).innerText,
                     'amount'        : parseFloat($j(jtem).find('td').get(3).innerText.split(' ')[0].replace(',','.')),
                     'secu_part'     : parseFloat($j(jtem).find('td').get(4).innerText.split(' ')[0].replace(',','.')),
                     'mutuelle_part' : parseFloat($j(jtem).find('td').get(5).innerText.split(' ')[0].replace(',','.')),
                   };
            }).toArray();
            return lst_details;
          }, row_index);

          _doc.details = lst_details;
        });

        this.then(function(){
          lst_documents.push(_doc);
          row_index++;
        })

        this.then(function(){
          if(!fs.exists(aim_path+_doc.name)){
            this.download('decomptePdf.html?decId='+_doc.id+'&CSRF_TOKEN='+_doc.token, aim_path+_doc.name);
          }
        });
        this.thenClick('.ui-icon-minus');
      });

    });
    casper.thenClick('#next_jqGrid_pager_decomptesTable');
  });
});
casper.run();
