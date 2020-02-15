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
let password    = null;
let debug       = false;

process.argv.forEach(function (val, index, array) {
  if(/--path=/.test(val)){ aim_path = val.split('=')[1]; }
  if(/--id=/.test(val)){ identifiant = val.split('=')[1]; }
  if(/--pwd=/.test(val)){ password = val.split('=')[1]; }
  if(/--debug/.test(val)){ debug = true; }
});

/**
 * read document from current page and download them
 *
 * @param {
 * } page
 */
const read_and_download_documents = async (page) => {
  let node, i;

  var lst_rembs = await page.evaluate((aim_path)=>{
    var month_labl_to_id, row, remb_rows, _i, result, lst_download_links,
        link, label, month_label, day_label, year_label, _i;

    month_labl_to_id = { 'JANVIER'       : '01',
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
    result = [];
    lst_download_links = document.querySelectorAll('a.downdetail');

    for(_i=0;_i<lst_download_links.length;_i++){
      link        = lst_download_links[_i];
      label       = link.parentElement.parentElement.parentElement.parentElement.querySelector('span.mois').innerText;
      day_label   = link.parentElement.parentElement.parentElement.querySelector('span.jour').innerText;
      year_label  = label.split(' ')[1];

      month_label = month_labl_to_id[label.split(' ')[0]];

      result.push({'name' : aim_path+year_label+month_label+day_label+'_ameli.pdf',
                    'href' : link.href});
    }
    return result;
  }, aim_path);

  for(i=0;i<lst_rembs.length;i++){
    node = lst_rembs[i];
    if(!fs.existsSync(node.name)){
      await page.evaluate(utils.download_it, node.href, node.name).then(utils.save_download).catch(function(error){if(error){console.log(error);}});
    }
  }
}

if(aim_path!==null && identifiant !== null && password !== null){
  if(!/\/$/.test(aim_path)){
    aim_path = aim_path + '/';
  }
  (async () => {
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox'], timeout:90000});
    let connected = false;

    // after beeing connect, remove any popup
    browser.on('targetcreated', (target) => {
      if(connected && !/assure.ameli.fr/.test(target.url())){
        console.log(target.url());
        let page = target.page()
        if(page){
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
      await page.type('input[name="connexioncompte_2codeConfidentiel"]', password);
      await page.click('#id_r_cnx_btn_submit');

      connected = true;
      await page.waitForSelector('#bpliable-header-attDroitsAccueilattDroitsItem');
      // wait enough to remove any popup
      await page.waitFor(10000);
      if(await page.$('div.fenetre.modale:not(.invisible)') !== null){
        await page.click('div.fenetre.modale:not(.invisible) span[id$="_close"]');
      }

      await page.waitForSelector('a[href*="as_paiements_page"]');
      await page.click('a[href*="as_paiements_page"]');
      await page.waitFor(2000);

      await page.waitForSelector('span.onoffswitch-inner');
      await page.waitFor(2000);

      await read_and_download_documents(page);

      await page.evaluate(()=>{
        document.querySelector('span.onoffswitch-inner').click();
      });
      await page.waitFor(2000);
      await read_and_download_documents(page);

    } catch (error) {
      console.log(error);
    }
    await browser.close();
  })();
}
