'use strict'

const RSSChannel = require("./rsschannel.js");
const TelegramBot = require('node-telegram-bot-api');
const log4js = require('log4js');

log4js.configure({
  appenders: { 
    lifestyle: { type: 'file', filename: 'lifecycle.log', maxLogSize: 5000000, backups: 3 }, 
    rss: { type: 'file', filename: 'rss.log', maxLogSize: 5000000, backups: 3 } 
  },
  categories: { 
      default: { appenders: ['lifestyle'], level: 'info' },
      rss: { appenders: ['rss'], level: 'info' }
  }
});

const logger = log4js.getLogger();

const fs = require('fs');

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const bot = new TelegramBot(config.token);
class TGChannel {
    constructor(channel, feeds) {
        this.index = 0;
        this.reciever = channel;
        this.channels = [];
        feeds.forEach( (url) => { 
            this.channels.push( new RSSChannel(url) ); 
        });    
        if( this.channels.length > 0 ) {
            setTimeout(() => {
                that.checkNews();
            }, config.timeout);
        }
    }

    processItems(items) {
        items.forEach((item) => { 
            const message = `[${item.title}](${item.link})`;
            logger.info(`${this.reciever} message: ${message}`);
            bot.sendMessage(this.reciever, message,{parse_mode : "Markdown"});
        });
    }

    checkNews() {
        logger.info(this.reciever + " Check news for " + this.channels[this.index].url);
        const that = this;
        this.channels[this.index].getNews((items)=>{ that.processItems(items) });
        this.switchToNextChannel();
        setTimeout(() => {
            that.checkNews();
        }, config.timeout);
    }

    switchToNextChannel() {
        this.index+=1;
        if(this.index>=this.channels.length) {
            this.index = 0;
        }
    }

}  

const channels = [];
config.tgchannels.forEach( (ch) => { 
    channels.push( new TGChannel(ch.channel, ch.feeds) ); 
});

