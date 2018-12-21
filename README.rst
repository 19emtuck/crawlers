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


sosh
----

sample usage using casperjs :

.. code-block:: shell

        export PATH=/home/user/phantomjs-2.1.1-linux-x86_64/bin:/home/user/casperjs-1.1.4-1/bin:/home/user/java/jdk1.8.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games
        # put your phone number and your password there
        casperjs sosh.js --ignore-ssl-errors=true --id=0600000000 --pwd=mypassword --path=/my_path/

use timeout when using crontab and don't forget to declare PATH (crontab don't have default .profile)

.. code-block:: shell

        export PATH=/home/user/phantomjs-2.1.1-linux-x86_64/bin:/home/user/casperjs-1.1.4-1/bin:/home/user/java/jdk1.8.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games
        # put your phone number and your password there
        # use timeout when crontab usage
        timeout 300 casperjs sosh.js --ignore-ssl-errors=true --id=0600000000 --pwd=mypassword --path=/my_path/


sample usage with puppeteer :


.. code-block:: shell

        node puppeteer_sosh.js --ignore-ssl-errors=true --id=0600000000 --pwd=mypassword --path=/my_path/



