#Billing Code Importer

This is a quick and easy mechanism for importing user billing codes. The app
provides a text box for the user to copy in a set of rows that are comma-separated
pairs of user names and billing codes.  The app will trim the white space from both.

The "billing code" is a field that's chosen by the person installing
the app (in Edit App Settings...) and is a field on the user object, so to
change the value, a user must have admin rights.  AND a workspace administrator
will not be able to set the code for a Subscription Administrator.

## Development Notes

All of the active users in the sub are loaded before the app launches so that
we can check to see if the user exists before running.  It might be that this
will be a performance hit.  If the customer intends to only load five or six
at a time, then it's reasonable to wait until running through to check user
existence, but if they want to push up a hundred, then it makes more sense to
run as this is written now.

The input box (text area) will perform two validations and won't let the Submit
button appear if there is something "wrong" with the data in the field.  (It
checks to see that every line is either blank or has a comma separated pair AND
that every user name has an @ sign.

### First Load

If you've just downloaded this from github and you want to do development, 
you're going to need to have these installed:

 * node.js
 * grunt-cli
 * grunt-init
 
Since you're getting this from github, we assume you have the command line
version of git also installed.  If not, go get git.

If you have those three installed, just type this in the root directory here
to get set up to develop:

  npm install

### Structure

  * src/javascript:  All the JS files saved here will be compiled into the 
  target html file
  * src/style: All of the stylesheets saved here will be compiled into the 
  target html file
  * test/fast: Fast jasmine tests go here.  There should also be a helper 
  file that is loaded first for creating mocks and doing other shortcuts
  (fastHelper.js) **Tests should be in a file named <something>-spec.js**
  * test/slow: Slow jasmine tests go here.  There should also be a helper
  file that is loaded first for creating mocks and doing other shortcuts 
  (slowHelper.js) **Tests should be in a file named <something>-spec.js**
  * templates: This is where templates that are used to create the production
  and debug html files live.  The advantage of using these templates is that
  you can configure the behavior of the html around the JS.
  * config.json: This file contains the configuration settings necessary to
  create the debug and production html files.  Server is only used for debug,
  name, className and sdk are used for both.
  * package.json: This file lists the dependencies for grunt
  * auth.json: This file should NOT be checked in.  Create this to run the
  slow test specs.  It should look like:
    {
        "username":"you@company.com",
        "password":"secret"
    }
  
### Usage of the grunt file
####Tasks
    
##### grunt debug

Use grunt debug to create the debug html file.  You only need to run this when you have added new files to
the src directories.

##### grunt build

Use grunt build to create the production html file.  We still have to copy the html file to a panel to test.

##### grunt test-fast

Use grunt test-fast to run the Jasmine tests in the fast directory.  Typically, the tests in the fast 
directory are more pure unit tests and do not need to connect to Rally.

##### grunt test-slow

Use grunt test-slow to run the Jasmine tests in the slow directory.  Typically, the tests in the slow
directory are more like integration tests in that they require connecting to Rally and interacting with
data.
