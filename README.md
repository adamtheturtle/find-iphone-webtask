# Find my iPhone webtask

A webtask.io task for Find my iPhone.
Alert on all devices.

## How to set this up

Install https://webtask.io/cli

```
wt create \
--secret APPLE_ID=$APPLE_ID \
--secret APPLE_PASSWORD=$APPLE_PASSWORD \
find_iphone.js
```

This will give a webtask URL which can be `curl`-ed.

Or, even better, set up a trigger for it on https://ifttt.com/.

## Credits

Most of the code is from https://github.com/matt-kruse/find-my-iphone.