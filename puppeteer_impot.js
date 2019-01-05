/****************************************************************************************************************************/
/*                                         impot crawler                                                                    */
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
const utils     = require('utils.js')
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


const search_available_document_type = async (page, type_impot) => {
  await page.waitForSelector('form[name="documentsForm"]');
  await page.waitForSelector('form[name="documentsForm"] select[name="typeImpot"]');
  await page.evaluate((type_impot)=>{document.querySelector('form[name="documentsForm"] select[name="typeImpot"]').value=type_impot}, type_impot);
  await page.waitFor(200);
  await page.evaluate(()=>{redirect(document.forms[0].typeImpot.options.selectedIndex);});
  await page.waitFor(2000);

  var lst_documents = await page.evaluate((type_impot)=>{
    var lst_documents = [];
    document.querySelectorAll('form[name="documentsForm"] select[name="annee"] option').forEach(function(item){
       if(/[0-9]{4}/.test(item.value)){
         lst_documents.push({'type_impot':type_impot, 'annee':item.value, 'type_document':'avis'});
       }
    });
    return lst_documents;
  }, type_impot);
  await page.waitFor(200);
  return lst_documents;
}


const select_document_type = async (page, type_impot, type_document, annee) => {
  await page.waitForSelector('form[name="documentsForm"]');
  await page.waitForSelector('form[name="documentsForm"] select[name="typeImpot"]');
  await page.waitForSelector('form[name="documentsForm"] select[name="typeDocument"]');
  await page.waitForSelector('form[name="documentsForm"] select[name="annee"]');
  await page.waitForSelector('a.cssBouton');

  await page.evaluate((type_impot)=>{document.querySelector('form[name="documentsForm"] select[name="typeImpot"]').value=type_impot}, type_impot);
  await page.waitFor(200);
  await page.evaluate((annee)=>{document.querySelector('form[name="documentsForm"] select[name="annee"]').value=annee}, annee);
  await page.waitFor(200);
  await page.evaluate((type_document)=>{document.querySelector('form[name="documentsForm"] select[name="typeDocument"]').value=type_document}, type_document);
  await page.waitFor(200);
  await page.evaluate(()=>{document.querySelector('a.cssBouton').click()});
  await page.waitFor(200);
}

const read_documents = async (browser, page) => {

    // let's store current documents
    let lst_documents = [];
    var _lst_documents = await page.evaluate(function(){
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
      var link;
      var url='';
      var annee='';
      var full_text_link='';
      var text_link ='';
      var result_list = [];
      var lst_links = document.querySelectorAll('a.cssLienTable');
      var type = '';

      for(var i=0;i<lst_links.length;i++){
        link = lst_links[i];
        if(i===0){
          annee     = link.parentElement.previousElementSibling.previousElementSibling.innerText;
          text_link = link.parentElement.previousElementSibling.innerText;
        }
        full_text_link = 'annee_' + annee + '_' + text_link + '_' + link.innerText;
        full_text_link = full_text_link.sansAccent().toLowerCase();
        full_text_link = full_text_link.replace(/ /g, '_');
        full_text_link = full_text_link.replace(/\s/g,'_');
        full_text_link = full_text_link.replace(/-/g,'_');
        full_text_link = full_text_link.replace(/[^a-z0-9A-Z]/g,'_');
        full_text_link = full_text_link.replace(/'/g,'');
        full_text_link = full_text_link.replace(/_{2,}/g,'_')+'.pdf';

        url = link.getAttribute('onclick');
        url = url.split("'")[1].split("'")[0];

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
                           'url'           : url,
                           'type_document' : type });
      }
      return result_list;
    });
    lst_documents = [];
    Array.prototype.push.apply(lst_documents, _lst_documents);

    let doc;
    let targetPromise;
    let target;
    let new_page;
    let error_happend;


    for(i=0;i<lst_documents.length;i++){
      doc = lst_documents[i];

      targetPromise = new Promise((resolve, reject) => {
        const listener = async (target) => {
          try {
            if (target.type() === 'page' && /ConsultationDocument/.test(target.url())) {
              browser.removeListener('targetcreated', listener);
              resolve(target);
            }
          } catch (error) {
            reject(error);
          }
        };
        browser.addListener('targetcreated', listener);
      });

      await page.evaluate(function(url){
        win = ouvreDocument(url, 805, 500);
      }, doc.url);

      target = await targetPromise
          .then((target)=>{return target;})
          .catch(function(error){if(error){console.log(error);}});

      await page.waitFor(5000);

      try {
        new_page = await target.page();
        await new_page.waitFor(100);
        error_happend = await new_page.evaluate(()=>{return document.querySelector('img[src$="attention.gif"]')!==null})
        if(!error_happend){
          await new_page.waitFor('iframe');
          await new_page.waitFor(100);

          var __url = await new_page.evaluate(function(){
            return document.querySelector('iframe').src;
          });

          if(! await fs.existsSync(aim_path+doc.annee)){
            await fs.mkdirSync(aim_path+doc.annee);
          }
          if(! await fs.existsSync(aim_path+doc.annee+'/'+doc.type_document)){
            await fs.mkdirSync(aim_path+doc.annee+'/'+doc.type_document+'/');
          }

          if(! await fs.existsSync(aim_path+doc.annee+'/'+doc.type_document+'/'+doc.name)){
            await page.evaluate(utils.download_it, __url, aim_path+doc.annee+'/'+doc.type_document+'/'+doc.name)
                      .then(utils.save_download)
                      .catch(function(error){if(error){console.log(error);}});
          }
        }
        await new_page.close();
      } catch (e) {
         console.log('Error: ' + e);
      }

      await page.waitFor(200);
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
      await page.waitForSelector('input[name="LMDP_Spi_tmp"]');
      await page.waitForSelector('input[name="LMDP_Password_tmp"]');

      await page.waitFor(500);
      await page.type('#LMDP_formulaire input[name="LMDP_Spi_tmp"]', identifiant);
      await page.waitFor(500);
      await page.type('#LMDP_formulaire input[name="LMDP_Password_tmp"]', password);
      await page.waitFor(1000);

      await page.click('#LMDP_formulaire button[type="submit"]');
      await page.waitForSelector('#personalInfo p');
      await page.goto('https://cfspart.impots.gouv.fr/acces-usager/cfs');
      await page.waitForSelector('a[title="Acc\u00e9der aux avis et d\u00e9clarations"]');
      await page.click('a[title="Acc\u00e9der aux avis et d\u00e9clarations"]');
      await page.waitForSelector('form[name="documentsForm"]');


      let lst_annees = await page.evaluate((restricted) => {
          var _item, i, lst_options, max_year;
          result = [];
          lst_options = document.querySelectorAll('select[name="annee"] option');
          max_year = 0;
          for(i=0;i<lst_options.length;i++){
            _item = lst_options[i];
            if(restricted){
              __item = parseInt(_item.value, 10);
              if(max_year<__item){
                max_year = __item;
              }

            } else {
              if(/[0-9]{4}/.test(_item.value)){
                result.push(_item.value);
              }
            }
          }
          if(restricted && max_year!==0){
            result.push(max_year.toString())
          }
          return result;
        }, restricted);

      let lst_entries_IR = await search_available_document_type(page, 'IR');
      let lst_entries_TH = await search_available_document_type(page, 'TH');
      let lst_entries_TF = await search_available_document_type(page, 'TF');
      let lst_entries = [];
      let item;

      Array.prototype.push.apply(lst_entries, lst_entries_IR);
      Array.prototype.push.apply(lst_entries, lst_entries_TF);
      Array.prototype.push.apply(lst_entries, lst_entries_TH);

      await page.goto('https://cfspart.impots.gouv.fr/acces-usager/cfs');
      await page.waitForSelector('a[title="Acc\u00e9der aux avis et d\u00e9clarations"]');
      await page.waitFor(1000);
      await page.click('a[title="Acc\u00e9der aux avis et d\u00e9clarations"]');
      await page.waitFor(2000);

      for(var _i=0;_i<lst_entries.length;_i++){
        item = lst_entries[_i];
        // check folder is available
        if(! await fs.existsSync(aim_path+item.annee)){
          await fs.mkdirSync(aim_path+item.annee);
        }

        // impot revenu
        select_document_type(page, item.type_impot, item.type_document, item.annee);
        await page.waitFor(1000);
        await read_documents(browser, page);
        await page.waitFor(2000);
      }

    } catch (error) {
      console.log(error);
    }

    await browser.close();
  })();
}
