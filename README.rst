crawlers descriptions
=====================


.. note:: Switching from casperjs to puppeteer. July 2017, phantomjs maintainer declare project is over. A last release
          has been compile and available. So it's time to switch.
          Because most of the scripts are pure js codes, that's really easy to switch from a browser to another.

.. note:: documentation about casperjs : 

    - the main documentation : http://docs.casperjs.org/en/latest/

.. note:: documentation about puppeteer : 

    - the api description : https://pptr.dev/

    - the old git page about the api https://github.com/GoogleChrome/puppeteer/blob/v1.11.0/docs/api.md

installation
============


puppeteer
---------

windows
^^^^^^^

`download and install last LTS node.js version <https://nodejs.org/en/download>`_.
npm shall be available


.. code-block:: shell

        npm install puppeteer


linux
^^^^^
Linux box installation is pretty similiar because nodejs packages are regulary outdated, so download
your nodejs installation and follow the requirements.
`download and install last LTS node.js version <https://nodejs.org/en/download>`_ then 

.. code-block:: shell

        npm install puppeteer

casperjs
--------

follow casperjs installation steps : http://docs.casperjs.org/en/latest/installation.html
Last phantomjs releases are available there http://docs.casperjs.org/en/latest/installation.html

take care to take the last one

windows
^^^^^^^

linux
^^^^^


crawlers
========


SOSH
----

use timeout when using crontab and don't forget to declare PATH (crontab don't have default .profile)

.. code-block:: shell

        node puppeteer_sosh.js --id=0600000000 --pwd=mypassword --path=/my_path/


La Banque Postale
-----------------

use timeout when using crontab and don't forget to declare PATH (crontab don't have default .profile)

.. code-block:: shell

        node puppeteer_bp.js --id=0600000000 --pwd=000000 --path=./

note : your can add suffis parameter in order to rename downloaded PDF with the right suffix name if you have
several accounts

.. code-block:: shell

        node puppeteer_bp.js --id=0600000000 --pwd=000000 --path=./ --suffix=CCP_XXXXXXX_



