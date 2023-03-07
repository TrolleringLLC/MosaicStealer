## ⚠️ For educational use, only. ⚠️

## ⚠️ We (Trollering LLC, but not limited to) are not responsible for the damage you cause with our software! ⚠️

## minecraft account stealer  
made for fun, don't use this to steal actual accounts please!!  

## setup  

Go to https://portal.azure.com/ and log in.  
In the search bar, type in "App Registrations" then click on it.  
Click on "New Registration"  
Name can be anything  
Supported account types should be personal accounts only  

Redirect URI => Set "platform" to "web" and the URI should be the url at which you are hosting mosaic  
copy the Application Client ID but do not close the tab yet!  
go to settings.json.example in the mosaic files and rename it to settings.json  
in the new settings.json, paste the ID you just copied to the client_id property  
then go back to the tab and click on "New Client Secret", enter a description & duration (can both be anything)  
Now copy the value to your clipboard and set the client_secret in the settings.json to the value you just copied.  
Fill in the redirect_uri, webhook & hypixel API key (optional) in the json file, then start mosaic using:  

``node index.js``
