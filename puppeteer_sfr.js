/****************************************************************************************************************************/
/*                                      sfr crawler                                                                         */
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
const utils     = require('../utils/utils.js')

const { exec } = require('child_process');

const root_url  = 'https://www.sfr.fr/mon-espace-client';

let aim_path    = null;
let identifiant = null;
let password    = null;
let debug       = false;


const read_invoice = ()=>{
  var _date = document.querySelector('span.sr-text-grey-14 span').innerText.replace(/[ \n]*/g,'').replace(/\//g,'_');
  _date = [_date.split('_')[2], _date.split('_')[1], _date.split('_')[0]].join('');
  return {'name': +_date+'_SFR.pdf',
          'url' : document.querySelector('a[href*="facture-fixe/consultation/telecharger/facture"]').href };
};

const read_second_invoice = ()=>{
  var _date = document.querySelector('span.sr-text-grey-14 span').innerText.replace(/[ \n]*/g,'').replace(/\//g,'_');
  _date = [_date.split('_')[2], _date.split('_')[1], _date.split('_')[0]].join('');

  return {'name': +_date+'_SFR.pdf',
          'url' : document.querySelector('a[href*="facture-fixe/consultation/telecharger"]').href };
}


const read_lst_nodes = ()=>{
  var lst_nodes, node, i, result;
  result = [];

  lst_nodes = document.querySelectorAll('#historique a[href*="/facture-fixe/consultation/facturette/facture"].sr-chevron');
  for(i=0;i<lst_nodes.length;i++){
    node = lst_nodes[i];
    var _date = node.parentElement.previousElementSibling.querySelector('span.sr-text-grey-14 span').innerText.replace(/[ \n]*/g,'').replace(/\//g,'_');
    result.push({'href':node.href,
                 'date':_date})
  }
  return result;
}



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

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36');

    try {
      let invoice, node, lst_nodes, i;

      await page.goto(root_url);
      await page.waitForSelector('form[name="loginForm"]');
      
      await page.type('input[name="username"]', identifiant);
      await page.type('input[name="password"]', password);

      await page.click('#identifier');
      await page.waitFor(300);
      await page.waitForSelector('a[href*="logout"]')
      await page.waitFor(1000);

      await page.goto('https://espace-client.sfr.fr/facture-fixe/consultation/infoconso')
      await page.waitFor(1000);
      await page.waitForSelector('#facture')
      await page.click('#facture');

      await page.waitForSelector('#plusFac');

      invoice = await page.evaluate(read_invoice);
      if(invoice!==null && typeof(invoice.url)!=='undefined' && typeof(invoice.name)!=='undefined' && invoice.name!==null &&!fs.existsSync(aim_path+invoice.name)){
        await page.evaluate(utils.download_it, invoice.url, aim_path+invoice.name).then(utils.save_download).catch(function(error){if(error){console.log(error);}});
      }

      lst_nodes = await page.evaluate(read_lst_nodes);

      for(i=0;i<lst_nodes.length;i++){
        node = lst_nodes[i];
        await page.goto(node.href);
        await page.waitFor(1000);

        invoice = await page.evaluate(read_second_invoice);
        if(invoice!==null && typeof(invoice.url)!=='undefined' && typeof(invoice.name)!=='undefined' && invoice.name!==null &&!fs.existsSync(aim_path+invoice.name)){
          await page.evaluate(utils.download_it, invoice.url, aim_path+invoice.name).then(utils.save_download).catch(function(error){if(error){console.log(error);}});
        }
      }

    } catch (error) {
      console.log(error);
    }
    await browser.close();
  })();
}
