/****************************************************************************************************************************/
/*                                      ameli crawler                                                                       */
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

const root_url          = 'https://assure.ameli.fr';

let aim_path    = null;
let identifiant = null;
let key_date    = null;
let password    = null;
let debug       = false;


const setup_profile = (profile_id) => {
  document.querySelector('#attDroitsAccueilidBenefs').value=profile_id;
  var evt = document.createEvent("HTMLEvents");
  evt.initEvent("change", false, true);
  document.querySelector('#attDroitsAccueilidBenefs').dispatchEvent(evt);
}

/**
 * read detail popup
 */
const get_document_detail = (aim_path, file_prefix)=>{

  var year_label  = new Date().getFullYear().toString();
  var month_label = new Date().getMonth()+1;

  month_label = month_label.toString();
  if(month_label.length===1){
    month_label='0'+month_label;
  }
  var url = document.querySelector('a.r_lien_pdf').href;
  f_name = aim_path+file_prefix+year_label+'_'+month_label+'.pdf';
  return  { 'name':f_name,
            'href':url
          };
}


process.argv.forEach(function (val, index, array) {
  if(/--path=/.test(val)){ aim_path = val.split('=')[1]; }
  if(/--id=/.test(val)){ identifiant = val.split('=')[1]; }
  if(/--key=/.test(val)){ key_date = val.split('=')[1]; }
  if(/--pwd=/.test(val)){ password = val.split('=')[1]; }
  if(/--debug/.test(val)){ debug = true; }
});

if(aim_path!==null && identifiant !== null && password !== null && key_date!==null){
  if(!/\/$/.test(aim_path)){
    aim_path = aim_path + '/';
  }
  (async () => {
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox'], timeout:90000});
    let connected = false;

    // after beeing connect, remove any popup
    browser.on('targetcreated', (target) => {
      if(connected && !/assure.ameli.fr/.test(target.url())){
        let page = target.page()
        if(page && typeof(page.close)!=='undefined'){
          page.close();
        }
      }
    })

    const page = await browser.newPage();
    // page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    await page.setViewport({width:1600, height:900});
    await page.setDefaultNavigationTimeout(90000);

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36');

    try {
      await page.goto(root_url);
      await page.waitFor(1000);
      await page.waitForSelector('a.r_btsubmit.r_btlien');
      await page.click('a.r_btsubmit.r_btlien');
      await page.waitForSelector('form[name="connexionCompteForm"]');

      await page.type('input[name="connexioncompte_2numSecuriteSociale"]', identifiant);
      await page.waitFor(500);
      await page.type('input[name="connexioncompte_2codeConfidentiel"]', password);
      await page.waitFor(500);
      await page.click('#id_r_cnx_btn_submit');

      connected = true;
      await page.waitForSelector('#bpliable-header-attDroitsAccueilattDroitsItem');
      // wait enough to remove any popup
      await page.waitFor(10000);
      if(await page.$('div.fenetre.modale:not(.invisible)') !== null){
        await page.click('div.fenetre.modale:not(.invisible) span[id$="_close"]');
      }
      await page.waitForSelector('#bpliable-header-attDroitsAccueilattDroitsItem');
      await page.waitFor(1000);
      await page.click('#bpliable-header-attDroitsAccueilattDroitsItem');
      await page.waitFor(100);
      await page.waitForSelector('#attDroitsAccueilidBenefs', {'visible':true});
      await page.evaluate(setup_profile, key_date);

      await page.waitFor(100);
      await page.click('#attDroitsAccueilidBtValider');
      await page.waitForSelector('a.r_lien_pdf');

      let node = await page.evaluate(get_document_detail, aim_path,'attestation_' );
      if(!fs.existsSync(node.name)){
        await page.evaluate(utils.download_it, node.href, node.name).then(utils.save_download).catch(function(error){if(error){console.log(error);}});
      }

      await page.click('input[name="attDroitsAccueilorg.apache.struts.taglib.html.CANCEL"]');
    } catch (error) {
      console.log(error);
    }
    await browser.close();
  })();
}
