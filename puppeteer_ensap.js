/****************************************************************************************************************************/
/*                                      ensap crawler                                                                         */
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
const { exec } = require('child_process');

const root_url = 'https://ensap.gouv.fr/web/accueilnonconnecte';

let aim_path    = null;
let identifiant = null;
let password    = null;
let debug       = false;
let full        = false;

process.argv.forEach(function (val, index, array) {
  if(/--path=/.test(val)){ aim_path = val.split('=')[1]; }
  if(/--id=/.test(val)){ identifiant = val.split('=')[1]; }
  if(/--pwd=/.test(val)){ password = val.split('=')[1]; }
  if(/--debug/.test(val)){ debug = true; }
  if(/--full/.test(val)){ full = true; }
});


/*
 * do xhr call
 */
const crawl_api = (url) => {
  function handleErrors(error) {
    console.error('Something went wrong ', error);
  }

  function request(url) {
    return new Promise(function(resolve, reject) {
        const xhr = new XMLHttpRequest();
        try {
          xhr.onreadystatechange = function(e) {
             try {
               if (xhr.readyState === 4) {
                 if (xhr.status === 200) {
                     resolve(xhr.response);
               } else {
                   reject(xhr.status)
                 }
               }
             } catch (error) {
               reject(error);
             }
          };

          xhr.ontimeout = function(){
            reject('timeout');
          }
          xhr.responseType = 'json';
          xhr.open('get', url);
          xhr.send();
        } catch (error) {
          reject(error);
        }
     });
  }

  // return a promise
  return request(url);
};

const manage_a_document = async (browser, page, aim_path, current_doc) => {
  let current_doc_name = current_doc.libelle2.split(' ')[0];
  let __url = 'https://ensap.gouv.fr/prive/telechargerremunerationpaie/v1?documentUuid='+current_doc.documentUuid;

  if(! await fs.existsSync(aim_path+current_doc)){
    await page.evaluate(utils.download_it, __url, aim_path+current_doc_name)
              .then(utils.save_download)
              .catch(function(error){if(error){console.log(error);}});
  }
}


if(aim_path!==null && identifiant !== null && password !== null){
  if(!/\/$/.test(aim_path)){
    aim_path = aim_path + '/';
  }
  (async () => {
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox'], timeout:90000});

    const page = await browser.newPage();
    // page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    await page.setViewport({width:1600, height:900});
    await page.setDefaultNavigationTimeout(90000);

    await page._client.send('Page.setDownloadBehavior', {behavior: 'allow', downloadPath: aim_path});

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36');
    try {
      await page.goto(root_url);
      await page.waitFor(1000);
      await page.waitForSelector('input[name="nir"]');
      await page.type('form input[name="nir"]', identifiant);
      await page.waitFor(500);
      await page.type('form input[name="password"]', password);
      await page.waitFor(500);
      await page.click('form button[type="submit"]');
      await page.waitForSelector('button.dgfip-button.dgfip-bt-deconnection');
      await page.waitFor(2000);
      let lst_urls = [];
      let current_doc, targetPromise, __url;
      let response = await page.evaluate(crawl_api, 'https://ensap.gouv.fr/prive/accueilconnecte/v1')
                .catch(function(error){if(error){console.log(error);}});

      let lst_docs = response.donnee.listeEvenement;
      let listeAnneeRemuneration = response.listeAnneeRemuneration;

      for(var __i=0;__i<lst_docs.length;__i++){
        let current_doc = lst_docs[__i];
        for(var __i=0;__i<lst_docs.length;__i++){
          let current_doc = lst_docs[__i];
          await manage_a_document(browser, page, aim_path, current_doc);
        }

        if(!full && __i>2){
          break;
        }
      }

      if(full){
        await page.click('a.dgfip-button[routerlink="/remunerationpaie"]');
        await page.waitForSelector('h2.dgfip-basic-title');
        await page.waitFor(3000);
        for(_y_i=0;_y_i<listeAnneeRemuneration.length;_y_i++){
           let _y = listeAnneeRemuneration[_y_i];
           let lst_docs = await page.evaluate(crawl_api, 'https://ensap.gouv.fr/prive/remunerationpaie/v1?annee='+_y)
                     .catch(function(error){if(error){console.log(error);}});

           for(var __i=0;__i<lst_docs.length;__i++){
             let current_doc = lst_docs[__i];
             await manage_a_document(browser, page, aim_path, current_doc);
           }
        }
      }

    } catch (error) {
      console.log(error);
    }
    await browser.close();
  })();
}
