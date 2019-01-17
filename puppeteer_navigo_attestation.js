/****************************************************************************************************************************/
/*                                            navigo crawler                                                                    */
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
const { exec } = require('child_process');

const root_url = 'https://www.jegeremacartenavigo.fr/connexion/connexion_ou_creation_compte';

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

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36');
    try {
      await page.goto(root_url);

      await page.waitForSelector('#loginform input[name="_username"]')
      await page.waitForSelector('button[value="Connectez-vous \u00E0 votre espace Service Navigo"]');
      await page.waitFor(1000);
      await page.type('#loginform input[name="_username"]', identifiant);
      await page.waitFor(1000);
      await page.type('#loginform input[name="_password"]', password);
      await page.waitFor(1000);
      await page.click('button[value="Connectez-vous \u00E0 votre espace Service Navigo"]');
      await page.waitForSelector('span.plus', {'visible':true, 'timeout':60000});
      await page.click('span.plus');
      await page.waitForSelector('span.moins', {'visible':true});
      await page.click('a[title="T\u00e9l\u00e9charger l\'attestation PDF"]');
      await page.waitForSelector('button[type="submit"][title="T\u00e9l\u00e9charger"]');

      let starting_month = await page.evaluate(function(){ return document.getElementById('form_moisDebut').value; });
      if(starting_month!==null && typeof(starting_month)!=='undefined' && starting_month.length==1){
        starting_month = '0'+starting_month;
      } else {
        starting_month = '';
      }

      let ending_month = await page.evaluate(function(){ return document.getElementById('form_moisFin').value; });
      if(ending_month!==null && typeof(ending_month)!=='undefined' && ending_month.length==1){
        ending_month = '0'+ending_month;
      } else {
        ending_month = '';
      }

      let starting_year = await page.evaluate(function(){ return document.getElementById('form_anneeDebut').value; });
      let ending_year   = await page.evaluate(function(){ return document.getElementById('form_anneeFin').value; });
      let current_month = await page.evaluate(function(){ return new Date().getFullYear().toString()+'-'+(new Date().getMonth()+1);});
      let doc_name = "attestation_"+current_month+"_periode_"+starting_month+starting_year+'_'+ending_month+ending_year+".pdf";

      let the_form_request = await page.evaluate(function(){
          var request = {};
          var formDom = document.forms['form'];
          formDom.onsubmit = function(){
            // iterate the form fileds
            var data = {};
            for(var i=0;i<formDom.elements.length;i++){
              data[formDom.elements[i].name] = formDom.elements[i].value;
            }
            request.action = formDom.action;
            request.data = data;
            return false; // stop submission
          }
          // trigger the click on the link
          var link = document.querySelector('button[title="T\u00e9l\u00e9charger"]');
          link.click();
          return request; // return the requested form data to casper
      });

      if(!fs.existsSync(aim_path+doc_name) && the_form_request!==null){
        await page.evaluate(utils.download_it,
                            the_form_request.action,
                            aim_path+doc_name,
                            the_form_request.data)
                  .then(utils.save_download)
                  .catch(function(error){if(error){console.log(error);}});
      }
    } catch (error) {
      console.log(error);
    }
    await browser.close();
  })();
}
