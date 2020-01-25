/****************************************************************************************************************************/
/*                                      facil famille crawler                                                               */
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

const root_url  = 'https://teleservices.paris.fr/ffaxssl/jsp/site/Portal.jsp?page';

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

    await page.setViewport({width:1600, height:900});
    await page.setDefaultNavigationTimeout(90000);

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36');

    try {
      let invoice, i, abs_file_name;

      await page.goto(root_url);
      await page.waitForSelector('input[value="Me connecter"]');
      await page.click('input[value="Me connecter"]');

      await page.waitForSelector('input[type="text"][title="Identifiant"]');
      await page.waitForSelector('input[type="password"][title="Mot de passe"]');
      
      await page.type('input[type="text"][title="Identifiant"]', identifiant);
      await page.waitFor(200);
      await page.type('input[type="password"][title="Mot de passe"]', password);
      await page.waitFor(200);

      await page.click('input[title="Connexion"]');
      await page.waitForSelector('img[alt="Deconnexion"]');
      await page.waitFor(500);
      await page.waitForSelector('a[href*="historiqueFactures"]');
      let invoices_url = await page.evaluate(()=>{return document.querySelector('a[href*="historiqueFactures"]').href;})
      await page.goto(invoices_url);
      await page.waitForSelector('legend.center.formengine-legend');

      let lst_invoices = await page.evaluate(()=>{
        var lst_factures_link = [];
        document.querySelectorAll('a[title="facture"]').forEach((item)=>{

          invoice_id                = item.parentElement.parentElement.querySelectorAll('td')[1].innerText;
          invoice_due_date          = item.parentElement.parentElement.querySelectorAll('td')[2].innerText;
          invoice_due_date_formated = item.parentElement.parentElement.querySelectorAll('td')[2].innerText.replace(/\//g,'_');
          invoice_amount            = parseFloat(item.parentElement.parentElement.querySelectorAll('td')[3].innerText.split(' ')[0].replace(',','.'));

          lst_factures_link.push({'url'      : item.href,
                                  'id'       : invoice_id,
                                  'year'     : invoice_due_date.split('/')[2],
                                  'name'     : 'facil_famille_'+invoice_id+'_'+invoice_due_date_formated+'.pdf',
                                  'amount'   : invoice_amount,
                                  'due_date' : invoice_due_date});
        });
        return lst_factures_link;
      });

      for(i=0;i<lst_invoices.length;i++){
        invoice = lst_invoices[i];

        if(! await fs.existsSync(aim_path+invoice.year)){
          await fs.mkdirSync(aim_path+invoice.year);
        }

        abs_file_name = aim_path+invoice.year+'/'+invoice.name;
        if(invoice!==null && typeof(invoice.url)!=='undefined' && typeof(invoice.name)!=='undefined' && invoice.name!==null &&!fs.existsSync(abs_file_name)){
          await page.evaluate(utils.download_it, invoice.url, abs_file_name).then(utils.save_download).catch(function(error){if(error){console.log(error);}});
        }
      }

    } catch (error) {
      console.log(error);
    }
    await browser.close();
  })();
}
