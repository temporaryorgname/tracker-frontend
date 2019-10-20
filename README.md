[![Build Status](https://travis-ci.org/temporaryorgname/tracker-frontend.svg?branch=master)](https://travis-ci.org/temporaryorgname/tracker-frontend)

# Front End

##Errors

### ENOSPC on npm test

This is likely because the watcher limit is exceeded. Run the following to increase the limit:
`echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p`
This persists across reboots.

[Source](https://stackoverflow.com/questions/22475849/node-js-what-is-enospc-error-and-how-to-solve)
