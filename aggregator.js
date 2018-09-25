'use strict'

const RSSChannel = require("./rsschannel.js");
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const bot = new TelegramBot(config.token);
class TGChannel {
    constructor(channel, feeds) {
        this.index = 0;
        this.reciever = channel
        this.channels = []
        feeds.forEach( (url) => { 
            this.channels.push( new RSSChannel(url) ); 
        });    
        if( this.channels.length > 0 ) {
            this.checkNews();
        }
    }

    processItems(items) {
        items.forEach((item) => { 
            bot.sendMessage(this.reciever, `[${item.title}](${item.link})`,{parse_mode : "Markdown"});
        });
        this.index+=1;
        if(this.index>=this.channels.length) {
            this.index = 0;
        }
        const that = this
        setTimeout(() => {
            that.checkNews();
        }, config.timeout);
    }

    checkNews() {
        const that = this
        this.channels[this.index].getNews((items)=>{ that.processItems(items) });
    }

}  

const channels = [];
config.tgchannels.forEach( (ch) => { 
    channels.push( new TGChannel(ch.channel, ch.feeds) ); 
});

