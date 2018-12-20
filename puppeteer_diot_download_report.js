/****************************************************************************************************************************/
/*                                      diot crawler                                                                        */
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

const root_url = 'https://sante.diot.com';

let aim_path        = null;
let identifiant     = null;
let password        = null;
let debug           = false;
let details_require = false;

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
      await page.waitFor(1000);
      await page.waitForSelector('#formLogin input[name="j_password"]');
      await page.type('#formLogin input[name="j_username"]', identifiant);
      await page.waitFor(1000);
      await page.type('#formLogin input[name="j_password"]', password);
      await page.waitFor(1000);
      await page.click('button.submit');
      await page.waitForSelector('a.buttonContact.button');
      await page.click('#menu-left > ul > li:nth-child(1) > ul > li > a');
      await page.waitForSelector('a[href^="sante-list-decomptes.html"]');
      await page.click('a[href^="sante-list-decomptes.html"]');

      let current_url = await page.evaluate(()=>{return window.location.href;})
      let csrfToken = current_url.split('CSRF_TOKEN=')[1];
      let lst_documents = [];
      await page.waitForSelector('#sp_1_jqGrid_pager_decomptesTable');
      await page.waitFor(1000);

      let url_data = 'json/sante-list-decomptes-table.html?CSRF_TOKEN='+csrfToken;
      let pages_count = await page.evaluate(function(){ return parseInt($j('#sp_1_jqGrid_pager_decomptesTable').text(),10); });
      let _doc, lst_details, rows_count;

      await page.waitFor(1000);

      for(var __u=0;__u<pages_count;__u++){

        rows_count = await page.evaluate(function(){
          return $j('tr[role=row].jqgrow').size();
        });

        for(var row_index=0;row_index < rows_count;row_index++){

          _doc = await page.evaluate(function(csrfToken, row_index){
            var $item = $j($j('tr[role=row].jqgrow').get(row_index));

            var _date = '';
            if(typeof($item.find('td').get(2))!=='undefined'){
              _date = $item.find('td').get(2).innerText;
            }

            var _y    = _date.split('/')[2];
            var _m    = _date.split('/')[1];
            var _d    = _date.split('/')[0];

            return {'name'     : _y+_m+_d+'_DIOT_'+$item.attr('id')+'.pdf',
                    'id'       : $item.attr('id'),
                    's_amount' : $item.find('td').get(4).innerText,
                    'f_amount' : parseFloat($item.find('td').get(4).innerText.split(' ')[0].replace(',','.')),
                    'aim'      : $item.find('td').get(3).innerText,
                    'date'     : $item.find('td').get(2).innerText,
                    'details'  : null,
                    'token'    : csrfToken};
          }, csrfToken, row_index );

          if(details_require){
            await page.evaluate(function(row_index){
                var $item = $j($j('tr[role=row].jqgrow').get(row_index));
                  $item.find('span.ui-icon-plus').click();
              }, row_index);
            await page.waitFor(200);

            await page.waitForSelector('span.ui-icon-carat-1-sw');

            lst_details = await page.evaluate(function(row_index){
              var $item = $j($j('tr[role=row].jqgrow').get(row_index));
              var $row_details = $item.next('tr.ui-subgrid');

              lst_details = $row_details.find('tr[role="row"]').not(':first').map(function(_j,jtem){

              var _date = $j(jtem).find('td').get(1).innerText;

              return { 'date'          : _date,
                       'nature'        : $j(jtem).find('td').get(2).innerText,
                       'amount'        : parseFloat($j(jtem).find('td').get(3).innerText.split(' ')[0].replace(',','.')),
                       'secu_part'     : parseFloat($j(jtem).find('td').get(4).innerText.split(' ')[0].replace(',','.')),
                       'mutuelle_part' : parseFloat($j(jtem).find('td').get(5).innerText.split(' ')[0].replace(',','.')),
                     };
              }).toArray();
              return lst_details;
            }, row_index);

            _doc.details = lst_details;
          }

          lst_documents.push(_doc);

          if(!fs.existsSync(aim_path+_doc.name)){
            await page.evaluate(utils.download_it,
                                'decomptePdf.html?decId='+_doc.id+'&CSRF_TOKEN='+_doc.token,
                                aim_path+_doc.name)
                      .then(utils.save_download)
                      .catch(function(error){if(error){console.log(error);}});
          }
          if(details_require){
            await page.click('.ui-icon-minus');
            await page.waitFor(200);
          }
        }
        await page.click('#next_jqGrid_pager_decomptesTable');
        await page.waitFor(200);
      }
    } catch (error) {
      console.log(error);
    }
    await browser.close();
  })();
}
