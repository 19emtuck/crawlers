/****************************************************************************************************************************/
/*                                         impot crawler                                                                    */
/*                                                                                                                          */
/* this code is under MIT license  :                                                                                        */
/* author: stéphane bard  <stephane.bard@gmail.com>                                                                         */
/*                                                                                                                          */
/*                                                                                                                          */
/* Copyright © <2020>, <Bard Stéphane> Permission is hereby granted, free of charge, to any person obtaining a copy of      */
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
/* <Bard Stéphane>.                                                                                                         */
/*                                                                                                                          */
/****************************************************************************************************************************/

const puppeteer = require('puppeteer');
const fs        = require('fs');
const utils     = require('./utils.js')
const { exec }  = require('child_process');

const root_url          = 'https://www.impots.gouv.fr';

let aim_path    = null;
let identifiant = null;
let password    = null;
let restricted  = true;
let debug       = false;

process.argv.forEach(function (val, index, array) {
  if(/--path=/.test(val)){ aim_path = val.split('=')[1]; }
  if(/--id=/.test(val)){ identifiant = val.split('=')[1]; }
  if(/--pwd=/.test(val)){ password = val.split('=')[1]; }
  if(/--debug/.test(val)){ debug = true; }
  if(/--full/.test(val)){ restricted = false; }
});

const read_documents = async (page) => {

    // let's store current documents
    let lst_documents = await page.evaluate(function(){

      const serialize_form = (myForm)=>{
        let formEntries = new FormData(myForm).entries();
        let _obj = Object.assign(...Array.from(formEntries, ([x,y]) => ({[x]:y})));
        return _obj;
      };

      String.prototype.sansAccent = function(){
          var accent = [
                  /[\300-\306]/g, /[\340-\346]/g, // A, a
                  /[\310-\313]/g, /[\350-\353]/g, // E, e
                  /[\314-\317]/g, /[\354-\357]/g, // I, i
                  /[\322-\330]/g, /[\362-\370]/g, // O, o
                  /[\331-\334]/g, /[\371-\374]/g, // U, u
                  /[\321]/g, /[\361]/g, // N, n
                  /[\307]/g, /[\347]/g, // C, c
              ];
          var noaccent = ['A','a','E','e','I','i','O','o','U','u','N','n','C','c'];
           
          var str = this;
          for(var i = 0; i < accent.length; i++){
                  str = str.replace(accent[i], noaccent[i]);
              }
           
          return str;
      }
      var result_list = [];
      var annee = document.querySelector('div.blocAnnee.selected').innerText;
      if(annee.match('[0-9]{4}\n[0-9]{1,}')!==null){
        annee = annee.split('\n')[0];
      }
      let previous_year = (parseInt(annee, 10) -1).toString();
      var lst_texts = document.querySelectorAll('div.documents div.row div.texte');
      var lst_forms = document.querySelectorAll('div.documents div.row form');

      for(var i=0;i<lst_texts.length;i++){

        let text_link     = lst_texts[i].innerText;
        let document_form = lst_forms[i];
        let serialized_form = serialize_form(document_form);

        let full_text_link     = 'annee_' + annee + '_' + text_link;
        full_text_link         = full_text_link.sansAccent().toLowerCase();
        full_text_link         = full_text_link.replace(/ /g, '_');
        full_text_link         = full_text_link.replace(/\s/g,'_');
        full_text_link         = full_text_link.replace(/-/g,'_');
        full_text_link         = full_text_link.replace(/[^a-z0-9A-Z]/g,'_');
        full_text_link         = full_text_link.replace(/'/g,'');
        full_text_link         = full_text_link.replace(/_{2,}/g,'_')+'.pdf';
        full_text_link         = full_text_link.replace(/_.pdf$/g,'.pdf');
        let org_full_text_link = full_text_link;
       

        type = '';
        if(/habitation/.test(full_text_link)){
          type='taxe_habitation';
        } else if(/foncieres/.test(full_text_link)){
          type='taxe_foncieres';

        } else if(/revenus/.test(full_text_link)){
          type='impot_sur_les_revenus';
        }
        result_list.push({ 'annee'         : annee,
                           'name'          : full_text_link,
                           'org_name'      : org_full_text_link,
                           'form'          : serialized_form,
                           'type_document' : type,
                           'detail_form'   : {
                                             'action':document_form.getAttribute('action'),
                                             'method':document_form.getAttribute('method')
                                            } });
      }
      return result_list;
    });

    await page.waitFor(200);

    for(var _i=0;_i<lst_documents.length;_i++){
      let _doc = lst_documents[_i];

      if(!await fs.existsSync(aim_path+_doc.annee)){
        await fs.mkdirSync(aim_path+_doc.annee);
      }
      if(!await fs.existsSync(aim_path+_doc.annee+'/'+_doc.type_document)){
        await fs.mkdirSync(aim_path+_doc.annee+'/'+_doc.type_document+'/');
      }

      let file_name = aim_path+_doc.annee+'/'+_doc.type_document+'/'+_doc.name;
      if(file_name!==null && !fs.existsSync(file_name)){
        // url evolved ...
        // https://cfspart.impots.gouv.fr/enp/ensu/Affichage_Document_PDF?idEnsua=339B67F1134784E44EB19DB3DD5E1849F8517EA143FED3D857656FA5EE8588E5
        // await page.evaluate(utils.download_it, 'https://cfspart.impots.gouv.fr/enp/ensu/document.do?idEnsua='+_doc.form.idEnsua, file_name)
        await page.evaluate(utils.download_it, 'https://cfspart.impots.gouv.fr/enp/ensu/Affichage_Document_PDF?idEnsua='+_doc.form.idEnsua, file_name)
                  .then(utils.save_download)
                  .catch(function(error){if(error){console.log(error);}});
      }
    }
}

if(aim_path!==null && identifiant !== null && password !== null){
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

      await page.waitForSelector('a.btn.identificationpart');
      await page.click('a.btn.identificationpart');
      await page.waitForSelector('#btnAction');
      await page.waitFor(1000);
      await page.waitForSelector('#spi_tmp');

      await page.waitFor(1000);
      await page.type('#spi_tmp', identifiant);
      await page.waitFor(500);
      await page.click('#btnAction');

      await page.waitForSelector('#pwd_tmp', {visible:true});
      await page.type('#pwd_tmp', password);
      await page.waitFor(500);
      await page.click('#btnAction');
      await page.waitFor(1000);

      await page.waitForSelector('#accederdeconnexion');
      await page.click('a[href="documents.do?n=0"]');

      await page.waitForSelector('div.container.general');

      let lst_annees = await page.evaluate((restricted) => {
          var _item, i, lst_items, max_year, result;
          result = [];
          lst_items = document.querySelectorAll('div.row.date a[href^="documents.do?n="]');
          max_year = 0;
          for(i=0;i<lst_items.length;i++){
            _item = lst_items[i];
            if(restricted){
              __item = parseInt(_item.innerText, 10);
              if(max_year<__item){
                max_year = __item;
              }

            } else {
              if(/[0-9]{4}/.test(_item.innerText)){
                result.push(_item.innerText);
              }
            }
          }
          if(restricted && max_year!==0){
            result.push(max_year.toString())
          }
          return result;
        }, restricted);

      for(var _i=0;_i<lst_annees.length;_i++){
        annee = lst_annees[_i];
        // check folder is available
        if(! await fs.existsSync(aim_path+annee)){
          await fs.mkdirSync(aim_path+annee);
        }
        await page.click('a[href="documents.do?n='+annee+'"]');
        await page.waitFor(1000);
        await read_documents(page);
      }
      
      await page.click('#accederdeconnexion');
      await page.waitForSelector('#confirmdeconnexion',{'visible':true});
      await page.click('#confirmdeconnexion');
      await page.waitFor(1000);

    } catch (error) {
      console.log(error);
    }

    await browser.close();
  })();
}
