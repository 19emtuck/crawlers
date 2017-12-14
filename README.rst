crawlers descriptions
=====================



sosh
----

sample usage

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
