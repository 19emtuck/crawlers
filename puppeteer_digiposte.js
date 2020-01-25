/****************************************************************************************************************************/
/*                                      digiposte crawler                                                                   */
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

const root_url          =  'https://secure.digiposte.fr/identification-plus';

let aim_path    = null;
let identifiant = null;
let password    = null;
let remote_path = null;
let debug       = false;

const click_label = (lst_spans, remote_path) => {
  var lst_result = [];
  for(var _i=0;_i<lst_spans.length;_i++){
    if(lst_spans[_i].textContent===remote_path){
      lst_spans[_i].click();
      break;
    }
  }
};

process.argv.forEach(function (val, index, array) {
  if(/--path=/.test(val)){ aim_path = val.split('=')[1]; }
  if(/--remote=/.test(val)){ remote_path = val.split('=')[1]; }
  if(/--id=/.test(val)){ identifiant = val.split('=')[1]; }
  if(/--pwd=/.test(val)){ password = val.split('=')[1]; }
  if(/--debug/.test(val)){ debug = true; }
});

if(aim_path!==null && identifiant !== null && password !== null && remote_path!==null){
  if(!/\/$/.test(aim_path)){
    aim_path = aim_path + '/';
  }
  (async () => {
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});

    const page = await browser.newPage();
    // page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    await page.setViewport({width:1600, height:900});
    await page.setDefaultNavigationTimeout(90000);

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36');
    try {
      await page.goto(root_url);
      await page.waitFor(1000);

      await page.waitForSelector('#email-input');
      await page.waitForSelector('#password-input');
      await page.waitForSelector('#validate-button');

      await page.type('#email-input', identifiant);
      await page.type('#password-input', password);
      await page.waitFor(200);
      await page.click('#validate-button');
      await page.waitFor(2000);
      await page.waitForSelector('button.safeMenu_item_opener');
      await page.waitForSelector('a[href="#!/mon-coffre"]');
     
      // remove modal dialog if one is shown
      if(await page.$('div.modal_dialog')!==null){
        await page.click('div.modal_dialog button.modal_header_close');
        await page.waitFor(200);
        await page.waitForSelector('div.modal_dialog', {'hidden':true});
      }

      await page.waitFor(200);
      await page.click('a[href="#!/mon-coffre"]');
      await page.waitFor(2000);
      // wait until a node contains "Mon coffre"
      await page.waitForXPath('//*[contains(child::text(), "Mon coffre")]/child::text()');
      await page.waitFor('span.safeContent_name_inner');

      let cookies = await page.cookies();

      // read xsrf token ...
      var cookie_chunk
      var xsrf_token = '';
      for(var i=0;i<cookies.length;i++){
        cookie_chunk = cookies[i];
        if(cookie_chunk.name==='XSRF-TOKEN'){
          xsrf_token = cookie_chunk.value;
        }
      }

      await page.$$eval('span.safeContent_name_inner', click_label, remote_path);
      await page.waitFor(100);
      await page.waitForSelector('table.safeContent_container');
      await page.waitFor(6000);

      let lst_documents = await page.evaluate(()=>{
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

      for(_e=0;_e<lst_documents.length;_e++){
        _doc = lst_documents[_e];

        if(!fs.existsSync(aim_path + _doc.pdf_file_name)){
          await page.$$eval('button', click_label, _doc.label);
          await page.waitForSelector('span.modal_header_title--preview_inner');
          await page.waitForSelector('button.dataAction_link.dataAction_link--download');
          await page.waitFor(1000);
          await page.click('button.dataAction_link.dataAction_link--download');

          await page.evaluate(utils.download_it,
                              'https://secure.digiposte.fr/rest/content/document/'+_doc.id+'?_xsrf_token='+xsrf_token,
                              aim_path + _doc.pdf_file_name).then(utils.save_download).catch(function(error){if(error){console.log(error);}});
          await page.click('button.modal_header_close');
          await page.waitForSelector('button.modal_header_close', {'visible':false});
          await page.waitFor(500);
        }
      }

    } catch (error) {
      console.log(error);
    }
    await browser.close();
  })();
} else {
  console.log('aim_path or identifiant or password or remote_path missing');
}
