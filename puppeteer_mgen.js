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
const puppeteer = require('puppeteer');
const fs        = require('fs');
const utils     = require('./utils.js')
const { exec } = require('child_process');

const root_url          = 'https://www.mgen.fr';
const detail_url        = 'https://www.mgen.fr/mon-espace-perso/mes-remboursements/?codeMatrice=1';
const releve_prestation = 'https://www.mgen.fr/mon-espace-perso/mes-abonnements/abonnement-releve-de-prestations/releves-de-prestation/';

let aim_path    = null;
let identifiant = null;
let password    = null;

let debug       = false;

process.argv.forEach(function (val, index, array) {
  if(/--path=/.test(val)){ aim_path = val.split('=')[1]; }
  if(/--id=/.test(val)){ identifiant = val.split('=')[1]; }
  if(/--pwd=/.test(val)){ password = val.split('=')[1]; }
  if(/--debug/.test(val)){ debug = true; }
});

const bounding_box = (selector)=>{
  var element = document.querySelector(selector);
  var {x, y, width, height} = element.getBoundingClientRect();
  return {left: x, top: y, width, height, id: element.id};
}

const init_remb_table = ()=>{
  // Constantes pour accéder au colonnes des Datatables
  var idColonneIndexVersement = 0;
  var idColonneTriParDefautVersement = 1;
  var idColonneDetailsVersement = 6;
  // Evite le loader infini lors de l'accès à la page via le bouton précédent
  initializeDataTableMesRemboursements($('#tableDernierVersement'), idColonneTriParDefautVersement, idColonneIndexVersement, idColonneDetailsVersement, 0);
};

const tick_line = (details_selector)=>{
  var detail_link = document.querySelector(details_selector);
  if(detail_link!==null){
    $(detail_link).trigger('click');
  }
}

const read_my_docs = ()=>{
  var result = [];
  var lst_rows =  document.querySelectorAll('#tableDernierRemboursement tr.ligne-remboursement');

  for(var i=0;i<lst_rows.length;i++){
    var row                = lst_rows[i];
    var cells              = row.querySelectorAll('td');
    var cell_name          = row.querySelector('td.colonne-nom-prenom-remboursement');
    var date_soins         = cell_name.previousElementSibling.innerText.replace(/\//g,'');
    var date_remboursement = cell_name.nextElementSibling.nextElementSibling.innerText.replace(/\//g,'');
    var name               = cell_name.innerText;
    var pdf_url            = null;
    var pdf_selector       = null;
    var details_url        = null;
    var link_html_element  = row.querySelector('a.pdf_download');
    var plus_de_details    = row.querySelector('a.tagco-etape');
    var details_selector   = '#tableDernierRemboursement tr.ligne-remboursement:nth-child('+(i+1)+') span.plus-details';
    var montant            = parseFloat(cell_name.nextElementSibling.innerText.replace(/\//g,'').split(' ')[0].replace(',','.'));
    var key = name+"_"+date_soins+"_"+date_remboursement+"_"+montant;
    key = key.replace(/ /g,'_').replace(/\./g,'_');

    if(link_html_element!==null){
      pdf_url = link_html_element.href;
      pdf_selector = '#tableDernierRemboursement tbody tr.ligne-remboursement:nth-child('+(i+1)+') a.pdf_download';
    }

    if(plus_de_details!==null){
      details_url = plus_de_details.href;
    }
    var file_name          = 'remboursement_soins_'+date_soins+'_remb_'+date_remboursement+'.pdf';
    var det_file_name_png  = 'details_soins_'+date_soins+'_remb_'+date_remboursement+'.png';
    var det_file_name_pdf  = 'details_soins_'+date_soins+'_remb_'+date_remboursement+'.pdf';
    var obj_remb           = {  date_soins         : date_soins,
                                date_remboursement : date_remboursement,
                                pdf_url            : pdf_url,
                                details_url        : details_url,
                                montant            : montant,
                                file_name          : file_name,
                                det_file_name_png  : det_file_name_png,
                                det_file_name_pdf  : det_file_name_pdf,
                                current_url        : document.location.href,
                                row_index          : i,
                                pdf_selector       : pdf_selector,
                                key                : key,
                                details_selector   : details_selector
                             };
    result.push(obj_remb);
  }
  return result;
};

const read_my_secondary_docs = ()=>{
  function fullPath(el){
    var names = [];
    while (el.parentNode){
      if (el.id){
        names.unshift('#'+el.id);
        break;
      }else{
        if (el==el.ownerDocument.documentElement) names.unshift(el.tagName);
        else{
          for (var c=1,e=el;e.previousElementSibling;e=e.previousElementSibling,c++);
          names.unshift(el.tagName+":nth-child("+c+")");
        }
        el=el.parentNode;
      }
    }
    return names.join(" > ");
  }
  $('h3.deployable.collapsed').click();
  $('h4.deployable.collapsed').click();


  var month_label_to_id = { 'JANVIER'       : '01',
                            'FEVRIER'       : '02',
                            'F\u00C9VRIER'  : '02',
                            'MARS'          : '03',
                            'AVRIL'         : '04',
                            'MAI'           : '05',
                            'JUIN'          : '06',
                            'JUILLET'       : '07',
                            'AOUT'          : '08',
                            'AO\u00DBT'     : '08',
                            'SEPTEMBRE'     : '09',
                            'OCTOBRE'       : '10',
                            'NOVEMBRE'      : '11',
                            'DECEMBRE'      : '12',
                            'D\u00C9CEMBRE' : '12',
                          };


  var $form = $("form#get-releve-pdf");
  var _input_url_name        = $form.children('#urlDocument').attr('name');
  var _input_dattrait_name   = $form.children('#dattrait').attr('name');
  var _input_typereleve_name = $form.children('#typeReleve').attr('name');
  var _input_numeromois_name = $form.children('#numeroMois').attr('name');

  var _lst_documents = $("a.get-pdf-releve-prestation").map(function(_i, _href){
      var _document = {'data':{}};
      var $href     = $(_href);

      var year      = $href.closest('div.partie-annee.panel').find('h3').text().trim();
      var month     = month_label_to_id[$href.closest('div.partie-mois.panel').find('h4').text().toUpperCase().trim()];

      _document['url'] = $href.attr('href');
      _document['data'][_input_url_name]        = $href.data('urldocument');
      _document['data'][_input_dattrait_name  ] = $href.data('dattrait');
      _document['data'][_input_typereleve_name] = $href.data('typereleve');
      _document['data'][_input_numeromois_name] = $href.data('numeromois');
      _document['selector'] = fullPath(_href);
    
      var link_name = $href.text().trim().replace(/\u00A0/g, '_').replace(/ /g,'_').replace(/\//g, '_').replace(/_-_/g, '.').toLowerCase();
      if(!/[0-9]{2}_[0-9]{2}_[0-9]{2}/.test(link_name)){
        link_name = 'releve_de_prestation_'+year+'_'+month+'.pdf';
      } else {
        link_name = 'releve_de_prestation_'+link_name.split('_').splice(5,3).join('_');
      }
      _document['name'] = link_name;

      return _document;
  }).toArray();
  return _lst_documents;
};

if(aim_path!==null && identifiant !== null && password !== null){
  if(!/\/$/.test(aim_path)){
    aim_path = aim_path + '/';
  }
  (async () => {
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox'], 'ignoreHTTPSErrors': true});

    const get_key_doc_to_row_index = ()=>{
      var result = [];
      var lst_rows =  document.querySelectorAll('#tableDernierRemboursement tr.ligne-remboursement');
      var map = {};

      for(var i=0;i<lst_rows.length;i++){
        var row                = lst_rows[i];
        var cells              = row.querySelectorAll('td');
        var cell_name          = row.querySelector('td.colonne-nom-prenom-remboursement');
        var date_soins         = cell_name.previousElementSibling.innerText.replace(/\//g,'');
        var date_remboursement = cell_name.nextElementSibling.nextElementSibling.innerText.replace(/\//g,'');
        var name               = cell_name.innerText;
        var montant            = parseFloat(cell_name.nextElementSibling.innerText.replace(/\//g,'').split(' ')[0].replace(',','.'));
        var key = name+"_"+date_soins+"_"+date_remboursement+"_"+montant;

        key = key.replace(/ /g,'_').replace(/\./g,'_');
        map[key]=i;
      }
      return map;
    };


    // const browser = await puppeteer.launch({
    //   headless : false,
    //   slowMo   : 10, // slow down by 250ms
    //   args     : ['--no-sandbox']
    // });

    const page = await browser.newPage();

    await page.setViewport({width:1600, height:900});
    await page.setDefaultNavigationTimeout(90000);
    try {

      // await page.setRequestInterception(true);
      // await page.on('request', interceptedRequest => {
      //   if (interceptedRequest.url().indexOf('https://www.youtube.com') === 0
      //    || interceptedRequest.url().indexOf('https://try.abtasty.com') === 0
      //    || interceptedRequest.url().indexOf('https://dcinfos.abtasty.com') === 0
      //    || interceptedRequest.url().indexOf('https://maps.google.com') === 0
      //    || interceptedRequest.url().indexOf('https://logs1279.xiti.com') === 0
      //    || interceptedRequest.url().indexOf('https://its.tradelab.fr') === 0
      //    || interceptedRequest.url().indexOf('https://www.google-analytics.com') === 0
      //    || interceptedRequest.url().indexOf('https://stats.g.doubleclick.net') === 0
      //    || interceptedRequest.url().indexOf('https://manager.tagcommander.com') === 0
      //    || interceptedRequest.url().indexOf('jquery.inputmask.bundle.min.js') !== -1
      //    || interceptedRequest.url().indexOf('https://syndication.twitter.com') === 0
      //    || interceptedRequest.url().indexOf('https://platform.twitter.com') === 0
      //    || interceptedRequest.url().indexOf('https://www.facebook.com') === 0
      //    || interceptedRequest.url().indexOf('https://connect.facebook.net') === 0
      //    || interceptedRequest.url().indexOf('https://ib.adnxs.com') === 0
      //    || interceptedRequest.url().indexOf('https://cdn.tradelab.fr') === 0
      //    || interceptedRequest.url().indexOf('https://bat.bing.com') === 0
      //    || interceptedRequest.url().indexOf('https://www.google.com') === 0
      //    || interceptedRequest.url().indexOf('https://googleads.g.doubleclick.net') === 0
      //    || interceptedRequest.url().indexOf('https://connect.facebook.net') === 0
      //    || interceptedRequest.url().indexOf('https://ad.atdmt.com') === 0
      //    ) {
      //     interceptedRequest.abort();
      //   } else {
      //     interceptedRequest.continue();
      //   }
      // });

      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36');

      await page.goto(root_url,{ ignoreHTTPSErrors: true });
      await page.click('a.btn.btn-primary.tagco-mon-espace')
      await page.waitForSelector('form[name="formConnexion"] input[name="user"]');
      await page.click('form[name="formConnexion"] input[name="user"]');
      await page.type('form[name="formConnexion"] input[name="user"]', identifiant);
      await page.click('form[name="formConnexion"] input#pass');
      await page.type('form[name="formConnexion"] input#pass', password);
      await page.click('#labelUsername');
      await page.click('form[name="formConnexion"] input[name="user"]');
      await page.click('input[type="submit"]');
      await page.waitForSelector('#carteRemboursementsSante a.more',{'visible':true});
      await page.goto(detail_url),{ ignoreHTTPSErrors: true };
      await page.waitForSelector('#tableDernierRemboursement');

      await page._client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: aim_path+'tmp/'});

      await page.waitFor(1000);
      let lst_documents = await page.evaluate(read_my_docs);
      let _document, post_data;

      await page.waitFor(1000);
      for(let _i=0;_i<lst_documents.length;_i++){
        _document = lst_documents[_i];
        if(typeof(_document.pdf_selector)!=='undefined' && _document.pdf_selector!=='' && _document.pdf_selector!==null){
          if(!fs.existsSync(aim_path + _document.det_file_name_pdf)){
            _document.pdf_url = _document.pdf_url.replace('http://','https://');

            post_data = await page.evaluate((pdf_selector)=>{
              var $pdf, form, data

              $pdf = $(pdf_selector);
              form = $pdf.next();
              form.children('#urlReleve').val($pdf.data('url-releve'));
              form.children('#dattrait').val($pdf.data('dattrait'));
              form.children('#dateReleve').val($pdf.data('date-releve'));

              data = {};
              form.serializeArray().map(function(x){data[x.name] = x.value;});
              return data;
            }, _document.pdf_selector);

            try {
              await page.evaluate(utils.download_it,
                                  _document.pdf_url,
                                  aim_path + _document.det_file_name_pdf,
                                  post_data,
                                 ).then(utils.save_download).catch(function(error){if(error){console.log(error);}});
            } catch(error){
              console.log(error);
            }
            await page.waitFor(1000);
          }
        }
      }
      await page.waitFor(5000);

      try {
        await page.goto(detail_url,{ ignoreHTTPSErrors: true });
        await page.waitForSelector('#tableDernierRemboursement');
        await page.waitFor(3000);

        let map_key_index;
        let details_selector;
        let padding=16;

        for(let _i=0;_i<lst_documents.length;_i++){
          _document = lst_documents[_i];

          if(typeof(_document.details_selector)!=='undefied' && _document.details_selector && !fs.existsSync(aim_path+'details/'+_document.det_file_name_pdf)) {
            await page.goto(detail_url,{ ignoreHTTPSErrors: true });
            await page.waitForSelector('#tableDernierRemboursement');
            await page.waitFor(3000);
            // let's reinit ...
            await page.evaluate(init_remb_table);

            map_key_index = await page.evaluate(get_key_doc_to_row_index);

            if(!_document.key in map_key_index || isNaN(map_key_index[_document.key])){
              continue;
            }

            details_selector   = '#tableDernierRemboursement tr.ligne-remboursement:nth-child('+(map_key_index[_document.key]+1)+') a.tagco-etape';
           
            // click on a line
            await page.evaluate(tick_line, details_selector);

            await page.waitForSelector('#ajax-details-remboursements', {'visible':true, 'timeout':30000}).catch(err => {
              console.error(err);
            });

            if (await page.$('#ajax-details-remboursements') !== null){
              let rect = await page.evaluate(bounding_box, '#ajax-details-remboursements');
              await page.screenshot({
                path: aim_path+'tmp/'+_document.det_file_name_png,
                clip: {
                  x: rect.left - padding,
                  y: rect.top - padding,
                  width: rect.width + padding * 2,
                  height: rect.height + padding * 2
                }
              });
              if(!fs.existsSync(aim_path+'details/'+_document.det_file_name_pdf)){
                await exec('convert '+ aim_path+'tmp/'+_document.det_file_name_png  + ' ' + aim_path+'details/'+_document.det_file_name_pdf, (err, stdout, stderr) => { });
                await page.waitFor(2000);
              }
              await exec('rm '+ aim_path+'tmp/'+_document.det_file_name_png, (err, stdout, stderr) => {});
            }
          }
        }
      } catch(error){
        console.log(error);
      }

      await page.goto(releve_prestation,{ ignoreHTTPSErrors: true });
      await page.waitFor(3000);
      let lst_documents_2 = await page.evaluate(read_my_secondary_docs);
      for(let _i=0;_i<lst_documents_2.length;_i++){
        let _document = lst_documents_2[_i];
        if(typeof(_document.selector)!=='undefined' && _document.selector!=='' && _document.selector!==null){
          if(!fs.existsSync(aim_path+'releves/'+_document.name)){
            _document.pdf_url = _document.pdf_url.replace('http://','https://');
            await page.evaluate(utils.download_it,
                                _document.url,
                                aim_path+'releves/'+_document.name,
                                _document.data).then(utils.save_download).catch(function(error){if(error){console.log(error);}});
            await page.waitFor(2000);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
    await browser.close();
  })();
}
