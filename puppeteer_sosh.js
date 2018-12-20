/****************************************************************************************************************************/
/*                                      sosh crawler                                                                        */
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

const root_url          = 'https://www.sosh.fr/';

let aim_path    = null;
let identifiant = null;
let password    = null;
let debug       = false;


const get_last_invoice = ()=>{

  var lst_invoice  = [];
  var _lst_links = document.querySelectorAll('a[href*="/?page=facture-telecharger"]');

  for(var i=0;i<_lst_links.length;i++){
    // check container is last bill ...
    var parent_container = _lst_links[i].parentElement;
    // check the last bill
    if(typeof(parent_container.getAttribute('class'))!=='undefined' && parent_container.getAttribute('headers').split(' ').indexOf('ec-downloadCol')!==-1){
      var lst_date = parent_container.parentElement.querySelector('td[headers="ec-dateCol"]').innerText.trim().split(' ');

      var _day   = lst_date[0];
      if(_day.length<2){
        _day = '0'+_day;
      }

      var _month = lst_date[1];
      if(_month==='janvier'){
        _month = '01';
      } else if(_month==='f\u00e9vrier' || _month==='fevrier'){
        _month = '02';
      } else if(_month==='mars'){
        _month = '03';
      } else if(_month==='avril'){
        _month = '04';
      } else if(_month==='mai'){
        _month = '05';
      } else if(_month==='juin'){
        _month = '06';
      } else if(_month==='juillet'){
        _month = '07';
      } else if(_month==='ao\u00fbt' || _month==='aout'){
        _month = '08';
      } else if(_month==='septembre'){
        _month = '09';
      } else if(_month==='octobre'){
        _month = '10';
      } else if(_month==='novembre'){
        _month = '11';
      } else if(_month==='d\u00e9cembre' || _month==='decembre'){
        _month = '12';
      }
      var _year  = lst_date[2];

      lst_invoice.push({'name': 'facture_'+_day+'_'+_month+'_'+_year+'.pdf',
                        'url' : _lst_links[i].getAttribute('href').toString() });
    }
  }
  return lst_invoice;
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
      await page.goto(root_url);

      await page.waitForSelector('#o-nav-item-login');
      await page.click('#o-nav-item-login');
      await page.waitForSelector('#login');
      await page.type('#login', identifiant);
      await page.click('#btnSubmit');
      await page.waitForSelector('#password');
      await page.type('#password', password);
      await page.click('#btnSubmit');
      await page.waitFor(300);
      await page.waitForSelector('#o-deconnect');
      await page.waitForSelector('a.sosher_bills');
      await page.waitFor(300);
      await page.click('a.sosher_bills');
      await page.waitForSelector('a[href*="page=factures-historique"]');
      await page.waitFor(300);
      await page.click('a[href*="page=factures-historique"]');
      await page.waitForSelector('div.ec-wrapper-bandeau.ec-bnt-title');
      await page.waitForSelector('td[headers="ec-dateCol"]');
      await page.waitFor(600);
      let lst_invoice = await page.evaluate(get_last_invoice);

      let invoice;
      for(let i=0;i<lst_invoice.length;i++){
        invoice = lst_invoice[i];
        if(invoice!==null && typeof(invoice.name)!=='undefined'){
          if(!fs.existsSync(aim_path+invoice.name)){
            await page.evaluate(utils.download_it, invoice.url, aim_path+invoice.name).then(utils.save_download).catch(function(error){if(error){console.log(error);}});
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
    await browser.close();
  })();
}
