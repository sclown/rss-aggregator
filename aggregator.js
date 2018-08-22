'use strict'

const RSSChannel = require("./rsschannel.js");
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const bot = new TelegramBot(config.token);
const channels = [];
config.feeds.forEach( (url) => { 
    channels.push( new RSSChannel(url) ); 
});

let index = 0;
channels.length && channels[index].getNews(processItems);

function processItems(items) {
    items.forEach((item) => { 
        bot.sendMessage(config.channel, `[${item.title}](${item.link})`,{parse_mode : "Markdown"});
    });
    index+=1;
    if(index>=channels.length) {
        index = 0;
    }
    setTimeout(() => {
        channels[index].getNews(processItems);
    }, config.timeout);
};